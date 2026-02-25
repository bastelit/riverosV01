import Image from "next/image";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import TopNav from "@/components/global/layout/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("riveros_token")?.value;
  const user = token ? await verifyToken(token) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopNav
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        vessel={user?.vessel ?? ""}
        vesselAbbr={user?.vesselAbbr ?? ""}
      />
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-10">
        {children}
      </main>
      <footer
        className="flex-shrink-0 w-full py-4 flex items-center justify-center border-t border-slate-100"
      >
        <a
          href="https://www.saatwika.de/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 hover:opacity-70 transition-opacity cursor-pointer"
        >
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#0369a1", boxShadow: "0 2px 8px rgba(3,105,161,0.30)" }}
          >
            <img src="/saatwika-logo.png" alt="Saatwika UG" width={18} height={18} style={{ objectFit: "contain" }} />
          </div>
          <span className="text-[13px] text-slate-400">
            Made with 💙 by <span className="font-bold text-[#0369a1]">Saatwika UG</span>
          </span>
        </a>
      </footer>
    </div>
  );
}
