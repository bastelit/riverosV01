import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import FlgoModule from "@/components/features/flgo/flgo-module";

export default async function FlgoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("riveros_token")?.value;
  const user = token ? await verifyToken(token) : null;

  // -mt-10 -mb-10 cancels the py-10 from the dashboard layout so
  // FlgoModule can use the full remaining viewport height.
  return (
    <div className="-mt-10 -mb-10">
      <FlgoModule
        vessel={user?.vessel ?? ""}
        vesselAbbr={user?.vesselAbbr ?? ""}
      />
    </div>
  );
}
