import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { grades, students, subjects, user, weights } from "../../db/schema";
import { calculateScore, validateGradeValues, type GradeValues } from "../../lib/grade";
import { forbidden, notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	resourceQueryValidator,
} from "../../lib/resource";

type GradeBody = GradeValues & { studentId: number; subjectId: number; yearId: number; isFirstTerm: boolean };

const gradeBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "成績データを指定してください");
	const errors: { field: string; message: string }[] = [];
	for (const field of ["studentId", "subjectId", "yearId"] as const) {
		if (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0) errors.push({ field, message: `${field}は正の整数で指定してください` });
	}
	if (typeof body.isFirstTerm !== "boolean") errors.push({ field: "isFirstTerm", message: "isFirstTermは真偽値で指定してください" });
	const values = validateGradeValues(body);
	if (!values.success) errors.push(...values.errors);
	if (errors.length > 0) return validationError(c, "成績の入力値を確認してください", errors);
	return {
		studentId: body.studentId as number,
		subjectId: body.subjectId as number,
		yearId: body.yearId as number,
		isFirstTerm: body.isFirstTerm as boolean,
		...(values.success ? values.data : {}),
	};
});

const gradePatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "成績データを指定してください");
	if (Object.keys(body).length === 0) return validationError(c, "編集する項目がありません");
	const errors: { field: string; message: string }[] = [];
	for (const field of ["studentId", "subjectId", "yearId"] as const) {
		if (body[field] !== undefined && (typeof body[field] !== "number" || !Number.isSafeInteger(body[field]) || body[field] <= 0)) errors.push({ field, message: `${field}は正の整数で指定してください` });
	}
	if (body.isFirstTerm !== undefined && typeof body.isFirstTerm !== "boolean") errors.push({ field: "isFirstTerm", message: "isFirstTermは真偽値で指定してください" });
	const gradeFields = ["attendance", "attitude", "assignment"] as const;
	if (gradeFields.some((field) => body[field] !== undefined)) {
		const values = validateGradeValues({
			attendance: body.attendance,
			attitude: body.attitude,
			assignment: body.assignment,
		});
		// A PATCH may omit fields; validate the supplied fields here and validate
		// the complete merged value after the existing row has been loaded.
		for (const field of gradeFields) {
			if (body[field] === undefined) continue;
			if (typeof body[field] !== "number" || !Number.isInteger(body[field])) errors.push({ field, message: "成績は整数で指定してください" });
		}
		void values;
	}
	if (errors.length > 0) return validationError(c, "成績の入力値を確認してください", errors);
	return {
		...(body.studentId === undefined ? {} : { studentId: body.studentId as number }),
		...(body.subjectId === undefined ? {} : { subjectId: body.subjectId as number }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
		...(body.isFirstTerm === undefined ? {} : { isFirstTerm: body.isFirstTerm as boolean }),
		...(body.attendance === undefined ? {} : { attendance: body.attendance as number }),
		...(body.attitude === undefined ? {} : { attitude: body.attitude as number }),
		...(body.assignment === undefined ? {} : { assignment: body.assignment as number }),
	};
});

const findGrade = async (id: number) => {
	const [item] = await db
		.select({
			id: grades.id,
			studentId: grades.studentId,
			studentNumber: students.studentNumber,
			studentName: students.name,
			subjectId: grades.subjectId,
			subjectName: subjects.name,
			teacherId: subjects.teacherId,
			teacherName: user.name,
			courseId: subjects.courseId,
			yearId: grades.yearId,
			attendance: grades.attendance,
			attitude: grades.attitude,
			assignment: grades.assignment,
			isFirstTerm: grades.isFirstTerm,
			score: grades.score,
			isConfirmed: grades.isConfirmed,
			confirmedAt: grades.confirmedAt,
			confirmedBy: grades.confirmedBy,
		})
		.from(grades)
		.innerJoin(students, eq(grades.studentId, students.id))
		.innerJoin(subjects, eq(grades.subjectId, subjects.id))
		.innerJoin(user, eq(subjects.teacherId, user.id))
		.where(eq(grades.id, id))
		.limit(1);
	return item;
};

const ensureGradeRelations = async (studentId: number, subjectId: number, yearId: number) => {
	const [student, subject] = await Promise.all([
		db.select({ id: students.id, courseId: students.courseId, yearId: students.yearId }).from(students).where(eq(students.id, studentId)).limit(1),
		db.select({ id: subjects.id, courseId: subjects.courseId, yearId: subjects.yearId, teacherId: subjects.teacherId }).from(subjects).where(eq(subjects.id, subjectId)).limit(1),
	]);
	if (!student[0]) return { ok: false as const, error: "生徒" };
	if (!subject[0]) return { ok: false as const, error: "科目" };
	if (student[0].yearId !== yearId || subject[0].yearId !== yearId || student[0].courseId !== subject[0].courseId) return { ok: false as const, error: "生徒・科目・年度" };
	return { ok: true as const, subject: subject[0] };
};

const weightFor = async (teacherId: string, subjectId: number, yearId: number, isFirstTerm: boolean) => {
	const [weight] = await db
		.select()
		.from(weights)
		.where(and(eq(weights.teacherId, teacherId), eq(weights.subjectId, subjectId), eq(weights.yearId, yearId), eq(weights.isFirstTerm, isFirstTerm)))
		.limit(1);
	return weight;
};

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const query = c.req.valid("query");
		const conditions = [];
		if (query.yearId ?? actor.yearId) conditions.push(eq(grades.yearId, query.yearId ?? actor.yearId));
		if (query.subjectId) conditions.push(eq(grades.subjectId, query.subjectId));
		if (query.studentId) conditions.push(eq(grades.studentId, query.studentId));
		if (query.isFirstTerm !== undefined) conditions.push(eq(grades.isFirstTerm, query.isFirstTerm));
		if (actor.role !== "staff") conditions.push(eq(subjects.teacherId, actor.id));
		const items = await db
			.select({
				id: grades.id,
				studentId: grades.studentId,
				studentNumber: students.studentNumber,
				studentName: students.name,
				subjectId: grades.subjectId,
				subjectName: subjects.name,
				teacherId: subjects.teacherId,
				yearId: grades.yearId,
				attendance: grades.attendance,
				attitude: grades.attitude,
				assignment: grades.assignment,
				isFirstTerm: grades.isFirstTerm,
				score: grades.score,
				isConfirmed: grades.isConfirmed,
				confirmedAt: grades.confirmedAt,
				confirmedBy: grades.confirmedBy,
			})
			.from(grades)
			.innerJoin(students, eq(grades.studentId, students.id))
			.innerJoin(subjects, eq(grades.subjectId, subjects.id))
			.where(and(...conditions))
			.orderBy(asc(students.studentNumber), asc(subjects.name));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "成績");
		const item = await findGrade(id);
		if (!item) return notFound(c, "成績");
		if (actor.role !== "staff" && item.teacherId !== actor.id) return forbidden(c);
		return c.json({ item });
	})
	.post("/", gradeBodyValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const body = c.req.valid("json") as GradeBody;
		const relation = await ensureGradeRelations(body.studentId, body.subjectId, body.yearId);
		if (!relation.ok) return notFound(c, relation.error);
		if (actor.role !== "staff" && relation.subject.teacherId !== actor.id) return forbidden(c);
		const weight = await weightFor(relation.subject.teacherId, body.subjectId, body.yearId, body.isFirstTerm);
		if (!weight) return c.json({ error: { code: "WEIGHT_NOT_CONFIGURED", message: "先に評価基準を登録してください" } }, 422);
		try {
			const result = await db.insert(grades).values({
				studentId: body.studentId,
				subjectId: body.subjectId,
				yearId: body.yearId,
				isFirstTerm: body.isFirstTerm,
				attendance: body.attendance,
				attitude: body.attitude,
				assignment: body.assignment,
				score: calculateScore(body, weight),
			});
			return c.json({ item: await findGrade(Number(result[0].insertId)) }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ生徒・科目・年度・学期の成績は登録できません");
			throw error;
		}
	})
	.patch("/:id", gradePatchValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "成績");
		const existing = await findGrade(id);
		if (!existing) return notFound(c, "成績");
		if (actor.role !== "staff" && existing.teacherId !== actor.id) return forbidden(c);
		if (existing.isConfirmed && actor.role !== "staff") return c.json({ error: { code: "GRADE_CONFIRMED", message: "確定済みの成績は編集できません" } }, 409);
		const body = c.req.valid("json");
		const merged = {
			studentId: body.studentId ?? existing.studentId,
			subjectId: body.subjectId ?? existing.subjectId,
			yearId: body.yearId ?? existing.yearId,
			isFirstTerm: body.isFirstTerm ?? existing.isFirstTerm,
			attendance: body.attendance ?? existing.attendance,
			attitude: body.attitude ?? existing.attitude,
			assignment: body.assignment ?? existing.assignment,
		};
		const validValues = validateGradeValues(merged);
		if (!validValues.success) return validationError(c, "成績の入力値を確認してください", validValues.errors);
		const relation = await ensureGradeRelations(merged.studentId, merged.subjectId, merged.yearId);
		if (!relation.ok) return notFound(c, relation.error);
		if (actor.role !== "staff" && relation.subject.teacherId !== actor.id) return forbidden(c);
		const weight = await weightFor(relation.subject.teacherId, merged.subjectId, merged.yearId, merged.isFirstTerm);
		if (!weight) return c.json({ error: { code: "WEIGHT_NOT_CONFIGURED", message: "先に評価基準を登録してください" } }, 422);
		try {
			await db.update(grades).set({ ...merged, score: calculateScore(validValues.data, weight) }).where(eq(grades.id, id));
			return c.json({ item: await findGrade(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ生徒・科目・年度・学期の成績は登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "成績");
		const existing = await findGrade(id);
		if (!existing) return notFound(c, "成績");
		if (actor.role !== "staff" && existing.teacherId !== actor.id) return forbidden(c);
		if (existing.isConfirmed && actor.role !== "staff") return c.json({ error: { code: "GRADE_CONFIRMED", message: "確定済みの成績は削除できません" } }, 409);
		const result = await db.delete(grades).where(eq(grades.id, id));
		if (result[0].affectedRows === 0) return notFound(c, "成績");
		return c.json({ status: "deleted" as const, id });
	});

export default app;
