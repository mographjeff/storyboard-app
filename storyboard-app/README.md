# frames — storyboard app

A motion graphics & commercial storyboard tool built with React, TanStack Start, and dnd-kit.

## features
- drag-and-drop frame reordering
- image upload per frame (click or drag-and-drop)
- auto-expanding text fields (voice over, action, + custom fields)
- reorderable sections per frame
- light / dark mode
- pdf export
- share modal

## local development

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

## deploying (free options)

### vercel (recommended — free tier, no credit card needed)
1. push this folder to a GitHub repo
2. go to vercel.com → "Add New Project" → import your repo
3. vercel auto-detects Vite — just click Deploy
4. done. you get a URL like `https://your-app.vercel.app`

### netlify (alternative)
1. push to GitHub
2. netlify.com → "Add new site" → import from Git
3. build command: `vite build`
4. publish directory: `dist/client`

### embed in Squarespace / Wix / Webflow
Once deployed, grab your URL and paste this into a custom code / HTML embed block:

```html
<iframe
  src="https://your-deployed-url.vercel.app"
  width="100%"
  height="850px"
  style="border:none; border-radius:12px;">
</iframe>
```

## project structure

```
src/
  routes/
    index.tsx     ← main app (all components live here)
    __root.tsx    ← html shell
  styles.css      ← tailwind import
```
