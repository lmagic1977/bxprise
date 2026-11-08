import "server-only";
import { categoryLabel, platformLabel, RIDDLE_MODEL } from "./config";

type ItemLike = {
  title: string;
  brand: string | null;
  category: string;
  platform: string | null;
  description: string;
};

// Generic words that appear in titles but don't give the item away.
const STOP = new Set([
  "the", "and", "with", "for", "from", "set", "box", "game", "games", "edition", "series", "pack", "book", "books",
  "mode", "rage", "base", "deluxe", "party", "classic", "collection", "complete", "special", "limited", "volume",
  "part", "new", "used", "board", "card", "cards", "puzzle", "piece", "pieces", "toys", "figure", "studio", "studios",
  "your", "this", "that", "into", "over", "life", "love", "time", "world", "play",
]);

// Words that would give the item away if they appeared in the clue.
function giveaways(it: ItemLike) {
  return `${it.title} ${it.brand ?? ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

export function riddleLeaks(riddle: string, it: ItemLike): string | null {
  const r = riddle.toLowerCase();
  return giveaways(it).find((w) => r.includes(w)) ?? null;
}

const SYSTEM = `You write one-line riddle clues for a mystery-box swap site.
The receiver reads the clue while their box is in the mail and tries to guess what's inside.
Rules:
- Describe what the item does, how it feels, or the experience it gives — never what it is.
- Never use the item's name, brand, model, title, author, characters or any word from them.
- No prices, no personal details, nothing negative.
- English, one sentence, at most 10 words, playful and warm.
- Reply with the clue only: no quotes, no explanation.
Example: a padlock → Something that keeps your things safe.`;

export const riddleAvailable = () => !!process.env.ANTHROPIC_API_KEY;

async function askOnce(it: ItemLike, avoid: string[]): Promise<string | null> {
  const details = [
    `Category: ${categoryLabel(it.category)}${it.platform ? ` (${platformLabel(it.platform)})` : ""}`,
    `Item: ${it.title}${it.brand ? ` by ${it.brand}` : ""}`,
    `Description: ${it.description.slice(0, 600)}`,
    `Forbidden words (do not use them or any form of them): ${[...new Set([...giveaways(it), ...avoid])].join(", ") || "none"}`,
  ].join("\n");
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: RIDDLE_MODEL,
      max_tokens: 60,
      system: SYSTEM,
      messages: [{ role: "user", content: details }],
    }),
  });
  if (!res.ok) throw new Error(`Riddle API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim().replace(/^["“]|["”]$/g, "");
  return text ? text.split("\n")[0].slice(0, 120) : null;
}

// Returns a clue that passed the giveaway check, or null (admin writes one by hand).
export async function generateRiddle(it: ItemLike): Promise<string | null> {
  if (!riddleAvailable()) return null;
  const avoid: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await askOnce(it, avoid);
    if (!r) continue;
    const leak = riddleLeaks(r, it);
    if (!leak) return r;
    avoid.push(leak);
  }
  return null;
}
