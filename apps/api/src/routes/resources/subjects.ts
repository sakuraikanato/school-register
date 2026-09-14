import { randomUUID } from "node:crypto";

import { and, asc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { courses, subjects, user, userYears, years } from "../../db/schema";
import { notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	requireStaffResponse,
	resourceQueryValidator,
} from "../../lib/resource";

const subjectBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "科目データを指定してください");
	const errors: { field: string; message: string }[] = [];
	const name = body.name;
	const teacherId = body.teacherId;
	if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
		errors.push({ field: "name", message: "科目名は1〜255文字で指定してください" });
	}
	if (typeof teacherId !== "string" || teacherId.trim().length === 0 || teacherId.length > 36) {
		errors.push({ field: "teacherId", message: "担当者IDが不正です" });
	}
	for (const field of ["courseId", "yearId"] as const) {
		if (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0) {
			errors.push({ field, message: `${field}は正の整数で指定してください` });
		}
	}
	if (errors.length > 0) return validationError(c, "科目の入力値を確認してください", errors);
	return { name: (name as string).trim(), teacherId: (teacherId as string).trim(), courseId: body.courseId as number, yearId: body.yearId as number };
});

const subjectPatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "科目データを指定してください");
	const errors: { field: string; message: string }[] = [];
	const name = body.name;
	const teacherId = body.teacherId;
	if (name !== undefined && (typeof name !== "string" || name.trim().length === 0 || name.length > 255)) {
		errors.push({ field: "name", message: "科目名は1〜255文字で指定してください" });
	}
	if (teacherId !== undefined && (typeof teacherId !== "string" || teacherId.trim().length === 0 || teacherId.length > 36)) {
		errors.push({ field: "teacherId", message: "担当者IDが不正です" });
	}
	for (const field of ["courseId", "yearId"] as const) {
		if (body[field] !== undefined && (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0)) {
			errors.push({ field, message: `${field}は正の整数で指定してください` });
		}
	}
	if (body.name === undefined && body.teacherId === undefined && body.courseId === undefined && body.yearId === undefined) {
		return validationError(c, "編集する項目がありません");
	}
	if (errors.length > 0) return validationError(c, "科目の入力値を確認してください", errors);
	return {
		...(name === undefined ? {} : { name: (name as string).trim() }),
		...(teacherId === undefined ? {} : { teacherId: (teacherId as string).trim() }),
		...(body.courseId === undefined ? {} : { courseId: body.courseId as number }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
	};
});

const findSubject = async (id: number) => {
	const [item] = await db
		.select({
			id: subjects.id,
			name: subjects.name,
			teacherId: subjects.teacherId,
			teacherYearId: subjects.teacherYearId,
			teacherName: user.name,
			courseId: subjects.courseId,
			courseName: courses.name,
			yearId: subjects.yearId,
		})
		.from(subjects)
		.innerJoin(courses, eq(subjects.courseId, courses.id))
		.innerJoin(user, eq(subjects.teacherId, user.id))
		.where(eq(subjects.id, id))
		.limit(1);
	return item;
};

const ensureSubjectRelations = async (teacherId: string, courseId: number, yearId: number) => {
	const [teacher, course, year] = await Promise.all([
		db.select({ id: user.id }).from(user).where(and(eq(user.id, teacherId), eq(user.role, "teacher"))).limit(1),
		db.select({ id: courses.id, yearId: courses.yearId }).from(courses).where(eq(courses.id, courseId)).limit(1),
		db.select({ id: years.id }).from(years).where(eq(years.id, yearId)).limit(1),
	]);
	if (!teacher[0]) return "担当講師" as const;
	if (!year[0]) return "年度" as const;
	if (!course[0]) return "コース" as const;
	if (course[0].yearId !== yearId) return "年度とコース" as const;
	return null;
};

const ensureTeacherYear = async (teacherId: string, yearId: number) => {
	const [existing] = await db.select({ id: userYears.id }).from(userYears).where(and(eq(userYears.userId, teacherId), eq(userYears.yearId, yearId))).limit(1);
	if (existing) return existing.id;
	const id = randomUUID();
	await db.insert(userYears).values({ id, userId: teacherId, yearId });
	return id;
};

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const query = c.req.valid("query");
		const conditions = [eq(subjects.yearId, query.yearId ?? actor.yearId)];
		if (!actor.role || actor.role !== "staff") conditions.push(eq(subjects.teacherId, actor.id));
		if (query.courseId) conditions.push(eq(subjects.courseId, query.courseId));
		if (query.search) conditions.push(like(subjects.name, `%${query.search}%`));
		const items = await db
			.select({
				id: subjects.id,
				name: subjects.name,
				teacherId: subjects.teacherId,
				teacherYearId: subjects.teacherYearId,
				teacherName: user.name,
				courseId: subjects.courseId,
				courseName: courses.name,
				yearId: subjects.yearId,
			})
			.from(subjects)
			.innerJoin(courses, eq(subjects.courseId, courses.id))
			.innerJoin(user, eq(subjects.teacherId, user.id))
			.where(and(...conditions))
			.orderBy(asc(courses.name), asc(subjects.name));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "科目");
		const item = await findSubject(id);
		if (!item) return notFound(c, "科目");
		if (actor.role !== "staff" && item.teacherId !== actor.id) return c.json({ error: { code: "FORBIDDEN", message: "この科目を参照できません" } }, 403);
		return c.json({ item });
	})
	.post("/", subjectBodyValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const body = c.req.valid("json");
		const invalidRelation = await ensureSubjectRelations(body.teacherId, body.courseId, body.yearId);
		if (invalidRelation) return notFound(c, invalidRelation);
		try {
			const teacherYearId = await ensureTeacherYear(body.teacherId, body.yearId);
			const result = await db.insert(subjects).values({ ...body, teacherYearId });
			return c.json({ item: await findSubject(Number(result[0].insertId)) }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度・コースに同名の科目は登録できません");
			throw error;
		}
	})
	.patch("/:id", subjectPatchValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "科目");
		const existing = await findSubject(id);
		if (!existing) return notFound(c, "科目");
		const body = c.req.valid("json");
		const teacherId = body.teacherId ?? existing.teacherId;
		const courseId = body.courseId ?? existing.courseId;
		const yearId = body.yearId ?? existing.yearId;
		const relationError = await ensureSubjectRelations(teacherId, courseId, yearId);
		if (relationError) return notFound(c, relationError);
		try {
			const teacherYearId = await ensureTeacherYear(teacherId, yearId);
			await db.update(subjects).set({ ...body, teacherYearId }).where(eq(subjects.id, id));
			return c.json({ item: await findSubject(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度・コースに同名の科目は登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "科目");
		try {
			const result = await db.delete(subjects).where(eq(subjects.id, id));
			if (result[0].affectedRows === 0) return notFound(c, "科目");
			return c.json({ status: "deleted" as const, id });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "成績・評価基準が紐づく科目は削除できません");
			throw error;
		}
	});

export default app;
