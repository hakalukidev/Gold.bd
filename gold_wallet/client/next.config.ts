import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Each app is installed independently and has its own lockfile, so Next would
  // otherwise walk up and infer the repo root as the workspace. Pinning it here
  // keeps file tracing scoped to this project.
  turbopack: { root: path.resolve(import.meta.dirname) },
  images: {
    // Needed for the local payment-method logos (bKash/Visa/Mastercard/Nagad)
    // under public/payment-logos — next/image refuses SVG sources by default
    // as an XSS precaution. Safe here: these are our own checked-in files,
    // not user-uploaded/remote, and script-src 'none' blocks any embedded
    // script from running even if one slipped in.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
