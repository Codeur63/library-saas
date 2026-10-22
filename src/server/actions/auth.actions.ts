"use server";

import { headers } from "next/headers";

import { AppError, toErrorResult, type ActionResult } from "@/server/errors";
import { clientIp } from "@/server/rate-limit";
import {
  changePassword,
  loginWithMatricule,
  logout,
  resolvePostLoginPath,
  type LoginSuccess,
} from "@/server/services/auth.service";
import { getCurrentUser, type CurrentUser } from "@/server/current-user";

export async function loginAction(
  matricule: string,
  password: string,
  requestedNext?: string | null
): Promise<ActionResult<LoginSuccess & { next: string }>> {
  try {
    const success = await loginWithMatricule(matricule, password, clientIp(await headers()));
    return {
      ok: true,
      data: { ...success, next: resolvePostLoginPath(success.mustChangePassword, requestedNext ?? undefined) },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
  confirmPassword?: string
): Promise<ActionResult<null>> {
  try {
    await changePassword(currentPassword, newPassword, confirmPassword);
    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    await logout();
    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function getProfileAction(): Promise<ActionResult<CurrentUser | null>> {
  try {
    const currentUser = await getCurrentUser();
    return { ok: true, data: currentUser };
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return { ok: true, data: null };
    }
    return toErrorResult(error);
  }
}

export type ProfileForAdmin = Pick<
  CurrentUser,
  "role" | "status" | "firstName" | "lastName" | "matricule"
>;

export async function getCurrentProfileForAdminAction(): Promise<ActionResult<ProfileForAdmin | null>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { ok: true, data: null };
    return {
      ok: true,
      data: {
        role: currentUser.role,
        status: currentUser.status,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        matricule: currentUser.matricule,
      },
    };
  } catch (error) {
    return toErrorResult(error);
  }
}
