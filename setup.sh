#!/bin/bash
# Portfolio template setup — replaces personal details from config.json
# Usage: edit config.json with your info, then run ./setup.sh

set -e

CONFIG="config.json"

if [ ! -f "$CONFIG" ]; then
  echo "Error: config.json not found"
  exit 1
fi

# Check for jq
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install: brew install jq"
  exit 1
fi

# Read config
DOMAIN=$(jq -r '.domain' "$CONFIG")
NAME_RU=$(jq -r '.name_ru' "$CONFIG")
NAME_EN=$(jq -r '.name_en' "$CONFIG")
USERNAME=$(jq -r '.username' "$CONFIG")
EMAIL=$(jq -r '.email' "$CONFIG")
JOB_RU=$(jq -r '.job_title_ru' "$CONFIG")
JOB_EN=$(jq -r '.job_title_en' "$CONFIG")
TG=$(jq -r '.telegram' "$CONFIG")
TG_RADAR=$(jq -r '.telegram_radar' "$CONFIG")
GH=$(jq -r '.github' "$CONFIG")
LI=$(jq -r '.linkedin' "$CONFIG")
IG=$(jq -r '.instagram' "$CONFIG")
GC=$(jq -r '.goatcounter' "$CONFIG")
LOC_RU=$(jq -r '.location_ru' "$CONFIG")
LOC_EN=$(jq -r '.location_en' "$CONFIG")

# Original values (what we're replacing FROM)
O_DOMAIN="diyor.design"
O_NAME_RU="Диёр Хакимов"
O_NAME_EN="Diyor Khakimov"
O_USERNAME="diyoriko"
O_EMAIL="diyor.khakimov@gmail.com"
O_JOB_RU="Продуктовый и бренд-дизайнер"
O_JOB_EN="Product & Brand Designer"
O_LOC_RU="Каш, Турция"
O_LOC_EN="Kaş, Turkey"

# Skip if config still has original values
if [ "$DOMAIN" = "$O_DOMAIN" ] && [ "$USERNAME" = "$O_USERNAME" ]; then
  echo "config.json still has default values. Edit it first."
  exit 1
fi

echo "Setting up portfolio for: $NAME_EN ($DOMAIN)"
echo ""

# Collect all target files (HTML, JS, CSS, XML, txt, CNAME, json)
FILES=$(find . -type f \( \
  -name "*.html" -o -name "*.js" -o -name "*.css" \
  -o -name "*.xml" -o -name "*.txt" -o -name "CNAME" \
  \) ! -path "./.git/*" ! -path "./node_modules/*")

replace() {
  local from="$1"
  local to="$2"
  local label="$3"

  if [ "$from" = "$to" ]; then return; fi

  local count=0
  for f in $FILES; do
    if grep -q "$from" "$f" 2>/dev/null; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|${from}|${to}|g" "$f"
      else
        sed -i "s|${from}|${to}|g" "$f"
      fi
      count=$((count + 1))
    fi
  done
  if [ "$count" -gt 0 ]; then
    echo "  ✓ $label — $count files"
  fi
}

echo "Replacing personal details..."

# Order matters: replace specific strings before generic ones

# GoatCounter (before username, since it contains username)
replace "${O_USERNAME}.goatcounter.com" "${GC}.goatcounter.com" "GoatCounter"

# Email (before username)
replace "$O_EMAIL" "$EMAIL" "Email"

# Social links (before generic username)
replace "t.me/${O_USERNAME}_radar" "t.me/${TG_RADAR}" "Telegram Radar"
replace "t.me/${O_USERNAME}" "t.me/${TG}" "Telegram"
replace "@${O_USERNAME}" "@${TG}" "Telegram @handle"
replace "github.com/${O_USERNAME}" "github.com/${GH}" "GitHub"
replace "linkedin.com/in/${O_USERNAME}" "linkedin.com/in/${LI}" "LinkedIn"
replace "instagram.com/${O_USERNAME}" "instagram.com/${IG}" "Instagram"

# Domain (before names, since names might appear in domain-like contexts)
replace "$O_DOMAIN" "$DOMAIN" "Domain"

# Names
replace "$O_NAME_RU" "$NAME_RU" "Name (RU)"
replace "$O_NAME_EN" "$NAME_EN" "Name (EN)"

# Job titles
replace "$O_JOB_RU" "$JOB_RU" "Job title (RU)"
replace "$O_JOB_EN" "$JOB_EN" "Job title (EN)"

# Location
replace "$O_LOC_RU" "$LOC_RU" "Location (RU)"
replace "$O_LOC_EN" "$LOC_EN" "Location (EN)"

# CNAME
echo "$DOMAIN" > CNAME
echo "  ✓ CNAME"

# Reset radar feed to empty starter
echo ""
echo "Resetting radar & feeds..."

cat > radar-db.json << 'RADAR'
{
  "_meta": {
    "tags": {
      "tools": { "en": "Tools", "ru": "инструменты" },
      "articles": { "en": "Articles", "ru": "статьи" }
    },
    "types": {
      "article": { "en": "Articles", "en_s": "article", "ru": "статьи", "ru_s": "статья", "emoji": "📄", "cta": "Read" },
      "tool": { "en": "Tools", "en_s": "tool", "ru": "инструменты", "ru_s": "инструмент", "emoji": "🔧", "cta": "Try it" }
    }
  },
  "items": []
}
RADAR
echo "  ✓ radar-db.json — reset to empty"

# Reset RSS feed
cat > feed.xml << FEED
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Radar — ${NAME_EN}</title>
  <link>https://${DOMAIN}/radar</link>
  <description>Curated feed</description>
  <language>en</language>
  <atom:link href="https://${DOMAIN}/feed.xml" rel="self" type="application/rss+xml"/>
</channel>
</rss>
FEED
echo "  ✓ feed.xml — reset"

# Reset sitemap with core pages only
cat > sitemap.xml << SITEMAP
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://${DOMAIN}/</loc><priority>1.0</priority></url>
  <url><loc>https://${DOMAIN}/about</loc><priority>0.8</priority></url>
  <url><loc>https://${DOMAIN}/radar</loc><priority>0.8</priority></url>
  <url><loc>https://${DOMAIN}/en/</loc><priority>1.0</priority></url>
  <url><loc>https://${DOMAIN}/en/about</loc><priority>0.8</priority></url>
  <url><loc>https://${DOMAIN}/en/radar</loc><priority>0.8</priority></url>
</urlset>
SITEMAP
echo "  ✓ sitemap.xml — reset to core pages"

echo ""
echo "Done!"
echo ""
echo "Next steps:"
echo "  1. Replace case studies in projects/ and en/projects/ with your own"
echo "  2. Replace images in assets/img/cases/ with your work"
echo "  3. Update about.html and en/about.html with your bio"
echo "  4. Add your projects to sitemap.xml"
echo "  5. Review: git diff"
echo "  6. Deploy: git add . && git commit -m 'personalize' && git push"
