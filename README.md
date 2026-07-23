# EditBridge

Video Editing & Thumbnail Design Marketplace — two-sided platform connecting clients with verified freelance editors.

## Prerequisites

- Node.js 18+
- npm 9+
- Neon PostgreSQL database
- Razorpay account (with Route access)
- Pusher Channels app
- Cloudflare R2 bucket
- Resend account

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

3. Push the database schema to Neon:

```bash
npx drizzle-kit push
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for the full list of required variables. All 23 must be set before the app will start correctly.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 App Router |
| Database | Neon PostgreSQL + Drizzle ORM |
| Auth | NextAuth.js (Auth.js beta) |
| Payments | Razorpay Route |
| Real-time | Pusher Channels |
| File storage | Cloudflare R2 |
| Email | Resend + React Email |
| Hosting | Vercel Pro |

## Deployment

```bash
npm run build
vercel deploy --prod
```

> Vercel Pro is required — the Hobby plan prohibits commercial use.
