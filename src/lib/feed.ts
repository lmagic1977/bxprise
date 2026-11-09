import { and, desc, eq, gt, inArray, isNull, notLike } from "drizzle-orm";
import { db, schema } from "@/db";

export type FeedRow = { key: string; name: string; place: string; category: string; at: string | null; example: boolean };

const SHORT: Record<string, string> = {
  board_games_puzzles: "Board game",
  toys_figures: "Designer toy",
  craft_yarn: "Craft & yarn",
  books: "Book",
  movies_music: "Movies & music",
  video_games: "Video game",
  trading_cards: "Trading cards",
};

// Clearly labeled illustrations, shown only while there is little real activity.
const EXAMPLES: [string, string, string, string][] = [
  ["Mike", "Redlands, CA", "video_games", "12:15 11/15"],
  ["Ana", "Austin, TX", "books", "11:42 11/15"],
  ["Chris", "Portland, OR", "board_games_puzzles", "10:36 11/15"],
  ["Jess", "Columbus, OH", "trading_cards", "09:18 11/15"],
  ["Sam", "Denver, CO", "craft_yarn", "18:52 11/14"],
  ["Lee", "Atlanta, GA", "toys_figures", "17:34 11/14"],
  ["Dana", "Seattle, WA", "movies_music", "15:08 11/14"],
  ["Ray", "Phoenix, AZ", "video_games", "13:26 11/14"],
];

export function exampleBoxes(limit = EXAMPLES.length): FeedRow[] {
  return EXAMPLES.slice(0, limit).map(([name, place, cat, at], i) => ({
    key: `e${i}`, name, place, category: SHORT[cat], at, example: true,
  }));
}

const MIN_REAL = 6;
const SHOWN = ["valuation_ready", "in_pool", "paused", "proposed", "locked", "exchanged"];

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false, month: "2-digit", day: "2-digit",
});
function stamp(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute} ${p.month}/${p.day}`;
}

export async function recentBoxes(): Promise<FeedRow[]> {
  const since = new Date(Date.now() - 60 * 86400_000);
  const rows = await db
    .select({
      id: schema.items.id, category: schema.items.category, at: schema.items.createdAt,
      name: schema.users.displayName, city: schema.users.city, state: schema.users.state,
    })
    .from(schema.items)
    .innerJoin(schema.users, eq(schema.items.ownerId, schema.users.id))
    .where(and(
      inArray(schema.items.status, SHOWN),
      gt(schema.items.createdAt, since),
      eq(schema.users.showInFeed, true),
      isNull(schema.users.suspendedAt),
      isNull(schema.users.deletionRequestedAt),
      notLike(schema.users.email, "%@bxprise.test"),
    ))
    .orderBy(desc(schema.items.createdAt))
    .limit(20);

  const real: FeedRow[] = rows
    .filter((r) => r.city && r.state)
    .map((r) => {
      const first = r.name.trim().split(/\s+/)[0].slice(0, 14);
      return {
        key: `i${r.id}`,
        name: first.charAt(0).toUpperCase() + first.slice(1),
        place: `${r.city!.trim()}, ${r.state!.toUpperCase()}`,
        category: SHORT[r.category] ?? r.category,
        at: stamp(r.at),
        example: false,
      };
    });
  if (real.length >= MIN_REAL) return real;
  return [...real, ...exampleBoxes(8 - real.length)];
}
