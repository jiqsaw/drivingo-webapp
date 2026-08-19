# CLAUDE.md — drivingo-webapp

## What this is

The **authed web client** for Drivingo, served at **`app.drivingo.co.uk`**. A standalone React app whose job is to put the AI coach (and whatever practice surface we scope into it) in a browser, for users who are not on iOS or Android.

Not to be confused with its two siblings:

| Repo | Surface | Nature |
|---|---|---|
| `drivingo-website` | `drivingo.co.uk` | public, static, SEO + app promotion |
| **`drivingo-webapp`** (here) | `app.drivingo.co.uk` | **authed, behind login, no public surface** |
| `drivingo-app` | iOS / Android | Expo React Native, bundle `app.drivingo` |

**Status: scaffolded 2026-08-19** — Vite + React 19 + TS per the stack table below, pushed to `github.com/jiqsaw/drivingo-webapp`. Placeholder routes only; no auth, no features, no hosting config yet. The architecture decision behind it is logged in `../ROADMAP.md`.

## Why this is a separate app and not an Expo web export

Decided 2026-08-18 — **do not re-litigate this, and never introduce React Native here.**

The native app's stack is native-only at exactly the layers a web build would need: React Native Firebase v22 (web needs the Firebase **JS** SDK), `react-native-purchases` (web needs RevenueCat Web Billing / Stripe), `@react-native-google-signin` and `expo-apple-authentication` (web needs browser OAuth flows). Sharing one codebase would mean `Platform.OS` branches through auth, payments, storage and video — inheriting React Native's constraints *and* the browser's, plus a permanent abstraction layer over every SDK without a real web story.

The split is cheap because the backend is already client-agnostic: coach logic is deterministic server-side code behind thin `onCall` wrappers, so this client calls the same functions the native app does. **`drivingo-backend` needs no changes to serve this repo.**

## Hard rules

1. **This client renders and calls; it never decides.** Mastery, scheduling, gating, streaks, credit/minute accounting and nudge timing are server-side in `../drivingo-backend/functions/src/coach/`. Never reimplement or mirror that logic here — if a number needs computing, a callable computes it.
2. **Firebase JS SDK only** — never `@react-native-firebase`. Callables are in **`europe-west2`**; set the region explicitly or every call 404s.
3. **No secrets in the client.** API keys for model providers live in the backend's `defineSecret` config. Live/voice coach connects by WebRTC using an **ephemeral token minted by `mintRealtimeSession`** — the client never holds a provider key.
4. **Entitlements are cross-platform and server-owned.** Web purchases go through the **same RevenueCat project and webhook** as mobile, landing in the same top-level `entitlements/{appUserId}` doc, so one subscriber has one entitlement wherever they bought. Never write entitlement state from the client; `firestore.rules` allowlists client-writable coach fields and this client is bound by the same rules as the app.
5. **The whole app is behind login.** DVSA bank questions must never be republished verbatim on the public web (licensing — see `../drivingo-website/CLAUDE.md` rule 7). There is therefore **no SEO surface here**; all SEO lives in `drivingo-website`.
6. **Do NOT reproduce the app's frozen Redux/persist shape.** That freeze exists solely for the legacy→native migration path. This client has no migration burden and should use whatever state management is natural for it.
7. **Content-display rules (same as the app, product-level not platform-level):** official source data — questions, options, explanations, HC rules — renders **complete and VERBATIM**, never trimmed or paraphrased by UI. Bilingual display applies ONLY to source data: English primary + selected-language translation beneath (per option line too), because the real exam is English-only. Coach chat bubbles are selected-language only, natural non-verbatim voice, never duplicated in English.
8. **Hazard perception is never part of the AI coach** — same separation as the native app.

## Stack (decided 2026-08-19 — don't re-litigate)

**Vite + React 19 + TypeScript.** Not Next.js. The app is entirely behind login, so there is no SEO surface and no SSR/ISR/API-route value to buy; under `output: 'export'` Next switches most of its value off anyway while still charging for the App Router's server/client component boundary in an app where every component is a client component. Vite's dev loop is faster, which is what matters while iterating on coach UX.

| Layer | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Routing | **React Router 7** (data mode) — mature and boring; not TanStack Router. v8 is blocked (decided 2026-08-19): every 8.x declares `peer react >=19.2.7`, unsatisfiable while Expo SDK 57 pins react `19.2.3` (see Toolchain). Bump to the current major the moment the app's react passes 19.2.7 — the data-mode API is compatible, so it should be a version-bump-only change |
| Styling | Tailwind 4 via `@tailwindcss/postcss` — same setup as `drivingo-website`, bundler-agnostic, config copies across |
| Backend access | **Firebase JS SDK** — auth, firestore, functions. Never `@react-native-firebase` |
| Region | Callables pinned to **`europe-west2`** — set it explicitly or every call 404s |
| Server state | TanStack Query suggested (not mandated). **No Redux** — see hard rule 6 |
| Payments | RevenueCat Web Billing (`@revenuecat/purchases-js`) / Stripe — wire at monetization, not at scaffold |
| Lint/format | **Biome** — same config as `drivingo-app`. Not ESLint |
| React · TypeScript · Biome | **Exact versions come from `../drivingo-app/CLAUDE.md` → "Toolchain versions".** Do not pin here |
| Hosting | Firebase Hosting, static build, SPA catch-all rewrite `**` → `/index.html` |

No server tier at any point: the client holds no secrets, the callables do.

### Tooling aligns with `drivingo-app`, not `drivingo-website` (decided 2026-08-19)

The webapp and the native app are **one product on two platforms** — same domain vocabulary, feature names, component names and backend contracts. Code and concepts move between them, so identical formatting and file naming keeps diffs readable and makes a file copy-and-adjust rather than copy-and-reformat. The website shares almost no vocabulary with either client and stays **deliberately independent** (Next 16 + `eslint-config-next` + TS 5) — its lint config is Next-specific and inapplicable to a Vite SPA regardless.

Note this supersedes an earlier "match the website" line. That reasoning leaned on the Tailwind config transferring, which is true but irrelevant: Tailwind 4 is PostCSS/CSS-based and independent of the linter.

Copy `drivingo-app/biome.json` and adjust only the `files.includes` ignores (drop `ios`/`android`/`.expo`, keep `dist`). The settings that must match:

- 4-space indent, **120** line width, LF endings
- single quotes in JS/TS, **double** quotes in JSX, semicolons always, trailing commas `all`
- `organizeImports` assist on, `recommended` lint preset
- **kebab-case filenames**
- `@`-prefixed path aliases in `tsconfig.json` (the app uses `@ui/*`, `@features/*`, `@theme/*`, `@global/*` — mirror the convention, not the exact list)

**Only four packages are shared** between the two repos: `react`, `@types/react`, `typescript`, `@biomejs/biome`. Everything else is platform-specific and independently versioned — `expo`/`react-native` exist only in the app, `vite`/`react-router`/`tailwind`/`firebase` only here, and the two use different Firebase packages entirely.

For those four, **`drivingo-app` is the source of truth** and its `CLAUDE.md` holds the canonical table. The app governs because **Expo SDK constrains React and React Native** — the webapp must never force a version Expo doesn't support. Upgrading any of the four is an app-and-webapp-together decision, driven by what the Expo SDK allows. React Router is not one of the four, but it is still transitively Expo-constrained: its peer range on `react` must be satisfiable by the table's react pin (this is what blocks v8 today — see the stack table's Routing row).

⚠️ If the scaffolding thread already installed ESLint + TS 5 from the previous version of this file, switch it now. Redoing lint setup is trivial today and annoying once there's application code to reformat.

---

## Authentication (login is built first)

Four methods, modelled on the Revolut Business login: **email magic link · Google · Apple · QR code from the native app.**

### The rule that outranks the others

**One account per email, and the web uid MUST be the same uid as the native app.** Coach data is uid-keyed (`coach/{uid}` and its subcollections), so a user who signs in with Google on the phone and a magic link on the web has to land on one uid or their entire coach history silently forks. Handle `auth/account-exists-with-different-credential` by **linking** the provider to the existing account, never by creating a second one.

### Google
`signInWithPopup` with `GoogleAuthProvider` (redirect fallback for blocked popups). Different mechanism from the app's native `signInWithCredential`, same resulting uid.

### Apple — the subtle one
`signInWithPopup` with `OAuthProvider('apple.com')`. Web Apple sign-in needs a **Services ID**, a configured return URL and domain verification — it does not come free with the iOS app's Apple sign-in.

⚠️ **Configure the Services ID inside the same Apple Developer team with the iOS App ID as its primary App ID.** Apple's `sub` is stable per team/primary-App-ID grouping, and Firebase derives the uid from it. Get this wrong and every existing Apple user gets a **second account** on web — with Hide My Email relay addresses making it near-impossible to reconcile afterwards. Verify with a real existing Apple account before launch, not a fresh one. Tracked in `../ACCOUNTS.md`.

### Email magic link — decided 2026-08-19

**Use Firebase's built-in mechanism.** Client-side `sendSignInLinkToEmail` + `signInWithEmailLink`. **No callable, no Admin-SDK link generation, no custom send path** — Firebase keeps its own abuse protection and there is no endpoint of ours to rate-limit. Do not build the backend route unless a listed trigger below actually forces it.

**Emails are UK English only.** No localization, not even for the 37 curated bank languages. It is one short functional email with a button, and the product is English-first by nature (the DVSA test is English-only; the app renders official source data in English with translation as a subtitle). British English spelling, matching the content repo's house rule.

**The two settings that keep it out of spam** — the default configuration is the risk, not the mechanism:

1. **Sender domain.** Firebase defaults to `noreply@drivingo-app.firebaseapp.com` — Google-owned, shared across every Firebase project, impossible to authenticate as ours, and visibly untrustworthy on a paid product's login. Point Authentication → Templates at **Resend's SMTP** so mail leaves as `@drivingo.co.uk` under our own SPF/DKIM/DMARC.
2. **Action link domain.** The link defaults to `firebaseapp.com/__/auth/action`. A login link on a domain that isn't ours reads as phishing to users *and* to filters, which score link domains alongside senders. Use the template editor's **custom action URL** and point it at `app.drivingo.co.uk` (already Firebase Hosting, so no new infrastructure).

⚠️ **Verify first:** confirm custom SMTP configuration is available on this project under Authentication → Templates. On some tiers it sits behind **Identity Platform** rather than plain Firebase Auth. This check decides the path — if SMTP customization is unavailable, the choice becomes upgrade to Identity Platform, or fall back to the backend-callable + Resend API route, because the `firebaseapp.com` sender does not meet the deliverability bar.

Other requirements:
- `app.drivingo.co.uk` must be in Firebase Auth's **authorized domains**.
- `actionCodeSettings.handleCodeInApp: true`, `url` on an authorized domain. Stash the email in `localStorage` before sending so same-device completion doesn't re-prompt; cross-device opens require re-entering it.
- **No Firebase Dynamic Links** (deprecated, banned in `../drivingo-website/CLAUDE.md`) — never needed for web-only email link sign-in.
- Keep the template plain: no images, no tracking pixels, minimal links. Firebase's default already is.

**Triggers to revisit** (move to a backend callable + Resend API only if one lands): branded or per-language emails become a real requirement · delivery webhooks/analytics are needed · SMTP customization turns out to be unavailable. Migration is non-breaking — auth model, uids, existing accounts, domain and DNS records all stay identical.

**Separate track, don't conflate:** replacing the legacy Gmail/nodemailer transactional mail (see `../ACCOUNTS.md`) needs a real Resend send module in `drivingo-backend` regardless. Those are product emails, not auth emails. That work does not drag magic link with it.

### QR code login — spec it exactly

⚠️ **Gated on the native v2 app.** This needs a Universal Link / App Link handler and a confirmation screen inside `drivingo-app`, which doesn't exist yet, and the legacy Ionic app is frozen and will never get one. **QR login cannot ship before the native v2 app does** — build the web side behind a flag, or schedule it after. Do not let it block login v1.

Firebase Auth has no cross-device login primitive, so this is ours to build:

1. Web calls `createLoginSession()` → `{ sessionId, secret }`. The **`secret` never leaves the web client**; only `sessionId` goes into the QR. Someone who photographs the screen therefore cannot redeem the session.
2. QR encodes a Universal/App Link (`https://app.drivingo.co.uk/link?s=<sessionId>`) so the phone camera opens the native app directly.
3. The app — already signed in — shows an explicit confirmation screen naming the requesting browser/OS and approximate location, then calls `approveLoginSession(sessionId)` with its own auth token.
4. Web is listening on `loginSessions/{sessionId}`, which carries **status only, never a token**. On `approved` it calls `redeemLoginSession(sessionId, secret)`.
5. Server validates secret + pending + unexpired, marks the session consumed, and returns a custom token from `admin.auth().createCustomToken(uid)`.
6. Web calls `signInWithCustomToken`.

Non-negotiables: TTL 60–120s · single-use, invalidated on redeem · rate-limited creation · **never auto-approve on deep-link open**. The confirmation screen is the entire security model — the standard attack is tricking someone into approving a QR displayed on the *attacker's* screen, so it must read as "you are granting access to this device", not "tap to continue".

---

## Sharing model (decided — no shared package)

No monorepo and no shared npm package. The established workspace pattern applies:

- **Generated / changing → export it.** Content (banks, translations, signs, HC) arrives from `../drivingo-content` as committed, reviewable files via an `export:webapp` script — the same shape as its existing `export:app` / `export:coach` / `export:blog`. *(Script not written yet.)* Decide at that point whether the browser bundles a **subset** rather than the full offline payload the native app ships.
- **Small / stable → duplicate.** Design tokens and UI copy are copied, not imported — the values are frozen (from the legacy `variables.scss`) and the two clients consume them incompatibly anyway. Matches the backend's existing "types are duplicated, never imported" rule.
- **Server-owned → not shared at all.** See hard rule 1.
- **Never shared:** UI components, platform SDK wrappers.

Callable request/response contracts are the one thing that will genuinely drift now that two clients consume them. Planned mitigation: an `export:types` from the backend's zod schemas into both clients as committed files, so drift shows up as a diff. Add it when this repo starts, not before.

## Open decisions (settle before scaffolding)

- **Scope — the big one.** Coach-only (chat thread, sessions, credits/minutes, live voice) is a bounded project. Coach **plus** full theory-test practice (test flow, review, signs, analysis) is most of the native app's feature scope built a second time. Nothing else here can be estimated until this is fixed.
- **Store-steering rules.** Honoring a web-purchased subscription inside the native app is uncontroversial; *advertising* web checkout from inside the iOS/Android app is jurisdiction-dependent and keeps changing. Verify current policy before building any cross-sell.
- **Auth launch set.** Magic link + Google + Apple is login v1. QR is deferred until the native v2 app ships its link handler (see Authentication).

## Hosting

Firebase Hosting **multi-site** on the existing `drivingo-app` project — two targets, `drivingo.co.uk` → `drivingo-website` and `app.drivingo.co.uk` → `drivingo-webapp`. Set both targets up together; retrofitting a second site onto a single-site config is fiddly. The website links here via its "Log in" nav item once this exists.

## Sibling repos

- `../drivingo-backend` — the callables, `firestore.rules`, entitlements. Spec: `AI-COACH-PLAN.md`. **Serves this client unchanged.**
- `../drivingo-content` — source provider for banks, translations, signs, HC. Spec: `CONTENT-PLAN.md`.
- `../drivingo-app` — the native client. Same backend, same content, different platform. Spec: `PLAN.md`.
- `../drivingo-website` — the public marketing/SEO site. Spec: `WEBSITE-PLAN.md`.
- `../ROADMAP.md` · `../ACCOUNTS.md` — cross-repo status/decisions, and account ownership.
- `/Users/burak/Dev/drivingo` — legacy monorepo. Read-only reference.
