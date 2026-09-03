import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { courses, students, subjects } from "../../db/schema";
import { notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	requireStaffResponse,
	resourceQueryValidator,
} from "../../lib/resource";

const genders = ["male", "female", "other"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const toDate = (value: string) => {
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

const validateStudentFields = (body: Record<string, unknown>, partial: boolean) => {
	const errors: { field: string; message: string }[] = [];
	const requiredStrings = [
		["studentNumber", 50],
		["schoolGrade", 50],
		["name", 255],
		["nameHiragana", 255],
		["email", 255],
		["tel", 50],
		["postCode", 20],
		["address", 512],
	] as const;
	for (const [field, max] of requiredStrings) {
		if (partial && body[field] === undefined) continue;
		if (typeof body[field] !== "string" || body[field].trim().length === 0 || body[field].length > max) {
			errors.push({ field, message: `${field}は1〜${max}文字で指定してください` });
		}
	}
	if (!partial || body.courseId !== undefined) {
		if (typeof body.courseId !== "number" || !Number.isSafeInteger(body.courseId) || body.courseId <= 0) errors.push({ field: "courseId", message: "courseIdが不正です" });
	}
	if (!partial || body.yearId !== undefined) {
		if (typeof body.yearId !== "number" || !Number.isSafeInteger(body.yearId) || body.yearId <= 0) errors.push({ field: "yearId", message: "yearIdが不正です" });
	}
	if (!partial || body.birthDate !== undefined) {
		if (typeof body.birthDate !== "string" || !datePattern.test(body.birthDate) || !toDate(body.birthDate)) errors.push({ field: "birthDate", message: "birthDateはYYYY-MM-DD形式で指定してください" });
	}
	if (!partial || body.gender !== undefined) {
		if (typeof body.gender !== "string" || !genders.includes(body.gender as (typeof genders)[number])) errors.push({ field: "gender", message: "genderが不正です" });
	}
	if (body.isAttending !== undefined && typeof body.isAttending !== "boolean") errors.push({ field: "isAttending", message: "isAttendingは真偽値で指定してください" });
	return errors;
};

const studentBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "生徒データを指定してください");
	const errors = validateStudentFields(body, false);
	if (errors.length > 0) return validationError(c, "生徒の入力値を確認してください", errors);
	return {
		courseId: body.courseId as number,
		yearId: body.yearId as number,
		studentNumber: (body.studentNumber as string).trim(),
		schoolGrade: (body.schoolGrade as string).trim(),
		name: (body.name as string).trim(),
		nameHiragana: (body.nameHiragana as string).trim(),
		birthDate: toDate(body.birthDate as string)!,
		gender: body.gender as (typeof genders)[number],
		email: (body.email as string).trim(),
		tel: (body.tel as string).trim(),
		postCode: (body.postCode as string).trim(),
		address: (body.address as string).trim(),
		isAttending: body.isAttending === undefined ? true : body.isAttending as boolean,
	};
});

const studentPatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "生徒データを指定してください");
	if (Object.keys(body).length === 0) return validationError(c, "編集する項目がありません");
	const errors = validateStudentFields(body, true);
	if (errors.length > 0) return validationError(c, "生徒の入力値を確認してください", errors);
	return {
		...(body.courseId === undefined ? {} : { courseId: body.courseId as number }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
		...(body.studentNumber === undefined ? {} : { studentNumber: (body.studentNumber as string).trim() }),
		...(body.schoolGrade === undefined ? {} : { schoolGrade: (body.schoolGrade as string).trim() }),
		...(body.name === undefined ? {} : { name: (body.name as string).trim() }),
		...(body.nameHiragana === undefined ? {} : { nameHiragana: (body.nameHiragana as string).trim() }),
		...(body.birthDate === undefined ? {} : { birthDate: toDate(body.birthDate as string)! }),
		...(body.gender === undefined ? {} : { gender: body.gender as (typeof genders)[number] }),
		...(body.email === undefined ? {} : { email: (body.email as string).trim() }),
		...(body.tel === undefined ? {} : { tel: (body.tel as string).trim() }),
		...(body.postCode === undefined ? {} : { postCode: (body.postCode as string).trim() }),
		...(body.address === undefined ? {} : { address: (body.address as string).trim() }),
		...(body.isAttending === undefined ? {} : { isAttending: body.isAttending as boolean }),
	};
});

const findStudent = async (id: number) => {
	const [item] = await db
		.select({
			id: students.id,
			courseId: students.courseId,
			courseName: courses.name,
			studentNumber: students.studentNumber,
			schoolGrade: students.schoolGrade,
			name: students.name,
			nameHiragana: students.nameHiragana,
			birthDate: students.birthDate,
			gender: students.gender,
			email: students.email,
			tel: students.tel,
			postCode: students.postCode,
			address: students.address,
			yearId: students.yearId,
			isAttending: students.isAttending,
		})
		.from(students)
		.innerJoin(courses, eq(students.courseId, courses.id))
		.where(eq(students.id, id))
		.limit(1);
	return item;
};

const ensureCourse = async (courseId: number, yearId: number) => {
	const [course] = await db.select({ id: courses.id, yearId: courses.yearId }).from(courses).where(eq(courses.id, courseId)).limit(1);
	if (!course) return "コース" as const;
	if (course.yearId !== yearId) return "年度とコース" as const;
	return null;
};

const canTeacherSeeStudent = async (teacherId: string, student: { courseId: number; yearId: number }) => {
	const [subject] = await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.teacherId, teacherId), eq(subjects.courseId, student.courseId), eq(subjects.yearId, student.yearId))).limit(1);
	return Boolean(subject);
};

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const query = c.req.valid("query");
		const yearId = query.yearId ?? actor.yearId;
		const conditions = [eq(students.yearId, yearId)];
		if (query.courseId) conditions.push(eq(students.courseId, query.courseId));
		if (query.search) conditions.push(or(like(students.name, `%${query.search}%`), like(students.studentNumber, `%${query.search}%`))!);
		if (actor.role !== "staff") {
			const teacherSubjects = await db.select({ courseId: subjects.courseId }).from(subjects).where(and(eq(subjects.teacherId, actor.id), eq(subjects.yearId, yearId)));
			const courseIds = [...new Set(teacherSubjects.map((row) => row.courseId))];
			if (courseIds.length === 0) return c.json({ items: [], total: 0 });
			conditions.push(inArray(students.courseId, courseIds));
		}
		const items = await db
			.select({
				id: students.id,
				courseId: students.courseId,
				courseName: courses.name,
				studentNumber: students.studentNumber,
				schoolGrade: students.schoolGrade,
				name: students.name,
				nameHiragana: students.nameHiragana,
				birthDate: students.birthDate,
				gender: students.gender,
				email: students.email,
				tel: students.tel,
				postCode: students.postCode,
				address: students.address,
				yearId: students.yearId,
				isAttending: students.isAttending,
			})
			.from(students)
			.innerJoin(courses, eq(students.courseId, courses.id))
			.where(and(...conditions))
			.orderBy(asc(students.studentNumber));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "生徒");
		const item = await findStudent(id);
		if (!item) return notFound(c, "生徒");
		if (actor.role !== "staff" && !(await canTeacherSeeStudent(actor.id, item))) return c.json({ error: { code: "FORBIDDEN", message: "この生徒を参照できません" } }, 403);
		return c.json({ item });
	})
	.post("/", studentBodyValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const body = c.req.valid("json");
		const relationError = await ensureCourse(body.courseId, body.yearId);
		if (relationError) return notFound(c, relationError);
		try {
			const result = await db.insert(students).values(body);
			return c.json({ item: await findStudent(Number(result[0].insertId)) }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ生徒番号は登録できません");
			throw error;
		}
	})
	.patch("/:id", studentPatchValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "生徒");
		const existing = await findStudent(id);
		if (!existing) return notFound(c, "生徒");
		const body = c.req.valid("json");
		const relationError = await ensureCourse(body.courseId ?? existing.courseId, body.yearId ?? existing.yearId);
		if (relationError) return notFound(c, relationError);
		try {
			await db.update(students).set(body).where(eq(students.id, id));
			return c.json({ item: await findStudent(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ生徒番号は登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "生徒");
		try {
			const result = await db.delete(students).where(eq(students.id, id));
			if (result[0].affectedRows === 0) return notFound(c, "生徒");
			return c.json({ status: "deleted" as const, id });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "成績が紐づく生徒は削除できません");
			throw error;
		}
	});

export default app;
