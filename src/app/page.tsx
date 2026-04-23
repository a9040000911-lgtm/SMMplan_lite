import { getPublicCatalogAction } from "@/actions/order/catalog";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { SmartLinkLanding } from "@/components/landing/SmartLinkLanding";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogResult, session] = await Promise.all([
    getPublicCatalogAction(),
    verifySession(),
  ]);
  const catalog =
    catalogResult.success && catalogResult.data ? catalogResult.data : [];

  let defaultEmail = "";
  if (session?.userId) {
    const u = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });
    if (u) defaultEmail = u.email;
  }

  return <SmartLinkLanding initialCatalog={catalog} initialEmail={defaultEmail} />;
}
