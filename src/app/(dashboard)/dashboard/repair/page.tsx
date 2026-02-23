import { Hammer, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function RepairPage() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors mb-8"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
          <Hammer className="w-6 h-6 text-rose-600" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#04111f]">Repair</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Repair requests &amp; work orders
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <p className="text-slate-400 text-sm">Module content coming soon.</p>
      </div>
    </div>
  );
}
