# TuGuTuGu

**TuGuTuGu** is a surplus dining and food rescue marketplace web application connecting local bakeries, cafes, restaurants, and groceries with diners looking for end-of-day surplus food at discounted prices or free community shares.

> **Status:** Interactive front-end prototype using local mock data and `localStorage` state persistence (no live backend or payment gateway yet).

---

## Features

### Consumer App
- **Home Feed:** Location selector, live expiring deals countdown, curated carousels (*Midnight Rescue*, *Free Community Food*, *Near You*), and quick category browsing.
- **Search & Filters:** Instant keyword search, category tabs, *Free Only* and *Midnight Deals* filters.
- **Explore Map:** Interactive pan/zoom city map with **Area** and **Rescue Route** modes, marker clustering, draggable bottom sheet (`peek` / `half` / `full`), quick store preview cards, and *Toko* check-in stamps.
- **Checkout & QR Pickup:** Supports **E-Wallet** (GoPay, OVO, DANA, ShopeePay), **Cash on Pickup (COD)**, and **Free Community Claim (Rp 0)** with generated QR order passes.
- **Orders & Profile:** Active/past order tracking, QR pickup modal, editable profile, saved pickup locations, linked e-wallets, dietary preferences, notification alerts, FAQ, and prototype data reset.

### Merchant Portal
- **Auth Flow:** Demo merchant login and store registration flow.
- **Orders & Check-in:** Order search, status filters (`All`, `Ready`, `Unpaid COD`, `Completed`, `Cancelled`), QR/Order ID lookup modal, COD cash confirmation, and order cancellation with stock restoration.
- **Surplus Bags Management:** Create, edit, delete, and adjust real-time bag stock with photo presets, pricing, pickup windows, and dietary tags.
- **Insights & Store Settings:** Food waste rescued (`kg` & `CO₂e`), confirmed revenue, pending COD totals, payment method mix, store open/paused toggle, payout channel preferences, and cashier alert settings.

---

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 8
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons:** Lucide React
- **Fonts:** Sora, Inter, JetBrains Mono (Google Fonts)

---

## Getting Started

### Prerequisites
- Node.js 18+ (or Bun)

### Installation & Local Development

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Start the development server (runs on http://localhost:3000)
npm run dev
```

### Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Vite dev server on port `3000` |
| `npm run build` | Builds the production bundle to `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |

---

## Project Structure

```text
├── index.html                  # HTML entry point & Google Fonts
├── public/assets/              # Static public brand assets
├── src/
│   ├── App.tsx                 # Root state, consumer/merchant switching, localStorage sync
│   ├── main.tsx                # React mount point
│   ├── index.css               # Tailwind CSS v4 setup & design tokens
│   ├── types/
│   │   └── marketplace.ts      # TypeScript interfaces for listings, orders, merchants
│   ├── data/
│   │   └── mockMarketplace.ts  # Seeded listings, orders, explore areas/routes, demo merchant
│   └── components/
│       ├── ConsumerHome.tsx
│       ├── ConsumerSearch.tsx
│       ├── ConsumerExplore.tsx
│       ├── ConsumerOrders.tsx
│       ├── ConsumerProfile.tsx
│       ├── CheckoutFlow.tsx
│       ├── ListingDetailSheet.tsx
│       ├── FoodCard.tsx
│       ├── HorizontalCarousel.tsx
│       ├── QrCodeSvg.tsx
│       └── MerchantPortal.tsx
├── .env.example                # Environment variable template (no real secrets)
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Security Note Before Pushing

- Never commit `.env` or any file containing real API keys/credentials (`.gitignore` already ignores `.env` and `.env.*` while keeping `.env.example`).
- All persistence in the current prototype runs locally in the browser via `localStorage` under `tugutugu_*` keys.
