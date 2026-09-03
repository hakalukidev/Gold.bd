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

module.exports = { globalLimiter, authLimiter, otpRequestLimiter };
