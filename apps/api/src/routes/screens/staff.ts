import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { courses, grades, studentCourses, students, subjects, user, years } from "../../db/schema";
import { COMMON_COURSE_NAME, isCommonCourseName } from "../../lib/course";
import { importCsv, type CsvImportResource } from "../../lib/csv-import";
import { gradeLabelFromScore, termLabel } from "../../lib/grade";
import { forbidden, isRecord, notFound, unauthorized, validationError } from "../../lib/http";
import { isDatabaseConstraintError } from "../../lib/resource";
import { getCurrentActor, isStaff } from "../../lib/session";
import { isFirstTerm, pathId, screenQueryValidator, selectedYear } from "./shared";

type CsvResource = CsvImportResource;
type CsvPreviewBody = { resource: CsvResource; csvText: string };
type CsvImportBody = CsvPreviewBody & { year: number };

const csvTemplates: Record<CsvResource, { label: string; columns: string[] }> = {
	teachers: { label: "講師", columns: ["name", "nameHiragana", "age", "gender", "email", "initialPassword"] },
	staff: { label: "専任職員", columns: ["name", "nameHiragana", "age", "gender", "email", "initialPassword"] },
	subjects: { label: "科目/コース", columns: ["courseName", "teacherEmail", "subjectName"] },
	students: {
		label: "生徒",
		columns: ["studentNumber", "name", "nameHiragana", "schoolGrade", "birthDate", "gender", "email", "tel", "postCode", "address", "courseName"],
	},
};

const csvColumnAliases: Record<CsvResource, string[][]> = {
	teachers: [["name", "氏名"], ["nameHiragana", "氏名（ひらがな）"], ["age", "年齢"], ["gender", "性別"], ["email", "メールアドレス"]],
	staff: [["name", "氏名"], ["nameHiragana", "氏名（ひらがな）"], ["age", "年齢"], ["gender", "性別"], ["email", "メールアドレス"]],
	subjects: [["courseName", "専攻"], ["teacherEmail", "teacherName", "担当講師"], ["subjectName", "科目名"]],
	students: [["studentNumber", "学籍番号"], ["name", "氏名"], ["nameHiragana", "氏名（ひらがな）"], ["schoolGrade", "学年", "年齢", "gradeNum"], ["birthDate", "生年月日"], ["gender", "性別"], ["email", "メールアドレス"], ["tel", "電話番号"], ["postCode", "郵便番号"], ["address", "住所"], ["courseName", "専攻"]],
};

const parseCsv = (text: string): string[][] => {
	const rows: string[][] = [];
	let row: string[] = [];
	let value = "";
	let quoted = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (char === '"') {
			if (quoted && text[index + 1] === '"') {
				value += '"';
				index += 1;
			} else {
				quoted = !quoted;
			}
		} else if (char === "," && !quoted) {
			row.push(value.trim());
			value = "";
		} else if ((char === "\n" || char === "\r") && !quoted) {
			if (char === "\r" && text[index + 1] === "\n") index += 1;
			row.push(value.trim());
			if (row.some(Boolean)) rows.push(row);
			row = [];
			value = "";
		} else {
			value += char;
		}
	}
	row.push(value.trim());
	if (row.some(Boolean)) rows.push(row);
	return rows;
};

const csvPreviewValidator = validator("json", (value, c) => {
	if (!isRecord(value) || typeof value.csvText !== "string" || !Object.hasOwn(csvTemplates, value.resource as string)) {
		return validationError(c, "resource と csvText を正しく指定してください");
	}
	return { resource: value.resource as CsvResource, csvText: value.csvText };
});

const csvImportValidator = validator("json", (value, c) => {
	if (!isRecord(value) || typeof value.csvText !== "string" || !Object.hasOwn(csvTemplates, value.resource as string)) {
		return validationError(c, "resource と csvText を正しく指定してください");
	}
	if (typeof value.year !== "number" || !Number.isSafeInteger(value.year) || value.year < 1 || value.year > 9999) {
		return validationError(c, "年度は1〜9999の整数で指定してください");
	}
	return { resource: value.resource as CsvResource, csvText: value.csvText, year: value.year } satisfies CsvImportBody;
});

const ensureImportYear = async (yearValue: number) => {
	const [existing] = await db.select().from(years).where(eq(years.year, yearValue)).limit(1);
	if (existing) return existing;
	try {
		const result = await db.insert(years).values({ year: yearValue });
		return { id: Number(result[0].insertId), year: yearValue };
	} catch (error) {
		// If two imports create the same year concurrently, use the row that won
		// the unique constraint race instead of failing the whole import.
		if (!isDatabaseConstraintError(error)) throw error;
		const [created] = await db.select().from(years).where(eq(years.year, yearValue)).limit(1);
		if (created) return created;
		throw error;
	}
};

const requireStaff = async (c: Parameters<typeof getCurrentActor>[0]) => {
	const actor = await getCurrentActor(c);
	return actor && isStaff(actor) ? actor : null;
};

const app = new Hono()
	.get("/students", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const firstTerm = isFirstTerm(query);

		const courseRows = await db.select().from(courses).where(eq(courses.yearId, year.id)).orderBy(asc(courses.name));
		if (query.courseId && !courseRows.some((course) => course.id === query.courseId)) return notFound(c, "コース");

		const conditions = [eq(students.yearId, year.id)];
		if (query.courseId) conditions.push(eq(studentCourses.courseId, query.courseId));
		if (query.search) {
			const pattern = `%${query.search}%`;
			conditions.push(or(like(students.name, pattern), like(students.nameHiragana, pattern), like(students.studentNumber, pattern))!);
		}

		const studentRows = await db
			.select({
				id: students.id,
				studentNumber: students.studentNumber,
				name: students.name,
				nameHiragana: students.nameHiragana,
				schoolGrade: students.schoolGrade,
				isAttending: students.isAttending,
				courseId: courses.id,
				courseName: courses.name,
			})
			.from(students)
			.leftJoin(studentCourses, eq(studentCourses.studentId, students.id))
			.leftJoin(courses, eq(studentCourses.courseId, courses.id))
			.where(and(...conditions))
			.orderBy(asc(students.studentNumber));

		const uniqueStudents = [...new Map(studentRows.map((student) => [student.id, student])).values()];
		const studentIds = uniqueStudents.map((student) => student.id);
		const gradeRows = studentIds.length === 0
			? []
			: await db
					.select({ studentId: grades.studentId, score: grades.score, isConfirmed: grades.isConfirmed })
					.from(grades)
					.where(and(inArray(grades.studentId, studentIds), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm)));
		const gradeByStudent = new Map<number, { scores: number[]; confirmed: number }>();
		for (const grade of gradeRows) {
			const summary = gradeByStudent.get(grade.studentId) ?? { scores: [], confirmed: 0 };
			summary.scores.push(grade.score);
			if (grade.isConfirmed) summary.confirmed += 1;
			gradeByStudent.set(grade.studentId, summary);
		}

		return c.json({
			year,
			term: { value: query.term, label: termLabel(firstTerm) },
			filters: { courseId: query.courseId ?? null, search: query.search ?? "" },
			courses: courseRows,
			students: uniqueStudents.map((student) => {
				const summary = gradeByStudent.get(student.id) ?? { scores: [], confirmed: 0 };
				return {
					...student,
					gradeStatus: {
						enteredSubjectCount: summary.scores.length,
						confirmedSubjectCount: summary.confirmed,
						averageScore: summary.scores.length === 0 ? null : Math.round(summary.scores.reduce((total, score) => total + score, 0) / summary.scores.length),
					},
					gradeSheetPath: `/api/screens/staff/grade-sheet/${student.id}`,
				};
			}),
		});
	})
	.get("/history", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const yearRows = await db.select().from(years).orderBy(desc(years.year));
		const query = c.req.valid("query");
		const selected = await selectedYear(query.yearId);
		if (!selected) return notFound(c, "年度");

		return c.json({
			currentYear: selected,
			years: yearRows,
			gradeLevels: ["1", "2", "3"],
			next: { coursesPath: "/api/screens/staff/students" },
		});
	})
	.get("/grade-sheet/:studentId", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const query = c.req.valid("query");
		const studentId = pathId(c.req.param("studentId"));
		if (!studentId && !query.studentNumber) return notFound(c, "生徒");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");

		const [student] = await db
			.select({
				id: students.id,
				studentNumber: students.studentNumber,
				name: students.name,
				nameHiragana: students.nameHiragana,
				schoolGrade: students.schoolGrade,
				isAttending: students.isAttending,
				courseName: courses.name,
			})
			.from(students)
			.leftJoin(studentCourses, eq(studentCourses.studentId, students.id))
			.leftJoin(courses, eq(studentCourses.courseId, courses.id))
			.where(and(query.studentNumber ? eq(students.studentNumber, query.studentNumber) : eq(students.id, studentId!), eq(students.yearId, year.id)))
		.limit(1);
		if (!student) return notFound(c, "生徒");

		const historyRows = await db
			.select({ id: students.id, yearId: students.yearId, year: years.year, schoolGrade: students.schoolGrade })
			.from(students)
			.innerJoin(years, eq(students.yearId, years.id))
			.where(eq(students.studentNumber, student.studentNumber))
			.orderBy(desc(years.year));

		const gradeRows = await db
			.select({
				isFirstTerm: grades.isFirstTerm,
				attendance: grades.attendance,
				attitude: grades.attitude,
				assignment: grades.assignment,
				score: grades.score,
				isConfirmed: grades.isConfirmed,
				subjectId: subjects.id,
				subjectName: subjects.name,
			})
			.from(grades)
			.innerJoin(subjects, eq(grades.subjectId, subjects.id))
			.where(and(eq(grades.studentId, student.id), eq(grades.yearId, year.id)))
			.orderBy(asc(subjects.name));

		const terms = [true, false].map((firstTerm) => {
			const rows = gradeRows.filter((grade) => grade.isFirstTerm === firstTerm);
			return {
				value: firstTerm ? "first" : "second",
				label: termLabel(firstTerm),
				subjects: rows.map((grade) => ({ ...grade, gradeLabel: gradeLabelFromScore(grade.score) })),
				averageScore: rows.length === 0 ? null : Math.round(rows.reduce((total, grade) => total + grade.score, 0) / rows.length),
			};
		});

		return c.json({
			student,
			year,
			history: historyRows,
			term: { value: query.term, label: termLabel(isFirstTerm(query)) },
			terms,
			overall: {
				enteredSubjectCount: gradeRows.length,
				confirmedSubjectCount: gradeRows.filter((grade) => grade.isConfirmed).length,
				averageScore: gradeRows.length === 0 ? null : Math.round(gradeRows.reduce((total, grade) => total + grade.score, 0) / gradeRows.length),
			},
			print: {
				documentTitle: `${year.year}年度 成績表`,
				fileName: `grade-sheet-${student.studentNumber}-${year.year}.pdf`,
				browserPrintSupported: true,
			},
		});
	})
	.get("/finalization", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const firstTerm = isFirstTerm(query);
		const subjectRows = await db
			.select({ id: subjects.id, name: subjects.name, courseId: subjects.courseId, courseName: courses.name, teacherName: user.name })
			.from(subjects)
			.innerJoin(courses, eq(subjects.courseId, courses.id))
			.innerJoin(user, eq(subjects.teacherId, user.id))
			.where(eq(subjects.yearId, year.id))
			.orderBy(asc(courses.name), asc(subjects.name));
		const subjectIds = subjectRows.map((subject) => subject.id);
		const [enrollmentRows, gradeRows] = await Promise.all([
			subjectIds.length === 0
				? Promise.resolve([])
				: db
						.selectDistinct({ subjectId: subjects.id, studentId: students.id })
						.from(subjects)
						.innerJoin(courses, eq(subjects.courseId, courses.id))
						.leftJoin(studentCourses, eq(studentCourses.courseId, subjects.courseId))
						.leftJoin(students, and(eq(students.yearId, year.id), eq(students.isAttending, true), or(eq(courses.name, COMMON_COURSE_NAME), eq(students.id, studentCourses.studentId))))
						.where(inArray(subjects.id, subjectIds)),
			subjectIds.length === 0
				? Promise.resolve([])
				: db
						.select({ subjectId: grades.subjectId, studentId: grades.studentId, isConfirmed: grades.isConfirmed })
						.from(grades)
						.where(and(inArray(grades.subjectId, subjectIds), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm))),
		]);
		const enrolled = new Map<number, number>();
		const entered = new Map<number, { count: number; confirmed: number }>();
		for (const row of enrollmentRows) enrolled.set(row.subjectId, (enrolled.get(row.subjectId) ?? 0) + 1);
		for (const row of gradeRows) {
			const summary = entered.get(row.subjectId) ?? { count: 0, confirmed: 0 };
			summary.count += 1;
			if (row.isConfirmed) summary.confirmed += 1;
			entered.set(row.subjectId, summary);
		}

		return c.json({
			year,
			term: { value: query.term, label: termLabel(firstTerm) },
			subjects: subjectRows.map((subject) => {
				const enteredSummary = entered.get(subject.id) ?? { count: 0, confirmed: 0 };
				const total = enrolled.get(subject.id) ?? 0;
				return {
					...subject,
					studentCount: total,
					enteredCount: enteredSummary.count,
					confirmedCount: enteredSummary.confirmed,
					missingCount: Math.max(total - enteredSummary.count, 0),
					isFinalized: total > 0 && enteredSummary.confirmed === total,
					canFinalize: total > 0 && total === enteredSummary.count && enteredSummary.confirmed === 0,
					finalizePath: `/api/screens/staff/finalization/${subject.id}`,
				};
			}),
		});
	})
	.post("/finalization/:subjectId", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const firstTerm = isFirstTerm(query);
		const [subject] = await db
			.select({ id: subjects.id, courseId: subjects.courseId, courseName: courses.name, name: subjects.name })
			.from(subjects)
			.innerJoin(courses, eq(subjects.courseId, courses.id))
			.where(and(eq(subjects.id, subjectId), eq(subjects.yearId, year.id)))
			.limit(1);
		if (!subject) return notFound(c, "教科");

		const studentRowsQuery = isCommonCourseName(subject.courseName)
			? db
					.select({ id: students.id, studentNumber: students.studentNumber, name: students.name })
					.from(students)
					.where(and(eq(students.yearId, year.id), eq(students.isAttending, true)))
					.orderBy(asc(students.studentNumber))
			: db
					.select({ id: students.id, studentNumber: students.studentNumber, name: students.name })
					.from(students)
					.innerJoin(studentCourses, eq(studentCourses.studentId, students.id))
					.where(and(eq(studentCourses.courseId, subject.courseId), eq(students.yearId, year.id), eq(students.isAttending, true)))
					.orderBy(asc(students.studentNumber));

		const [studentRows, gradeRows] = await Promise.all([
			studentRowsQuery,
				db
					.select({ studentId: grades.studentId, isConfirmed: grades.isConfirmed })
				.from(grades)
				.where(and(eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm))),
		]);
		const enteredStudents = new Set(gradeRows.map((grade) => grade.studentId));
		const missingRows = studentRows
			.filter((student) => !enteredStudents.has(student.id))
			.map((student) => ({ student, missingFields: ["attendance", "attitude", "assignment"] }));
		if (missingRows.length > 0) {
			return c.json(
				{
					error: { code: "GRADE_INCOMPLETE", message: "未入力の成績があるため確定できません", missingRows },
				},
				422,
			);
		}
		if (gradeRows.some((grade) => grade.isConfirmed)) {
			return c.json({ error: { code: "GRADE_CONFIRMED", message: "この学期の成績はすでに確定しています" } }, 409);
		}

		const confirmedAt = new Date();
		const result = await db
			.update(grades)
			.set({ isConfirmed: true, confirmedAt, confirmedBy: actor.id })
			.where(and(eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm), eq(grades.isConfirmed, false)));
		if (Number(result[0]?.affectedRows ?? 0) !== gradeRows.length) {
			return c.json({ error: { code: "GRADE_CONFIRMED", message: "この学期の成績はすでに確定しています" } }, 409);
		}

		return c.json({ status: "confirmed" as const, subject, confirmedAt, count: gradeRows.length });
	})
	.post("/finalization/:subjectId/unlock", screenQueryValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const subjectId = pathId(c.req.param("subjectId"));
		if (!subjectId) return notFound(c, "教科");
		const query = c.req.valid("query");
		const year = await selectedYear(query.yearId);
		if (!year) return notFound(c, "年度");
		const firstTerm = isFirstTerm(query);
		const [subject] = await db
			.select({ id: subjects.id, courseId: subjects.courseId, name: subjects.name })
			.from(subjects)
			.where(and(eq(subjects.id, subjectId), eq(subjects.yearId, year.id)))
			.limit(1);
		if (!subject) return notFound(c, "教科");

		const gradeRows = await db
			.select({ id: grades.id, isConfirmed: grades.isConfirmed })
			.from(grades)
			.where(and(eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm)));
		if (!gradeRows.some((grade) => grade.isConfirmed)) {
			return c.json({ error: { code: "GRADE_NOT_CONFIRMED", message: "確定済みの成績がありません" } }, 409);
		}

		const result = await db
			.update(grades)
			.set({ isConfirmed: false, confirmedAt: null, confirmedBy: null })
			.where(and(eq(grades.subjectId, subject.id), eq(grades.yearId, year.id), eq(grades.isFirstTerm, firstTerm), eq(grades.isConfirmed, true)));
		return c.json({ status: "unlocked" as const, subject, count: Number(result[0]?.affectedRows ?? 0) });
	})
	.get("/csv-import", async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		return c.json({
			resources: Object.entries(csvTemplates).map(([value, template]) => ({ value: value as CsvResource, ...template })),
			years: await db.select().from(years).orderBy(desc(years.year)),
			currentYear: (await db.select().from(years).where(eq(years.id, actor.yearId)).limit(1))[0] ?? null,
			constraints: {
				atomic: true,
				message: "不正なCSVは全件取り込みを中止します。プレビューで内容を確認してください。",
			},
		});
	})
	.post("/csv-import/preview", csvPreviewValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const body = c.req.valid("json") as CsvPreviewBody;
		const template = csvTemplates[body.resource];
		const rows = parseCsv(body.csvText);
		if (rows.length === 0) return validationError(c, "CSVが空です");

		const [header, ...dataRows] = rows;
		const headerErrors = csvColumnAliases[body.resource]
			.filter((aliases) => !aliases.some((column) => header.includes(column)))
			.map((aliases) => ({ field: aliases[0], message: `必須列 ${aliases.join(" / ")} のいずれかがありません` }));
		const widthErrors = dataRows.flatMap((row, index) =>
			row.length === header.length ? [] : [{ rowNumber: index + 2, message: "列数がヘッダーと一致しません" }],
		);

		return c.json({
			resource: body.resource,
			template,
			header,
			previewRows: dataRows.slice(0, 20).map((row, index) => ({ rowNumber: index + 2, values: row })),
			validRows: headerErrors.length === 0 && widthErrors.length === 0 ? dataRows.length : 0,
			errors: { header: headerErrors, rows: widthErrors },
			canImport: dataRows.length > 0 && headerErrors.length === 0 && widthErrors.length === 0,
		});
	})
	.post("/csv-import/import", csvImportValidator, async (c) => {
		const actor = await requireStaff(c);
		if (!actor) {
			const loggedIn = await getCurrentActor(c);
			return loggedIn ? forbidden(c) : unauthorized(c);
		}

		const body = c.req.valid("json") as CsvImportBody;
		try {
			const year = await ensureImportYear(body.year);
			const result = await importCsv(body.resource, body.csvText, year.id);
			return c.json({ ...result, year });
		} catch (error) {
			return validationError(c, error instanceof Error ? error.message : "CSVを取り込めませんでした");
		}
	});

export default app;
