"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(255, "Category name too long"),
  networkId: z.string().min(1, "Network ID required"),
  sort: z.coerce.number().int().default(0)
});

const idSchema = z.string().min(1);

export async function createCategory(rawData: { name: string; networkId: string; sort: number }) {
  return requireAdmin(async (admin) => {
    const data = categorySchema.parse(rawData);
    const cat = await db.category.create({
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_CREATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId }
    });

    return { success: true, error: undefined, categoryId: cat.id };
  });
}

export async function updateCategory(rawId: string, rawData: { name: string; networkId: string; sort: number }) {
  return requireAdmin(async (admin) => {
    const id = idSchema.parse(rawId);
    const data = categorySchema.parse(rawData);
    const cat = await db.category.update({
      where: { id },
      data: {
        name: data.name,
        networkId: data.networkId,
        sort: data.sort
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_UPDATE",
      target: cat.id,
      targetType: "SETTINGS",
      newValue: { name: cat.name, networkId: cat.networkId }
    });

    return { success: true, error: undefined };
  });
}

export async function deleteCategory(rawId: string) {
  return requireAdmin(async (admin) => {
    const id = idSchema.parse(rawId);
    const count = await db.service.count({ where: { categoryId: id } });
    if (count > 0) {
      return { success: false, error: `Cannot delete category. It contains ${count} services. Delete or move them first.` };
    }

    await db.category.delete({ where: { id } });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "CATEGORY_DELETE",
      target: id,
      targetType: "SETTINGS"
    });

    return { success: true, error: undefined };
  });
}
