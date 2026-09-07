# Savepoint (app)

> **Play. Rate. Review. Remember.**

Next.js application for [Savepoint](../README.md) — a social gaming platform to track your library, rate and review games, follow friends, and discover what to play next.

Screenshots of the live UI live in the [repository root README](../README.md).

## Features

- **IGDB catalog** — search and browse a live catalog of hundreds of thousands of games
- **Discover** — Spotlight carousel, Trending Now rail, and personalized recommendations from your ratings and tastes
- **Library** — Playing / Completed / Want to Play / Dropped; optional public libraries; Steam sync; community average playtime
- **Reviews & ratings** — half-star precision, spoilers, comments, reports
- **Social** — follows, friends, curated lists, activity feed
- **Realtime friend chat** — end-to-end encrypted DMs (ciphertext only on the server) with live polling while a thread is open
- **Auth** — email/password with verification, Google, Discord, Xbox (Auth.js)
- **Media** — avatars and banners on Cloudflare R2 with Sightengine NSFW checks
- **Admin** — user management, review moderation, report queue
- **Unreleased games** — wishlist / notify on release (no ratings until released)

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) + Prisma |
| Auth | Auth.js (NextAuth v5) |
| Games API | IGDB (Twitch credentials) |
| Storage | Cloudflare R2 (AWS SDK) |
| Styling | Vanilla CSS design system |

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Supabase recommended)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Fill in the values documented in `.env.example`. For production hosting, also follow [DEPLOY.md](./DEPLOY.md).

Summary of common keys:

```env
# Database
DATABASE_URL="your_postgres_pooler_url"
DIRECT_URL="your_postgres_direct_url"

# Authentication
AUTH_SECRET="your_secure_secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
XBOX_CLIENT_ID=""
XBOX_CLIENT_SECRET=""

# Steam library sync — https://steamcommunity.com/dev/apikey
STEAM_WEB_API_KEY=""

# IGDB (Twitch) API
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""

# Cloudflare R2
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="savepoint-assets"
NEXT_PUBLIC_R2_PUBLIC_URL=""

# NSFW moderation
SIGHTENGINE_API_USER=""
SIGHTENGINE_API_SECRET=""

# Email (verification, resets, message alerts)
GMAIL_USER=""
GMAIL_APP_PASSWORD=""
```

3. Apply the schema and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

4. Start the development server:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |

## Project docs

- [Root README](../README.md) — overview + screenshots
- [DEPLOY.md](./DEPLOY.md) — production checklist and env matrix
- [../savepoint-srs.md](../savepoint-srs.md) — product / requirements notes

---

© 2026 Savepoint.
