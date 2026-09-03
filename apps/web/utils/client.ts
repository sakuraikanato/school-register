import type { AppType } from "api/src";
import { hc, type InferResponseType } from "hono/client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// AppType is exported from the chained Hono application, so screen routes,
// request bodies, path params, and response shapes stay synchronized here.
export const client = hc<AppType>(apiBaseUrl, {
  init: { credentials: "include" },
});

export type ScreenQuery = Readonly<{
  yearId?: number;
  courseId?: number;
  search?: string;
  term?: "first" | "second";
}>;

type RpcSuccess<T> = Exclude<T, { error: unknown }>;
export type DashboardResponse = RpcSuccess<InferResponseType<typeof client.api.screens.dashboard.$get>>;
export type StaffStudentsResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.students.$get>>;
export type StaffHistoryResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.history.$get>>;
export type StaffGradeSheetResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["grade-sheet"][":studentId"]["$get"]>>;
export type StaffFinalizationResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.finalization.$get>>;
export type StaffCsvImportResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["csv-import"]["$get"]>>;
export type TeacherGradeEntryResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["$get"]>>;
export type CoursesResponse = RpcSuccess<InferResponseType<typeof client.api.courses.$get>>;
export type SubjectsResponse = RpcSuccess<InferResponseType<typeof client.api.subjects.$get>>;
export type YearsResponse = RpcSuccess<InferResponseType<typeof client.api.years.$get>>;
export type SavedWeightResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["weight"]["$put"]>>;
export type SavedGradesResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["grades"]["$put"]>>;
export type StaffFinalizeResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.finalization[":subjectId"]["$post"]>>;

type ErrorBody = { error?: { message?: string } };

export class RpcError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RpcError";
    this.status = status;
  }
}

const screenQuery = (query: ScreenQuery) => ({ yearId: query.yearId, term: query.term ?? "first" as const });
const resourceQuery = (query: ScreenQuery) => ({
  yearId: query.yearId,
  courseId: query.courseId,
  subjectId: undefined,
  studentId: undefined,
  search: query.search,
  isFirstTerm: query.term === undefined ? undefined : query.term === "first",
});

export async function readRpc<T>(request: Promise<Response>): Promise<T> {
  const response = await request;
  const body = await response.json() as T & ErrorBody;
  if (!response.ok) throw new RpcError(body.error?.message ?? "APIからデータを取得できませんでした", response.status);
  return body;
}

export function getDashboard(query: ScreenQuery = {}) {
  return readRpc<DashboardResponse>(client.api.screens.dashboard.$get({ query: screenQuery(query) }));
}

export function getStaffStudents(query: ScreenQuery = {}) {
  return readRpc<StaffStudentsResponse>(client.api.screens.staff.students.$get({ query: screenQuery(query) }));
}

export function getStaffHistory(query: ScreenQuery = {}) {
  return readRpc<StaffHistoryResponse>(client.api.screens.staff.history.$get({ query: screenQuery(query) }));
}

export function getStaffGradeSheet(studentId: number, query: ScreenQuery = {}) {
  return readRpc<StaffGradeSheetResponse>(client.api.screens.staff["grade-sheet"][":studentId"].$get({ param: { studentId: String(studentId) }, query: screenQuery(query) }));
}

export function getStaffFinalization(query: ScreenQuery = {}) {
  return readRpc<StaffFinalizationResponse>(client.api.screens.staff.finalization.$get({ query: screenQuery(query) }));
}

export function getStaffCsvImport() {
  return readRpc<StaffCsvImportResponse>(client.api.screens.staff["csv-import"].$get());
}

export function getTeacherGradeEntry(subjectId: number, query: ScreenQuery = {}) {
  return readRpc<TeacherGradeEntryResponse>(client.api.screens.teacher["grade-entry"][":subjectId"].$get({ param: { subjectId: String(subjectId) }, query: screenQuery(query) }));
}

export function getCourses(query: ScreenQuery = {}) {
  return readRpc<CoursesResponse>(client.api.courses.$get({ query: resourceQuery(query) }));
}

export function getSubjects(query: ScreenQuery = {}) {
  return readRpc<SubjectsResponse>(client.api.subjects.$get({ query: resourceQuery(query) }));
}

export function getYears() {
  return readRpc<YearsResponse>(client.api.years.$get());
}

export function saveTeacherWeight(subjectId: number, query: ScreenQuery, weight: { attendanceWeight: number; attitudeWeight: number; assignmentWeight: number }) {
  return readRpc<SavedWeightResponse>(client.api.screens.teacher["grade-entry"][":subjectId"].weight.$put({
    param: { subjectId: String(subjectId) },
    query: screenQuery(query),
    json: weight,
  }));
}

export function saveTeacherGrades(subjectId: number, query: ScreenQuery, grades: Array<{ studentId: number; attendance: number; attitude: number; assignment: number }>) {
  return readRpc<SavedGradesResponse>(client.api.screens.teacher["grade-entry"][":subjectId"].grades.$put({
    param: { subjectId: String(subjectId) },
    query: screenQuery(query),
    json: { grades },
  }));
}

export function finalizeStaffSubject(subjectId: number, query: ScreenQuery) {
  return readRpc<StaffFinalizeResponse>(client.api.screens.staff.finalization[":subjectId"].$post({
    param: { subjectId: String(subjectId) },
    query: screenQuery(query),
  }));
}
