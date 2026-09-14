import type { Context } from "hono";
import { currentTerm } from "./academic-calendar";

export type ScreenQuery = {
	yearId?: number;
	term: "first" | "second";
	courseId?: number;
	search?: string;
	studentNumber?: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const parsePositiveInt = (value: unknown): number | undefined => {
	if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const parseScreenQuery = (value: unknown):
	| { success: true; data: ScreenQuery }
	| { success: false; message: string } => {
	if (!isRecord(value)) return { success: false, message: "クエリが不正です" };

	const yearId = value.yearId === undefined ? undefined : parsePositiveInt(value.yearId);
	const courseId = value.courseId === undefined ? undefined : parsePositiveInt(value.courseId);
	const term = value.term === undefined ? currentTerm() : value.term;
	const search = value.search;
	const studentNumber = value.studentNumber;

	if ((value.yearId !== undefined && yearId === undefined) || (value.courseId !== undefined && courseId === undefined)) {
		return { success: false, message: "年度とコースは正の整数で指定してください" };
	}
	if (term !== "first" && term !== "second") {
		return { success: false, message: "term は first または second で指定してください" };
	}
	if (search !== undefined && typeof search !== "string") {
		return { success: false, message: "検索語が不正です" };
	}
	if (studentNumber !== undefined && (typeof studentNumber !== "string" || studentNumber.trim().length === 0 || studentNumber.length > 50)) {
		return { success: false, message: "学籍番号が不正です" };
	}

	return { success: true, data: { yearId, courseId, term, search, studentNumber: typeof studentNumber === "string" ? studentNumber.trim() : undefined } };
};

export const validationError = (c: Context, message: string, fields?: { field: string; message: string }[]) =>
	c.json({ error: { code: "VALIDATION_ERROR", message, fields: fields ?? [] } }, 400);

export const unauthorized = (c: Context) =>
	c.json({ error: { code: "UNAUTHENTICATED", message: "ログインが必要です" } }, 401);

export const forbidden = (c: Context) =>
	c.json({ error: { code: "FORBIDDEN", message: "この操作を行う権限がありません" } }, 403);

export const notFound = (c: Context, resource: string) =>
	c.json({ error: { code: "NOT_FOUND", message: `${resource}が見つかりません` } }, 404);
