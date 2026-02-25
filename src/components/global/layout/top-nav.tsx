"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  Anchor,
  X,
  Mail,
} from "lucide-react";
import { IconGasStation } from "@tabler/icons-react";
import { useLayoutStore } from "@/store/layout-store";
import { useVesselStore } from "@/store/vessel-store";

// Maps moduleKey → icon + accent colour used in the TopNav breadcrumb
const MODULE_META: Record<string, { icon: React.ReactNode; accent: string; iconBg: string }> = {
  flgo: {
    icon: <IconGasStation size={17} stroke={1.75} style={{ color: "#0369a1" }} />,
    accent: "#0369a1",
    iconBg: "rgba(3,105,161,0.08)",
  },
};

interface TopNavProps {
  name: string;
  email: string;
  vessel: string;
  vesselAbbr: string;
}

export default function TopNav({ name, email, vessel, vesselAbbr }: TopNavProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Module context injected by individual module pages
  const { moduleName, moduleKey } = useLayoutStore();
  const moduleMeta = moduleKey ? MODULE_META[moduleKey] : null;

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const firstName = name?.split(" ")[0] || name || "User";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    useVesselStore.getState().clear();
    router.push("/login");
  }

  return (
    <>
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-100"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        <div className="h-full max-w-screen-2xl mx-auto px-6 flex items-center justify-between gap-4">

          {/* ── Left section ── */}
          <div className="flex items-center gap-3 min-w-0">

            {/* Brand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-5 h-[26px] flex-shrink-0">
                <img src="/riveros-logo.jpg" alt="RIVEROS" className="w-full h-full object-contain" />
              </div>
              <span className="text-[15px] font-black tracking-[0.1em] text-[#04111f]">
                RIVEROS
              </span>
            </div>

            {/* Module breadcrumb — shown only when inside a module */}
            {moduleName && moduleMeta && (
              <>
                <div className="h-5 w-px bg-slate-200 flex-shrink-0" />

                {/* Back to dashboard */}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </Link>

                <div className="h-5 w-px bg-slate-200 flex-shrink-0" />

                {/* Module icon + name */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: moduleMeta.iconBg }}
                  >
                    {moduleMeta.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#04111f] leading-tight truncate">
                      {moduleName}
                    </p>
                    <p className="text-[10.5px] text-slate-400 leading-tight truncate hidden sm:block">
                      Fuel &amp; Lubrication Grade Operations
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Right section ── */}
          <div className="flex items-center gap-3 flex-shrink-0">

            {/* Vessel badge */}
            {vessel && (
              <div
                className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border"
                style={{
                  background: "linear-gradient(135deg, rgba(219,234,254,0.7) 0%, rgba(199,210,254,0.5) 100%)",
                  borderColor: "rgba(147,197,253,0.6)",
                  boxShadow: "inset 0 0 0 1px rgba(147,197,253,0.15), 0 1px 3px rgba(37,99,235,0.08)",
                }}
              >
                <Anchor className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#2563eb" }} strokeWidth={2} />
                <span className="text-[12.5px] font-semibold max-w-[180px] truncate" style={{ color: "#1e40af" }}>
                  {vessel}
                </span>
              </div>
            )}

            <div className="hidden sm:block h-6 w-px bg-slate-200" />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full hover:bg-slate-100 transition-colors duration-150"
                aria-label="User menu"
              >
                <div
                  className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 select-none"
                  style={{ background: "linear-gradient(135deg, #071e3d 0%, #1a4a8a 100%)" }}
                >
                  {initials}
                </div>
                <span className="hidden md:block text-[13px] font-medium text-slate-700 max-w-[140px] truncate">
                  {firstName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-100 py-2 z-50"
                  style={{ boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 16px 40px rgba(0,0,0,0.10)" }}
                >
                  <div className="px-4 py-3 border-b border-slate-100 mb-1">
                    <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">{name || "User"}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{email}</p>
                  </div>

                  <button
                    onClick={() => { setDropdownOpen(false); setProfileOpen(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                    Profile
                  </button>

                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                    Settings
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.75} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Profile slide-over ─────────────────────────────────── */}
      <div
        onClick={() => setProfileOpen(false)}
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: "rgba(15,23,42,0.35)",
          backdropFilter: "blur(2px)",
          opacity: profileOpen ? 1 : 0,
          pointerEvents: profileOpen ? "auto" : "none",
        }}
      />

      <div
        className="fixed right-0 top-0 h-full z-50 w-80 bg-white flex flex-col"
        style={{
          boxShadow: "-8px 0 40px rgba(0,0,0,0.14)",
          transform: profileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 280ms cubic-bezier(0.22,0.61,0.36,1)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-[13px] font-semibold text-slate-500 tracking-wider uppercase">Profile</span>
          <button
            onClick={() => setProfileOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl text-white text-2xl font-bold flex items-center justify-center mb-4 select-none"
              style={{ background: "linear-gradient(135deg, #071e3d 0%, #1a4a8a 100%)", boxShadow: "0 8px 24px rgba(7,30,61,0.30)" }}
            >
              {initials}
            </div>
            <h2 className="text-lg font-bold text-slate-900 text-center">{name || "—"}</h2>
          </div>

          <div className="space-y-4">
            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "rgba(248,250,252,0.8)", border: "1px solid rgba(226,232,240,0.6)" }}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-blue-500" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-[13px] font-medium text-slate-800 break-all">{email || "—"}</p>
              </div>
            </div>

            {vessel && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, rgba(219,234,254,0.4) 0%, rgba(199,210,254,0.25) 100%)",
                  border: "1px solid rgba(147,197,253,0.4)",
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Anchor className="w-4 h-4" style={{ color: "#2563eb" }} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-0.5">Assigned Vessel</p>
                  <p className="text-[13px] font-semibold" style={{ color: "#1e40af" }}>{vessel}</p>
                  {vesselAbbr && <p className="text-[11px] text-blue-400 mt-0.5">{vesselAbbr}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold text-red-600 border border-red-100 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
