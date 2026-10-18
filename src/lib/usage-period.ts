/**
 * Monthly allowances reset at 00:00 UTC on the first day of each calendar
 * month. The period start is stored on each usage event, so a new month
 * automatically starts with a fresh allowance.
 */
export function currentUsagePeriod(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}
