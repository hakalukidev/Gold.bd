const DAY_MS = 24 * 60 * 60 * 1000;

/** Start-of-period cutoffs (epoch ms), Sunday-start week — shared by
 * anything that buckets timestamps into today/this-week/this-month/this-year.
 * Takes `now` as a param (defaulting to the real clock) so it stays testable. */
export function periodCutoffs(now: Date = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - now.getDay() * DAY_MS;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  return { today: startOfToday, thisWeek: startOfWeek, thisMonth: startOfMonth, thisYear: startOfYear, allTime: 0 };
}
