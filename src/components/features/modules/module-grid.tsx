"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconGasStation,
  IconTool,
  IconCertificate,
  IconPackages,
  IconShieldCheck,
  IconHammer,
  IconArrowRight,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Module configuration — every visual token lives here.
//  To restyle a module, edit only this array.
// ─────────────────────────────────────────────────────────────────────────────

interface ModuleConfig {
  slug: string;
  name: string;
  label: string;       // Category pill label (top-right)
  Icon: ComponentType<{ size?: number; stroke?: number; style?: React.CSSProperties }>;
  accent: string;      // Accent colour — icon, pill text, CTA, hover border
  iconBg: string;      // Icon container gradient
  iconGlow: string;    // Icon container box-shadow
  cardWash: string;    // Subtle per-module radial overlay on card bg
  hoverBorder: string; // Border colour on hover
  hoverShadow: string; // Box-shadow on hover
  pillBg: string;      // Category pill background
}

const MODULES: ModuleConfig[] = [
  // ── FLGO — Deep Teal ──────────────────────────────────────────────────────
  {
    slug:        "flgo",
    name:        "FLGO",
    label:       "Fuel Operations",
    Icon:        IconGasStation,
    accent:      "#0E7490",
    iconBg:      "linear-gradient(140deg, rgba(6,182,212,0.17) 0%, rgba(8,145,178,0.32) 100%)",
    iconGlow:    "0 2px 16px rgba(8,145,178,0.24), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(6,182,212,0.09) 0%, transparent 58%)",
    hoverBorder: "rgba(8,145,178,0.44)",
    hoverShadow: "0 14px 44px rgba(8,145,178,0.20), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(8,145,178,0.09)",
  },

  // ── Maintenance — Navy Blue ────────────────────────────────────────────────
  {
    slug:        "maintenance",
    name:        "Maintenance",
    label:       "Vessel Upkeep",
    Icon:        IconTool,
    accent:      "#1D4ED8",
    iconBg:      "linear-gradient(140deg, rgba(59,130,246,0.17) 0%, rgba(29,78,216,0.30) 100%)",
    iconGlow:    "0 2px 16px rgba(29,78,216,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(59,130,246,0.09) 0%, transparent 58%)",
    hoverBorder: "rgba(29,78,216,0.40)",
    hoverShadow: "0 14px 44px rgba(29,78,216,0.18), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(29,78,216,0.08)",
  },

  // ── Certificate — Deep Violet ──────────────────────────────────────────────
  {
    slug:        "certificate",
    name:        "Certificate",
    label:       "Compliance",
    Icon:        IconCertificate,
    accent:      "#6D28D9",
    iconBg:      "linear-gradient(140deg, rgba(139,92,246,0.16) 0%, rgba(109,40,217,0.30) 100%)",
    iconGlow:    "0 2px 16px rgba(109,40,217,0.24), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(139,92,246,0.09) 0%, transparent 58%)",
    hoverBorder: "rgba(109,40,217,0.40)",
    hoverShadow: "0 14px 44px rgba(109,40,217,0.18), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(109,40,217,0.08)",
  },

  // ── Material — Dark Amber ──────────────────────────────────────────────────
  {
    slug:        "material",
    name:        "Material",
    label:       "Inventory",
    Icon:        IconPackages,
    accent:      "#92400E",
    iconBg:      "linear-gradient(140deg, rgba(217,119,6,0.17) 0%, rgba(180,83,9,0.32) 100%)",
    iconGlow:    "0 2px 16px rgba(180,83,9,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(217,119,6,0.09) 0%, transparent 58%)",
    hoverBorder: "rgba(180,83,9,0.40)",
    hoverShadow: "0 14px 44px rgba(180,83,9,0.18), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(180,83,9,0.08)",
  },

  // ── QHSE — Forest Green ────────────────────────────────────────────────────
  {
    slug:        "qhse",
    name:        "QHSE",
    label:       "Safety & Quality",
    Icon:        IconShieldCheck,
    accent:      "#047857",
    iconBg:      "linear-gradient(140deg, rgba(5,150,105,0.17) 0%, rgba(4,120,87,0.32) 100%)",
    iconGlow:    "0 2px 16px rgba(4,120,87,0.24), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(5,150,105,0.09) 0%, transparent 58%)",
    hoverBorder: "rgba(4,120,87,0.40)",
    hoverShadow: "0 14px 44px rgba(4,120,87,0.18), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(4,120,87,0.08)",
  },

  // ── Repair — Deep Rose ─────────────────────────────────────────────────────
  {
    slug:        "repair",
    name:        "Repair",
    label:       "Work Orders",
    Icon:        IconHammer,
    accent:      "#9F1239",
    iconBg:      "linear-gradient(140deg, rgba(225,29,72,0.15) 0%, rgba(190,18,60,0.30) 100%)",
    iconGlow:    "0 2px 16px rgba(190,18,60,0.22), inset 0 1px 0 rgba(255,255,255,0.60)",
    cardWash:    "radial-gradient(ellipse at 95% 5%, rgba(225,29,72,0.08) 0%, transparent 58%)",
    hoverBorder: "rgba(190,18,60,0.40)",
    hoverShadow: "0 14px 44px rgba(190,18,60,0.16), 0 4px 14px rgba(0,0,0,0.06)",
    pillBg:      "rgba(190,18,60,0.08)",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  ModuleCard
// ─────────────────────────────────────────────────────────────────────────────

function ModuleCard({ mod }: { mod: ModuleConfig }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/dashboard/${mod.slug}`} className="block h-full">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative overflow-hidden rounded-2xl border h-full flex flex-col cursor-pointer"
        style={{
          background:   "linear-gradient(158deg, #ffffff 0%, #f8fafd 100%)",
          borderColor:  hovered ? mod.hoverBorder : "rgba(15,23,42,0.08)",
          boxShadow:    hovered
            ? mod.hoverShadow
            : "0 1px 3px rgba(15,23,42,0.04), 0 6px 22px rgba(15,23,42,0.06)",
          transform:    hovered ? "translateY(-5px)" : "translateY(0px)",
          transition:
            "transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease-out, border-color 220ms ease-out",
        }}
      >
        {/* Per-module radial wash — identifies each card by colour at a glance */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: mod.cardWash }}
        />

        {/* ── Card body ──────────────────────────────────────────── */}
        <div className="relative z-10 p-8 flex flex-col flex-1">

          {/* Row 1 — Icon (64 px) + Category pill */}
          <div className="flex items-start justify-between mb-8">

            {/* Icon container — enlarged to 64 × 64 */}
            <div
              className="w-16 h-16 rounded-[14px] flex items-center justify-center flex-shrink-0"
              style={{
                background: mod.iconBg,
                boxShadow:  mod.iconGlow,
                transform:  hovered ? "scale(1.10)" : "scale(1)",
                transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <mod.Icon
                size={30}
                stroke={1.5}
                style={{ color: mod.accent }}
              />
            </div>

            {/* Category label pill */}
            <span
              className="text-[11px] font-semibold tracking-wide px-2.5 py-[5px] rounded-full leading-none mt-1"
              style={{
                color:      mod.accent,
                background: mod.pillBg,
              }}
            >
              {mod.label}
            </span>
          </div>

          {/* Module name — prominent, 22 px bold */}
          <h3
            className="text-[22px] font-bold tracking-tight leading-tight"
            style={{ color: "#0f172a" }}
          >
            {mod.name}
          </h3>

          {/* Spacer — keeps CTA pinned to bottom of every card */}
          <div className="flex-1 min-h-[28px]" />

          {/* Gradient divider */}
          <div
            className="mb-5"
            style={{
              height:     "1px",
              background: "linear-gradient(90deg, rgba(15,23,42,0.09) 0%, transparent 72%)",
            }}
          />

          {/* CTA row */}
          <div
            className="flex items-center gap-1.5"
            style={{ color: mod.accent }}
          >
            <span className="text-[12px] font-semibold tracking-wide">
              Open module
            </span>
            <IconArrowRight
              size={14}
              stroke={2.5}
              style={{
                transform:  hovered ? "translateX(4px)" : "translateX(0px)",
                transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>

        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ModuleGrid
// ─────────────────────────────────────────────────────────────────────────────

export default function ModuleGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {MODULES.map((mod) => (
        <ModuleCard key={mod.slug} mod={mod} />
      ))}
    </div>
  );
}
