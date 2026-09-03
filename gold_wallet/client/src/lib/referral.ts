/**
 * Referral program stand-in — there's no `/api/referrals` in this repo (see
 * CLAUDE.md), so the code is derived from the user id and the reward is a
 * fixed figure. Shared by the wallet page's "Refer & earn" card and the
 * profile page's referral row so a user never sees two different codes.
 */

/** Gold both sides earn when an invited friend makes their first purchase. */
export const REFERRAL_REWARD_GRAMS = 0.02;

export function referralCode(userId: string): string {
  return `GOLDBD-${userId.slice(0, 4).toUpperCase()}`;
}

export function referralLink(userId: string): string {
  return `https://gold.bd/r/${referralCode(userId)}`;
}
