import "server-only";
import {
  CATEGORIES, PLATFORMS, IDENTIFY_MODEL, WEB_SEARCH_TOOL, MAX_DIMS_IN, MAX_WEIGHT_LB, PACK_PAD_IN, PACK_PAD_OZ,
} from "./config";
import { suggestionSchema, type Suggestion } from "./identify-types";

export const identifyAvailable = () => !!process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You identify second-hand items from photos for a US mystery-swap site.
Open categories (use the id): ${CATEGORIES.map((c) => `${c.id} = ${c.label}`).join("; ")}.
Game platforms (use the id): ${PLATFORMS.map((p) => `${p.id} = ${p.label}`).join("; ")}.

Steps:
1. Identify the exact product (title, edition, brand/publisher, platform for games) from the photos and the owner's note.
2. If web search is available, look up (a) the product's own box/package dimensions and weight, and (b) recent US second-hand SOLD prices (eBay sold listings, BoardGameGeek marketplace, Brickset, PriceCharting, etc.).
3. Reply with ONLY a JSON object, no prose, matching:
{"identified":bool,"title":string|null,"brand":string|null,"category":id|null,"platform":id|null,
 "confidence":"low"|"medium"|"high","productWeightOz":number|null,"productDimsIn":[l,w,h]|null,
 "usedPriceLowUsd":number|null,"usedPriceHighUsd":number|null,"priceBasis":string|null,"notes":string|null,
 "sources":[{"title":string,"url":string}]}

Rules:
- Never invent numbers. If you did not find a source for a price, set both prices and priceBasis to null.
- Product dims/weight are for the item's own retail box; null if unknown.
- Prices are for used, complete copies; mention in priceBasis how many sold listings you saw and when.
- In notes, flag anything the photos show that matters: missing parts, damage, wrong category, counterfeit signs, batteries/liquids (not allowed).
- If you can't tell what it is, set identified=false and explain in notes.
- sources: only pages you actually opened in search results.`;

type Img = { mediaType: string; data: string };

async function call(images: Img[], note: string, withSearch: boolean) {
  const body: Record<string, unknown> = {
    model: IDENTIFY_MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: [
        ...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mediaType, data: i.data } })),
        { type: "text", text: `Owner's note: ${note || "(none)"}` },
      ],
    }],
  };
  if (withSearch) body.tools = [{ type: WEB_SEARCH_TOOL, name: "web_search", max_uses: 4 }];
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body),
  });
  return res;
}

function packed(s: Suggestion): Pick<Suggestion, "packedWeightOz" | "packedDimsIn"> {
  const dims = s.productDimsIn
    ? (s.productDimsIn.map((d) => Math.ceil(d + PACK_PAD_IN)).sort((a, b) => b - a) as number[])
    : null;
  const fits = dims && dims[0] <= MAX_DIMS_IN[0] && dims[1] <= MAX_DIMS_IN[1] && dims[2] <= MAX_DIMS_IN[2];
  const oz = s.productWeightOz ? Math.ceil(s.productWeightOz + PACK_PAD_OZ) : null;
  return { packedDimsIn: fits ? dims : null, packedWeightOz: oz && oz <= MAX_WEIGHT_LB * 16 ? oz : null };
}

export async function identifyItem(images: Img[], note: string): Promise<Suggestion> {
  let searched = true;
  let res = await call(images, note, true);
  if (res.status === 400) {
    // Search tool not available on this account/model: identify without it, and drop prices.
    searched = false;
    res = await call(images, note, false);
  }
  if (!res.ok) throw new Error(`AI service error (${res.status}). Fill the form by hand for now.`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let parsed: Suggestion;
  try {
    parsed = suggestionSchema.parse(JSON.parse(json));
  } catch {
    throw new Error("AI couldn't read this item. Fill the form by hand.");
  }
  if (!CATEGORIES.some((c) => c.id === parsed.category)) parsed.category = null;
  if (!PLATFORMS.some((p) => p.id === parsed.platform)) parsed.platform = null;
  if (!searched || parsed.sources.length === 0) {
    parsed.usedPriceLowUsd = parsed.usedPriceHighUsd = null;
    parsed.priceBasis = null;
  }
  return { ...parsed, ...packed(parsed), searched, model: IDENTIFY_MODEL };
}
