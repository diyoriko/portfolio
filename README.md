# Portfolio

Vanilla HTML/CSS/JS portfolio template. No frameworks, no dependencies, no build tools.

**Demo:** [diyor.design](https://diyor.design)

## Features

- Bilingual (RU/EN) with language switcher
- Responsive (mobile-first)
- Case study pages with image grids
- Design × AI radar (curated feed with filters)
- RSS feed
- SEO: meta tags, Open Graph, JSON-LD, sitemap
- Analytics ready (GoatCounter)
- Terminal easter egg
- Lighthouse 95+

## Use as template

### 1. Create your repo

Click **"Use this template"** on GitHub, or fork the repo.

### 2. Edit config

Open `config.json` and fill in your details:

```json
{
  "domain": "yourname.com",
  "name_ru": "Ваше Имя",
  "name_en": "Your Name",
  "username": "yourusername",
  "email": "you@email.com",
  "job_title_ru": "Дизайнер",
  "job_title_en": "Designer",
  "telegram": "yourusername",
  "telegram_radar": "yourusername_radar",
  "github": "yourusername",
  "linkedin": "yourusername",
  "instagram": "yourusername",
  "goatcounter": "yourusername",
  "location_ru": "Город, Страна",
  "location_en": "City, Country"
}
```

### 3. Run setup

```bash
chmod +x setup.sh
./setup.sh
```

This replaces all personal details across 46 files: domain, name, socials, analytics, meta tags, JSON-LD, CNAME, sitemap, RSS feed, radar data.

Requires [jq](https://jqlang.github.io/jq/): `brew install jq`

### 4. Add your content

- Replace case studies in `projects/` and `en/projects/`
- Replace images in `assets/img/cases/`
- Update `about.html` and `en/about.html` with your bio
- Add your projects to `sitemap.xml`

### 5. Deploy

```bash
git add . && git commit -m "personalize" && git push
```

GitHub Pages auto-deploys from `main`.

## Stack

- HTML5 (semantic, accessible)
- CSS3 (custom properties, grid, flexbox)
- Vanilla JS
- GitHub Pages

## Structure

```
index.html          — home
about.html          — about
radar.html          — curated feed
projects/           — case studies (RU)
en/                 — English versions
assets/img/         — images
assets/fonts/       — custom fonts
styles.css          — source styles
styles.min.css      — minified (production)
script.js           — source scripts
script.min.js       — minified (production)
radar-db.json       — radar feed data
config.json         — template config
setup.sh            — template setup script
```

## License

MIT
