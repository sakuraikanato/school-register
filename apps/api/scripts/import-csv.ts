import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

import { connection, db } from "../src/db";
import { account, courses, students, subjects, user, userYears, years } from "../src/db/schema";
import { nextStudentSchoolGrade } from "../src/lib/csv-import";

type StaffRow = { name: string; nameHiragana: string; age: number; gender: "男" | "女" | "その他"; email: string };
type StudentRow = { studentNumber: string; name: string; nameHiragana: string; age: number; birthDate: Date; gender: "male" | "female" | "other"; email: string; tel: string; postCode: string; address: string; courseName: string };
type SubjectRow = { courseName: string; subjectName: string; teacherName: string };

const defaults = {
  staff: "/Users/sakurai/Downloads/専任職員名簿.csv",
  teachers: "/Users/sakurai/Downloads/講師名簿.csv",
  students: "/Users/sakurai/Downloads/学生名簿.csv",
  subjects: "/Users/sakurai/Downloads/科目一覧.csv",
};

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const records = (text: string, requiredHeaders: readonly string[]) => {
  const [header, ...data] = parseCsv(text);
  if (!header || requiredHeaders.some((name) => !header.includes(name))) {
    throw new Error(`CSVの列が不足しています（必須: ${requiredHeaders.join(", ")}）`);
  }
  return data.map((values, rowIndex) => {
    if (values.length !== header.length) throw new Error(`${rowIndex + 2}行目の列数がヘッダーと一致しません`);
    return Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""]));
  });
};

const required = (value: unknown, label: string) => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label}が空です`);
  return value.trim();
};

const integer = (value: unknown, label: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${label}が不正です`);
  return parsed;
};

const userGender = (value: string): StaffRow["gender"] => value === "男" || value === "女" ? value : value === "その他" ? value : (() => { throw new Error(`性別「${value}」が不正です`); })();
const studentGender = (value: string): StudentRow["gender"] => value === "男" ? "male" : value === "女" ? "female" : value === "その他" ? "other" : (() => { throw new Error(`性別「${value}」が不正です`); })();

const birthDate = (value: string) => {
  const match = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (!match) throw new Error(`生年月日「${value}」が不正です`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) throw new Error(`生年月日「${value}」が不正です`);
  return date;
};

const readStaff = async (path: string): Promise<StaffRow[]> => records(await readFile(path, "utf8"), ["氏名", "氏名（ひらがな）", "年齢", "性別", "メールアドレス"]).map((row) => ({
  name: required(row["氏名"], "氏名"), nameHiragana: required(row["氏名（ひらがな）"], "氏名（ひらがな）"), age: integer(row["年齢"], "年齢"), gender: userGender(required(row["性別"], "性別")), email: required(row["メールアドレス"], "メールアドレス").toLowerCase(),
}));

const readStudents = async (path: string): Promise<StudentRow[]> => records(await readFile(path, "utf8"), ["学籍番号", "氏名", "氏名（ひらがな）", "年齢", "生年月日", "性別", "メールアドレス", "電話番号", "郵便番号", "住所", "専攻"]).map((row) => ({
  studentNumber: required(row["学籍番号"], "学籍番号"), name: required(row["氏名"], "氏名"), nameHiragana: required(row["氏名（ひらがな）"], "氏名（ひらがな）"), age: integer(row["年齢"], "年齢"), birthDate: birthDate(required(row["生年月日"], "生年月日")), gender: studentGender(required(row["性別"], "性別")), email: required(row["メールアドレス"], "メールアドレス").toLowerCase(), tel: required(row["電話番号"], "電話番号"), postCode: required(row["郵便番号"], "郵便番号"), address: required(row["住所"], "住所"), courseName: required(row["専攻"], "専攻"),
}));

const readSubjects = async (path: string): Promise<SubjectRow[]> => records(await readFile(path, "utf8"), ["専攻", "科目名", "担当講師"]).map((row) => ({
  courseName: required(row["専攻"], "専攻"), subjectName: required(row["科目名"], "科目名"), teacherName: required(row["担当講師"], "担当講師"),
}));

const ensureYear = async (yearValue: number) => {
  const [existing] = await db.select().from(years).where(eq(years.year, yearValue)).limit(1);
  if (existing) return existing;
  await db.insert(years).values({ year: yearValue });
  const [created] = await db.select().from(years).where(eq(years.year, yearValue)).limit(1);
  if (!created) throw new Error(`年度 ${yearValue} を作成できませんでした`);
  return created;
};

const paths = {
  staff: process.env.CSV_STAFF_PATH ?? defaults.staff,
  teachers: process.env.CSV_TEACHERS_PATH ?? defaults.teachers,
  students: process.env.CSV_STUDENTS_PATH ?? defaults.students,
  subjects: process.env.CSV_SUBJECTS_PATH ?? defaults.subjects,
};
const yearValue = Number(process.env.IMPORT_YEAR ?? process.env.SEED_YEAR ?? 2026);
const initialPasswords = {
  staff: "Staff123!",
  teacher: "Teacher123!",
} as const;

try {
  if (!Number.isSafeInteger(yearValue) || yearValue <= 0) throw new Error("IMPORT_YEAR は正の整数で指定してください");
  const [staffRows, teacherRows, studentRows, subjectRows] = await Promise.all([
    readStaff(paths.staff), readStaff(paths.teachers), readStudents(paths.students), readSubjects(paths.subjects),
  ]);
  const year = await ensureYear(yearValue);
  const allUsers = [...staffRows.map((row) => ({ ...row, role: "staff" as const })), ...teacherRows.map((row) => ({ ...row, role: "teacher" as const }))];
  const userByName = new Map(teacherRows.map((row) => [row.name, row]));
  for (const row of subjectRows) if (!userByName.has(row.teacherName)) throw new Error(`科目「${row.subjectName}」の担当講師「${row.teacherName}」が講師CSVにありません`);

  const courseNames = new Set([...studentRows.map((row) => row.courseName), ...subjectRows.map((row) => row.courseName)]);
  const counts = { usersCreated: 0, usersUpdated: 0, coursesCreated: 0, subjectsCreated: 0, subjectsUpdated: 0, studentsCreated: 0, studentsUpdated: 0 };

  await db.transaction(async (tx) => {
    const passwordHashes = {
      staff: await hashPassword(initialPasswords.staff),
      teacher: await hashPassword(initialPasswords.teacher),
    } as const;
    const userIds = new Map<string, string>();
    for (const row of allUsers) {
      const [existing] = await tx.select({ id: user.id, isPasswordChanged: user.isPasswordChanged }).from(user).where(eq(user.email, row.email)).limit(1);
      const id = existing?.id ?? randomUUID();
      userIds.set(row.name, id);
      if (existing) {
        await tx.update(user).set({ name: row.name, nameHiragana: row.nameHiragana, age: row.age, gender: row.gender, role: row.role, yearId: year.id, updatedAt: new Date() }).where(eq(user.id, id));
        if (!existing.isPasswordChanged) {
          await tx.update(account).set({ password: passwordHashes[row.role], updatedAt: new Date() }).where(and(eq(account.userId, id), eq(account.providerId, "credential")));
        }
        counts.usersUpdated += 1;
      } else {
        const now = new Date();
        await tx.insert(user).values({ id, name: row.name, nameHiragana: row.nameHiragana, email: row.email, age: row.age, gender: row.gender, role: row.role, yearId: year.id, isPasswordChanged: false, createdAt: now, updatedAt: now });
        await tx.insert(account).values({ id: randomUUID(), accountId: row.email, providerId: "credential", userId: id, password: passwordHashes[row.role], createdAt: now, updatedAt: now });
        counts.usersCreated += 1;
      }
      const [membership] = await tx.select({ id: userYears.id }).from(userYears).where(and(eq(userYears.userId, id), eq(userYears.yearId, year.id))).limit(1);
      if (!membership) await tx.insert(userYears).values({ id: randomUUID(), userId: id, yearId: year.id });
    }

    const courseIds = new Map<string, number>();
    for (const name of courseNames) {
      const [existing] = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.name, name), eq(courses.yearId, year.id))).limit(1);
      if (existing) courseIds.set(name, existing.id);
      else {
        const inserted = await tx.insert(courses).values({ name, yearId: year.id });
        const id = Number(inserted[0].insertId);
        courseIds.set(name, id);
        counts.coursesCreated += 1;
      }
    }

    for (const row of subjectRows) {
      const courseId = courseIds.get(row.courseName);
      const teacherId = userIds.get(row.teacherName);
      if (!courseId || !teacherId) throw new Error(`科目「${row.subjectName}」の関連データがありません`);
      const [existing] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.name, row.subjectName), eq(subjects.courseId, courseId), eq(subjects.yearId, year.id))).limit(1);
      const [teacherYear] = await tx.select({ id: userYears.id }).from(userYears).where(and(eq(userYears.userId, teacherId), eq(userYears.yearId, year.id))).limit(1);
      if (!teacherYear) throw new Error(`講師「${row.teacherName}」の年度所属がありません`);
      if (existing) {
        await tx.update(subjects).set({ teacherId, teacherYearId: teacherYear.id }).where(eq(subjects.id, existing.id));
        counts.subjectsUpdated += 1;
      } else {
        await tx.insert(subjects).values({ name: row.subjectName, teacherId, teacherYearId: teacherYear.id, courseId, yearId: year.id });
        counts.subjectsCreated += 1;
      }
    }

    for (const row of studentRows) {
      const courseId = courseIds.get(row.courseName);
      if (!courseId) throw new Error(`生徒「${row.studentNumber}」の専攻「${row.courseName}」がありません`);
      const existingRows = await tx.select({ id: students.id, schoolGrade: students.schoolGrade, yearId: students.yearId }).from(students).where(eq(students.studentNumber, row.studentNumber));
      const existing = existingRows.find((item) => item.yearId === year.id);
      const values = { courseId, studentNumber: row.studentNumber, schoolGrade: String(row.age), name: row.name, nameHiragana: row.nameHiragana, birthDate: row.birthDate, gender: row.gender, email: row.email, tel: row.tel, postCode: row.postCode, address: row.address, yearId: year.id, isAttending: true };
      if (existing) { await tx.update(students).set({ ...values, schoolGrade: existing.schoolGrade }).where(eq(students.id, existing.id)); counts.studentsUpdated += 1; }
      else {
        await tx.insert(students).values({ ...values, schoolGrade: nextStudentSchoolGrade(existingRows.map((item) => item.schoolGrade), values.schoolGrade) });
        counts.studentsCreated += 1;
      }
    }
  });

  console.log(`CSV取り込み完了: ${year.year}年度 (id: ${year.id})`);
  console.log(JSON.stringify(counts, null, 2));
  console.warn(`新規職員アカウントの初期パスワード: ${initialPasswords.staff}`);
  console.warn(`新規講師アカウントの初期パスワード: ${initialPasswords.teacher}（ログイン後に変更してください）`);
} finally {
  await connection.end();
}
