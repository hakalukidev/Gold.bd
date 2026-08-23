/**
 * Real (not fabricated) site-visit tracking, stored the same way as
 * mock-rates.ts/mock-settings.ts — in-memory, since this repo has no
 * database (see CLAUDE.md). Counts start from zero whenever the dev server
 * (re)starts; there's no persistence across restarts or across separate
 * server instances. POST /api/visits appends to this on every page load
 * (see components/visitor-tracker.tsx); GET /api/admin/visits reads it.
 */

import { periodCutoffs } from "@/lib/date-buckets";

interface VisitRecord {
  visitorId: string;
  at: number; // epoch ms
}

const visits: VisitRecord[] = [];

// A long-running dev server could otherwise accumulate this forever —
// cap it well above anything a demo would realistically hit.
const MAX_RECORDS = 200_000;

export function recordVisit(visitorId: string): void {
  visits.push({ visitorId, at: Date.now() });
  if (visits.length > MAX_RECORDS) visits.splice(0, visits.length - MAX_RECORDS);
}

export interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    allTime: number;
  };
}

function uniqueVisitorsSince(cutoff: number): number {
  const ids = new Set<string>();
  for (const v of visits) if (v.at >= cutoff) ids.add(v.visitorId);
  return ids.size;
}

export function getVisitorStats(): VisitorStats {
  const cutoffs = periodCutoffs();

  return {
    totalVisits: visits.length,
    uniqueVisitors: {
      today: uniqueVisitorsSince(cutoffs.today),
      thisWeek: uniqueVisitorsSince(cutoffs.thisWeek),
      thisMonth: uniqueVisitorsSince(cutoffs.thisMonth),
      thisYear: uniqueVisitorsSince(cutoffs.thisYear),
      allTime: uniqueVisitorsSince(cutoffs.allTime),
    },
  };
}
