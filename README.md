# PHISH — Don't Get Hooked

A front-end mockup for **PHISH**, a public phishing-awareness drill service featuring **Phil the PHISH**.

## What it does

- Marketing site explaining the service
- Scam education library (6 articles)
- Mock sign-up / login (localStorage)
- Simulated drill inbox with fake phishing emails
- Interactive fake landing pages (bank, delivery, subscription)
- Phil-led debrief flow when you "take the bait"
- Dashboard with stats and monthly reports

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Adding Phil mascot images

Drop your PNG assets into `public/mascot/` and update `components/phil/PhilMascot.tsx` to use them instead of the inline SVG placeholders.

Suggested filenames from the dont-bite asset library:
- `phil-hero-sign.png`
- `phil-intro.png`
- `phil-peek-right.png`
- `phil-magnifier.png`
- `phil-warning.png`

## Tech stack

- Next.js 15 (App Router)
- React 19 + Tailwind CSS v4
- Recharts (dashboard charts)
- localStorage mock data layer

## Phase 2 (not in this mockup)

- Real email delivery
- User authentication
- Bank/platform brand partnerships
- Backend API
