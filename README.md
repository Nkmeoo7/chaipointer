# ☕ ChaiSpot — Chai Shop Discovery & Rewards Platform

> Discover chai shops near you, get directions, leave reviews, and earn points you can redeem for coupon codes.

**Live URL:** `[ADD AFTER DEPLOYMENT]`

---

## Quick Start (< 5 minutes)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier) or local MongoDB
- Mapbox account (free tier) — you need **two tokens**:
  - A **secret token** (`sk.eyJ1...`) for server-side Geocoding + Directions API
  - A **public token** (`pk.eyJ1...`) for Mapbox GL JS on the client

### 1. Clone & install
```bash
git clone <repo-url>
cd chaipointer

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment variables

**Server (`server/.env`):**
```bash
cp server/.env.example server/.env
# Fill in your values:
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=some_long_random_string
MAPBOX_SECRET_TOKEN=sk.eyJ1...
CLIENT_URL=http://localhost:5173
```

**Client (`client/.env`):**
```bash
cp client/.env.example client/.env
# Fill in:
VITE_MAPBOX_PUBLIC_TOKEN=pk.eyJ1...
```

### 3. Run locally

**Two terminals:**
```bash
# Terminal 1 — backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client && npm run dev
```

Open http://localhost:5173 — done.

### 4. Run tests
```bash
cd server && npm test
```
All 9 unit tests for the points/redemption logic should pass.

---

## Data Model

### User
```
email        String   unique, indexed
passwordHash String   bcrypt(12)
points       Number   default:0, min:0 (schema-enforced, never negative)
```
**Why:** Storing `points` on the User document gives us a single source of truth for the balance. The `min:0` validator is the last line of defense against negative balances.

### Shop
```
name          String
address       String   human-readable, as entered
description   String
photoUrl      String?
location      GeoJSON Point { type:"Point", coordinates:[lng,lat] }
averageRating Number   denormalized for fast map loads
reviewCount   Number   denormalized (updated atomically on each review)
createdBy     ObjectId → User
```
**Why:** `location` is a GeoJSON Point with a `2dsphere` index, enabling future proximity queries (`$near`). `averageRating` and `reviewCount` are denormalized — recalculating averages via aggregation on every map load would be expensive. They're updated atomically whenever a review is submitted or edited.

### Review
```
shop   ObjectId → Shop
user   ObjectId → User
rating Number  (1-5)
text   String  (max 500 chars)
```
**Why:** A compound unique index `{ shop: 1, user: 1 }` enforces the "one review per user per shop" rule at the database level, not just in application logic. Even if a race condition bypassed the application check, MongoDB would reject the duplicate with a `code:11000` error.

### Transaction
```
user       ObjectId → User
type       "earn" | "redeem"
points     Number
reason     String
couponCode String?  (only for redeem)
```
**Why:** Immutable ledger for auditing. `User.points` is the authoritative balance — this table is for history and debugging.

---

## Architecture Decisions

### Mapbox token security
The **secret token** is never sent to the client. Geocoding (address → lat/lng) happens server-side on `POST /api/shops`. Directions are also proxied through the backend (`GET /api/shops/:id/directions`). Only the **public token** (suitable for client exposure) goes into `VITE_MAPBOX_PUBLIC_TOKEN`.

### Points are never negative
Three layers of defense:
1. Application check before deduction (`if (user.points < threshold)`)
2. `$inc: -cost` with `runValidators: true` → triggers Mongoose `min:0`
3. No way to subtract more than the balance (check happens on fresh DB read, not cached token)

### Review duplicate prevention
1. Application pre-check: returns a 409 with the existing review ID (so the client can offer "Edit" instead of "Create")
2. DB compound unique index: even if two concurrent requests slip past check 1, only one will succeed

---

## Known Limitations / What I'd Do Differently

- **No rate limiting** on review submission (stretch goal) — `express-rate-limit` would take ~10 minutes to add
- **No leaderboard** — would be a simple aggregation query
- **Average rating** is updated in a non-atomic multi-document write (review create + shop update). For high-concurrency production use, a MongoDB transaction would be safer
- **Coupon codes are mock** — no integration with an actual discount system
- **No image uploads** — only URL references accepted (an S3 bucket + presigned URL flow would be the next step)
- **Geolocation is unreliable in testing environments** — that's why the manual start-address fallback is built in

---

## Deployment

| Service | What runs here |
|---|---|
| **Render** (free tier) | Node.js/Express server |
| **Vercel** (free tier) | React client |
| **MongoDB Atlas** (free M0 tier) | Database |

Set `CLIENT_URL` on Render to your Vercel URL. Set `VITE_MAPBOX_PUBLIC_TOKEN` in Vercel's environment variables.
