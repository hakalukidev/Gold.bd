const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const env = require("./config/env");
const logger = require("./utils/logger");
const { globalLimiter } = require("./middleware/rate-limit");
const { notFoundHandler, errorHandler } = require("./middleware/error-handler");
const authRoutes = require("./modules/auth/auth.routes");

const app = express();

// Needed so `req.ip` reflects the real client (not the proxy) when deployed
// behind a load balancer/reverse proxy — otherwise rate limiting and audit
// logs key off the proxy's address instead of the caller's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  })
);
app.use(hpp());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(globalLimiter);

app.get("/health", (req, res) => res.status(200).json({ success: true, data: { status: "ok" } }));

app.use("/api/auth", authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
