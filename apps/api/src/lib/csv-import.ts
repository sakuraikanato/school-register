import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { db } from "../db";
import { account, courses, studentCourses, students, subjects, user, userYears } from "../db/schema";

export type CsvImportResource = "teachers" | "staff" | "subjects" | "students";

export type CsvImportResult = {
	resource: CsvImportResource;
	created: number;
	updated: number;
	rows: number;
};

export const defaultInitialPassword = {
	staff: "Staff123!",
	teachers: "Teacher123!",
} as const;

type RecordRow = Record<string, string>;

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

const records = (text: string): { header: string[]; rows: RecordRow[] } => {
	const [header, ...data] = parseCsv(text);
	if (!header || header.length === 0) throw new Error("CSVが空です");
	return {
		header,
		rows: data.map((values, index) => {
			if (values.length !== header.length) throw new Error(`${index + 2}行目の列数がヘッダーと一致しません`);
			return Object.fromEntries(header.map((name, valueIndex) => [name, values[valueIndex] ?? ""]));
		}),
	};
};

const field = (row: RecordRow, names: string[], label: string, rowNumber?: number) => {
	const value = names.map((name) => row[name]).find((item) => item !== undefined)?.trim() ?? "";
	if (!value) throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}${label}が空です`);
	return value;
};

const integer = (value: string, label: string, rowNumber?: number) => {
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}${label}が不正です`);
	return parsed;
};

/** Increment the numeric part while preserving labels such as "1年" or "第1学年". */
export const advanceSchoolGrade = (value: string, rowNumber?: number) => {
	const match = value.match(/\d+/);
	if (!match) throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}既存の学年「${value}」を繰り上げられません`);
	const current = Number(match[0]);
	if (!Number.isSafeInteger(current) || current === Number.MAX_SAFE_INTEGER) throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}既存の学年「${value}」を繰り上げられません`);
	const index = match.index ?? 0;
	return `${value.slice(0, index)}${current + 1}${value.slice(index + match[0].length)}`;
};

export const nextStudentSchoolGrade = (existingGrades: readonly string[], incomingGrade: string, rowNumber?: number) => {
	const highest = existingGrades.reduce<{ value: string; numeric: number } | null>((currentHighest, value) => {
		const match = value.match(/\d+/);
		const numeric = match ? Number(match[0]) : Number.NaN;
		if (!Number.isSafeInteger(numeric)) return currentHighest;
		return !currentHighest || numeric > currentHighest.numeric ? { value, numeric } : currentHighest;
	}, null);
	return highest ? advanceSchoolGrade(highest.value, rowNumber) : incomingGrade;
};

const normalizeUserGender = (value: string, rowNumber?: number): "男" | "女" | "その他" => {
	if (value === "男" || value.toLowerCase() === "male") return "男";
	if (value === "女" || value.toLowerCase() === "female") return "女";
	if (value === "その他" || value.toLowerCase() === "other") return "その他";
	throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}性別「${value}」が不正です`);
};

const normalizeStudentGender = (value: string, rowNumber?: number): "male" | "female" | "other" => {
	if (value === "男" || value.toLowerCase() === "male") return "male";
	if (value === "女" || value.toLowerCase() === "female") return "female";
	if (value === "その他" || value.toLowerCase() === "other") return "other";
	throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}性別「${value}」が不正です`);
};

const parseBirthDate = (value: string, rowNumber?: number) => {
	const japanese = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
	const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	const match = japanese ?? iso;
	if (!match) throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}生年月日「${value}」が不正です`);
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (month < 1 || month > 12 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		throw new Error(`${rowNumber ? `${rowNumber}行目の` : ""}生年月日「${value}」が不正です`);
	}
	return date;
};

const ensureCourse = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], name: string, yearId: number, counts: { created: number }) => {
	const [existing] = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.name, name), eq(courses.yearId, yearId))).limit(1);
	if (existing) return existing.id;
	const result = await tx.insert(courses).values({ name, yearId });
	counts.created += 1;
	return Number(result[0].insertId);
};

const ensureUserYear = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string, yearId: number) => {
	const [existing] = await tx.select({ id: userYears.id }).from(userYears).where(and(eq(userYears.userId, userId), eq(userYears.yearId, yearId))).limit(1);
	if (existing) return existing.id;
	const id = randomUUID();
	await tx.insert(userYears).values({ id, userId, yearId });
	return id;
};

const importUsers = async (resource: "teachers" | "staff", text: string, yearId: number, initialPassword: string): Promise<CsvImportResult> => {
	const { rows } = records(text);
	const password = await hashPassword(initialPassword);
	const counts = { created: 0, updated: 0 };
	await db.transaction(async (tx) => {
		for (const [index, row] of rows.entries()) {
			const rowNumber = index + 2;
			const name = field(row, ["氏名", "name"], "氏名", rowNumber);
			const nameHiragana = field(row, ["氏名（ひらがな）", "nameHiragana"], "氏名（ひらがな）", rowNumber);
			const age = integer(field(row, ["年齢", "age"], "年齢", rowNumber), "年齢", rowNumber);
			const gender = normalizeUserGender(field(row, ["性別", "gender"], "性別", rowNumber), rowNumber);
			const email = field(row, ["メールアドレス", "email"], "メールアドレス", rowNumber).toLowerCase();
			const [existing] = await tx.select({ id: user.id, isPasswordChanged: user.isPasswordChanged }).from(user).where(eq(user.email, email)).limit(1);
			const id = existing?.id ?? randomUUID();
			if (existing) {
				await tx.update(user).set({ name, nameHiragana, age, gender, role: resource === "staff" ? "staff" : "teacher", yearId, updatedAt: new Date() }).where(eq(user.id, id));
				await ensureUserYear(tx, id, yearId);
				if (!existing.isPasswordChanged) {
					await tx.update(account).set({ password, updatedAt: new Date() }).where(and(eq(account.userId, id), eq(account.providerId, "credential")));
				}
				counts.updated += 1;
			} else {
				const now = new Date();
				await tx.insert(user).values({ id, name, nameHiragana, email, age, gender, role: resource === "staff" ? "staff" : "teacher", yearId, isPasswordChanged: false, createdAt: now, updatedAt: now });
				await tx.insert(account).values({ id: randomUUID(), accountId: email, providerId: "credential", userId: id, password, createdAt: now, updatedAt: now });
				await ensureUserYear(tx, id, yearId);
				counts.created += 1;
			}
		}
	});
	return { resource, ...counts, rows: rows.length };
};

const importSubjects = async (text: string, yearId: number): Promise<CsvImportResult> => {
	const { rows } = records(text);
	const counts = { created: 0, updated: 0 };
	const courseCounts = { created: 0 };
	await db.transaction(async (tx) => {
		for (const [index, row] of rows.entries()) {
			const rowNumber = index + 2;
			const courseName = field(row, ["専攻", "courseName"], "専攻", rowNumber);
			const subjectName = field(row, ["科目名", "subjectName"], "科目名", rowNumber);
			const teacherKey = field(row, ["担当講師", "teacherName", "teacherEmail"], "担当講師", rowNumber);
			const courseId = await ensureCourse(tx, courseName, yearId, courseCounts);
			const [teacher] = await tx
				.select({ id: user.id, teacherYearId: userYears.id })
				.from(user)
				.innerJoin(userYears, eq(userYears.userId, user.id))
				.where(and(eq(user.role, "teacher"), eq(userYears.yearId, yearId), teacherKey.includes("@") ? eq(user.email, teacherKey.toLowerCase()) : eq(user.name, teacherKey)))
				.limit(1);
			if (!teacher) throw new Error(`${rowNumber}行目の担当講師「${teacherKey}」が見つかりません`);
			const [existing] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.name, subjectName), eq(subjects.courseId, courseId), eq(subjects.yearId, yearId))).limit(1);
			if (existing) {
				await tx.update(subjects).set({ teacherId: teacher.id, teacherYearId: teacher.teacherYearId }).where(eq(subjects.id, existing.id));
				counts.updated += 1;
			} else {
				await tx.insert(subjects).values({ name: subjectName, teacherId: teacher.id, teacherYearId: teacher.teacherYearId, courseId, yearId });
				counts.created += 1;
			}
		}
	});
	return { resource: "subjects", ...counts, rows: rows.length };
};

const importStudents = async (text: string, yearId: number): Promise<CsvImportResult> => {
	const { rows } = records(text);
	const counts = { created: 0, updated: 0 };
	const courseCounts = { created: 0 };
	await db.transaction(async (tx) => {
		for (const [index, row] of rows.entries()) {
			const rowNumber = index + 2;
			const studentNumber = field(row, ["学籍番号", "studentNumber"], "学籍番号", rowNumber);
			const courseNames = field(row, ["専攻", "courseName"], "専攻", rowNumber)
				.split(/[|、;]/)
				.map((name) => name.trim())
				.filter(Boolean);
			const courseIds = [];
			for (const courseName of courseNames) courseIds.push(await ensureCourse(tx, courseName, yearId, courseCounts));
			const values = {
				studentNumber,
				schoolGrade: field(row, ["学年", "schoolGrade", "年齢", "gradeNum"], "学年", rowNumber),
				name: field(row, ["氏名", "name"], "氏名", rowNumber),
				nameHiragana: field(row, ["氏名（ひらがな）", "nameHiragana"], "氏名（ひらがな）", rowNumber),
				birthDate: parseBirthDate(field(row, ["生年月日", "birthDate"], "生年月日", rowNumber), rowNumber),
				gender: normalizeStudentGender(field(row, ["性別", "gender"], "性別", rowNumber), rowNumber),
				email: field(row, ["メールアドレス", "email"], "メールアドレス", rowNumber).toLowerCase(),
				tel: field(row, ["電話番号", "tel"], "電話番号", rowNumber),
				postCode: field(row, ["郵便番号", "postCode"], "郵便番号", rowNumber),
				address: field(row, ["住所", "address"], "住所", rowNumber),
				yearId,
				isAttending: true,
			};
			const existingRows = await tx
				.select({ id: students.id, schoolGrade: students.schoolGrade, yearId: students.yearId })
				.from(students)
				.where(eq(students.studentNumber, studentNumber));
			const existing = existingRows.find((item) => item.yearId === yearId);
			if (existing) {
				// Re-importing the same year's CSV updates that year's record without
				// promoting it a second time.
				await tx.update(students).set({ ...values, schoolGrade: existing.schoolGrade }).where(eq(students.id, existing.id));
				await tx.delete(studentCourses).where(eq(studentCourses.studentId, existing.id));
				await tx.insert(studentCourses).values(courseIds.map((id) => ({ studentId: existing.id, courseId: id })));
				counts.updated += 1;
			} else {
				const schoolGrade = nextStudentSchoolGrade(existingRows.map((item) => item.schoolGrade), values.schoolGrade, rowNumber);
				const result = await tx.insert(students).values({ ...values, schoolGrade });
				await tx.insert(studentCourses).values(courseIds.map((id) => ({ studentId: Number(result[0].insertId), courseId: id })));
				counts.created += 1;
			}
		}
	});
	return { resource: "students", ...counts, rows: rows.length };
};

export const importCsv = async (resource: CsvImportResource, text: string, yearId: number, initialPassword?: string) => {
	if (resource === "teachers" || resource === "staff") return importUsers(resource, text, yearId, initialPassword ?? defaultInitialPassword[resource]);
	if (resource === "subjects") return importSubjects(text, yearId);
	return importStudents(text, yearId);
};
