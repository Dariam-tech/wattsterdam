# Wattsterdam

Static site, no build step. Two pages so far:
- `/index.html` — homepage
- `/tools/connection-check/index.html` — connection capacity calculator

## Deploy (GitHub + Vercel)

```bash
# from inside this folder
git init
git add .
git commit -m "Initial commit: homepage + connection check tool"
gh repo create wattsterdam --public --source=. --remote=origin --push
# (or manually: create an empty repo on github.com first, then)
# git remote add origin git@github.com:YOUR_USERNAME/wattsterdam.git
# git branch -M main
# git push -u origin main
```

Then on vercel.com:
1. "Add New Project" → Import the `wattsterdam` GitHub repo
2. Framework Preset: select **Other** (it's plain static HTML, no framework needed)
3. Leave Build Command / Output Directory blank
4. Deploy

You'll get a live URL like `wattsterdam.vercel.app` within ~30 seconds.

## Connect the real domain (after first deploy)

In the Vercel project → Settings → Domains → add `wattsterdam.nl`.
Vercel will show you the exact DNS records to add in TransIP's DNS panel
(usually an A record for the root domain + a CNAME for `www`). Add those in
TransIP, wait a few minutes for propagation, done.

## Adding new tools later

Same pattern: `tools/[tool-name]/index.html` → commit → push.
Vercel auto-deploys every push to `main`. No manual redeploy step.
