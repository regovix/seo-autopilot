# Regovix SEO Autopilot 🚀

AI-powered SEO content engine built on Claude + Netlify Functions.
Generates, optimises, and publishes travel blog posts automatically.

## What it does

- 🔍 **Keyword Research** — Claude finds 10 low-competition long-tail keywords for any topic
- ✍️ **Content Generation** — Full 800–2,500 word SEO blog posts with H1/H2/meta/FAQ/CTA
- 🚀 **Ghost CMS Publishing** — Pushes posts live via Ghost Admin API
- 📅 **Daily Autopilot** — Scheduled Netlify function runs the full pipeline every morning
- 📊 **Dashboard** — Full control panel to manage everything

## Deploy to Netlify in 5 minutes

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial SEO Autopilot"
git remote add origin https://github.com/YOUR_USERNAME/seo-autopilot
git push -u origin main
```

### 2. Connect to Netlify
- Go to app.netlify.com → Add new site → Import from GitHub
- Select your repo
- Build command: (leave empty)
- Publish directory: `public`
- Functions directory: `netlify/functions`

### 3. Add Environment Variables
In Netlify → Site Settings → Environment Variables, add:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... | Required — you already have this |
| `GHOST_URL` | https://your-ghost.com | Optional — for auto-publishing |
| `GHOST_ADMIN_API_KEY` | id:secret | Optional — from Ghost Admin → Integrations |
| `SITE_URL` | madrammilsanai.regovix.com | Optional |
| `SITE_NAME` | Madram Milsan AI | Optional |

### 4. Enable Daily Autopilot
Add to `netlify.toml`:
```toml
[functions.autopilot-scheduler]
schedule = "0 22 * * *"
```
This runs daily at 10pm UTC = 8am AEST.

## Setting up Ghost CMS (free, optional)

Ghost is a free open-source CMS you can self-host or use Ghost(Pro).

**Quickest option — Ghost on Railway.app (free tier):**
1. Go to railway.app → New Project → Deploy Ghost
2. Your Ghost URL will be something like https://ghost-xxx.railway.app
3. Go to Ghost Admin → Settings → Integrations → Add Custom Integration
4. Copy the Admin API Key (format: `id:secret`)
5. Add both as Netlify environment variables

**Or add a blog section to your existing Regovix site:**
- Ghost can run as a subdomain: blog.madrammilsanai.regovix.com
- Point a CNAME record to your Ghost instance

## File Structure
```
seo-autopilot/
├── netlify/
│   └── functions/
│       ├── keyword-research.js      # Finds SEO keywords via Claude
│       ├── generate-content.js      # Writes full blog posts via Claude  
│       ├── publish-to-ghost.js      # Publishes to Ghost CMS
│       └── autopilot-scheduler.js  # Daily pipeline (scheduled)
├── public/
│   └── index.html                   # Full dashboard UI
├── netlify.toml                     # Netlify config + scheduler
├── package.json
└── README.md
```

## API Endpoints

| Endpoint | Method | Body |
|---|---|---|
| `/.netlify/functions/keyword-research` | POST | `{topic, niche}` |
| `/.netlify/functions/generate-content` | POST | `{keyword, title, siteName, siteUrl, wordCount}` |
| `/.netlify/functions/publish-to-ghost` | POST | `{post, publishImmediately}` |
| `/.netlify/functions/autopilot-scheduler` | POST | `{}` |

## Extending into a SaaS Product (Regovix App 13)

To turn this into a multi-tenant product:
1. Add Supabase auth (users table, posts table, sites table)
2. Add per-user site configuration stored in Supabase
3. Add a topic queue editor UI
4. Add Stripe billing ($29/$59/$99 tiers)
5. Add WordPress publisher function alongside Ghost
6. Add auto-promotion: LinkedIn API + Pinterest API post-publish

## Estimated running cost

| Usage | Cost/month |
|---|---|
| 30 posts × ~3,000 tokens each | ~$0.30 (Claude claude-sonnet-4-6) |
| Netlify Functions | Free tier covers 125K invocations |
| Ghost CMS | Free (self-hosted) |
| **Total** | **< $1/month** |
