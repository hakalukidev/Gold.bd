const rateLimit = require("express-rate-limit");

/** Generous ceiling for the whole API — a backstop against blunt abuse/DoS. */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tight limiter for register/login/refresh: these are the endpoints a
 * credential-stuffing or brute-force script would hammer. Keyed by IP+phone
 * so one attacker can't lock out a victim's account by spamming from many IPs
 * without also being throttled themselves, and can't drown out other users
 * from one IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.phone || ""}`,
  message: { success: false, error: "Too many attempts. Please try again later." },
});

/**
 * Guards the two endpoints that trigger an SMS send. Keyed by phone alone
 * (not IP) — the abuse this stops is spamming a *victim's* phone with texts,
 * which an attacker could otherwise dodge by rotating IPs.
 */
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: { success: false, error: "Too many verification codes requested. Please try again later." },
});

/** Bounds how often one caller can spin up a new SSLCommerz session — each
 * call is an outbound API request to the gateway, so this is as much about
 * not hammering SSLCommerz as it is about abuse from one IP. */
const paymentInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many payment attempts. Please try again later." },
});

/** Bounds how often one signed-in caller can submit a buy/sell — generous
 * enough for normal trading, tight enough that a scripted hammering of the
 * balance-mutating endpoint gets throttled. Keyed by user id (always present
 * — the route requires auth) rather than IP, so it can't be dodged by
 * rotating IPs and doesn't penalize other users behind the same NAT/proxy. */
const tradeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
  message: { success: false, error: "Too many trade requests. Please try again later." },
});

module.exports = { globalLimiter, authLimiter, otpRequestLimiter, paymentInitLimiter, tradeLimiter };
