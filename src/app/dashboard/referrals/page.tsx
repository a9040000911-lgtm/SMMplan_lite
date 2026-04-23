import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ReferralUi } from "./referral-ui";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  let user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      _count: {
        select: { referrals: true }
      }
    }
  });

  if (!user) redirect("/login");

  if (!user.referralCode) {
    const newCode = Array.from(Array(8), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
    user = await db.user.update({
      where: { id: user.id },
      data: { referralCode: newCode },
      include: {
        _count: {
          select: { referrals: true }
        }
      }
    });
  }

  const referralLink = `https://${process.env.NEXT_PUBLIC_APP_URL || 'smmplan.ru'}/?ref=${user.referralCode}`;
  const earnedRub = user.referralBalance / 100;
  const referralsCount = user._count?.referrals || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Партнёрская программа</h1>
        <p className="text-zinc-500 mt-1">Приглашайте друзей и зарабатывайте до 15% с их пополнений.</p>
      </div>

      <ReferralUi 
        referralLink={referralLink} 
        referralsCount={referralsCount} 
        earnedRub={earnedRub} 
      />
    </div>
  );
}
