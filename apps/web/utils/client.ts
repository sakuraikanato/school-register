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
	studentNumber?: string;
	term?: "first" | "second";
}>;

type RpcSuccess<T> = Exclude<T, { error: unknown }>;
export type DashboardResponse = RpcSuccess<InferResponseType<typeof client.api.screens.dashboard.$get>>;
export type SessionResponse = RpcSuccess<InferResponseType<typeof client.api.screens.session.$get>>;
export type CompletePasswordChangeResponse = RpcSuccess<InferResponseType<typeof client.api.auth["complete-password-change"]["$post"]>>;
export type StaffStudentsResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.students.$get>>;
export type StaffHistoryResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.history.$get>>;
export type StaffGradeSheetResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["grade-sheet"][":studentId"]["$get"]>>;
export type StaffFinalizationResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.finalization.$get>>;
export type StaffCsvImportResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["csv-import"]["$get"]>>;
export type StaffCsvPreviewResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["csv-import"]["preview"]["$post"]>>;
export type StaffCsvCommitResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff["csv-import"]["import"]["$post"]>>;
export type TeacherGradeEntryResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["$get"]>>;
export type CoursesResponse = RpcSuccess<InferResponseType<typeof client.api.courses.$get>>;
export type SubjectsResponse = RpcSuccess<InferResponseType<typeof client.api.subjects.$get>>;
export type YearsResponse = RpcSuccess<InferResponseType<typeof client.api.years.$get>>;
export type SavedWeightResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["weight"]["$put"]>>;
export type SavedGradesResponse = RpcSuccess<InferResponseType<typeof client.api.screens.teacher["grade-entry"][":subjectId"]["grades"]["$put"]>>;
export type StaffFinalizeResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.finalization[":subjectId"]["$post"]>>;
export type StaffUnlockResponse = RpcSuccess<InferResponseType<typeof client.api.screens.staff.finalization[":subjectId"]["unlock"]["$post"]>>;

type ErrorBody = { error?: { message?: string } };

export class RpcError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RpcError";
    this.status = status;
  }
}

// Leaving term out lets the API choose the current term from the academic
// calendar. A term is only sent when a non-UI integration explicitly supplies it.
type ScreenRequestQuery = { yearId?: number; term: "first" | "second"; search?: string; studentNumber?: string };
const screenQuery = (query: ScreenQuery): ScreenRequestQuery => {
	const base = { yearId: query.yearId, search: query.search, studentNumber: query.studentNumber };
  // The API resolves an omitted term from the academic calendar. The cast
  // keeps the generated Hono client contract while allowing that omission.
  return query.term ? { ...base, term: query.term } : base as ScreenRequestQuery;
};
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

export function getSession() {
  return readRpc<SessionResponse>(client.api.screens.session.$get());
}

export function completePasswordChange(newPassword: string) {
  return readRpc<CompletePasswordChangeResponse>(client.api.auth["complete-password-change"].$post({ json: { newPassword } }));
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

export function previewStaffCsv(resource: StaffCsvImportResponse["resources"][number]["value"], csvText: string) {
  return readRpc<StaffCsvPreviewResponse>(client.api.screens.staff["csv-import"].preview.$post({ json: { resource, csvText } }));
}

export function importStaffCsv(resource: StaffCsvImportResponse["resources"][number]["value"], csvText: string, year: number) {
  return readRpc<StaffCsvCommitResponse>(client.api.screens.staff["csv-import"].import.$post({ json: { resource, csvText, year } }));
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

export function saveTeacherGrades(subjectId: number, query: ScreenQuery, grades: Array<{ studentId: number; attendance: number | null; attitude: number | null; assignment: number | null }>) {
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

export function unlockStaffSubject(subjectId: number, query: ScreenQuery = {}) {
  return readRpc<StaffUnlockResponse>(client.api.screens.staff.finalization[":subjectId"].unlock.$post({
    param: { subjectId: String(subjectId) },
    query: screenQuery(query),
  }));
}
