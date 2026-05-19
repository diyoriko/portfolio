#!/bin/bash
# Generate LinkedIn post drafts from new radar items
# Drafts saved to ~/Documents/Projects/Portfolio/agents/radar/linkedin-drafts/
# Designer angle, not developer self-promo (per feedback)

set -uo pipefail

PROJECT_DIR="${PORTFOLIO_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DB_FILE="$PROJECT_DIR/radar-db.json"
DRAFTS_DIR="$PROJECT_DIR/agents/radar/linkedin-drafts"
DATE=$(date +%Y-%m-%d)

mkdir -p "$DRAFTS_DIR"

# URLs to generate drafts for (passed as arguments or generate for today's items)
URLS="$*"

python3 << PYEOF
import json, textwrap, os

db_file = "$DB_FILE"
drafts_dir = "$DRAFTS_DIR"
date = "$DATE"
urls_arg = "$URLS".strip().split() if "$URLS".strip() else []

with open(db_file) as f:
    raw = json.load(f)
db_obj = raw if isinstance(raw, dict) and 'items' in raw else {'_meta': {}, 'items': raw}
items = db_obj.get('items', [])

# If specific URLs passed, filter to those. Otherwise, get today's items.
if urls_arg:
    from urllib.parse import urlparse, urlunparse
    def norm(u):
        p = urlparse(u.strip().rstrip('/'))
        h = p.hostname or ''
        if h.startswith('www.'): h = h[4:]
        return urlunparse(('https', h, p.path.rstrip('/'), '', '', ''))
    target = {norm(u) for u in urls_arg}
    items = [i for i in items if i.get('url') and norm(i['url']) in target]
else:
    items = [i for i in items if i.get('added', '') == date]

if not items:
    print("No items to draft")
    exit(0)

drafts = []
for item in items:
    title = item.get('title', '')
    url = item.get('url', '')
    desc = item.get('desc_en', '') or item.get('desc_ru', '')
    itype = item.get('type', 'article')
    tag = item.get('tag', '')
    stars = item.get('stars', 0)

    # Designer-angle LinkedIn post template
    if itype == 'tool':
        hook = f"Found a tool that changes how designers work with AI."
    elif itype == 'article':
        hook = f"This caught my eye on the design × AI radar."
    elif itype == 'skill':
        hook = f"A skill worth adding to your design toolkit."
    elif itype == 'research':
        hook = f"New research at the intersection of design and AI."
    else:
        hook = f"Something interesting from the design × AI space."

    stars_line = ""
    if stars and stars >= 1000:
        stars_line = f"\n{stars // 1000}.{(stars % 1000) // 100}k stars on GitHub — the community agrees."
    elif stars and stars >= 100:
        stars_line = f"\n{stars} stars on GitHub."

    draft = f"""{hook}

{title}
{desc}{stars_line}

{url}

I track design × AI tools daily at diyor.design/radar

#DesignEngineering #AI #Design"""

    drafts.append((title, draft))

# Save to file
draft_file = os.path.join(drafts_dir, f"{date}.md")
with open(draft_file, 'w') as f:
    f.write(f"# LinkedIn Drafts — {date}\n\n")
    for title, draft in drafts:
        f.write(f"## {title}\n\n")
        f.write("~~~\n")
        f.write(draft.strip())
        f.write("\n~~~\n\n---\n\n")

print(f"Generated {len(drafts)} drafts → {draft_file}")
PYEOF
