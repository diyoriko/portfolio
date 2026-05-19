#!/bin/bash
# Send weekly Radar digest to Telegram channel (@diyoriko_radar)
# Called from run.sh on Mondays, or standalone for dry-run preview.
#
# Usage:
#   ./send-weekly-tg.sh           — post to channel
#   DRY_RUN=1 ./send-weekly-tg.sh — print formatted HTML to stdout, no POST

set -uo pipefail

PROJECT_DIR="${PORTFOLIO_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DB_FILE="$PROJECT_DIR/radar-db.json"

RADAR_BOT_TOKEN=""
[ -f "$HOME/.config/diyoriko/radar-bot-token" ] && RADAR_BOT_TOKEN=$(cat "$HOME/.config/diyoriko/radar-bot-token")
RADAR_CHANNEL="${RADAR_CHANNEL_ID:-@diyoriko_radar}"

if [ -z "${DRY_RUN:-}" ] && [ -z "$RADAR_BOT_TOKEN" ]; then
  echo "$(date -Iseconds) Radar bot token not configured, skipping digest"
  exit 0
fi

export DB_FILE RADAR_BOT_TOKEN RADAR_CHANNEL DRY_RUN="${DRY_RUN:-}"
python3 << 'PYEOF'
import json, os, html, urllib.request, urllib.parse
from datetime import datetime, timedelta

db_file = os.environ["DB_FILE"]
token = os.environ.get("RADAR_BOT_TOKEN", "")
chat = os.environ.get("RADAR_CHANNEL", "@diyoriko_radar")
dry = bool(os.environ.get("DRY_RUN"))

raw = json.load(open(db_file))
items = raw.get("items", raw) if isinstance(raw, dict) else raw

now = datetime.now()
week_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
weekly = [i for i in items if (i.get("added", "") >= week_ago)]
weekly.sort(key=lambda x: (x.get("priority", 2), -(x.get("score", 0) or 0), -(x.get("stars", 0) or 0)))
top3 = weekly[:3]

if not top3:
    print("No items for digest")
    raise SystemExit(0)

def esc(s):
    return html.escape(str(s or ""))

def stars_label(s):
    if not s:
        return ""
    if s >= 1000:
        return f"{s // 1000}.{(s % 1000) // 100}k ★"
    if s >= 100:
        return f"{s} ★"
    return ""

def fmt_date(d):
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%b %d")
    except Exception:
        return ""

week_num = now.isocalendar()[1]
start = now - timedelta(days=6)
if start.month == now.month:
    range_str = f"{start.strftime('%b %-d')}–{now.strftime('%-d')}"
else:
    range_str = f"{start.strftime('%b %-d')}–{now.strftime('%b %-d')}"

SEP = "─" * 12
DOT = "  ·  "

lines = [f"📡 <b>Radar Weekly</b>{DOT}week {week_num}{DOT}{range_str}", ""]

for idx, item in enumerate(top3, 1):
    title = esc(item.get("title", ""))
    url = esc(item.get("url", ""))
    desc = esc(item.get("desc_en", "") or item.get("desc_ru", ""))
    itype = esc(item.get("type", ""))
    idate = fmt_date(item.get("date", ""))
    sl = stars_label(item.get("stars", 0))

    meta_bits = [b for b in [itype, idate, sl] if b]
    meta = DOT.join(meta_bits)

    if idx > 1:
        lines.append(SEP)
        lines.append("")

    lines.append(f'<b>{idx}</b>  <a href="{url}">{title}</a>')
    if meta:
        lines.append(f"<i>{meta}</i>")
    if desc:
        lines.append(f"<blockquote>{desc}</blockquote>")
    lines.append("")

lines.append(
    '<a href="https://diyor.design/radar">diyor.design/radar</a>'
    f'{DOT}<a href="https://buttondown.com/diyor">Email digest</a>'
)
text = "\n".join(lines)[:4000]

if dry:
    print(text)
    raise SystemExit(0)

payload = urllib.parse.urlencode({
    "chat_id": chat,
    "text": text,
    "parse_mode": "HTML",
    "link_preview_options": json.dumps({"is_disabled": True}),
}).encode()

try:
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", payload)
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    print(f"Weekly digest posted (message_id={data.get('result', {}).get('message_id', '?')})")
except Exception as e:
    print(f"Digest failed: {e}")
    raise SystemExit(1)
PYEOF
