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

## Drill delivery foundation

Admins with `manage_drills` can send tracked test drills from the admin Drills tab.
Training users can also trigger a practice drill from Account & Training Settings.

Tracked click links look like `/api/drills/track/<token>` and open Phil's lesson page
while recording a "caught" outcome. Users can mark pending drills as spotted from
Training History. Dashboard stats and history now read from the `DrillSend` table.

Still to come:

- Real inbox email delivery
- Scheduled live campaigns
- Editable email templates in admin
- Bank/platform brand partnerships

## Dev-only: promote a user to admin

Admin APIs are now role-protected (`role === "admin"`). Do not expose admin promotion in public UI.

Recommended approach (Supabase Table Editor):

1. Open your Supabase project.
2. Go to Table Editor -> `User`.
3. Find the existing user row by email.
4. Set `role` from `user` to `admin`.
5. Save the row.

This is a developer/operator action only. Avoid adding a public route or client-side control for role changes.
