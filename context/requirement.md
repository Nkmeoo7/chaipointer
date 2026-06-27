Project: "ChaiSpot" — Chai Shop Discovery & Rewards Platform
------------------------------------------------------------

1.  Context
    

ChaiSpot is a small platform where users can discover chai shops near them on a map, get directions, leave reviews, and earn points for contributing — which they can redeem for coupon codes. You're building a working prototype of the core flow, not the finished product.We care more about how you think, structure code, and handle edge cases than about visual polish.

1.  What to build
    

### Core features (required)

**A. Chai shop listings**

*   A way to add a new chai shop: name, address/location, description, optional photo URL.
    
*   Use the Mapbox **Geocoding API** to convert the entered address into lat/lng coordinates server-side (don't make the user manually enter coordinates).
    
*   Store shops in a database.
    

**B. Map view**

*   Show all chai shops as markers on a Mapbox map (Mapbox GL JS).
    
*   Clicking a marker shows shop name, average rating, and a "Get Directions" action.
    
*   "Get Directions" should use the Mapbox **Directions API** to draw a route from the user's current location (or a manually entered start point — browser geolocation can be flaky in test environments, so support both) to the selected shop.
    

**C. Reviews**

*   Logged-in users can add a review (rating 1-5 + short text) for a shop.
    
*   A shop's average rating should update and reflect on the map/listing view.
    
*   A user can only review a given shop once (edit allowed, duplicate-create not allowed).
    

**D. Points & rewards**

*   A user earns points for each review they submit (e.g. +10 points). First review on a _new_ shop (one with zero existing reviews) earns a bonus (e.g. +15 instead of +10) — this rewards people for discovering new spots, not just farming reviews on popular ones.
    
*   Users can see their current point balance.
    
*   Once a user crosses a threshold (e.g. 50 points), they can redeem a coupon code for a participating chai shop. Generate a mock random coupon code (e.g. CHAI-X7K2P9) and deduct the points. No real payment/discount logic needed — this is just state + a generated string.
    
*   A user shouldn't be able to redeem more points than they have (handle this server-side, not just in the UI).
    

**E. Auth (minimal)**

*   Simple email/password signup+login is enough.
    

1.  Tech expectations
    

*   **Stack:** MERN — MongoDB, Express, React, Node.js.
    
*   **Frontend:** React + Mapbox GL JS.
    
*   **Backend:** Node.js/Express.
    
*   **Database:** MongoDB.
    
*   **Mapbox:** Use a free-tier Mapbox account/token. We'll provide a token if you don't want to sign up, just ask.
    

1.  Deliverables
    
2.  GitHub repo (public or invite us) with frontend + backend code.
    
3.  **A live, hosted URL** where we can actually use the app — frontend and backend, both deployed and working (e.g. Vercel/Netlify for frontend, Render/Railway for backend, MongoDB Atlas for the DB — all of these have free tiers). A local-only submission won't be reviewed.
    
4.  README.md with:
    
    1.  Setup/run instructions for running it locally (we should be able to run this locally in under 5 minutes)
        
    2.  The live URL, clearly linked
        
    3.  A short explanation of your data model
        
    4.  Known limitations / what you'd do differently with more time
        
5.  A 2-3 minute screen recording (Loom or similar) walking through the working app. This matters as much as the code — it shows us how you talk about your own work.
    
6.  Stretch goals (totally optional, only if you have time left)
    

*   Search/filter shops by name or minimum rating.
    
*   Leaderboard of top point-earners.
    
*   Rate-limit or cooldown on review submission to discourage spam.
    
*   Basic test coverage on the points/redemption logic (this is the one stretch goal we'd actually weight meaningfully — it's the trickiest logic to get right).
