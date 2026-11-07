// Every number here is a pilot parameter, not a final policy.

export const CATEGORIES = [
  { id: "board_games_puzzles", label: "Board games & puzzles", open: true },
  { id: "toys_figures", label: "Designer toys & figures", open: true },
  { id: "craft_yarn", label: "Craft supplies & yarn", open: true },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const categoryLabel = (id: string) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const CONDITIONS = [
  { id: "new", label: "New / sealed" },
  { id: "like_new", label: "Like new" },
  { id: "good", label: "Good — works fully, light wear" },
] as const;

export const conditionLabel = (id: string) =>
  CONDITIONS.find((c) => c.id === id)?.label ?? id;

export const conditionRank: Record<string, number> = { good: 1, like_new: 2, new: 3 };

// Packed limits.
export const MAX_WEIGHT_LB = 15;
export const MAX_DIMS_IN: [number, number, number] = [24, 18, 18]; // sorted desc

// Value tiers, unlocked by reputation.
export const TIERS = [
  { id: "starter", label: "Starter", minCents: 1500, maxCents: 4000, minCompleted: 0, minScore: 0 },
  { id: "plus", label: "Plus", minCents: 4000, maxCents: 10000, minCompleted: 3, minScore: 60 },
] as const;
export type TierId = (typeof TIERS)[number]["id"];

export const BASE_REPUTATION = 50;
export const REPUTATION_POINTS = {
  completed: 5,
  on_time_pickup: 2,
  packing_photo: 1,
  review_matches: 3,
  review_mismatch: -15,
  late_pickup: -5,
  fraud_confirmed: -30,
} as const;
export const SUSPEND_AFTER_FRAUD = 2;

export const ACCEPT_WINDOW_HOURS = 48;
export const SHIP_WINDOW_DAYS = 4;
export const REVIEW_AUTO_PUBLISH_DAYS = 7;
export const MAX_WAIT_DAYS_BEFORE_REFUND = 30;

export const MAX_PHOTOS = 6;
export const MIN_PHOTOS = 3;

// When no real payment / label provider is configured the site runs in test
// mode and says so on every page that shows money or shipping.
export const TEST_MODE = !process.env.STRIPE_SECRET_KEY || !process.env.SHIPPING_API_KEY;
