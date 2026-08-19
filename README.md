# drivingo-webapp

The authed web client for Drivingo, served at `app.drivingo.co.uk`. Everything sits behind login — there is no public/SEO surface here (that's [drivingo-website](https://drivingo.co.uk)).

The full spec — hard rules, auth design, sharing model, open decisions — lives in `CLAUDE.md`.

## Stack

- **Vite + React 19 + TypeScript** (exact versions pinned in `package.json`)
- **React Router v7** — data mode
- **Tailwind 4** via `@tailwindcss/postcss`
- **Firebase JS SDK** — auth, Firestore, callables pinned to `europe-west2`
- **TanStack Query** for server state
- **ESLint 9** flat config + `typescript@5`

## Getting started

```bash
npm install
cp .env.example .env   # fill in the Firebase web app config
npm run dev
```

`npm run build` type-checks then builds to `dist/`; `npm run lint` runs ESLint.

## Hosting (not wired yet)

Firebase Hosting multi-site on project `drivingo-app`: `app.drivingo.co.uk` → this repo, alongside `drivingo.co.uk` → drivingo-website. Both hosting targets should be set up together (the website is currently single-site); static build with SPA catch-all rewrite `**` → `/index.html`. `firebase.json` lands with that work.
