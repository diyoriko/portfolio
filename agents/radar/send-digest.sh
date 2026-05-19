#!/bin/bash
# Send weekly Radar digest via Buttondown email (HTML template)
# Called from run.sh on Mondays (after weekly digest to Telegram)
# Requires: ~/.config/diyoriko/buttondown-api-key
# Template: mirrors diyor.design/radar visual language

set -uo pipefail

PROJECT_DIR="${PORTFOLIO_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DB_FILE="$PROJECT_DIR/radar-db.json"

BUTTONDOWN_KEY=""
[ -f "$HOME/.config/diyoriko/buttondown-api-key" ] && BUTTONDOWN_KEY=$(cat "$HOME/.config/diyoriko/buttondown-api-key")

if [ -z "${DRY_RUN:-}" ] && [ -z "$BUTTONDOWN_KEY" ]; then
  echo "$(date -Iseconds) Buttondown API key not configured, skipping digest"
  exit 0
fi

export DB_FILE BUTTONDOWN_KEY DRY_RUN="${DRY_RUN:-}"
python3 << 'PYEOF'
import json, urllib.request, os, html
from datetime import datetime, timedelta

db_file = os.environ["DB_FILE"]
api_key = os.environ.get("BUTTONDOWN_KEY", "")
dry = bool(os.environ.get("DRY_RUN"))

with open(db_file) as f:
    raw = json.load(f)
db_obj = raw if isinstance(raw, dict) and 'items' in raw else {'_meta': {}, 'items': raw}
items = db_obj.get('items', [])

# Items added in last 7 days
week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
weekly = [i for i in items if i.get('added', '') >= week_ago]
weekly.sort(key=lambda x: (x.get('priority', 2), -(x.get('stars', 0) or 0)))
top5 = weekly[:5]

if not top5:
    print("No items for digest")
    exit(0)

date_str = datetime.now().strftime('%B %d, %Y')
date_short = datetime.now().strftime('%b %d')

# --- Styles (inline, email-safe) ---
S = {
    'bg_outer': '#fef9ea',
    'bg': '#fef9ea',
    'text': '#222222',
    'dim': 'rgba(34,34,34,0.4)',
    'dim2': 'rgba(34,34,34,0.35)',
    'dim3': 'rgba(34,34,34,0.25)',
    'accent': '#F8401C',
    'line': 'rgba(34,34,34,0.1)',
    'line2': 'rgba(34,34,34,0.08)',
    'sans': "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif",
    'mono': "'SF Mono','Fira Code','Courier New',monospace",
}

def esc(s):
    return html.escape(s or '')

def stars_label(stars):
    if not stars: return ''
    if stars >= 1000:
        return f'{stars // 1000}.{(stars % 1000) // 100}k ★'
    if stars >= 100:
        return f'{stars} ★'
    return ''

# --- Build item rows (single-column, mobile-first) ---
item_rows = ''
for idx, item in enumerate(top5):
    title = esc(item.get('title', ''))
    url = esc(item.get('url', ''))
    desc = esc(item.get('desc_en', '') or item.get('desc_ru', ''))
    itype = esc(item.get('type', 'article'))
    idate = item.get('date', '')
    stars = item.get('stars', 0)
    sl = stars_label(stars)

    try:
        dt = datetime.strptime(idate, '%Y-%m-%d')
        date_fmt = dt.strftime('%b %d')
    except:
        date_fmt = idate[:10] if idate else ''

    meta_bits = [b for b in [itype, date_fmt, sl] if b]
    meta = '  &middot;  '.join(meta_bits)

    divider = ''
    if idx > 0:
        divider = f'''<tr><td style="padding:0 24px;">
          <div style="border-top:1px solid {S['line2']};"></div>
        </td></tr>'''

    item_rows += f'''{divider}
    <tr><td style="padding:24px 24px;">
      <div style="font-family:{S['mono']};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:{S['accent']};line-height:1.4;">
        {meta}
      </div>
      <a href="{url}" style="display:block;margin-top:10px;font-family:{S['sans']};font-size:22px;font-weight:500;color:{S['text']};text-decoration:none;line-height:1.25;letter-spacing:-0.01em;">
        {title}
      </a>
      <div style="margin-top:8px;font-family:{S['sans']};font-size:15px;color:{S['dim']};line-height:1.55;">
        {desc}
      </div>
    </td></tr>'''

# --- Full HTML email (mobile-first, single-column) ---
body_html = f'''<!-- buttondown-editor-mode: raw -->
<div style="background-color:{S['bg']};margin:0;padding:0;">
<table role="presentation" bgcolor="{S['bg']}" width="100%" cellpadding="0" cellspacing="0" style="background-color:{S['bg']};margin:0;padding:0;">
<tr><td bgcolor="{S['bg']}" align="center" style="background-color:{S['bg']};padding:24px 8px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:{S['bg']};margin:0 auto;">

    <!-- Header -->
    <tr><td style="padding:24px 24px 4px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:{S['sans']};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:{S['dim2']};">
            diyor.design/radar
          </td>
          <td align="right" style="font-family:{S['mono']};font-size:11px;color:{S['dim2']};white-space:nowrap;">
            {date_short}
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Title -->
    <tr><td style="padding:12px 24px 24px 24px;">
      <h1 style="margin:0;font-family:{S['sans']};font-size:32px;font-weight:500;color:{S['text']};letter-spacing:-0.02em;line-height:1.1;">
        Radar Weekly
      </h1>
      <p style="margin:10px 0 0 0;font-family:{S['sans']};font-size:15px;color:{S['dim']};line-height:1.5;">
        The best finds from the intersection of design, AI, and engineering this week.
      </p>
    </td></tr>

    <!-- Top divider -->
    <tr><td style="padding:0 24px;">
      <div style="border-top:1px solid {S['line']};"></div>
    </td></tr>

    <!-- Items -->
    {item_rows}

    <!-- Footer divider -->
    <tr><td style="padding:0 24px;">
      <div style="border-top:1px solid {S['line']};"></div>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:20px 24px 32px 24px;">
      <div style="font-family:{S['mono']};font-size:12px;color:{S['dim2']};line-height:1.8;">
        <a href="https://diyor.design/radar" style="color:{S['accent']};text-decoration:none;">diyor.design/radar</a>
        &nbsp;&middot;&nbsp;
        <a href="https://t.me/diyoriko_radar" style="color:{S['accent']};text-decoration:none;">Telegram</a>
        &nbsp;&middot;&nbsp;
        <a href="https://diyor.design/feed.xml" style="color:{S['accent']};text-decoration:none;">RSS</a>
      </div>
      <div style="margin-top:10px;font-family:{S['mono']};font-size:11px;color:{S['dim3']};line-height:1.5;">
        You received this because you subscribed at diyor.design/radar
      </div>
    </td></tr>

  </table>

</td></tr>
</table>
</div>'''

if dry:
    out = "/tmp/radar-digest-preview.html"
    wrap = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Radar Weekly preview</title></head><body style="margin:0;background:#888;">
<div style="display:flex;gap:24px;padding:24px;align-items:flex-start;flex-wrap:wrap;">
  <div><div style="font:12px/1 monospace;color:#fff;margin-bottom:6px;">mobile · 375px</div>
    <div style="width:375px;background:{S['bg']};">{body_html}</div></div>
  <div><div style="font:12px/1 monospace;color:#fff;margin-bottom:6px;">desktop · 640px</div>
    <div style="width:640px;background:{S['bg']};">{body_html}</div></div>
</div></body></html>"""
    with open(out, "w") as f:
        f.write(wrap)
    print(f"Preview written: {out}")
    raise SystemExit(0)

# Send via Buttondown API (raw HTML)
subject = f"Radar Weekly — {date_str}"

payload = json.dumps({
    "subject": subject,
    "body": body_html,
    "status": "about_to_send"
}).encode()

req = urllib.request.Request(
    "https://api.buttondown.com/v1/emails",
    data=payload,
    headers={
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
        "X-Buttondown-Live-Dangerously": "true",
    }
)

try:
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read())
    print(f"Digest sent: {data.get('id', 'ok')} ({len(top5)} items)")
except urllib.error.HTTPError as e:
    err = e.read().decode()
    print(f"Buttondown API error: {e.code} {err[:300]}")
except Exception as e:
    print(f"Buttondown error: {e}")
PYEOF
