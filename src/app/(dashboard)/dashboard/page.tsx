import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import ModuleGrid from "@/components/features/modules/module-grid";
import FlgoPrefetch from "@/components/features/dashboard/flgo-prefetch";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("riveros_token")?.value;
  const user = token ? await verifyToken(token) : null;

  const firstName = user?.name?.split(" ")[0] || user?.name || "there";

  return (
    <div>
      {/* Silent background prefetch — populates FLGO store while user is on dashboard */}
      <FlgoPrefetch />
      {/* Page header */}
      <div className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-400 mb-2">
          Operations Dashboard
        </p>
        <h1 className="text-[28px] font-bold text-[#04111f] tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500">
          Select a module to get started.
        </p>
      </div>

      {/* Module grid — client component for hover interactivity */}
      <ModuleGrid />
    </div>
  );
}
