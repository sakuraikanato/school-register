import { and, count, countDistinct, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";

import { db } from "../../db";
import { courses, grades, studentCourses, students, subjects, weights } from "../../db/schema";
import { COMMON_COURSE_NAME } from "../../lib/course";
import { termLabel } from "../../lib/grade";
import { notFound, unauthorized } from "../../lib/http";
import { getCurrentActor } from "../../lib/session";
import { isFirstTerm, screenQueryValidator, selectedYear } from "./shared";

const countBy = <T extends { key: number; count: unknown }>(rows: T[]) =>
	new Map(rows.map((row) => [row.key, Number(row.count)]));

const app = new Hono()
	.get("/dashboard", screenQueryValidator, async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) return unauthorized(c);

		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const firstTerm = isFirstTerm(query);

		if (actor.role === "teacher") {
			const teacherSubjects = await db
				.select({
					id: subjects.id,
					name: subjects.name,
					courseId: courses.id,
					courseName: courses.name,
				})
				.from(subjects)
				.innerJoin(courses, eq(subjects.courseId, courses.id))
				.where(and(eq(subjects.teacherId, actor.id), eq(subjects.yearId, year.id)));

			const subjectIds = teacherSubjects.map((subject) => subject.id);
			const [weightRows, enrollmentRows, gradeRows] = await Promise.all([
				subjectIds.length === 0
					? Promise.resolve([])
					: db
						.select({ subjectId: weights.subjectId })
						.from(weights)
						.where(and(inArray(weights.subjectId, subjectIds), eq(weights.yearId, year.id), eq(weights.isFirstTerm, firstTerm))),
				subjectIds.length === 0
					? Promise.resolve([])
					: db
						.select({ key: subjects.id, count: countDistinct(students.id) })
						.from(subjects)
						.innerJoin(courses, eq(subjects.courseId, courses.id))
						.leftJoin(studentCourses, eq(studentCourses.courseId, subjects.courseId))
						.leftJoin(students, and(eq(students.yearId, year.id), eq(students.isAttending, true), or(eq(courses.name, COMMON_COURSE_NAME), eq(students.id, studentCourses.studentId))))
						.where(inArray(subjects.id, subjectIds))
						.groupBy(subjects.id),
				subjectIds.length === 0
					? Promise.resolve([])
					: db
						.select({ key: grades.subjectId, count: count(grades.id) })
						.from(grades)
						.where(and(inArray(grades.subjectId, subjectIds), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm)))
						.groupBy(grades.subjectId),
			]);

			const enrolled = countBy(enrollmentRows);
			const entered = countBy(gradeRows);
			const configuredWeights = new Set(weightRows.map((row) => row.subjectId));

			return c.json({
				role: "teacher" as const,
				me: actor,
				year,
				term: { value: query.term, label: termLabel(firstTerm) },
				subjects: teacherSubjects.map((subject) => ({
					...subject,
					studentCount: enrolled.get(subject.id) ?? 0,
					enteredCount: entered.get(subject.id) ?? 0,
					incompleteCount: Math.max(0, (enrolled.get(subject.id) ?? 0) - (entered.get(subject.id) ?? 0)),
					hasWeights: configuredWeights.has(subject.id),
					gradeEntryPath: `/api/screens/teacher/grade-entry/${subject.id}`,
				})),
				actions: [{ label: "パスワード変更", path: "/password/change" }],
			});
		}

		const [courseRows, subjectRows, attending] = await Promise.all([
			db.select().from(courses).where(eq(courses.yearId, year.id)),
			db
				.select({ id: subjects.id, name: subjects.name, courseId: subjects.courseId })
				.from(subjects)
				.where(eq(subjects.yearId, year.id)),
			db.select({ count: count(students.id) }).from(students).where(and(eq(students.yearId, year.id), eq(students.isAttending, true))),
		]);

		return c.json({
			role: "staff" as const,
			me: actor,
			year,
			term: { value: query.term, label: termLabel(firstTerm) },
			summary: { courseCount: courseRows.length, subjectCount: subjectRows.length, attendingStudentCount: Number(attending[0]?.count ?? 0) },
			courses: courseRows,
			subjects: subjectRows,
			actions: [
				{ label: "全生徒の成績一覧", path: "/staff/students" },
				{ label: "成績確定", path: "/staff/finalization" },
				{ label: "CSV読み込み", path: "/staff/csv-import" },
				{ label: "パスワード変更", path: "/password/change" },
			],
		});
	});

export default app;
