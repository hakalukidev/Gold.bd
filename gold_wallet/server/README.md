# wallet_server

Express + PostgreSQL API for Gold BD. Covers registration and login as a
two-step, SMS-OTP-verified flow with JWT access tokens and rotating refresh
tokens — the backend [gold_wallet/client](../client)'s `/register`, `/login`
and `/verify-otp` pages are meant to be wired up to.

## Setup

```bash
cd gold_wallet/server
npm install
cp .env.example .env   # then fill in real secrets — see below
npm run migrate
npm run dev             # http://localhost:4000
```

Generate strong JWT secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each be 32+ characters and
different from each other — the server refuses to start otherwise.

### SMS OTP (BulkSMSBD)

Registration and login both require a 6-digit SMS code as a second factor,
sent via [BulkSMSBD](http://bulksmsbd.net/api/smsapi). Set `BULKSMSBD_API_KEY`
and `BULKSMSBD_SENDER_ID` in `.env` — **required when `NODE_ENV=production`**.
Outside production those can stay blank: `sendSms()` logs the code to the
console instead of calling the real gateway, so local dev and tests never
need live credentials or spend real SMS credits.

## API

All responses use the envelope `{ success: true, data }` or
`{ success: false, error, fieldErrors? }`, matching
`gold_wallet/client/src/types/index.ts`'s `ApiResponse<T>`.

| Method | Path                    | Auth              | Body                                 |
| ------ | ----------------------- | ----------------- | ------------------------------------- |
| POST   | `/api/auth/register`    | —                 | `fullName, phone, email?, password`   |
| POST   | `/api/auth/register/verify` | —             | `phone, code`                         |
| POST   | `/api/auth/login`       | —                 | `phone, password`                     |
| POST   | `/api/auth/login/verify` | —                | `phone, code`                         |
| POST   | `/api/auth/refresh`     | refresh cookie    | —                                      |
| POST   | `/api/auth/logout`      | refresh cookie    | —                                      |
| GET    | `/api/auth/me`          | `Authorization: Bearer <accessToken>` | —          |

**Registration**: `POST /register` validates the form and texts a code — no
account is created yet. `POST /register/verify` with the matching `phone` +
`code` creates the account and returns `{ user, accessToken }` plus the
refresh cookie, same as a login.

**Login**: `POST /login` checks the password and, on success, texts a code
(this is where failed-attempt lockout is enforced — see below). `POST
/login/verify` with the code completes 2FA and issues the session.

Phone numbers follow the BD mobile format `01[3-9]XXXXXXXX`, with or without a
`+88`/`88` prefix — normalized server-side so one person can't register twice
under different prefixes.

## Security notes

- **Passwords**: hashed with bcrypt (cost 12 by default, configurable).
- **Two-factor by design**: neither registration nor login can complete
  without proving control of the phone number via a one-time SMS code — a
  stolen password alone isn't enough to sign in.
- **OTP handling**: codes are 6 digits from a CSPRNG (`crypto.randomInt`),
  stored only as a SHA-256 hash, expire after `OTP_TTL_MINUTES` (default 5),
  are invalidated after `OTP_MAX_ATTEMPTS` wrong guesses (default 5), and are
  rate-limited per phone number (`OTP_RESEND_COOLDOWN_SECONDS` between sends,
  5/hour via `otpRequestLimiter`) so an attacker can't SMS-bomb a phone they
  don't own or brute-force the code.
- **Sessions**: short-lived JWT access token (15m) returned in the response
  body for the client to hold in memory; a long-lived refresh token in an
  `httpOnly`, `sameSite=strict` cookie scoped to `/api/auth`, so it never
  reaches JS and isn't attached to cross-site requests.
- **Refresh rotation**: every refresh issues a new token and revokes the old
  one. Presenting an already-rotated (or logged-out) token revokes *all*
  sessions for that user — the standard signal that a token was stolen and
  replayed.
- **Refresh tokens at rest**: stored as a SHA-256 hash, never in plaintext, so
  a database leak alone can't be replayed as a session.
- **Login**: generic "invalid phone or password" on any failure (no account
  enumeration), a dummy bcrypt comparison runs even when the phone doesn't
  exist (no timing signal), and an account locks for
  `LOGIN_LOCKOUT_MINUTES` after `LOGIN_MAX_ATTEMPTS` consecutive password
  failures — checked before an OTP is ever sent.
- **Transport/headers**: `helmet` defaults, CORS locked to `CORS_ORIGINS`
  with credentials, `hpp` against parameter pollution, 10kb JSON body cap.
- **Rate limiting**: a phone-keyed limiter on the two endpoints that send SMS,
  a per-IP+phone limiter on the OTP-verify/refresh endpoints, and a looser
  global limiter on everything else.
- **SQL**: every query is parameterized (`pg` placeholders) — no string-built
  SQL anywhere.
- **IDs**: UUIDs, not sequential integers, so account IDs aren't guessable.
- **Config**: environment variables are validated with `zod` at boot; the
  process refuses to start with missing/weak secrets (including SMS
  credentials in production) rather than falling back to an insecure default.
- **Logging**: `pino`, with `Authorization`, cookies, passwords and tokens
  redacted from logs; OTP codes are only ever logged in the non-production
  dev fallback, never in production.
