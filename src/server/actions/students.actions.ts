"use server";

import { toErrorResult, type ActionResult } from "@/server/errors";
import {
  createStudent,
  listStudents,
  resetStudentPassword,
  setStudentStatus,
  updateStudent,
  type StudentListItem,
} from "@/server/services/students.service";
import {
  CreateStudentInputSchema,
  ResetStudentPasswordSchema,
  SetStudentStatusSchema,
  UpdateStudentInputSchema,
  matriculaId,
  type CreateStudentInput,
  type SetStudentStatusInput,
  type UpdateStudentInput,
} from "@/server/dto";

export interface CreateStudentActionResult {
  id: string;
  matricule: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export async function createStudentAction(
  input: CreateStudentInput
): Promise<ActionResult<CreateStudentActionResult>> {
  try {
    const parsed = CreateStudentInputSchema.parse(input);
    const student = await createStudent(parsed);
    return { ok: true, data: student };
  } catch (error) {
    return toErrorResult(error);
  }
}

export interface ResetPasswordActionResult {
  id: string;
  matricule: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

export async function resetStudentPasswordAction(
  matricule: string
): Promise<ActionResult<ResetPasswordActionResult>> {
  try {
    const parsed = ResetStudentPasswordSchema.parse({ matricule });
    const result = await resetStudentPassword(parsed.matricule);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function setStudentStatusAction(
  input: SetStudentStatusInput
): Promise<ActionResult<{ id: string; matricule: string; status: string }>> {
  try {
    const parsed = SetStudentStatusSchema.parse(input);
    const result = await setStudentStatus(parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export interface UpdatedStudentActionResult {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
}

export async function updateStudentAction(
  matricule: string,
  input: UpdateStudentInput
): Promise<ActionResult<UpdatedStudentActionResult>> {
  try {
    const parsedMatricule = matriculaId.parse(matricule);
    const parsed = UpdateStudentInputSchema.parse(input);
    const result = await updateStudent(parsedMatricule, parsed);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}

export interface ListStudentsActionResult {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listStudentsAction(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}): Promise<ActionResult<ListStudentsActionResult>> {
  try {
    const result = await listStudents(params);
    return { ok: true, data: result };
  } catch (error) {
    return toErrorResult(error);
  }
}