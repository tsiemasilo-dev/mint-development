# Mint Auth (React + Vite)

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

## Notes

- This project uses Vite + React with Tailwind CSS built through PostCSS.
- The Vite base path is configured to `./` so static assets resolve on both GitHub Pages and Vercel. If you need a fixed base URL, update `vite.config.js`.
- Ensure `public/assets/fonts/future-earth.ttf` exists in the repo; it is required for the branded font to load correctly.

## TruID Step 1 (Bank Connect)

The TruID Step 1 flow is available from the Credit Apply screen. It uses serverless API routes under `/api/banking/*`.

### Server environment variables

Copy the template and populate it in your server runtime (Vercel, Netlify, or your Node host):

```bash
cp .env.server.example .env.server.local
```

### Required backend routes

- `/api/banking/initiate`
- `/api/banking/status`
- `/api/banking/all`
- `/api/banking/capture`
