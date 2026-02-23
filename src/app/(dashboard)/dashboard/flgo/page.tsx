import { Droplets, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function FlgoPage() {
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
        <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
          <Droplets className="w-6 h-6 text-cyan-600" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#04111f]">FLGO</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Fuel &amp; Lubrication Grade Operations
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <p className="text-slate-400 text-sm">Module content coming soon.</p>
      </div>
    </div>
  );
}
