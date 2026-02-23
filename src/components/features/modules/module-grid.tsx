"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Droplets,
  Wrench,
  Award,
  Package,
  ShieldCheck,
  Hammer,
  ArrowRight,
} from "lucide-react";
import type { ElementType } from "react";

interface ModuleConfig {
  slug: string;
  name: string;
  description: string;
  Icon: ElementType;
  // Icon container gradient
  iconGradFrom: string;
  iconGradTo: string;
  iconGlowColor: string;
  iconColor: string;
  // Card hover
  hoverBorderColor: string;
  hoverBoxShadow: string;
}

const MODULES: ModuleConfig[] = [
  {
    slug: "flgo",
    name: "FLGO",
    description:
      "Fuel & Lubrication Grade Operations — bunker tracking, measurement and reporting.",
    Icon: Droplets,
    iconGradFrom: "rgba(6,182,212,0.16)",
    iconGradTo: "rgba(8,145,178,0.30)",
    iconGlowColor: "rgba(6,182,212,0.30)",
    iconColor: "#0891b2",
    hoverBorderColor: "#67e8f9",
    hoverBoxShadow:
      "0 16px 48px rgba(6,182,212,0.18), 0 4px 16px rgba(0,0,0,0.08)",
  },
  {
    slug: "maintenance",
    name: "Maintenance",
    description:
      "Vessel maintenance scheduling, job orders, inspection history and task tracking.",
    Icon: Wrench,
    iconGradFrom: "rgba(37,99,235,0.14)",
    iconGradTo: "rgba(29,78,216,0.26)",
    iconGlowColor: "rgba(37,99,235,0.28)",
    iconColor: "#2563eb",
    hoverBorderColor: "#93c5fd",
    hoverBoxShadow:
      "0 16px 48px rgba(37,99,235,0.16), 0 4px 16px rgba(0,0,0,0.08)",
  },
  {
    slug: "certificate",
    name: "Certificate",
    description:
      "Certification management, expiry tracking, compliance status and renewal alerts.",
    Icon: Award,
    iconGradFrom: "rgba(124,58,237,0.13)",
    iconGradTo: "rgba(109,40,217,0.26)",
    iconGlowColor: "rgba(124,58,237,0.28)",
    iconColor: "#7c3aed",
    hoverBorderColor: "#c4b5fd",
    hoverBoxShadow:
      "0 16px 48px rgba(124,58,237,0.16), 0 4px 16px rgba(0,0,0,0.08)",
  },
  {
    slug: "material",
    name: "Material",
    description:
      "Inventory control, stock level management, spare parts and materials procurement.",
    Icon: Package,
    iconGradFrom: "rgba(217,119,6,0.13)",
    iconGradTo: "rgba(180,83,9,0.26)",
    iconGlowColor: "rgba(217,119,6,0.28)",
    iconColor: "#d97706",
    hoverBorderColor: "#fcd34d",
    hoverBoxShadow:
      "0 16px 48px rgba(217,119,6,0.16), 0 4px 16px rgba(0,0,0,0.08)",
  },
  {
    slug: "qhse",
    name: "QHSE",
    description:
      "Quality, Health, Safety & Environment — audits, incident reporting and compliance.",
    Icon: ShieldCheck,
    iconGradFrom: "rgba(5,150,105,0.13)",
    iconGradTo: "rgba(4,120,87,0.26)",
    iconGlowColor: "rgba(5,150,105,0.28)",
    iconColor: "#059669",
    hoverBorderColor: "#6ee7b7",
    hoverBoxShadow:
      "0 16px 48px rgba(5,150,105,0.16), 0 4px 16px rgba(0,0,0,0.08)",
  },
  {
    slug: "repair",
    name: "Repair",
    description:
      "Repair work orders, docking schedules, contractor coordination and cost tracking.",
    Icon: Hammer,
    iconGradFrom: "rgba(225,29,72,0.12)",
    iconGradTo: "rgba(190,18,60,0.24)",
    iconGlowColor: "rgba(225,29,72,0.26)",
    iconColor: "#e11d48",
    hoverBorderColor: "#fda4af",
    hoverBoxShadow:
      "0 16px 48px rgba(225,29,72,0.14), 0 4px 16px rgba(0,0,0,0.08)",
  },
];

function ModuleCard({ mod }: { mod: ModuleConfig }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/dashboard/${mod.slug}`} className="block">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative rounded-2xl border p-6 cursor-pointer"
        style={{
          background: "linear-gradient(158deg, #ffffff 0%, #f8faff 100%)",
          borderColor: hovered ? mod.hoverBorderColor : "rgba(226,232,240,0.8)",
          boxShadow: hovered
            ? mod.hoverBoxShadow
            : "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          transition: "transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out",
        }}
      >
        {/* Icon container */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{
            background: `linear-gradient(135deg, ${mod.iconGradFrom} 0%, ${mod.iconGradTo} 100%)`,
            boxShadow: `0 4px 14px ${mod.iconGlowColor}`,
            transform: hovered ? "scale(1.08)" : "scale(1)",
            transition: "transform 200ms ease-out",
          }}
        >
          <mod.Icon size={26} color={mod.iconColor} strokeWidth={1.75} />
        </div>

        {/* Module name */}
        <h3 className="text-[16px] font-bold text-slate-900 mb-2 tracking-tight">
          {mod.name}
        </h3>

        {/* Description */}
        <p className="text-[13px] text-slate-400 leading-relaxed">
          {mod.description}
        </p>

        {/* Divider */}
        <div
          className="border-t my-5"
          style={{ borderColor: "rgba(226,232,240,0.6)" }}
        />

        {/* CTA row */}
        <div
          className="flex items-center gap-1.5"
          style={{ color: mod.iconColor }}
        >
          <span className="text-[12px] font-semibold tracking-wide">
            Open module
          </span>
          <ArrowRight
            size={13}
            strokeWidth={2.5}
            style={{
              transform: hovered ? "translateX(3px)" : "translateX(0)",
              transition: "transform 200ms ease-out",
            }}
          />
        </div>
      </div>
    </Link>
  );
}

export default function ModuleGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {MODULES.map((mod) => (
        <ModuleCard key={mod.slug} mod={mod} />
      ))}
    </div>
  );
}
