import { index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { courses } from "./course";
import { user } from "./auth-schema";
import { years } from "./years";
import { userYears } from "./user-year";

export const subjects = mysqlTable(
	"subjects",
	{
		id: int("id").autoincrement().primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		teacherId: varchar("teacher_id", { length: 36 })
			.notNull()
			.references(() => user.id),
		teacherYearId: varchar("teacher_year_id", { length: 36 }).references(() => userYears.id),
		courseId: int("course_id")
			.notNull()
			.references(() => courses.id),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
	},
	(table) => [
		uniqueIndex("subjects_year_id_course_id_name_unique").on(table.yearId, table.courseId, table.name),
		index("subjects_teacher_id_idx").on(table.teacherId),
		index("subjects_course_id_idx").on(table.courseId),
		index("subjects_year_id_idx").on(table.yearId),
	],
);
