# Saffron & Stone

This is a beginner-friendly restaurant website featuring 40 Tamil Nadu-inspired dishes (10 vegetarian, 10 non-vegetarian, 10 desserts, and 10 drinks), an INR cart, demo checkout options, and browser-based demo sign-in.

Menu images are spread across each category to reduce repetition. Licensed Wikimedia Commons photo overrides display author and license credits; other dishes use representative category images.

## Run locally

1. Install Node.js 20 or later.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env`.
4. Generate a session secret with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Put the generated value in `SESSION_SECRET` in `.env`.
5. Run `npm start` and open `http://localhost:3000`.

Demo sign-in works without Google credentials. It stores only the label “Demo Guest” in this browser and does not verify identity. The optional Google OAuth backend scaffold is not connected to the website's sign-in button.

## Optional Google OAuth backend scaffold

The server retains Google OAuth routes for possible future use, but the current website does not call them. To configure that scaffold, create an OAuth client ID for a **Web application** in Google Cloud Console and add these local URLs:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/auth/google/callback`

Copy the client ID and client secret into `.env`. Never put the client secret in HTML or JavaScript, and do not commit `.env`. Google credentials are not required for the demo sign-in.

The menu can be searched by dish name or description, including alongside the category filters. The cart saves items in browser storage, shows quantities and totals, and offers demo UPI, card, and cash-on-pickup options. After demo checkout, the site opens a dedicated order-tracking page and then offers the feedback page; feedback is saved only in the current browser and is not sent to the restaurant. The Support page contains clearly labeled placeholder contact details. The separate tracker shows a sample timeline for the current browser session, not a live fulfillment update or real support service. Demo checkout does not collect payment details or charge money. The contact form is also a demo and does not send messages.

The shared menu uses `menu-data.js`, with `menu-photo-data.js` providing licensed photo overrides and attribution details.

The unused OAuth scaffold uses Passport's state check, an HTTP-only session cookie, and an API endpoint that exposes only the signed-in user's basic profile. Demo sign-in is separate and does not submit orders or messages.

## Production note

The included in-memory session store is for local development only. Before production, configure HTTPS and replace it with a persistent session store shared by all server instances. Set `NODE_ENV=production`, use an HTTPS `GOOGLE_CALLBACK_URL`, and bind to the host provided by your hosting platform (the default is `0.0.0.0` in production).
