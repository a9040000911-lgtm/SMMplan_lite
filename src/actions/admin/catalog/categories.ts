"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";

export async function createCategory(data: { name: string; networkId: string; sort: number }) {
  return requireAdmin(async (admin) => {
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

export async function updateCategory(id: string, data: { name: string; networkId: string; sort: number }) {
  return requireAdmin(async (admin) => {
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

export async function deleteCategory(id: string) {
  return requireAdmin(async (admin) => {
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
