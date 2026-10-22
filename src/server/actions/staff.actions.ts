"use server";

import { toErrorResult, type ActionResult } from "@/server/errors";
import {
  createStaff,
  listStaff,
  resetStaffPassword,
  setStaffStatus,
  type StaffListItem,
} from "@/server/services/staff.service";
import {
  CreateStaffInputSchema,
  SetStaffStatusSchema,
  matriculaId,
  type CreateStaffInput,
  type SetStaffStatusInput,
} from "@/server/dto";

export interface CreateStaffActionResult {
  id: string;
  matricule: string;
  role: "ADMIN" | "SUPERADMIN";
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export async function createStaffAction(
  input: CreateStaffInput
): Promise<ActionResult<CreateStaffActionResult>> {
  try {
    const parsed = CreateStaffInputSchema.parse(input);
    const staff = await createStaff(parsed);
    return { ok: true, data: staff };
  } catch (error) {
    return toErrorResult(error);
  }
}

export interface ListStaffActionResult {
  items: StaffListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listStaffAction(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: string;
}): Promise<ActionResult<ListStaffActionResult>> {
  try {
    const result = await listStaff(params);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function setStaffStatusAction(
  input: SetStaffStatusInput
): Promise<ActionResult<{ id: string; matricule: string; status: string }>> {
  try {
    const parsed = SetStaffStatusSchema.parse(input);
    const result = await setStaffStatus(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function resetStaffPasswordAction(
  matricule: string
): Promise<ActionResult<{ id: string; matricule: string; temporaryPassword: string; mustChangePassword: boolean }>> {
  try {
    const parsed = matriculaId.parse(matricule);
    const result = await resetStaffPassword(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}
