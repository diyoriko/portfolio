#!/bin/bash
# Post new radar items to Twitter/X
# Requires: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
# Called from run.sh after items are added to DB

set -uo pipefail

PROJECT_DIR="${PORTFOLIO_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DB_FILE="$PROJECT_DIR/radar-db.json"

# Load X credentials
X_API_KEY=""
X_API_SECRET=""
X_ACCESS_TOKEN=""
X_ACCESS_SECRET=""
[ -f "$HOME/.config/diyoriko/x-credentials.json" ] && {
  X_API_KEY=$(python3 -c "import json; print(json.load(open('$HOME/.config/diyoriko/x-credentials.json')).get('api_key',''))")
  X_API_SECRET=$(python3 -c "import json; print(json.load(open('$HOME/.config/diyoriko/x-credentials.json')).get('api_secret',''))")
  X_ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/.config/diyoriko/x-credentials.json')).get('access_token',''))")
  X_ACCESS_SECRET=$(python3 -c "import json; print(json.load(open('$HOME/.config/diyoriko/x-credentials.json')).get('access_secret',''))")
}

if [ -z "$X_API_KEY" ] || [ -z "$X_ACCESS_TOKEN" ]; then
  echo "$(date -Iseconds) X credentials not configured, skipping Twitter post"
  exit 0
fi

# URLs to post (passed as arguments or from stdin)
URLS="$*"
if [ -z "$URLS" ]; then
  echo "$(date -Iseconds) No URLs to post"
  exit 0
fi

python3 << PYEOF
import json, hmac, hashlib, time, urllib.request, urllib.parse, base64, uuid, sys

api_key = "$X_API_KEY"
api_secret = "$X_API_SECRET"
access_token = "$X_ACCESS_TOKEN"
access_secret = "$X_ACCESS_SECRET"

def percent_encode(s):
    return urllib.parse.quote(str(s), safe='')

def sign_request(method, url, params, consumer_secret, token_secret):
    sorted_params = '&'.join(f'{percent_encode(k)}={percent_encode(v)}' for k, v in sorted(params.items()))
    base_string = f'{method}&{percent_encode(url)}&{percent_encode(sorted_params)}'
    signing_key = f'{percent_encode(consumer_secret)}&{percent_encode(token_secret)}'
    signature = base64.b64encode(hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha256).digest()).decode()
    return signature

def post_tweet(text):
    url = 'https://api.x.com/2/tweets'

    oauth_params = {
        'oauth_consumer_key': api_key,
        'oauth_nonce': uuid.uuid4().hex,
        'oauth_signature_method': 'HMAC-SHA256',
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': access_token,
        'oauth_version': '1.0',
    }

    signature = sign_request('POST', url, oauth_params, api_secret, access_secret)
    oauth_params['oauth_signature'] = signature

    auth_header = 'OAuth ' + ', '.join(f'{percent_encode(k)}="{percent_encode(v)}"' for k, v in sorted(oauth_params.items()))

    body = json.dumps({'text': text}).encode()
    req = urllib.request.Request(url, data=body, headers={
        'Authorization': auth_header,
        'Content-Type': 'application/json',
    })

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        return data.get('data', {}).get('id', 'ok')
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f'Twitter API error: {e.code} {err[:200]}')
        return None

# Load DB
with open('$DB_FILE') as f:
    db = json.load(f)
items = db.get('items', [])
item_map = {i.get('url', '').rstrip('/'): i for i in items}

urls = "$URLS".strip().split()
posted = 0

for url in urls:
    item = item_map.get(url.rstrip('/'))
    if not item:
        continue

    title = item.get('title', '')
    desc = item.get('desc_en', '') or item.get('desc_ru', '')
    tag = item.get('tag', '')
    stars = item.get('stars', 0)

    # Build tweet text
    lines = [title]
    if desc:
        lines.append(desc)
    if stars and stars >= 1000:
        lines.append(f'GitHub ★ {stars // 1000}.{(stars % 1000) // 100}k')
    elif stars and stars >= 100:
        lines.append(f'GitHub ★ {stars}')
    lines.append(url)
    lines.append('')
    lines.append('diyor.design/radar')

    tweet = '\n'.join(lines)
    if len(tweet) > 280:
        tweet = f'{title}\n{url}\n\ndiyor.design/radar'

    tweet_id = post_tweet(tweet)
    if tweet_id:
        posted += 1
        print(f'  Posted: {title[:50]}')

    time.sleep(2)

print(f'Twitter: {posted} tweets posted')
PYEOF
