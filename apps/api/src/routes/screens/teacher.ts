import { and, asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { courses, grades, studentCourses, students, subjects, weights } from "../../db/schema";
import {
	calculateScore,
	gradeLabelFromScore,
	termLabel,
	validateGradeValues,
	validateWeights,
	type GradeValues,
	type WeightValues,
} from "../../lib/grade";
import { isCommonCourseName } from "../../lib/course";
import { forbidden, isRecord, notFound, unauthorized, validationError } from "../../lib/http";
import { getCurrentActor, isStaff, type CurrentActor } from "../../lib/session";
import { isFirstTerm, pathId, screenQueryValidator, selectedYear } from "./shared";

type SaveGradesBody = {
	grades: Array<GradeValues & { studentId: number }>;
};

const saveWeightsValidator = validator("json", (value, c) => {
	const parsed = validateWeights(value);
	return parsed.success ? parsed.data : validationError(c, "重みの入力値を確認してください", parsed.errors);
});

const saveGradesValidator = validator("json", (value, c) => {
	if (!isRecord(value) || !Array.isArray(value.grades) || value.grades.length === 0) {
		return validationError(c, "1件以上の成績を入力してください");
	}

	const errors: { field: string; message: string }[] = [];
	const saved = new Set<number>();
	const rows: SaveGradesBody["grades"] = [];

	for (const [index, raw] of value.grades.entries()) {
		if (!isRecord(raw) || typeof raw.studentId !== "number" || !Number.isInteger(raw.studentId) || raw.studentId <= 0) {
			errors.push({ field: `grades.${index}.studentId`, message: "生徒IDが不正です" });
			continue;
		}
		if (saved.has(raw.studentId)) {
			errors.push({ field: `grades.${index}.studentId`, message: "同じ生徒を重複して保存できません" });
			continue;
		}

		const grade = validateGradeValues(raw);
		if (!grade.success) {
			errors.push(...grade.errors.map((error) => ({ field: `grades.${index}.${error.field}`, message: error.message })));
			continue;
		}

		saved.add(raw.studentId);
		rows.push({ studentId: raw.studentId, ...grade.data });
	}

	return errors.length > 0
		? validationError(c, "成績の入力値を確認してください", errors)
		: { grades: rows };
});

const subjectFor = async (subjectId: number, yearId: number) => {
	const [subject] = await db
		.select({
			id: subjects.id,
			name: subjects.name,
			teacherId: subjects.teacherId,
			courseId: subjects.courseId,
			courseName: courses.name,
			yearId: subjects.yearId,
		})
		.from(subjects)
		.innerJoin(courses, eq(subjects.courseId, courses.id))
		.where(and(eq(subjects.id, subjectId), eq(subjects.yearId, yearId)))
		.limit(1);
	return subject;
};

const canEditSubject = (actor: CurrentActor, teacherId: string) => isStaff(actor) || actor.id === teacherId;

const hasConfirmedGrades = async (subjectId: number, yearId: number, firstTerm: boolean) => {
	const [confirmed] = await db
		.select({ id: grades.id })
		.from(grades)
		.where(and(eq(grades.subjectId, subjectId), eq(grades.yearId, yearId), eq(grades.isFirstTerm, firstTerm), eq(grades.isConfirmed, true)))
		.limit(1);
	return Boolean(confirmed);
};

const studentsForSubject = async (subjectCourseId: number, courseName: string, yearId: number) => {
	if (isCommonCourseName(courseName)) {
		return db
			.select({
				id: students.id,
				studentNumber: students.studentNumber,
				name: students.name,
				nameHiragana: students.nameHiragana,
				schoolGrade: students.schoolGrade,
				isAttending: students.isAttending,
			})
			.from(students)
			.where(eq(students.yearId, yearId))
			.orderBy(asc(students.studentNumber));
	}
	const [anyEnrollment] = await db
		.select({ studentId: studentCourses.studentId })
		.from(studentCourses)
		.innerJoin(students, eq(studentCourses.studentId, students.id))
		.where(eq(students.yearId, yearId))
		.limit(1);
	if (!anyEnrollment) {
		return db
			.select({
				id: students.id,
				studentNumber: students.studentNumber,
				name: students.name,
				nameHiragana: students.nameHiragana,
				schoolGrade: students.schoolGrade,
				isAttending: students.isAttending,
			})
			.from(students)
			.where(eq(students.yearId, yearId))
			.orderBy(asc(students.studentNumber));
	}
	return db
		.select({
			id: students.id,
			studentNumber: students.studentNumber,
			name: students.name,
			nameHiragana: students.nameHiragana,
			schoolGrade: students.schoolGrade,
			isAttending: students.isAttending,
		})
		.from(students)
		.innerJoin(studentCourses, eq(studentCourses.studentId, students.id))
		.where(and(eq(studentCourses.courseId, subjectCourseId), eq(students.yearId, yearId)))
		.orderBy(asc(students.studentNumber));
};

const app = new Hono()
	.get("/grade-entry/:subjectId", screenQueryValidator, async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) return unauthorized(c);

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const subject = await subjectFor(subjectId, year.id);
		if (!subject) return notFound(c, "教科");
		if (!canEditSubject(actor, subject.teacherId)) return notFound(c, "教科");

		const firstTerm = isFirstTerm(query);
		const [weightRows, studentRows, gradeRows] = await Promise.all([
			db
				.select()
				.from(weights)
				.where(and(eq(weights.teacherId, subject.teacherId), eq(weights.subjectId, subject.id), eq(weights.yearId, year.id), eq(weights.isFirstTerm, firstTerm)))
				.limit(1),
			studentsForSubject(subject.courseId, subject.courseName, year.id),
			db
				.select()
				.from(grades)
				.where(and(eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm))),
		]);

		const existingByStudent = new Map(gradeRows.map((grade) => [grade.studentId, grade]));
		const missingCount = studentRows.filter((student) => student.isAttending && !existingByStudent.has(student.id)).length;

		return c.json({
			me: actor,
			year,
			term: { value: query.term, label: termLabel(firstTerm) },
			subject,
			weight: weightRows[0] ?? null,
			validationRules: {
				attendance: { min: 0, max: 100, label: "出席率" },
				attitude: { min: 1, max: 10, label: "授業態度" },
				assignment: { min: 1, max: 10, label: "課題" },
				weightsMustSumTo: 10,
			},
			formula: "出席率 × 出席率重み/10 + 授業態度 × 10 × 授業態度重み/10 + 課題 × 10 × 課題重み/10",
			students: studentRows.map((student) => {
				const grade = existingByStudent.get(student.id) ?? null;
				return {
					student,
					grade,
					gradeLabel: grade ? gradeLabelFromScore(grade.score) : null,
					editable: !grade?.isConfirmed,
				};
			}),
			isFinalized: gradeRows.some((grade) => grade.isConfirmed),
			progress: { total: studentRows.filter((student) => student.isAttending).length, missing: missingCount },
		});
	})
	.get("/weight/:subjectId", screenQueryValidator, async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) return unauthorized(c);

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const subject = await subjectFor(subjectId, year.id);
		if (!subject) return notFound(c, "教科");
		if (!canEditSubject(actor, subject.teacherId)) return notFound(c, "教科");

		const firstTerm = isFirstTerm(query);
		const [weight] = await db
			.select()
			.from(weights)
			.where(and(eq(weights.teacherId, subject.teacherId), eq(weights.subjectId, subject.id), eq(weights.yearId, year.id), eq(weights.isFirstTerm, firstTerm)))
			.limit(1);

		return c.json({
			subject,
			year,
			term: { value: query.term, label: termLabel(firstTerm) },
			weight: weight ?? null,
			labels: ["出席率", "授業態度", "課題"],
			formula: "重みは各1〜10、合計10。授業態度・課題は10倍して100点換算します。",
		});
	})
	.put("/grade-entry/:subjectId/weight", screenQueryValidator, saveWeightsValidator, async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) return unauthorized(c);

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const subject = await subjectFor(subjectId, year.id);
		if (!subject) return notFound(c, "教科");
		if (!canEditSubject(actor, subject.teacherId)) return forbidden(c);

		const value = c.req.valid("json") as WeightValues;
		const firstTerm = isFirstTerm(query);
		if (await hasConfirmedGrades(subject.id, year.id, firstTerm)) {
			return c.json({ error: { code: "GRADE_CONFIRMED", message: "確定済みの成績があるため、この学期の評価基準は変更できません" } }, 409);
		}
		await db
			.insert(weights)
			.values({ ...value, teacherId: subject.teacherId, subjectId: subject.id, yearId: year.id, isFirstTerm: firstTerm })
			.onDuplicateKeyUpdate({
				set: value,
			});

		return c.json({
			status: "saved" as const,
			weight: { ...value, teacherId: subject.teacherId, subjectId: subject.id, yearId: year.id, isFirstTerm: firstTerm },
		});
	})
	.put("/grade-entry/:subjectId/grades", screenQueryValidator, saveGradesValidator, async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) return unauthorized(c);

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const subject = await subjectFor(subjectId, year.id);
		if (!subject) return notFound(c, "教科");
		if (!canEditSubject(actor, subject.teacherId)) return forbidden(c);

		const firstTerm = isFirstTerm(query);
		if (await hasConfirmedGrades(subject.id, year.id, firstTerm)) {
			return c.json({ error: { code: "GRADE_CONFIRMED", message: "確定済みの成績は変更できません" } }, 409);
		}
		const [weight] = await db
			.select()
			.from(weights)
			.where(and(eq(weights.teacherId, subject.teacherId), eq(weights.subjectId, subject.id), eq(weights.yearId, year.id), eq(weights.isFirstTerm, firstTerm)))
			.limit(1);
		if (!weight) {
			return c.json({ error: { code: "WEIGHT_NOT_CONFIGURED", message: "先に評価の重みを保存してください" } }, 422);
		}

		const body = c.req.valid("json") as SaveGradesBody;
		const studentIds = body.grades.map((grade) => grade.studentId);
		const [anyEnrollment, existingRows] = await Promise.all([
			db
				.select({ studentId: studentCourses.studentId })
				.from(studentCourses)
				.innerJoin(students, eq(studentCourses.studentId, students.id))
				.where(eq(students.yearId, year.id))
				.limit(1),
			db
				.select({ studentId: grades.studentId, isConfirmed: grades.isConfirmed })
				.from(grades)
				.where(and(inArray(grades.studentId, studentIds), eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm))),
		]);

		const enrolledRows = isCommonCourseName(subject.courseName)
			? await db.select({ id: students.id }).from(students).where(and(inArray(students.id, studentIds), eq(students.yearId, year.id)))
			: anyEnrollment.length === 0
			? await db.select({ id: students.id }).from(students).where(and(inArray(students.id, studentIds), eq(students.yearId, year.id)))
			: await db
					.select({ id: students.id })
					.from(students)
					.innerJoin(studentCourses, eq(studentCourses.studentId, students.id))
					.where(and(inArray(students.id, studentIds), eq(studentCourses.courseId, subject.courseId), eq(students.yearId, year.id)));
		if (enrolledRows.length !== studentIds.length) {
			return validationError(c, "この教科に属しない生徒が含まれています");
		}
		if (existingRows.some((grade) => grade.isConfirmed)) {
			return c.json({ error: { code: "GRADE_CONFIRMED", message: "確定済みの成績は変更できません" } }, 409);
		}

		const saved = body.grades.map((grade) => ({
			...grade,
			score: calculateScore(grade, weight),
		}));
		await db.transaction(async (tx) => {
			for (const grade of saved) {
				await tx
					.insert(grades)
					.values({
						studentId: grade.studentId,
						subjectId: subject.id,
						yearId: year.id,
						isFirstTerm: firstTerm,
						attendance: grade.attendance,
						attitude: grade.attitude,
						assignment: grade.assignment,
						score: grade.score,
					})
					.onDuplicateKeyUpdate({
						set: {
							attendance: grade.attendance,
							attitude: grade.attitude,
							assignment: grade.assignment,
							score: grade.score,
						},
					});
			}
		});

		return c.json({
			status: "saved" as const,
			count: saved.length,
			grades: saved.map((grade) => ({ ...grade, gradeLabel: gradeLabelFromScore(grade.score) })),
		});
	});

export default app;
