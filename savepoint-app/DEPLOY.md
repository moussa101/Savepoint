# Savepoint deployment checklist

Deploy from `savepoint-app/`. Treat this as a standard Next.js Node app + Postgres (Supabase). No Dockerfile/Vercel config is required for this checklist.

## 1. Pre-deploy (code & DB)

- [ ] `cd savepoint-app && npm ci`
- [ ] `npx tsc --noEmit` and `npm run build` succeed
- [ ] Production Postgres ready (`DATABASE_URL` pooler + `DIRECT_URL` for migrations)
- [ ] `./node_modules/.bin/prisma db push` (or migrate) against **production** DB
- [ ] `./node_modules/.bin/prisma generate`
- [ ] Generate a new strong `AUTH_SECRET` (`openssl rand -base64 32`) — do **not** reuse a local/dev secret
- [ ] Set `NEXTAUTH_URL=https://your-domain.com` (no trailing slash) — used by email links, Steam OpenID return, Auth.js

## 2. Environment variables

Copy [`.env.example`](./.env.example) and fill production values in your host dashboard (never commit `.env`).

### Required for core app

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma | Prefer Supabase **pooler** URL |
| `DIRECT_URL` | Prisma `directUrl` | Non-pooled URL for schema push |
| `AUTH_SECRET` | Auth.js / `src/lib/security.ts` | Also unlocks internal `/api/track` + `/api/banned-ips` |
| `NEXTAUTH_URL` | Auth, mail, Steam | Must match public HTTPS origin |
| `TWITCH_CLIENT_ID` | IGDB via Twitch | Required for Discover / game pages / recs |
| `TWITCH_CLIENT_SECRET` | IGDB | Same Twitch app |
| `GMAIL_USER` | `src/lib/mail.ts` | Verification + password reset |
| `GMAIL_APP_PASSWORD` | mail | Google App Password, not account password |

### Required for uploads / profiles

| Variable | Used by | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | `src/lib/r2.ts` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | R2 | |
| `R2_SECRET_ACCESS_KEY` | R2 | |
| `R2_BUCKET_NAME` | uploads | e.g. `savepoint-assets` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | uploads / CDN | Public bucket/custom domain; add host to CSP `img-src` if not `*.r2.dev` |
| `SIGHTENGINE_API_USER` | `src/app/actions/upload.ts` | **Fail-closed in production** if missing |
| `SIGHTENGINE_API_SECRET` | upload | |

### OAuth login (enable only providers you need)

| Variable | Provider | Console callback |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google | `https://YOUR_DOMAIN/api/auth/callback/google` |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord | `https://YOUR_DOMAIN/api/auth/callback/discord` |
| `XBOX_CLIENT_ID` / `XBOX_CLIENT_SECRET` | Microsoft Entra (login only) | `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id` |

### Optional / currently UI-hidden

| Variable | Feature | Status |
|---|---|---|
| `STEAM_WEB_API_KEY` | Steam library sync | Backend exists; Settings UI may be hidden |
| `OPENXBL_API_KEY` | Xbox library sync | Backend exists; Settings UI may be hidden |
| `GEMINI_API_KEY` | Legacy README entry | **Unused** — recommendations are algorithmic IGDB, not Gemini |

## 3. Provider consoles (URLs & domains)

- [ ] **Google Cloud OAuth**: Authorized redirect = `/api/auth/callback/google`; JS origins = production domain
- [ ] **Discord Developer Portal**: Redirects include production callback
- [ ] **Microsoft Entra**: Redirect URI for web = Microsoft Entra callback path above; tenant `common`
- [ ] **Twitch / IGDB**: Client credentials app active
- [ ] **Cloudflare R2**: Bucket public URL works; CORS allows your domain if browser uploads need it
- [ ] **Sightengine**: Account has NSFW/moderation credits
- [ ] **Gmail**: App password for the sending account; SPF/DKIM if using custom domain later
- [ ] **Steam** (when re-enabling UI): API key domain = production domain; OpenID return `https://YOUR_DOMAIN/api/auth/steam/callback`
- [ ] **OpenXBL** (when re-enabling UI): Key valid; calls go to `https://api.xbl.io/v2/...` (no `/api` prefix)

## 4. Build & host config

- [ ] Deploy `savepoint-app` as Node Next.js (`npm run build` → `npm start`) or platform Next adapter
- [ ] Env vars set in the host dashboard (never commit `.env`)
- [ ] If custom R2 domain: update `next.config.ts` CSP `img-src` accordingly
- [ ] Confirm CSP `connect-src` covers: `api.igdb.com`, `id.twitch.tv`, `api.sightengine.com`, Steam/OpenXBL if re-enabled
- [ ] HTTPS only; cookies/session work on the real domain

## 5. API / integration smoke tests (post-deploy)

| Check | How | Pass criteria |
|---|---|---|
| Health / home | `GET /` | 200, no crash |
| DB | Login or open `/feed` when authed | No Prisma column errors |
| IGDB | `/games` Discover | Games + covers load from `images.igdb.com` |
| Auth credentials | Register → verify email → login | Mail arrives; session works |
| Google OAuth | Continue with Google | Callback succeeds, no `OAuthAccountNotLinked` for new users |
| Discord OAuth | Continue with Discord | Same |
| Xbox login | Continue with Xbox | Login works (library sync separate) |
| Upload | Edit profile avatar | R2 URL serves image; Sightengine does not block clean image |
| NSFW fail-closed | Missing Sightengine in prod | Upload rejected (expected) |
| Password reset | Forgot password | Email link uses production `NEXTAUTH_URL` |
| Admin | Admin user → `/admin` | Dashboard loads |
| Internal APIs | Ban IP / traffic | `/api/track` + `/api/banned-ips` need `AUTH_SECRET` via middleware |
| Mobile | Phone or 375px | Bottom nav + no horizontal overflow |
| Steam sync | Only if UI re-enabled | Connect + sync with public Steam profile |
| Xbox sync | Only if UI re-enabled | Gamertag connect via OpenXBL `/v2/search/...` |

## 6. Security before go-live

- [ ] Rotate any secrets that were pasted in chat or committed historically
- [ ] Confirm `.env*` is gitignored (`.env.example` is allowlisted)
- [ ] Confirm `/api/test-recs` stays blocked in production
- [ ] Create first admin in DB carefully (`isAdmin=true`) if needed
- [ ] Review CORS/CSP after first real upload + OAuth round-trip

## 7. Suggested deploy order

1. DB + `AUTH_SECRET` + `NEXTAUTH_URL` + Twitch/IGDB
2. Build & deploy shell site
3. Gmail verification flow
4. OAuth providers one at a time
5. R2 + Sightengine uploads
6. Full smoke matrix above
7. Re-enable Steam/Xbox Settings UI later when ready
