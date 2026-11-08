import { z } from "zod";

const num = (max: number) => z.coerce.number().nonnegative().max(max).nullable().catch(null);
const str = (max: number) => z.string().transform((s) => s.slice(0, max)).nullable().catch(null);

// Lenient on purpose: a model reply with one odd field should still give the
// person a useful suggestion, with the odd field dropped.
export const suggestionSchema = z.object({
  identified: z.coerce.boolean().catch(false),
  title: str(120).optional().transform((v) => v ?? null),
  brand: str(80).optional().transform((v) => v ?? null),
  category: str(40).optional().transform((v) => v ?? null),
  platform: str(40).optional().transform((v) => v ?? null),
  confidence: z.enum(["low", "medium", "high"]).catch("low"),
  productWeightOz: num(400).optional().transform((v) => v || null),
  productDimsIn: z.array(z.coerce.number().positive().max(60)).length(3).nullable().catch(null).optional().transform((v) => v ?? null),
  usedPriceLowUsd: num(5000).optional().transform((v) => v ?? null),
  usedPriceHighUsd: num(5000).optional().transform((v) => v ?? null),
  priceBasis: str(400).optional().transform((v) => v ?? null),
  notes: str(400).optional().transform((v) => v ?? null),
  sources: z
    .array(z.object({ title: z.string().catch("source").transform((s) => s.slice(0, 200)), url: z.string().url().max(500) }).nullable().catch(null))
    .catch([])
    .optional()
    .transform((a) => (a ?? []).filter((x): x is { title: string; url: string } => !!x).slice(0, 8)),
  // Filled in by our code, not the model:
  packedWeightOz: z.number().nullable().optional(),
  packedDimsIn: z.array(z.number()).length(3).nullable().optional(),
  searched: z.boolean().optional(),
  model: z.string().optional(),
});
export type Suggestion = z.output<typeof suggestionSchema>;
