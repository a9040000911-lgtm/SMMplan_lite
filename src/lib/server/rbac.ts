import { headers } from "next/headers";
import { db } from "@/lib/db";

import { verifySession } from "@/lib/session";

async function getSessionUserId(): Promise<string | null> {
  const sessionUser = await verifySession();
  return sessionUser ? sessionUser.id : null;
}

import { User } from "@prisma/client";

/**
 * Higher Order Component / Wrapper for Server Actions
 * Protects the action to only be executed by 'ADMIN' role users.
 */
export async function requireAdmin<T>(
  action: (admin: User) => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    const userId = await getSessionUserId();
    
    if (!userId) {
       console.warn("[RBAC] Blocked unauthorized attempt to execute Admin Action");
       return { success: false, error: "Unauthorized access" };
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
       console.error(`[RBAC] User ${userId} attempted to execute Admin Action without proper role.`);
       return { success: false, error: "Forbidden: Administrator context required" };
    }

    return await action(user);
  } catch (error: any) {
    console.error("[RBAC] Execution Error:", error);
    return { success: false, error: "Internal Server Error during execution" };
  }
}
