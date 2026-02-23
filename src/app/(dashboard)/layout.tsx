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
    <div className="min-h-screen bg-slate-50">
      <TopNav
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        vessel={user?.vessel ?? ""}
        vesselAbbr={user?.vesselAbbr ?? ""}
      />
      <main className="max-w-screen-xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
