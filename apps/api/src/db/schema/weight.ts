import { boolean, check, index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { subjects } from "./subject";
import { user } from "./auth-schema";
import { years } from "./years";

export const weights = mysqlTable(
	"weights",
	{
		id: int("id").autoincrement().primaryKey(),
		teacherId: varchar("teacher_id", { length: 191 })
			.notNull()
			.references(() => user.id),
		subjectId: int("subject_id")
			.notNull()
			.references(() => subjects.id),
		attendanceWeight: int("attendance_weight").notNull(),
		attitudeWeight: int("attitude_weight").notNull(),
		assignmentWeight: int("assignment_weight").notNull(),
		isFirstTerm: boolean("is_first_term").notNull().default(false),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
	},
	(table) => [
		uniqueIndex("weights_teacher_id_subject_id_year_id_is_first_term_unique").on(
			table.teacherId,
			table.subjectId,
			table.yearId,
			table.isFirstTerm,
		),
		index("weights_teacher_id_idx").on(table.teacherId),
		index("weights_subject_id_idx").on(table.subjectId),
		index("weights_year_id_idx").on(table.yearId),
		check("weights_attendance_range", sql`${table.attendanceWeight} between 1 and 10`),
		check("weights_attitude_range", sql`${table.attitudeWeight} between 1 and 10`),
		check("weights_assignment_range", sql`${table.assignmentWeight} between 1 and 10`),
		check(
			"weights_sum_to_ten",
			sql`${table.attendanceWeight} + ${table.attitudeWeight} + ${table.assignmentWeight} = 10`,
		),
	],
);