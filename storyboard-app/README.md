# frames — storyboard app

> **Vercel fix applied** — the Netlify plugin has been removed and `vercel.json` added. Use this version for Vercel.

## deploying to Vercel

1. Push this folder to a GitHub repo (replace your old repo contents with these files)
2. In Vercel, go to your project → **Settings → General**
3. Set these:
   - **Build Command:** `vite build`
   - **Output Directory:** `.output/public`
   - **Framework Preset:** Other
4. Click **Redeploy** (or it will auto-deploy when you push to GitHub)

## local development

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

## embed in Squarespace / Wix / Webflow

```html
<iframe
  src="https://your-app.vercel.app"
  width="100%"
  height="850px"
  style="border:none; border-radius:12px;">
</iframe>
```
