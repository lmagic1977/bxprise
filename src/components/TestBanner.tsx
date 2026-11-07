import { TEST_MODE } from "@/lib/config";

export function TestBanner() {
  if (!TEST_MODE) return null;
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
      Test mode — no real payments are taken and no real shipping labels are created. Postage and tracking shown are simulated.
    </div>
  );
}
