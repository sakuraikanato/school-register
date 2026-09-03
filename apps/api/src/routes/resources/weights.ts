import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { subjects, user, weights, years } from "../../db/schema";
import { validateWeights, type WeightValues } from "../../lib/grade";
import { forbidden, notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	requireStaffResponse,
	resourceQueryValidator,
} from "../../lib/resource";

const weightBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "評価基準データを指定してください");
	const weight = validateWeights(body);
	if (!weight.success) return validationError(c, "評価基準の入力値を確認してください", weight.errors);
	const errors: { field: string; message: string }[] = [];
	if (typeof body.teacherId !== "string" || body.teacherId.trim().length === 0 || body.teacherId.length > 191) errors.push({ field: "teacherId", message: "teacherIdが不正です" });
	for (const field of ["subjectId", "yearId"] as const) {
		if (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0) errors.push({ field, message: `${field}は正の整数で指定してください` });
	}
	if (typeof body.isFirstTerm !== "boolean") errors.push({ field: "isFirstTerm", message: "isFirstTermは真偽値で指定してください" });
	if (errors.length > 0) return validationError(c, "評価基準の入力値を確認してください", errors);
	return {
		teacherId: (body.teacherId as string).trim(),
		subjectId: body.subjectId as number,
		yearId: body.yearId as number,
		isFirstTerm: body.isFirstTerm as boolean,
		...weight.data,
	};
});

const weightPatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "評価基準データを指定してください");
	if (Object.keys(body).length === 0) return validationError(c, "編集する項目がありません");
	const errors: { field: string; message: string }[] = [];
	for (const field of ["teacherId", "subjectId", "yearId"] as const) {
		if (body[field] === undefined) continue;
		if (field === "teacherId" && (typeof body[field] !== "string" || body[field].trim().length === 0 || body[field].length > 191)) errors.push({ field, message: "teacherIdが不正です" });
		if (field !== "teacherId" && (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0)) errors.push({ field, message: `${field}は正の整数で指定してください` });
	}
	if (body.isFirstTerm !== undefined && typeof body.isFirstTerm !== "boolean") errors.push({ field: "isFirstTerm", message: "isFirstTermは真偽値で指定してください" });
	const weightFields = ["attendanceWeight", "attitudeWeight", "assignmentWeight"] as const;
	if (weightFields.some((field) => body[field] !== undefined)) {
		for (const field of weightFields) if (typeof body[field] !== "number" || !Number.isInteger(body[field]) || body[field] < 1 || body[field] > 10) errors.push({ field, message: "重みは1〜10の整数で指定してください" });
		if (weightFields.every((field) => typeof body[field] === "number") && (body.attendanceWeight as number) + (body.attitudeWeight as number) + (body.assignmentWeight as number) !== 10) errors.push({ field: "weights", message: "3つの重みの合計は10にしてください" });
	}
	if (errors.length > 0) return validationError(c, "評価基準の入力値を確認してください", errors);
	return {
		...(body.teacherId === undefined ? {} : { teacherId: (body.teacherId as string).trim() }),
		...(body.subjectId === undefined ? {} : { subjectId: body.subjectId as number }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
		...(body.isFirstTerm === undefined ? {} : { isFirstTerm: body.isFirstTerm as boolean }),
		...(body.attendanceWeight === undefined ? {} : { attendanceWeight: body.attendanceWeight as number }),
		...(body.attitudeWeight === undefined ? {} : { attitudeWeight: body.attitudeWeight as number }),
		...(body.assignmentWeight === undefined ? {} : { assignmentWeight: body.assignmentWeight as number }),
	};
});

const findWeight = async (id: number) => {
	const [item] = await db
		.select({
			id: weights.id,
			teacherId: weights.teacherId,
			teacherName: user.name,
			subjectId: weights.subjectId,
			subjectName: subjects.name,
			yearId: weights.yearId,
			isFirstTerm: weights.isFirstTerm,
			attendanceWeight: weights.attendanceWeight,
			attitudeWeight: weights.attitudeWeight,
			assignmentWeight: weights.assignmentWeight,
		})
		.from(weights)
		.innerJoin(subjects, eq(weights.subjectId, subjects.id))
		.innerJoin(user, eq(weights.teacherId, user.id))
		.where(eq(weights.id, id))
		.limit(1);
	return item;
};

const ensureWeightRelations = async (teacherId: string, subjectId: number, yearId: number) => {
	const [teacher, subject, year] = await Promise.all([
		db.select({ id: user.id }).from(user).where(and(eq(user.id, teacherId), eq(user.role, "teacher"))).limit(1),
		db.select({ id: subjects.id, teacherId: subjects.teacherId, yearId: subjects.yearId }).from(subjects).where(eq(subjects.id, subjectId)).limit(1),
		db.select({ id: years.id }).from(years).where(eq(years.id, yearId)).limit(1),
	]);
	if (!teacher[0]) return "担当講師" as const;
	if (!year[0]) return "年度" as const;
	if (!subject[0]) return "科目" as const;
	if (subject[0].teacherId !== teacherId || subject[0].yearId !== yearId) return "科目と担当講師または年度" as const;
	return null;
};

const canEditWeight = async (actorId: string, role: string, teacherId: string) => role === "staff" || actorId === teacherId;

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const query = c.req.valid("query");
		const conditions = [];
		if (query.yearId) conditions.push(eq(weights.yearId, query.yearId));
		if (query.subjectId) conditions.push(eq(weights.subjectId, query.subjectId));
		if (query.isFirstTerm !== undefined) conditions.push(eq(weights.isFirstTerm, query.isFirstTerm));
		if (actor.role !== "staff") conditions.push(eq(weights.teacherId, actor.id));
		const items = await db
			.select({
				id: weights.id,
				teacherId: weights.teacherId,
				teacherName: user.name,
				subjectId: weights.subjectId,
				subjectName: subjects.name,
				yearId: weights.yearId,
				isFirstTerm: weights.isFirstTerm,
				attendanceWeight: weights.attendanceWeight,
				attitudeWeight: weights.attitudeWeight,
				assignmentWeight: weights.assignmentWeight,
			})
			.from(weights)
			.innerJoin(subjects, eq(weights.subjectId, subjects.id))
			.innerJoin(user, eq(weights.teacherId, user.id))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(asc(subjects.name));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "評価基準");
		const item = await findWeight(id);
		if (!item) return notFound(c, "評価基準");
		if (!(await canEditWeight(actor.id, actor.role, item.teacherId))) return forbidden(c);
		return c.json({ item });
	})
	.post("/", weightBodyValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const body = c.req.valid("json");
		if (!(await canEditWeight(actor.id, actor.role, body.teacherId))) return forbidden(c);
		const relationError = await ensureWeightRelations(body.teacherId, body.subjectId, body.yearId);
		if (relationError) return notFound(c, relationError);
		try {
			const result = await db.insert(weights).values(body);
			return c.json({ item: await findWeight(Number(result[0].insertId)) }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ科目・年度・学期の評価基準は登録できません");
			throw error;
		}
	})
	.patch("/:id", weightPatchValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "評価基準");
		const existing = await findWeight(id);
		if (!existing) return notFound(c, "評価基準");
		if (!(await canEditWeight(actor.id, actor.role, existing.teacherId))) return forbidden(c);
		const body = c.req.valid("json");
		const merged: WeightValues = {
			attendanceWeight: body.attendanceWeight ?? existing.attendanceWeight,
			attitudeWeight: body.attitudeWeight ?? existing.attitudeWeight,
			assignmentWeight: body.assignmentWeight ?? existing.assignmentWeight,
		};
		const valid = validateWeights(merged);
		if (!valid.success) return validationError(c, "評価基準の合計は10にしてください", valid.errors);
		const teacherId = body.teacherId ?? existing.teacherId;
		const subjectId = body.subjectId ?? existing.subjectId;
		const yearId = body.yearId ?? existing.yearId;
		const relationError = await ensureWeightRelations(teacherId, subjectId, yearId);
		if (relationError) return notFound(c, relationError);
		try {
			await db.update(weights).set({ ...body, ...valid.data }).where(eq(weights.id, id));
			return c.json({ item: await findWeight(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ科目・年度・学期の評価基準は登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "評価基準");
		const existing = await findWeight(id);
		if (!existing) return notFound(c, "評価基準");
		if (!(await canEditWeight(actor.id, actor.role, existing.teacherId))) return forbidden(c);
		const result = await db.delete(weights).where(eq(weights.id, id));
		if (result[0].affectedRows === 0) return notFound(c, "評価基準");
		return c.json({ status: "deleted" as const, id });
	});

export default app;
