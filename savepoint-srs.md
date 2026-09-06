# Savepoint — Software Requirements Specification

| | |
|---|---|
| **Version** | 0.1 |
| **Status** | Initial Requirements |
| **Product Type** | Social gaming platform / gaming diary |
| **Primary Inspiration** | Letterboxd-style social experience, applied to video games |
| **Initial Platform** | Web |
| **Future Integrations** | Steam, PlayStation Network, Xbox, Epic Games |

> This document defines the **product only**. No monetization, payments, subscriptions, or marketplace features are in scope at this stage.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Goals](#2-goals)
3. [Target Users](#3-target-users)
4. [Core User Types](#4-core-user-types)
5. [Functional Requirements — Authentication](#5-functional-requirements--authentication)
6. [User Profile](#6-user-profile)
7. [Game Database](#7-game-database)
8. [Game Tracking](#8-game-tracking)
9. [Ratings](#9-ratings)
10. [Reviews](#10-reviews)
11. [Gaming Diary](#11-gaming-diary)
12. [Lists](#12-lists)
13. [Social System](#13-social-system)
14. [Activity Feed](#14-activity-feed)
15. [Discovery](#15-discovery)
16. [Game Page](#16-game-page)
17. [Statistics](#17-statistics)
18. [Gaming Personality (Future)](#18-gaming-personality-future)
19. [External Account Integration](#19-external-account-integration)
20. [Gaming Wrapped (Future)](#20-gaming-wrapped-future)
21. [Notifications](#21-notifications)
22. [Comments](#22-comments)
23. [Reporting & Moderation](#23-reporting--moderation)
24. [Privacy](#24-privacy)
25. [Non-Functional Requirements](#25-non-functional-requirements)
26. [Suggested MVP Scope](#26-suggested-mvp-scope)
27. [Explicitly Out of Scope](#27-explicitly-out-of-scope)
28. [Core User Journey](#28-core-user-journey)
29. [Competitive Landscape](#29-competitive-landscape)
30. [Open Questions & Risks](#30-open-questions--risks)
31. [Recommended Tech Stack](#31-recommended-tech-stack)

---

## 1. Product Vision

**Savepoint** is a social platform where gamers can track, rate, review, organize, discover, and share their gaming experiences.

Core philosophy:

> **Your gaming profile represents your taste.**

Rather than functioning primarily as a game database or launcher, Savepoint centers on the social and personal experience of gaming — the way Letterboxd does for film and Goodreads does for books.

The product should let a user answer:

- What games have I played?
- What am I playing right now?
- What games do I want to play?
- What are my favorite games?
- What did I think about a game?
- What games do my friends like?
- What kind of gamer am I?
- What should I play next?

---

## 2. Goals

### 2.1 Primary Goals

- Create a social gaming diary.
- Allow users to build a personal gaming profile.
- Allow users to rate and review games.
- Allow users to create and share lists.
- Allow users to discover games through people rather than only algorithms.
- Eventually synchronize gaming activity from external platforms (Steam, PSN, Xbox, Epic).
- Make profiles and activity highly shareable.
- Create a visually polished, personality-driven experience.

### 2.2 Non-Goals for MVP

The following are explicitly **not** part of the initial build:

- Game purchasing
- Digital-product marketplace
- Subscriptions
- Advertising
- Game downloads
- Game launching
- Game streaming
- In-game statistics
- Multiplayer functionality
- Chat
- Forums
- AI recommendations
- Mobile apps

These may be reconsidered in later phases.

---

## 3. Target Users

### 3.1 Primary User

Gamers aged approximately **16–35** who:

- Play games regularly.
- Care about games beyond simply playing them.
- Like rating/reviewing media.
- Enjoy discovering new games.
- Want to express and show off their gaming taste.
- Use platforms such as Steam or PlayStation.
- Enjoy sharing their interests socially.

### 3.2 Secondary User

People who enjoy:

- Game collecting
- Completionism
- Writing game reviews
- Gaming statistics and analytics
- Backlog management
- Gaming communities
- Ranking and list-making

---

## 4. Core User Types

### 4.1 Guest (Unauthenticated)

**Can:**
- Browse games
- View public profiles
- View public reviews
- View public lists
- Search games
- View rankings

**Cannot:**
- Review games
- Create lists
- Track games
- Follow users
- Like content

### 4.2 Registered User

**Can:**
- Create a profile
- Track games
- Rate games
- Review games
- Create lists
- Follow users
- Like reviews
- Comment
- View personal statistics
- Manage privacy settings

### 4.3 Administrator

**Can:**
- Manage users
- Manage games
- Manage genres/platforms
- Moderate reviews
- Remove inappropriate content
- Manage reports
- Ban/suspend users
- View system statistics

---

## 5. Functional Requirements — Authentication

### FR-001 — Account Registration
The system shall allow users to create an account using:
- Email
- Username
- Password

Optional future authentication providers:
- Google
- Apple
- Steam

### FR-002 — Login / Logout
The system shall provide:
- Login
- Logout
- Forgot password
- Password reset
- Session management

---

## 6. User Profile

### FR-010 — Profile
Each user shall have a public profile containing:

- Username
- Profile picture
- Bio
- Favorite games
- Games played
- Games currently playing
- Games planned
- Reviews
- Lists
- Followers
- Following
- Statistics

**Example:**
```
Abdelrhman
🎮 142 games   ⭐ 4.2 average rating   🏆 31 favorites   📚 27 reviews

Currently playing: Red Dead Redemption 2
```

### FR-011 — Profile Customization
Users shall be able to customize:
- Profile picture
- Bio
- Favorite games
- Profile header/background
- Display preferences

> Theme marketplace / paid cosmetics are **out of scope** for MVP.

---

## 7. Game Database

### FR-020 — Game Database
The system shall maintain a database of games. Each game entry should contain:

- Name
- Cover image
- Description
- Release date
- Developers
- Publishers
- Genres
- Platforms
- Average rating
- Number of ratings
- Number of reviews

**Example:**
```
Red Dead Redemption 2
Developer: Rockstar Studios   Publisher: Rockstar Games
Genres: Action, Adventure, Open World
Platforms: PS4, PS5, Xbox One, PC
```

### FR-021 — Game Search
Users shall be able to search games by:
- Name
- Genre
- Platform
- Release year

**Future:** Developer, Publisher, Rating, Popularity.

---

## 8. Game Tracking

One of the most important systems in the product.

### Statuses

| Status | Description |
|---|---|
| **Want to Play** | Games the user wants to play |
| **Playing** | Games currently being played |
| **Completed** | Games the user considers finished |
| **Dropped** | Games the user stopped playing |
| **Backlog** | Can initially be represented via "Want to Play" rather than a separate status |

### FR-030 — Add Game
Users shall be able to add a game to their profile via an "Add to Library" action, selecting one of: Want to Play, Playing, Completed, Dropped.

---

## 9. Ratings

### FR-040 — Rate Game
Users shall be able to rate games on a **0.5–5 star** scale (half-star increments).

The system shall calculate:
- The user's own rating
- Average community rating
- Number of ratings

---

## 10. Reviews

### FR-050 — Write Review
A review contains:
- Game
- Rating
- Text
- Date
- Author

Optional: Spoiler warning, Like count, Comments.

### FR-051 — Edit Review
Users can edit their own reviews.

### FR-052 — Delete Review
Users can delete their own reviews.

### FR-053 — Like Review
Users can like other users' reviews. A user cannot like their own review.

### FR-054 — Spoiler Protection
Users can mark reviews as containing spoilers. Review text shall be hidden by default behind a "Contains spoilers — click to reveal" prompt.

---

## 11. Gaming Diary

This is a key differentiator for the product.

### FR-060 — Log Gaming Activity
Users can record:
- Game
- Date
- Status
- Rating
- Review
- Optional play session

**Example:**
```
September 5, 2026
🎮 Red Dead Redemption 2 — ⭐⭐⭐⭐⭐ — Completed
"One of the best games I've ever played."
```

### FR-061 — Gaming Timeline
Users shall be able to view their gaming history in chronological order, grouped by month/year.

---

## 12. Lists

### FR-070 — Create List
Users can create custom game lists (e.g. "My Favorite Games," "Games That Made Me Cry," "Best Open-World Games").

### FR-071 — List Visibility
Lists can be **Public** or **Private**. (Future: Followers-only.)

### FR-072 — List Ordering
Users can manually reorder games within a list.

---

## 13. Social System

### FR-080 — Follow Users
Users can follow other users. Following causes the followed user's public activity to appear in the follower's feed.

### FR-081 — Followers
Users can view their Followers and Following lists.

---

## 14. Activity Feed

### FR-090 — Home Feed
The home page for logged-in users shall display recent activity from people they follow (completions, ratings, new lists, etc.), most-recent-first.

---

## 15. Discovery

### FR-100 — Discover Games
Users shall be able to discover games through:
- Popular games
- Highly rated games
- Recently reviewed games
- Trending games
- New releases
- User-curated lists

---

## 16. Game Page

Every game shall have its own page containing:
- Rating summary (average + count)
- Overview/description
- Platforms
- Community reviews
- Lists containing this game
- Users who have played it

---

## 17. Statistics

### FR-110 — User Statistics
The system shall calculate:
- Games played / completed / dropped / currently playing / in backlog
- Average rating given
- Most played genres
- Most played platforms
- Favorite developers
- Favorite games

---

## 18. Gaming Personality (Future)

Not required for MVP. The system could analyze user activity and generate a personality label, e.g.:

> 🎭 **The Explorer** — You love open-world games, long campaigns, and large worlds to explore.

Other candidate personalities: The Completionist, The Storyteller, The Competitive Gamer, The Nostalgic, The Collector, The Casual, The Critic.

---

## 19. External Account Integration

### FR-120 — Steam Connection *(Future)*
User selects "Connect Steam"; the system associates the Savepoint account with the user's SteamID via Steam's authentication flow.

Potential imported data:
- Owned games
- Recently played games
- Playtime
- Achievements
- Steam profile info

> Imported information must be clearly distinguished from manually entered information in the UI.

### FR-121 — PlayStation Connection *(Future, lower confidence)*
Sony supports authorized third-party app connections and user-managed authorization, but does **not** offer a public, well-documented equivalent of Steam's Web API for bulk library/playtime/trophy import.

**Implication:** PSN integration should remain a **separate, lower-priority technical spike** until Sony's current developer/API access is confirmed. Do not design the MVP architecture to depend on it.

**Recommended integration order:** Steam first → validate with Xbox/Epic where APIs are public → treat PSN as a stretch goal.

---

## 20. Gaming Wrapped (Future)

An annual summary feature, e.g.:

```
YOUR 2026
🎮 47 games played   🕐 642 hours   ⭐ 4.31 average rating
🏆 Game of the Year: Red Dead Redemption 2
🎭 Gaming personality: The Explorer
```

Shareable as an image/card.

---

## 21. Notifications

### FR-130
The system may notify users when:
- Someone follows them
- Someone likes their review
- Someone comments on their review
- Someone interacts with their list

Users can disable notifications.

---

## 22. Comments

### FR-140
Users may comment on reviews. A comment contains: Author, Text, Date, Like count. Users can delete their own comments.

---

## 23. Reporting & Moderation

### FR-150
Users can report reviews, comments, profiles, or lists, with a reason:
- Spam
- Harassment
- Hate speech
- Sexual content
- Copyright infringement
- Other

Administrators can review and act on reports.

---

## 24. Privacy

Users shall control visibility of:
- Profile
- Gaming activity
- Reviews
- Lists
- Followers/following

Profile modes: **Public** or **Private**.

---

## 25. Non-Functional Requirements

### NFR-001 — Performance
Initial page load target: **< 3 seconds** under normal network conditions.

### NFR-002 — Scalability
Architecture should support growth in users, games, reviews, lists, and activity events without a full redesign.

### NFR-003 — Security
The system shall:
- Hash passwords (never store plaintext)
- Validate all user input
- Protect authentication endpoints
- Prevent unauthorized access
- Enforce HTTPS
- Implement rate limiting

### NFR-004 — Availability
Long-term target: **99.9% uptime**. Can be lower for MVP.

### NFR-005 — Responsive Design
Must work across desktop, laptop, tablet, and mobile browser (no native app required for MVP).

### NFR-006 — Accessibility
UI should support:
- Keyboard navigation
- Screen readers
- Adequate color contrast
- Alt text on images
- Accessible form design

---

## 26. Suggested MVP Scope

The first version should include:

- **Authentication** — Registration, Login, Logout
- **Game system** — Game database, search, game pages
- **Personal library** — Want to Play / Playing / Completed / Dropped
- **Social** — Profiles, Follow, Activity feed
- **Reviews** — Ratings, Reviews, Likes, Spoiler tags
- **Lists** — Create, Edit, Delete, Public/Private
- **Diary** — Gaming history log
- **Basic statistics** — Games played, Completed, Average rating, Favorite games

This is enough to prove the core product loop (see Section 28).

---

## 27. Explicitly Out of Scope

To avoid scope creep, the following are **not** built in this phase:

- ❌ Payments
- ❌ Marketplace
- ❌ Subscriptions
- ❌ Ads
- ❌ AI recommendations
- ❌ Mobile app
- ❌ Steam synchronization
- ❌ PSN synchronization
- ❌ Xbox synchronization
- ❌ Gaming personality
- ❌ Gaming Wrapped
- ❌ Advanced recommendations
- ❌ Chat
- ❌ Forums

These are candidates for post-MVP phases.

---

## 28. Core User Journey

```
Visit Savepoint
      ↓
Create account
      ↓
Choose favorite games
      ↓
Choose games you've played
      ↓
Rate some games
      ↓
Add games to backlog
      ↓
Follow interesting users
      ↓
Home feed
      ↓
Discover games
      ↓
Write first review
      ↓
Create first list
      ↓
Profile starts becoming "you"
```

**The core product loop:**

```
PLAY GAME → LOG IT → RATE IT → REVIEW IT → SHARE IT
   ↑                                            ↓
DISCOVER ANOTHER GAME  ←  FRIENDS SEE IT ←───────┘
```

---

## 29. Competitive Landscape

| Product | Positioning |
|---|---|
| **Backloggd** | Closest existing equivalent — explicitly positions itself as "Letterboxd for games / Goodreads for games." Has logging, ratings, reviews, backlog, ranked lists, social feed. |
| **Grouvee** | Game shelves, reviews, lists, Steam importing, social feed. |
| **Playlogd** | Explicit video-game diary — ratings, reviews, backlog, lists. |
| **Spawnr** | Letterboxd-style diary with stronger mobile/social positioning. |
| **Firetale** | Game diary + reviews + lists + library imports + social features. |
| **GameLoggr** | Markets itself directly as "Letterboxd, but for games." |
| **Lootd** | Newer entrant, focused on social diary + shareable profiles. |

**Implication:** The category is validated — there is clear demand for a Letterboxd-style gaming product. The opportunity is differentiation, not first-mover advantage. The identified wedge is **identity/taste-expression** (shareable taste profiles, stats, "gaming personality") rather than a pure tracking/database feature set, since that is the mechanism that made Letterboxd itself addictive rather than just useful.

---

## 30. Open Questions & Risks

- **PSN API access:** No confirmed public API for bulk library/playtime/trophy import. Needs a dedicated feasibility spike before any PSN feature is scoped or promised to users.
- **Game database sourcing:** Not yet decided whether to build a proprietary game database or ingest from a third-party source (e.g. IGDB, RAWG) — affects FR-020/FR-021 implementation cost significantly.
- **Cross-platform game identity:** Merging the same game across Steam/PSN/Xbox/Epic into one canonical `Game` entity (so a rating applies regardless of platform played) needs a matching/normalization strategy — this is a data-modeling decision, not just a feature.
- **Differentiation risk:** Given the crowded competitive landscape (Section 29), MVP success likely hinges on execution quality and the identity/taste-profile angle rather than feature parity alone.
- **Naming:** "Savepoint" is a working title only — not yet validated for trademark/domain availability.

---

## 31. Recommended Tech Stack

Chosen to fit the actual requirements above: a content-heavy social app (profiles, feeds, reviews, lists) with a relational data model at its core, one external OAuth integration to start (Steam), room to grow into more integrations, and a solo/small-team MVP that shouldn't burn time on infrastructure.

### 31.1 Overall approach

**Recommendation: a single full-stack framework rather than a separate frontend/backend from day one.**

For an MVP at this scope, splitting into a standalone API service + separate SPA adds deployment and auth complexity (CORS, token handling, two codebases) that buys nothing yet — Savepoint has no requirement (real-time multiplayer, heavy background compute, separate mobile client) that forces that split today. A monolithic full-stack framework gets FR-001 through FR-150 built faster, and can still expose a clean API layer later if a mobile app is added post-MVP.

### 31.2 Frontend + Backend: **Next.js (React, TypeScript)**

- Server-rendered pages for game pages/profiles (good for SEO — public game/profile pages are meant to be discoverable, per Section 15).
- API routes / Server Actions cover all FR-0xx endpoints (auth, tracking, reviews, lists, follow, feed) without a separate backend service.
- TypeScript end-to-end reduces the class of bugs that matter most in a data-model-heavy app like this (game/user/review/list relationships).
- Large ecosystem, easy to find components for star ratings, infinite-scroll feeds, spoiler-toggle UI, etc.

*Alternative if you'd rather keep frontend and backend fully separate (e.g. to reuse the API for a future mobile app sooner):* React (Vite) frontend + **Node.js/Express or NestJS** backend. NestJS in particular maps cleanly onto the FR sections above (modules per domain: Users, Games, Reviews, Lists, Social, Feed).

### 31.3 Database: **PostgreSQL**

- The data model is inherently relational: Users ↔ Games ↔ Reviews ↔ Ratings ↔ Lists ↔ Follows, with the cross-platform game-identity problem from Section 30 (one canonical `Game` row referenced by many platform-specific ownership records). That's a foreign-key/join-heavy problem — exactly what Postgres is built for.
- Native full-text search (`tsvector`) is enough for FR-021 game search at MVP scale — no need for a separate search service yet.
- Strong JSON support (`jsonb`) if you need semi-structured fields (e.g. raw imported Steam achievement data) without a schema migration for every platform quirk.

**ORM: Prisma** — type-safe queries matched to the TypeScript stack, and its migration workflow keeps the schema (which you'll want to formalize next, per Section 26) in version control from day one.

### 31.4 Authentication

- **Auth.js (formerly NextAuth)** if using Next.js — handles email/password plus OAuth providers (Google, Apple, and later Steam) with minimal custom code, satisfying FR-001/FR-002/FR-120 with one library instead of hand-rolling session management (which NFR-003 makes riskier to DIY).
- Steam specifically uses OpenID rather than OAuth2 — Auth.js has community providers for this, or a small custom provider; flag this now so it's not a surprise during FR-120 implementation.
- Passwords hashed with **bcrypt** or **argon2** (never rolled by hand) — directly satisfies NFR-003.

### 31.5 File/image storage: **S3-compatible object storage** (AWS S3, or Cloudflare R2 for lower cost)

- Profile pictures, game cover art, list headers. Don't store binary blobs in Postgres.
- Cloudflare R2 is worth a look specifically because it has no egress fees — relevant once game cover images are being served at any real traffic volume.
- Pair with **Cloudflare Images** or `next/image` + a CDN for resizing/optimization rather than building that yourself.

### 31.6 Caching / feed performance: **Redis**

- Not required for FR-090 (Activity Feed) at MVP scale — a straightforward SQL query against a `follows` join can serve the feed initially. Add Redis when feed generation or session storage actually becomes a bottleneck, not before. Listed here so it's already accounted for in the architecture when that day comes (satisfies NFR-002 without over-building now).

### 31.7 Hosting

| Component | Recommendation | Why |
|---|---|---|
| App (Next.js) | **Vercel** | Zero-config deploys, generous free tier, built for this exact framework |
| Database | **Supabase** or **Neon** (managed Postgres) | Free/cheap tier, handles backups and connection pooling you'd otherwise build yourself |
| Object storage | **Cloudflare R2** | No egress fees, S3-compatible API so nothing else changes if you switch providers later |

This combination means near-zero DevOps for the MVP — important since Section 26/27 explicitly say not to over-invest before the core loop is proven.

### 31.8 External integrations

- **Steam Web API + Steam OpenID** for FR-120 — well documented, the natural starting integration per Section 19.
- **Game database seeding:** rather than building Savepoint's own game metadata from scratch (Section 30's open question), seed and periodically sync from **IGDB** (free, generous, used by many of the competitors in Section 29) or **RAWG**. This resolves FR-020 without manual data entry and de-risks the cross-platform game-identity problem, since IGDB already assigns one canonical ID per game across platforms.
- PSN/Xbox integrations: deliberately not chosen yet, per Section 19/30 — revisit once Steam is live and the feasibility spike on Sony's current API access is done.

### 31.9 Summary

| Layer | Choice |
|---|---|
| Frontend + Backend | Next.js (React, TypeScript) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Auth.js (email/password + OAuth/OpenID) |
| File storage | Cloudflare R2 (S3-compatible) |
| Caching (later) | Redis |
| Game metadata source | IGDB API |
| Hosting | Vercel (app) + Supabase/Neon (DB) |

This stack covers every FR/NFR in the MVP scope (Section 26) with mainstream, well-documented tools — deliberately avoiding anything exotic, since the near-term risk to this project is scope creep, not technology limitations.

---

*This document is the source of truth for product scope during MVP development. Recommended next steps: formalize the database/entity schema in Prisma, write detailed use cases, define the API contract, and begin MVP implementation.*
