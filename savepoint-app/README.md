# ⟐ Savepoint

> **Play. Rate. Review. Remember.**

Savepoint is a modern, beautifully designed social gaming platform built for gamers who want to track their gaming journey, rate and review titles, and discover their next favorite game. Think of it as Letterboxd or Spotify, but tailor-made for video games.

## ✨ Features

- **Massive Game Database**: Fully integrated with the IGDB API. Search a live catalog of over 300,000 video games in real-time.
- **AI-Powered Recommendations**: Powered by Google Gemini (`@google/genai`), Savepoint analyzes your unique gaming taste profile to recommend highly personalized games you'll absolutely love.
- **Advanced Authentication**: 
  - Seamless "Continue with Google" OAuth powered by Auth.js.
  - Bulletproof Email/Password registration with cryptographic email verification powered by Nodemailer.
- **Zero-Egress Media Storage**: Upload custom avatars and profile banners instantly. Media is securely stored on Cloudflare R2 and served lightning-fast globally.
- **NSFW Moderation**: All uploaded images are automatically scanned by Sightengine to keep the community safe.
- **Glassmorphic UI**: A stunning, premium dark-mode interface with vibrant neon accents and fluid micro-animations.

## 🚀 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [Auth.js (NextAuth v5)](https://authjs.dev/)
- **Styling**: Vanilla CSS (Custom Design System)
- **Media Storage**: AWS SDK + Cloudflare R2
- **AI**: Google Gemini API

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js installed, and an active PostgreSQL database (we recommend Supabase).

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure your environment variables. Create a `.env` file in the root directory and add the following keys:
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

# Xbox library sync via OpenXBL — https://xbl.io/ (separate from Xbox login)
OPENXBL_API_KEY=""

# IGDB (Twitch) API
TWITCH_CLIENT_ID="your_twitch_client_id"
TWITCH_CLIENT_SECRET="your_twitch_client_secret"

# Cloudflare R2 Storage
R2_ACCOUNT_ID="your_r2_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key"
R2_SECRET_ACCESS_KEY="your_r2_secret_key"
R2_BUCKET_NAME="savepoint-assets"
NEXT_PUBLIC_R2_PUBLIC_URL="your_r2_public_domain"

# NSFW Moderation
SIGHTENGINE_API_USER="your_sightengine_user"
SIGHTENGINE_API_SECRET="your_sightengine_secret"

# AI Recommendations
GEMINI_API_KEY="your_gemini_api_key"

# Email Verification (Gmail SMTP)
GMAIL_USER="your_gmail_address"
GMAIL_APP_PASSWORD="your_16_char_app_password"
```

3. Push the Prisma schema to your database:
```bash
npx prisma db push
npx prisma generate
```

4. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to start your gaming journey!

---
*© 2026 Savepoint.*
