import { TZDate } from "@date-fns/tz";
import { endOfDay, startOfDay, subDays } from "date-fns";

// The shop's own timezone. A server abroad runs on its own clock (often UTC), so "today" and the
// start/end of each report day are always worked out in this zone instead. Override with SHOP_TIMEZONE.
export const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || "Asia/Karachi";

// A calendar day in the shop's timezone. A "YYYY-MM-DD" string means that day (as typed in a date box);
// a Date means the day that moment falls on there; nothing means today.
function shopDay(input?: string | Date | null): TZDate | null {
  if (input === undefined || input === null || input === "") {
    return new TZDate(new Date(), SHOP_TIMEZONE);
  }
  if (typeof input === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
    if (!match) return null;
    return new TZDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]), SHOP_TIMEZONE);
  }
  return new TZDate(input, SHOP_TIMEZONE);
}

// First moment of that shop-day (optionally some days earlier). null if the input isn't a valid day.
export function startOfShopDay(input?: string | Date | null, daysAgo = 0): Date | null {
  const day = shopDay(input);
  if (!day || Number.isNaN(day.getTime())) return null;
  return new Date(startOfDay(subDays(day, daysAgo)).getTime());
}

// Last moment of that shop-day.
export function endOfShopDay(input?: string | Date | null): Date | null {
  const day = shopDay(input);
  if (!day || Number.isNaN(day.getTime())) return null;
  return new Date(endOfDay(day).getTime());
}

// Is this moment inside today, in the shop's timezone?
export function isToday(moment: Date): boolean {
  const from = startOfShopDay();
  const to = endOfShopDay();
  return !!from && !!to && moment >= from && moment <= to;
}
