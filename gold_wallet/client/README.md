# gold-wallet

The Gold BD wallet: sign-in, OTP, and the authenticated dashboard. Next.js 16
(App Router), served on **http://localhost:3001**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Routing

`(auth)` holds login/register/verify-otp; `(dashboard)` holds the authenticated
app (wallet, buy-gold, sell-gold, market, vault, transactions, kyc, profile, …).
`/` has no page of its own — it redirects to `/wallet`.

## No backend

This app has no route handlers (`src/app/api` does not exist) and there is no
server in the repo, so every `/api/*` call in `src/hooks/use-*.ts` is
unimplemented. The queries fall back to the `src/lib/mock-*.ts` demo data
(`data ?? MOCK_…`) so the dashboard renders a shaped page rather than an empty
shell, and the auth forms are a UI-only flow:

```
/login  ─┐
         ├─→ /verify-otp ─→ /wallet
/register ┘
```

Treat `src/types/index.ts` and the `src/lib/validations/*` Zod schemas as the
API contract when a backend is added.

## Linking back to the storefront

The marketing site is the separate `gold_commerce` project on its own origin.
"Back to the site" links go through `src/lib/site-links.ts`
(`NEXT_PUBLIC_COMMERCE_URL`) as plain `<a>` elements — `next/link` can't route
to another origin. That value is inlined at build time, so it has to be set
wherever this app is **built**, not just where it runs.

## Conventions

Covered in the repo-root `CLAUDE.md`: TanStack Query owns server state, Redux
owns UI-only state, the `ApiResponse` envelope, money and grams as strings,
forms via react-hook-form + the Zod schemas in `src/lib/validations/*`, and
Tailwind v4 configured entirely in `src/app/globals.css`.
