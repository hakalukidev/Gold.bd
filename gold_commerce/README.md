# gold-commerce

The public Gold BD storefront and the admin panel. Next.js 16 (App Router),
served on **http://localhost:3000**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## What's here

- **Marketing site** — `src/app/page.tsx` plus `src/components/landing/*`:
  landing page, products, calculator, buying guide, checkout.
- **Admin** — `src/app/admin/*`: rates, users, transactions, footer and site
  settings, behind its own layout and login.
- **Route handlers** — `src/app/api/*`: the rate feed, site settings and visitor
  stats this app serves for itself. They read the `src/lib/mock-*.ts` stand-ins;
  there is no database in this project.

## What's *not* here

The customer wallet — sign-in, the dashboard, buy/sell, KYC — is a separate
project at `gold_wallet/`, on its own port with its own Express/Postgres API.
The link between them is a URL, not an import: the navbar's **Gold Wallet**
button and the "open an account" CTAs point at `NEXT_PUBLIC_WALLET_URL`
(see `src/lib/site-links.ts`), rendered as plain `<a>` elements because this
app's router has no page for them.

`NEXT_PUBLIC_WALLET_URL` is inlined at build time, so it has to be set wherever
this app is **built**, not just where it runs.

## Conventions

Covered in the repo-root `CLAUDE.md`: TanStack Query owns server state, Redux
owns UI-only state, the `ApiResponse` envelope, money-as-strings, Tailwind v4
configured entirely in `src/app/globals.css`, and the bn/en dictionary that
covers this app's marketing pages.
