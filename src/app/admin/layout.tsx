import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 text-sm">
        {[["/admin", "Overview"], ["/admin/activity", "Activity"], ["/admin/items", "Item review"], ["/admin/matching", "Matching"], ["/admin/exchanges", "Swaps"], ["/admin/disputes", "Reports"]].map(([h, l]) => (
          <Link key={h} href={h} className="rounded-full border border-ink/15 bg-white px-3 py-1 hover:border-plum">{l}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
