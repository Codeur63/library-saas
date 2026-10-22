"use server";

import { toErrorResult, type ActionResult } from "@/server/errors";
import { getDashboardStats, type DashboardStats } from "@/server/services/stats.service";

export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  try {
    const stats = await getDashboardStats();
    return { ok: true, data: stats };
  } catch (error) {
    return toErrorResult(error);
  }
}
