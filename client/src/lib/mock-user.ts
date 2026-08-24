import type { PublicUser } from "@/types";

/**
 * Stand-in for the signed-in user until a backend exists (see CLAUDE.md — this
 * repo has no `/api/auth/me` of its own), mirroring mock-rates.ts /
 * mock-settings.ts. Purely illustrative demo data: the name, phone and email
 * are placeholders for design work, not a real account.
 */
export const MOCK_USER: PublicUser = {
  id: "demo-user",
  fullName: "Robiul Islam Robin",
  phone: "+8801700000000",
  email: "robin@example.com",
  role: "USER",
  kycStatus: "PENDING",
  createdAt: "2026-01-01T00:00:00.000Z",
};
