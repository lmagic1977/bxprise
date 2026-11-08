import { z } from "zod";

export const suggestionSchema = z.object({
  identified: z.boolean(),
  title: z.string().max(120).nullable(),
  brand: z.string().max(80).nullable(),
  category: z.string().nullable(),
  platform: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  productWeightOz: z.number().positive().max(400).nullable(),
  productDimsIn: z.array(z.number().positive().max(60)).length(3).nullable(),
  usedPriceLowUsd: z.number().nonnegative().max(5000).nullable(),
  usedPriceHighUsd: z.number().nonnegative().max(5000).nullable(),
  priceBasis: z.string().max(400).nullable(),
  notes: z.string().max(400).nullable(),
  sources: z.array(z.object({ title: z.string().max(200), url: z.string().url().max(500) })).max(8),
  // Filled in by our code, not the model:
  packedWeightOz: z.number().nullable().optional(),
  packedDimsIn: z.array(z.number()).length(3).nullable().optional(),
  searched: z.boolean().optional(),
  model: z.string().optional(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;
