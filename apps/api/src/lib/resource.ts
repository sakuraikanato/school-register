import type { Context } from "hono";
import { validator } from "hono/validator";

import { forbidden, isRecord, notFound, parsePositiveInt, unauthorized, validationError } from "./http";
import { getCurrentActor, isStaff, type CurrentActor } from "./session";

export type ResourceQuery = {
	yearId?: number;
	courseId?: number;
	subjectId?: number;
	studentId?: number;
	search?: string;
	isFirstTerm?: boolean;
};

const scalarQueryValue = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

const optionalPositiveInt = (value: string | string[] | undefined) =>
	value === undefined ? undefined : parsePositiveInt(scalarQueryValue(value));

export const resourceQueryValidator = validator("query", (query, c) => {
	const yearId = optionalPositiveInt(query.yearId);
	const courseId = optionalPositiveInt(query.courseId);
	const subjectId = optionalPositiveInt(query.subjectId);
	const studentId = optionalPositiveInt(query.studentId);
	const isFirstTermValue = scalarQueryValue(query.isFirstTerm);
	const isFirstTerm = isFirstTermValue === undefined ? undefined : isFirstTermValue === "true" ? true : isFirstTermValue === "false" ? false : null;

	if (
		(query.yearId !== undefined && yearId === undefined) ||
		(query.courseId !== undefined && courseId === undefined) ||
		(query.subjectId !== undefined && subjectId === undefined) ||
		(query.studentId !== undefined && studentId === undefined)
	) {
		return validationError(c, "IDは正の整数で指定してください");
	}
	if (isFirstTerm === null) return validationError(c, "isFirstTerm は true または false で指定してください");
	const search = scalarQueryValue(query.search);
	if (search !== undefined && search.length > 100) {
		return validationError(c, "search は100文字以内で指定してください");
	}

	return { yearId, courseId, subjectId, studentId, search, isFirstTerm } satisfies ResourceQuery;
});

export const requireActor = async (c: Context): Promise<CurrentActor | null> => getCurrentActor(c);

export const requireStaff = async (c: Context): Promise<CurrentActor | null> => {
	const actor = await getCurrentActor(c);
	return actor && isStaff(actor) ? actor : null;
};

export const requireStaffResponse = async (c: Context): Promise<CurrentActor | Response> => {
	const actor = await getCurrentActor(c);
	if (!actor) return unauthorized(c);
	if (!isStaff(actor)) return forbidden(c);
	return actor;
};

export const authError = (c: Context, actor: CurrentActor | null, staffOnly = false) => {
	if (!actor) return unauthorized(c);
	return staffOnly && !isStaff(actor) ? forbidden(c) : null;
};

export const parseBodyRecord = (value: unknown, c: Context) => {
	if (!isRecord(value)) {
		return null;
	}
	return value;
};

export const conflict = (c: Context, message = "関連データが存在するため操作できません") =>
	c.json({ error: { code: "CONFLICT", message } }, 409);

export const isDatabaseConstraintError = (error: unknown) => {
	const messages: string[] = [];
	let current: unknown = error;
	for (let depth = 0; depth < 3 && current; depth += 1) {
		if (current instanceof Error) {
			messages.push(current.message);
			current = "cause" in current ? current.cause : undefined;
		} else {
			messages.push(String(current));
			break;
		}
	}
	return /duplicate|unique|foreign key|constraint|cannot delete|cannot add|ER_DUP_ENTRY|ER_ROW_IS_REFERENCED/i.test(messages.join(" "));
};

export const operationError = (c: Context, error: unknown, message: string) =>
	isDatabaseConstraintError(error) ? conflict(c, message) : null;

export const idNotFound = (c: Context, resource: string) => notFound(c, resource);
