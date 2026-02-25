"use client";

import Link from "next/link";
import { IconHelmet, IconArrowLeft } from "@tabler/icons-react";

interface UnderConstructionProps {
  moduleName: string;
  accent?: string;
}

export default function UnderConstruction({ moduleName, accent = "#0369a1" }: UnderConstructionProps) {
  const accentLight = `${accent}14`;
  const accentBorder = `${accent}28`;

  return (
    <div className="flex flex-col min-h-[70vh]">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors mb-10"
      >
        <IconArrowLeft size={14} stroke={2} />
        Back to Dashboard
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 py-16">
        {/* Animated icon block */}
        <div
          className="relative w-28 h-28 rounded-3xl flex items-center justify-center"
          style={{
            background:  `linear-gradient(135deg, ${accentLight} 0%, ${accentBorder} 100%)`,
            border:      `2px solid ${accentBorder}`,
            boxShadow:   `0 8px 32px ${accentLight}`,
          }}
        >
          <IconHelmet size={54} stroke={1.3} style={{ color: accent }} />
        </div>

        {/* Text */}
        <div className="text-center max-w-md">
          <h1
            className="text-[32px] font-black tracking-tight leading-tight mb-3"
            style={{ color: "#04111f" }}
          >
            Under Construction
          </h1>
          <p className="text-[16px] font-semibold text-slate-500 mb-2">
            {moduleName} module
          </p>
          <p className="text-[14px] text-slate-400 leading-relaxed">
            We&apos;re building something great here. This module will be available soon.
          </p>
        </div>

        {/* Status pill */}
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-full"
          style={{
            background:  accentLight,
            border:      `1px solid ${accentBorder}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: accent }}
          />
          <span className="text-[13px] font-semibold" style={{ color: accent }}>
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
