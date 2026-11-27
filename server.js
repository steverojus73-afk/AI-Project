"use strict";

require("dotenv").config();

const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const host = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const sessionSecret = process.env.SESSION_SECRET || "";
const clientId = process.env.GOOGLE_CLIENT_ID || "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${port}/auth/google/callback`;
const callbackOrigin = new URL(callbackUrl).origin;
const googleConfigured = Boolean(clientId && clientSecret);
const accountsFile = path.join(__dirname, "data", "accounts.json");

fs.mkdirSync(path.dirname(accountsFile), { recursive: true });
if (!fs.existsSync(accountsFile)) fs.writeFileSync(accountsFile, "[]", "utf8");

function loadAccounts() {
  try {
    const accounts = JSON.parse(fs.readFileSync(accountsFile, "utf8"));
    return Array.isArray(accounts) ? accounts : [];
  } catch (error) {
    console.error("Could not read the account store.", error);
    return [];
  }
}

function saveAccounts(accounts) {
  fs.writeFileSync(accountsFile, `${JSON.stringify(accounts, null, 2)}\n`, "utf8");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, encodedPassword) {
  const parts = String(encodedPassword).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = crypto.scryptSync(password, parts[1], 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sameOrigin(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  return origin === `${req.protocol}://${req.get("host")}`;
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

if (sessionSecret.length < 32) {
  throw new Error("Set SESSION_SECRET to a random value at least 32 characters long in .env.");
}

if (isProduction && new URL(callbackUrl).protocol !== "https:") {
  throw new Error("GOOGLE_CALLBACK_URL must use HTTPS in production.");
}

if (isProduction) app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "https://images.unsplash.com", "https://images.pexels.com", "https://thumb.wikimedia.org", "https://upload.wikimedia.org", "data:"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

app.use(session({
  name: "saffron.sid",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json({ limit: "16kb" }));

if (googleConfigured) {
  passport.use(new GoogleStrategy({
    clientID: clientId,
    clientSecret,
    callbackURL: callbackUrl,
    state: true
  }, (_accessToken, _refreshToken, profile, done) => {
    done(null, {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails && profile.emails[0] ? profile.emails[0].value : "",
      picture: profile.photos && profile.photos[0] ? profile.photos[0].value : ""
    });
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get(["/index.html", "/veg.html", "/non-veg.html", "/desserts.html", "/drinks.html", "/cart.html", "/feedback.html", "/support.html", "/tracking.html"], (req, res) => {
  res.sendFile(path.join(__dirname, req.path.slice(1)));
});
app.get("/styles.css", (_req, res) => res.sendFile(path.join(__dirname, "styles.css")));
app.get("/menu-data.js", (_req, res) => res.sendFile(path.join(__dirname, "menu-data.js")));
app.get("/menu-photo-data.js", (_req, res) => res.sendFile(path.join(__dirname, "menu-photo-data.js")));
app.get("/script.js", (_req, res) => res.sendFile(path.join(__dirname, "script.js")));

app.get("/auth/google", (req, res, next) => {
  if (!googleConfigured) {
    return res.status(503).type("text").send("Google sign-in is not configured. Add the Google client ID and secret to .env.");
  }
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

app.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!googleConfigured) {
      return res.status(503).type("text").send("Google sign-in is not configured.");
    }
    return next();
  },
  passport.authenticate("google", { failureRedirect: "/?signin=failed" }),
  (_req, res) => res.redirect("/?signin=success")
);

app.get("/api/auth/status", (req, res) => {
  res.set("Cache-Control", "no-store");
  const authenticated = req.isAuthenticated();
  return res.json({
    configured: true,
    googleConfigured,
    method: "account",
    authenticated,
    user: authenticated ? req.user : null
  });
});

app.get("/api/me", (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!req.isAuthenticated()) return res.sendStatus(401);
  return res.json({ user: req.user });
});

app.post("/api/auth/register", (req, res) => {
  if (!sameOrigin(req)) return res.sendStatus(403);

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ message: "Enter a name between 2 and 80 characters." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
  }

  const accounts = loadAccounts();
  if (accounts.some((account) => account.email === email)) {
    return res.status(409).json({ message: "An account already exists with this email." });
  }

  const account = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  accounts.push(account);
  saveAccounts(accounts);

  req.login({
    id: account.id,
    name: account.name,
    email: account.email,
    picture: ""
  }, (loginError) => {
    if (loginError) {
      console.error("Could not create the account session.", loginError);
      return res.sendStatus(500);
    }
    return res.status(201).json({ user: req.user });
  });
});

app.post("/api/auth/login", (req, res) => {
  if (!sameOrigin(req)) return res.sendStatus(403);

  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!isValidEmail(email) || password.length === 0 || password.length > 128) {
    return res.status(400).json({ message: "Enter a valid email address and password." });
  }

  const account = loadAccounts().find((item) => item.email === email);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }

  req.login({
    id: account.id,
    name: account.name,
    email: account.email,
    picture: ""
  }, (loginError) => {
    if (loginError) {
      console.error("Could not create the account session.", loginError);
      return res.sendStatus(500);
    }
    return res.json({ user: req.user });
  });
});

app.post("/auth/logout", (req, res, next) => {
  if (!sameOrigin(req)) return res.sendStatus(403);
  if (!req.isAuthenticated()) return res.sendStatus(204);

  req.logout((logoutError) => {
    if (logoutError) return next(logoutError);
    return req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("saffron.sid", { path: "/" });
      return res.sendStatus(204);
    });
  });
});

app.use((_req, res) => res.sendStatus(404));

app.use((error, _req, res, next) => {
  console.error("Request failed.", error);
  if (res.headersSent) return next(error);
  return res.status(500).type("text").send("An unexpected error occurred.");
});

app.listen(port, host, () => {
  console.log(`Saffron & Stone is running at http://localhost:${port}`);
  if (!googleConfigured) {
    console.warn("Google sign-in is disabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.");
  }
});
