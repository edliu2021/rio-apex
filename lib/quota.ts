import {
  planCaps,
  planName,
  leadsToday,
  sendsToday,
  sendsThisMonth,
} from "./db";

// The numbers the Actions header + Step 1/Step 4 meters render.
export type QuotaSnapshot = {
  plan: string;
  leads: { used: number; cap: number; remaining: number };
  sendsDay: { used: number; cap: number; remaining: number };
  sendsMonth: { used: number; cap: number; remaining: number };
};

export function snapshot(): QuotaSnapshot {
  const caps = planCaps();
  const leadsUsed = leadsToday();
  const dayUsed = sendsToday();
  const monthUsed = sendsThisMonth();
  return {
    plan: planName(),
    leads: {
      used: leadsUsed,
      cap: caps.leadsPerDay,
      remaining: Math.max(0, caps.leadsPerDay - leadsUsed),
    },
    sendsDay: {
      used: dayUsed,
      cap: caps.sendsPerDay,
      remaining: Math.max(0, caps.sendsPerDay - dayUsed),
    },
    sendsMonth: {
      used: monthUsed,
      cap: caps.emailsPerMonth,
      remaining: Math.max(0, caps.emailsPerMonth - monthUsed),
    },
  };
}

// How many leads we're allowed to scrape right now (bounded by request + daily cap).
export function allowedScrape(requested: number): number {
  const { leads } = snapshot();
  return Math.max(0, Math.min(requested, leads.remaining));
}

// How many emails we're allowed to send right now (bounded by request, daily + monthly caps).
export function allowedSend(requested: number): number {
  const { sendsDay, sendsMonth } = snapshot();
  return Math.max(0, Math.min(requested, sendsDay.remaining, sendsMonth.remaining));
}
