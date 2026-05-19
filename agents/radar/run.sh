#!/bin/bash
# Radar Agent — Design × AI Scout & Reviewer
# Dual-mode: runs both locally (Mac+launchd) and in GitHub Actions CI.
# CI detection: $CI env var (GitHub Actions sets CI=true automatically)
# Usage: ./run.sh [full|scout-only]   (default: auto-detect by day-of-week)

set -uo pipefail

# === Mode ===
if [ -n "${1:-}" ] && [ "$1" != "auto" ]; then
  MODE="$1"
elif [ "$(date +%u)" -eq 1 ]; then
  MODE="full"
else
  MODE="scout-only"
fi

# === Paths ===
# In CI: script at $GITHUB_WORKSPACE/agents/radar/run.sh → repo root = $GITHUB_WORKSPACE
# Local: script at Portfolio/site/agents/radar/run.sh → repo root = Portfolio/site/
PROJECT_DIR="${RADAR_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
AGENT_DIR="$PROJECT_DIR/agents/radar"
REPORTS_DIR="$AGENT_DIR/reports"
DATE=$(date +%Y-%m-%d)
RUN_ID=$(date +%H%M%S)
REPORT_FILE="$REPORTS_DIR/$DATE.md"
DB_FILE="$PROJECT_DIR/radar-db.json"
TMP_PROMPT=$(mktemp)

# === Tokens (env first → local config fallback) ===
RADAR_BOT_TOKEN="${RADAR_BOT_TOKEN:-}"
if [ -z "$RADAR_BOT_TOKEN" ] && [ -f "$HOME/.config/diyoriko/radar-bot-token" ]; then
  RADAR_BOT_TOKEN=$(cat "$HOME/.config/diyoriko/radar-bot-token")
fi

NOTIFY_BOT_TOKEN="${NOTIFY_BOT_TOKEN:-${BOT_TOKEN:-}}"
if [ -z "$NOTIFY_BOT_TOKEN" ] && [ -f "$HOME/.config/diyoriko/notify-bot-token" ]; then
  NOTIFY_BOT_TOKEN=$(cat "$HOME/.config/diyoriko/notify-bot-token")
fi

ADMIN_CHAT_ID="${ADMIN_TELEGRAM_ID:-85013206}"
RADAR_CHANNEL="${RADAR_CHANNEL_ID:-@diyoriko_radar}"

# === Local-only: PATH for nvm + Mac wake/sleep prevention ===
CAFFEINE_PID=""
if [ -z "${CI:-}" ]; then
  if [ -d "$HOME/.nvm/versions/node" ]; then
    NVM_BIN=$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | tail -1)
    export PATH="$HOME/.local/bin:${NVM_BIN:-}:/usr/local/bin:/usr/bin:/bin:$PATH"
  fi

  # Prevent sleep during run (Mac launchd context with DarkWake)
  if command -v caffeinate >/dev/null 2>&1; then
    caffeinate -is -w $$ &
    CAFFEINE_PID=$!
  fi

  # Wait for network (DarkWake → WiFi can take 30-120s)
  NET_WAIT=0
  while [ "$NET_WAIT" -lt 180 ]; do
    if curl -sf --max-time 5 -o /dev/null https://www.google.com 2>/dev/null; then break; fi
    echo "$(date -Iseconds) Waiting for network... (${NET_WAIT}s)"
    sleep 10
    NET_WAIT=$((NET_WAIT + 10))
  done
fi

unset CLAUDECODE 2>/dev/null || true
unset CLAUDE_CODE_ENTRY_POINT 2>/dev/null || true

cleanup() {
  rm -f "$TMP_PROMPT" "${TMP_PROMPT}.out" "${TMP_PROMPT}.stream.jsonl"
  [ -n "$CAFFEINE_PID" ] && kill "$CAFFEINE_PID" 2>/dev/null || true
}
trap cleanup EXIT

mkdir -p "$REPORTS_DIR"

# Timestamped filename if today's report already exists
if [ -f "$REPORT_FILE" ]; then
  REPORT_FILE="$REPORTS_DIR/${DATE}-${RUN_ID}.md"
fi

echo "$(date -Iseconds) Starting radar agent (mode: $MODE, env: ${CI:+CI}${CI:-local})..."

# === Existing data from DB ===
[ -f "$DB_FILE" ] || echo '{"_meta":{"tags":{},"types":{}},"items":[]}' > "$DB_FILE"

EXISTING_URLS=$(python3 -c "
import json
try:
    raw = json.load(open('$DB_FILE'))
    items = raw.get('items', raw) if isinstance(raw, dict) else raw
    for i in items: print(i.get('url',''))
except: pass
" 2>/dev/null)

EXISTING_TAGS=$(python3 -c "
import json
try:
    raw = json.load(open('$DB_FILE'))
    items = raw.get('items', raw) if isinstance(raw, dict) else raw
    print(', '.join(sorted(set(i.get('tag','') for i in items if i.get('tag')))))
except: pass
" 2>/dev/null)

EXISTING_TITLES=$(python3 -c "
import json
try:
    raw = json.load(open('$DB_FILE'))
    items = raw.get('items', raw) if isinstance(raw, dict) else raw
    for i in items: print(i.get('title',''))
except: pass
" 2>/dev/null)

# === Build prompt ===
{
  cat "$AGENT_DIR/prompt.md"
  echo ""
  echo "---"
  echo "Today: $DATE"
  echo ""
  echo "URLs already in database (SKIP these):"
  echo "$EXISTING_URLS"
  echo ""
  echo "Titles already in database (SKIP duplicates / very similar topics):"
  echo "$EXISTING_TITLES"
  echo ""
  echo "Existing tags: $EXISTING_TAGS"
  echo ""
  echo "## Current tag distribution:"
  python3 -c "
import json
from collections import Counter
try:
    raw = json.load(open('$DB_FILE'))
    items = raw.get('items', raw) if isinstance(raw, dict) else raw
    tags = Counter(i.get('tag','') for i in items if i.get('tag'))
    for tag, count in tags.most_common():
        print(f'  {tag}: {count} items')
    print(f'Total: {len(items)} items')
except: pass
" 2>/dev/null || true
  echo ""

  REVIEWS_FILE="$REPORTS_DIR/reviews.json"
  if [ -f "$REVIEWS_FILE" ]; then
    echo "## Past Algorithm Reviews (most recent 3) — APPLY suggestions this run:"
    python3 -c "
import json
try:
    reviews = json.load(open('$REVIEWS_FILE'))
    for r in reviews[-3:]:
        print(f\"### {r.get('date','')}:\")
        for q in r.get('query_suggestions',[]): print(f\"  - Suggested query: {q.get('query','')} ({q.get('why','')})\")
        gaps = r.get('coverage_gaps',[])
        if gaps: print(f\"  Coverage gaps: {', '.join(gaps)}\")
        weak = r.get('weak_queries',[])
        if weak: print(f\"  Weak queries to skip: {', '.join(weak)}\")
        notes = r.get('notes','')
        if notes: print(f\"  Notes: {notes}\")
        print()
except: pass
" 2>/dev/null || true
    echo "ACTION: Run at least TWO of the suggested queries above (beyond the 8 required) and SKIP the weak queries listed."
    echo ""
  fi

  if [ "$(date +%u)" -eq 7 ]; then
    echo "## Weekly recovery pass (Sunday):"
    echo "Widen freshness window globally to 14 days this run."
    echo ""
  fi

  if [ "$MODE" = "scout-only" ]; then
    echo "IMPORTANT: SKIP Phase 2 and Phase 3. Only do Phase 1 (Scout)."
    echo "Return ONLY a JSON array of items. Start with [ end with ]. No review, no radar_ideas, no other text."
  else
    echo "IMPORTANT: Your response must contain ONLY a JSON object with keys: items, review, radar_ideas. Start with { end with }. No other text."
  fi
} > "$TMP_PROMPT"

# === Run Claude CLI ===
# CI: uses CLAUDE_CODE_OAUTH_TOKEN env (Max subscription long-lived token from `claude setup-token`)
# Local: uses keychain OAuth
echo "$(date -Iseconds) Running Claude scan..."
STREAM_FILE="${TMP_PROMPT}.stream.jsonl"
claude --print \
  --model claude-sonnet-4-6 \
  --output-format stream-json \
  --include-partial-messages \
  --verbose \
  --max-budget-usd 1.50 \
  --allowedTools "WebSearch,WebFetch" \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  < "$TMP_PROMPT" > "$STREAM_FILE" 2>&1 &
CLAUDE_PID=$!

# Timeout: scout-only=30min, full=40min
TIMEOUT_SEC=$([ "$MODE" = "scout-only" ] && echo 1800 || echo 2400)

WAIT=0
TIMED_OUT=0
while kill -0 "$CLAUDE_PID" 2>/dev/null; do
  sleep 10
  WAIT=$((WAIT + 10))
  if [ "$WAIT" -ge "$TIMEOUT_SEC" ]; then
    kill "$CLAUDE_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$CLAUDE_PID" 2>/dev/null || true
    echo "$(date -Iseconds) Timed out after $((TIMEOUT_SEC / 60)) min — attempting partial recovery"
    TIMED_OUT=1
    break
  fi
done
wait "$CLAUDE_PID" 2>/dev/null || true

# Extract final assistant text from stream-json events
REPORT=$(python3 <<PYEOF
import json, sys
text_parts = []
tool_calls = 0
last_result = None
try:
    with open("$STREAM_FILE") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try: ev = json.loads(line)
            except: continue
            t = ev.get('type', '')
            if t == 'result':
                last_result = ev.get('result') or ev.get('content') or ''
                continue
            if t == 'stream_event':
                inner = ev.get('event', {})
                if inner.get('type') == 'content_block_delta':
                    delta = inner.get('delta', {})
                    if delta.get('type') == 'text_delta':
                        text_parts.append(delta.get('text', ''))
                continue
            if t == 'assistant':
                msg = ev.get('message', {})
                for c in msg.get('content', []):
                    if isinstance(c, dict) and c.get('type') == 'text':
                        text_parts.append(c.get('text', ''))
                continue
            if t == 'user':
                msg = ev.get('message', {})
                for c in msg.get('content', []):
                    if isinstance(c, dict) and c.get('type') == 'tool_result':
                        tool_calls += 1
except FileNotFoundError:
    pass

result = last_result or ''.join(text_parts)
sys.stderr.write(f"[stream-parse] tool_calls={tool_calls} text_chars={len(result)}\n")
print(result)
PYEOF
)

if [ -z "$REPORT" ]; then
  echo "$(date -Iseconds) Empty response (timed_out=$TIMED_OUT)"
  if [ -n "$NOTIFY_BOT_TOKEN" ]; then
    REASON=$([ "$TIMED_OUT" -eq 1 ] && echo "timed out" || echo "empty response")
    curl -s -X POST "https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${ADMIN_CHAT_ID}" --data-urlencode "text=📡 Radar — $DATE — $REASON" > /dev/null 2>&1 || true
  fi
  cp "$STREAM_FILE" "$REPORTS_DIR/${DATE}-stream-debug.jsonl" 2>/dev/null || true
  exit 1
fi

# SECURITY: if Claude CLI returned an auth/API error, the response can echo back
# the malformed Authorization header (i.e. the OAuth token itself). Never persist
# such content — abort early and notify admin without writing a file.
if echo "$REPORT" | head -c 200 | grep -qE "^(API Error:|Authentication error|Invalid API key|Bearer )"; then
  echo "$(date -Iseconds) API error response detected — refusing to persist (would leak credentials)"
  if [ -n "$NOTIFY_BOT_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${ADMIN_CHAT_ID}" --data-urlencode "text=📡 Radar — $DATE — API error (likely token issue). Run aborted to prevent credential leak. Check workflow logs (which are auto-redacted by GitHub) and rotate the OAuth token." > /dev/null 2>&1 || true
  fi
  exit 1
fi

echo "$REPORT" > "$REPORT_FILE"
echo "$(date -Iseconds) Report saved$([ "$TIMED_OUT" -eq 1 ] && echo " (partial — timeout recovery)")"

# === Parse JSON from response, dedup, append to DB ===
DB_RESULT=$(python3 -c "
import json, re, sys
from urllib.parse import urlparse, urlunparse
from urllib.request import urlopen, Request

def norm_url(u):
    p = urlparse(u.strip().rstrip('/'))
    host = p.hostname or ''
    if host.startswith('www.'):
        host = host[4:]
    return urlunparse(('https', host, p.path.rstrip('/'), '', '', ''))

def url_ok(u):
    try:
        req = Request(u, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        code = urlopen(req, timeout=8).status
        return 200 <= code < 400
    except:
        try:
            req = Request(u, method='GET', headers={'User-Agent': 'Mozilla/5.0'})
            code = urlopen(req, timeout=8).status
            return 200 <= code < 400
        except:
            return False

report = open('$REPORT_FILE').read()

new_items = []
obj_match = re.search(r'\{[\s\S]*\}', report)
if obj_match:
    try:
        obj = json.loads(obj_match.group())
        if isinstance(obj, dict):
            new_items = obj.get('items', [])
    except: pass
if not new_items:
    arr_match = re.search(r'\[[\s\S]*\]', report)
    if arr_match:
        try: new_items = json.loads(arr_match.group())
        except: pass
if not new_items:
    print(0); sys.exit(0)

with open('$DB_FILE') as f:
    raw = json.load(f)

if isinstance(raw, list):
    db_obj = {'_meta': {'tags': {}, 'types': {}}, 'items': raw}
else:
    db_obj = raw
db = db_obj.get('items', [])
meta = db_obj.get('_meta', {})
tag_meta = meta.setdefault('tags', {})

urls = {norm_url(i.get('url','')) for i in db if i.get('url')}
added = 0
added_urls = []
for item in new_items:
    url = item.get('url','')
    if url and norm_url(url) not in urls and url_ok(url):
        item['added'] = '$DATE'
        tag = item.get('tag', '')
        if tag and tag not in tag_meta:
            tag_meta[tag] = {
                'en': item.pop('tag_label_en', tag),
                'ru': item.pop('tag_label_ru', tag)
            }
        else:
            item.pop('tag_label_en', None)
            item.pop('tag_label_ru', None)
        db.append(item)
        urls.add(norm_url(url))
        added += 1
        added_urls.append(url)

db.sort(key=lambda x: x.get('date',''), reverse=True)
db_obj['items'] = db
with open('$DB_FILE', 'w') as f:
    json.dump(db_obj, f, ensure_ascii=False, indent=2)

print(added)
for u in added_urls: print(u)
" 2>/dev/null || echo "0")

ADDED_COUNT=$(echo "$DB_RESULT" | head -1)
ADDED_URLS=$(echo "$DB_RESULT" | tail -n +2)

echo "$(date -Iseconds) Added $ADDED_COUNT items"

# === Save algorithm review (full mode only) ===
if [ "$MODE" != "scout-only" ]; then
  REVIEWS_FILE="$REPORTS_DIR/reviews.json"
  python3 -c "
import json, re
report = open('$REPORT_FILE').read()
obj_match = re.search(r'\{[\s\S]*\}', report)
if not obj_match: exit()
try: obj = json.loads(obj_match.group())
except: exit()
if not isinstance(obj, dict): exit()
review = obj.get('review')
ideas = obj.get('radar_ideas', [])
if not review: exit()
review['date'] = '$DATE'
if ideas: review['radar_ideas'] = ideas
try:
    with open('$REVIEWS_FILE') as f: reviews = json.load(f)
except: reviews = []
reviews.append(review)
reviews = reviews[-20:]
with open('$REVIEWS_FILE', 'w') as f:
    json.dump(reviews, f, ensure_ascii=False, indent=2)
print(f'Review saved ({len(review.get(\"query_suggestions\", []))} suggestions, {len(ideas)} ideas)')
" 2>/dev/null || echo "$(date -Iseconds) Review save skipped"
fi

# === Update GitHub stars ===
STARS_UPDATED=$(python3 -c "
import json, re
from urllib.request import urlopen, Request

with open('$DB_FILE') as f:
    raw = json.load(f)
db_obj = raw if isinstance(raw, dict) and 'items' in raw else {'_meta': {}, 'items': raw}
db = db_obj['items']

updated = 0
for item in db:
    url = item.get('url', '')
    m = re.match(r'https?://github\.com/([^/]+/[^/]+)', url)
    if not m: continue
    repo = m.group(1)
    try:
        req = Request(f'https://api.github.com/repos/{repo}', headers={'User-Agent': 'radar-scout'})
        data = json.loads(urlopen(req, timeout=8).read())
        stars = data.get('stargazers_count', 0)
        if stars != item.get('stars', 0):
            item['stars'] = stars
            updated += 1
    except: pass

if updated:
    with open('$DB_FILE', 'w') as f:
        json.dump(db_obj, f, ensure_ascii=False, indent=2)

print(updated)
" 2>/dev/null || echo "0")

echo "$(date -Iseconds) Updated stars for $STARS_UPDATED repos"

# === Regenerate RSS feed ===
NEEDS_DEPLOY=0
[ "$ADDED_COUNT" -gt 0 ] 2>/dev/null && NEEDS_DEPLOY=1
[ "$STARS_UPDATED" -gt 0 ] 2>/dev/null && NEEDS_DEPLOY=1

if [ "$NEEDS_DEPLOY" -eq 1 ]; then
  python3 -c "
import json
from datetime import datetime, timezone
raw = json.load(open('$DB_FILE'))
db_obj = raw if isinstance(raw, dict) and 'items' in raw else {'_meta': {}, 'items': raw}
items = db_obj['items']
tag_meta = db_obj.get('_meta', {}).get('tags', {})
items.sort(key=lambda x: x.get('date',''), reverse=True)
rss = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n<channel>\n'
rss += '  <title>Radar — Diyor Khakimov</title>\n  <link>https://diyor.design/radar</link>\n'
rss += '  <description>Design × AI feed</description>\n  <language>en</language>\n'
rss += '  <atom:link href=\"https://diyor.design/feed.xml\" rel=\"self\" type=\"application/rss+xml\"/>\n'
rss += '  <lastBuildDate>' + datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S +0000') + '</lastBuildDate>\n'
for item in items[:20]:
    t = item.get('title','').replace('&','&amp;').replace('<','&lt;')
    u = item.get('url','')
    d = (item.get('desc_en','') or item.get('desc_ru','')).replace('&','&amp;').replace('<','&lt;')
    tag = item.get('tag','')
    cat = tag_meta.get(tag, {}).get('en', tag).replace('&','&amp;') if tag else ''
    try: pub = datetime.strptime(item.get('date',''), '%Y-%m-%d').strftime('%a, %d %b %Y 00:00:00 +0000')
    except: pub = ''
    rss += f'  <item>\n    <title>{t}</title>\n    <link>{u}</link>\n    <description>{d}</description>\n    <pubDate>{pub}</pubDate>\n    <guid>{u}</guid>\n'
    if cat: rss += f'    <category>{cat}</category>\n'
    rss += '  </item>\n'
rss += '</channel>\n</rss>'
open('$PROJECT_DIR/feed.xml','w').write(rss)
" 2>/dev/null || echo "$(date -Iseconds) RSS generation failed"
fi

# === Git commit + push ===
# CI: commit and push directly (no rate-limit hook, no Mac dance)
# Local: keep old "Monday-only" behavior to match historical rhythm
if [ "$NEEDS_DEPLOY" -eq 1 ]; then
  cd "$PROJECT_DIR"
  COMMIT_MSG="radar: +${ADDED_COUNT} articles"
  [ "$STARS_UPDATED" -gt 0 ] 2>/dev/null && COMMIT_MSG="$COMMIT_MSG, ${STARS_UPDATED} stars updated"
  COMMIT_MSG="$COMMIT_MSG ($DATE)"

  if [ -n "${CI:-}" ]; then
    # CI path: configure git identity if not set, commit all radar state changes
    git config user.name "${GIT_AUTHOR_NAME:-Radar Bot}" 2>/dev/null || true
    git config user.email "${GIT_AUTHOR_EMAIL:-radar-bot@users.noreply.github.com}" 2>/dev/null || true
    git add radar-db.json feed.xml agents/radar/reports/ 2>/dev/null || true
    if git diff --staged --quiet 2>/dev/null; then
      echo "$(date -Iseconds) No staged changes to commit"
    else
      git commit -m "$COMMIT_MSG" 2>&1 | tail -3
      git push origin "${GITHUB_REF_NAME:-main}" 2>&1 | tail -3
    fi
  else
    # Local path: Monday-only push (matches historical launchd cadence)
    if [ "$(date +%u)" -eq 1 ]; then
      git add radar-db.json feed.xml 2>/dev/null || true
      git commit -m "$COMMIT_MSG" 2>/dev/null || true
      git push origin main 2>/dev/null && echo "$(date -Iseconds) Pushed to git" || echo "$(date -Iseconds) Push failed"
    else
      echo "$(date -Iseconds) Data updated locally (+${ADDED_COUNT} articles, ${STARS_UPDATED} stars) — git commit deferred to Monday"
    fi
  fi
fi

# === Telegram — Radar Bot (public posts, NEW items only) ===
if [ -n "$RADAR_BOT_TOKEN" ] && [ "$ADDED_COUNT" -gt 0 ] 2>/dev/null; then
  python3 -c "
import json, re, urllib.request, urllib.parse, time, sys
from urllib.parse import urlparse, urlunparse

def norm_url(u):
    p = urlparse(u.strip().rstrip('/'))
    host = p.hostname or ''
    if host.startswith('www.'):
        host = host[4:]
    return urlunparse(('https', host, p.path.rstrip('/'), '', '', ''))

added_urls_raw = '''$ADDED_URLS'''.strip().splitlines()
added_urls = {norm_url(u) for u in added_urls_raw if u.strip()}
if not added_urls: sys.exit(0)

report = open('$REPORT_FILE').read()
items = []
obj_match = re.search(r'\{[\s\S]*\}', report)
if obj_match:
    try:
        obj = json.loads(obj_match.group())
        if isinstance(obj, dict): items = obj.get('items', [])
    except: pass
if not items:
    arr_match = re.search(r'\[[\s\S]*\]', report)
    if arr_match:
        try: items = json.loads(arr_match.group())
        except: pass

items = [i for i in items if i.get('url') and norm_url(i['url']) in added_urls]
if not items: sys.exit(0)

token = '$RADAR_BOT_TOKEN'
chat = '$RADAR_CHANNEL'

with open('$DB_FILE') as _f: _db = json.load(_f)
_meta = _db.get('_meta', {})
_type_meta = _meta.get('types', {})
_db_items = _db.get('items', _db) if isinstance(_db, dict) else _db
_db_by_url = {norm_url(i.get('url','')): i for i in _db_items if i.get('url')}

for item in items:
    title = item.get('title', '')
    url = item.get('url', '')
    desc = item.get('desc_en', '') or item.get('desc_ru', '')
    itype = item.get('type', 'article')
    tmeta = _type_meta.get(itype, {})
    emoji = tmeta.get('emoji', '📄')
    stars = item.get('stars', 0)

    lines = [f'<b>{title}</b>']
    if stars and stars >= 100:
        stars_str = f'{stars // 1000}.{(stars % 1000) // 100}k' if stars >= 1000 else str(stars)
        lines.append(f'⭐ {stars_str} GitHub Stars')
    if desc:
        lines.append(f'\n<blockquote>{desc}</blockquote>')
    text = '\n'.join(lines)

    cta = tmeta.get('cta', 'Open')
    inline_kb = json.dumps({'inline_keyboard': [[{'text': f'{cta} ↗', 'url': url}]]})
    link_preview = json.dumps({'url': url, 'show_above_text': False, 'prefer_large_media': True})

    data = urllib.parse.urlencode({
        'chat_id': chat,
        'text': text[:4000],
        'parse_mode': 'HTML',
        'reply_markup': inline_kb,
        'link_preview_options': link_preview,
    }).encode()

    try:
        req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendMessage', data)
        resp = json.loads(urllib.request.urlopen(req, timeout=10).read())
        if resp.get('ok'):
            msg_id = resp['result']['message_id']
            db_item = _db_by_url.get(norm_url(url))
            if db_item is not None: db_item['tg_message_id'] = msg_id
    except Exception as e:
        print(f'Telegram post failed: {e}')
    time.sleep(1.5)

with open('$DB_FILE', 'w') as _f:
    json.dump(_db, _f, ensure_ascii=False, indent=2)
" 2>/dev/null || echo "$(date -Iseconds) Radar bot posting failed"
  echo "$(date -Iseconds) Posted $ADDED_COUNT items to radar bot"
fi

# === LinkedIn draft generation ===
if [ "$ADDED_COUNT" -gt 0 ] 2>/dev/null && [ -x "$AGENT_DIR/gen-linkedin-draft.sh" ]; then
  bash "$AGENT_DIR/gen-linkedin-draft.sh" $ADDED_URLS 2>/dev/null || echo "$(date -Iseconds) LinkedIn drafts skipped"
fi

# === Telegram — Admin notification ===
if [ -n "$NOTIFY_BOT_TOKEN" ]; then
  TITLES=$(python3 -c "
import json, re
report = open('$REPORT_FILE').read()
items = []
review_summary = ''
ideas_summary = ''
obj_match = re.search(r'\{[\s\S]*\}', report)
if obj_match:
    try:
        obj = json.loads(obj_match.group())
        if isinstance(obj, dict):
            items = obj.get('items', [])
            review = obj.get('review', {})
            ideas = obj.get('radar_ideas', [])
            gaps = review.get('coverage_gaps', [])
            suggestions = review.get('query_suggestions', [])
            if gaps or suggestions:
                parts = []
                if gaps: parts.append(f\"Gaps: {', '.join(gaps[:3])}\")
                if suggestions: parts.append(f\"Suggestions: {len(suggestions)}\")
                review_summary = ' | '.join(parts)
            if ideas: ideas_summary = ', '.join(i.get('idea','')[:40] for i in ideas[:2])
    except: pass
if not items:
    arr_match = re.search(r'\[[\s\S]*\]', report)
    if arr_match:
        try: items = json.loads(arr_match.group())
        except: pass
if items:
    for i in items[:5]:
        p={'1':'🔴','2':'🟡'}.get(str(i.get('priority',2)),'🟡')
        print(f\"{p} {i.get('title','')[:60]}\")
else:
    print('No items parsed')
if review_summary: print(f\"\n🔍 {review_summary}\")
if ideas_summary: print(f\"💡 {ideas_summary}\")
" 2>/dev/null || echo "Parse error")

  NOTIFY="$(printf '📡 Radar — %s\n\n%s\n\n+%s added' "$DATE" "$TITLES" "$ADDED_COUNT")"
  curl -s -X POST "https://api.telegram.org/bot${NOTIFY_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ADMIN_CHAT_ID}" -d "disable_web_page_preview=true" \
    --data-urlencode "text=${NOTIFY:0:4000}" > /dev/null 2>&1 || true
fi

# === Buttondown weekly digest (Monday only) ===
if [ "$(date +%u)" -eq 1 ] && [ -x "$AGENT_DIR/send-digest.sh" ]; then
  bash "$AGENT_DIR/send-digest.sh" 2>/dev/null || echo "$(date -Iseconds) Buttondown digest skipped"
fi

echo "$(date -Iseconds) Radar complete"
curl -fsS --retry 3 "https://hc-ping.com/53ea74f6-fdf1-4320-ba06-dc81a0c82d23" >/dev/null 2>&1 || true
