import { boolean, date, index, int, mysqlEnum, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { courses } from "./course";
import { years } from "./years";

export const students = mysqlTable(
	"students",
	{
		id: int("id").autoincrement().primaryKey(),
		courseId: int("course_id")
			.notNull()
			.references(() => courses.id),
		studentNumber: varchar("student_number", { length: 50 }).notNull(),
		schoolGrade: varchar("school_grade", { length: 50 }).notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		nameHiragana: varchar("name_hiragana", { length: 255 }).notNull(),
		birthDate: date("birth_date", { mode: "date" }).notNull(),
		gender: mysqlEnum("gender", ["male", "female", "other"]).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		tel: varchar("tel", { length: 50 }).notNull(),
		postCode: varchar("post_code", { length: 20 }).notNull(),
		address: varchar("address", { length: 512 }).notNull(),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
		isAttending: boolean("is_attending").notNull().default(true),
	},
	(table) => [
		uniqueIndex("students_student_number_unique").on(table.studentNumber),
		index("students_course_id_idx").on(table.courseId),
		index("students_year_id_idx").on(table.yearId),
	],
);