import { boolean, check, index, int, mysqlTable, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { students } from "./student";
import { subjects } from "./subject";
import { years } from "./years";

export const grades = mysqlTable(
	"grades",
	{
		id: int("id").autoincrement().primaryKey(),
		studentId: int("student_id")
			.notNull()
			.references(() => students.id),
		subjectId: int("subject_id")
			.notNull()
			.references(() => subjects.id),
		attendance: int("attendance").notNull(),
		attitude: int("attitude").notNull(),
		assignment: int("assignment").notNull(),
		isFirstTerm: boolean("is_first_term").notNull().default(false),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
		score: int("score").notNull(),
	},
	(table) => [
		uniqueIndex("grades_student_id_subject_id_year_id_is_first_term_unique").on(
			table.studentId,
			table.subjectId,
			table.yearId,
			table.isFirstTerm,
		),
		index("grades_student_id_idx").on(table.studentId),
		index("grades_subject_id_idx").on(table.subjectId),
		index("grades_year_id_idx").on(table.yearId),
		check("grades_attendance_range", sql`${table.attendance} between 0 and 100`),
		check("grades_attitude_range", sql`${table.attitude} between 1 and 10`),
		check("grades_assignment_range", sql`${table.assignment} between 1 and 10`),
		check("grades_score_range", sql`${table.score} between 0 and 100`),
	],
);