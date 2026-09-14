import { int, index, mysqlTable, primaryKey } from "drizzle-orm/mysql-core";

import { courses } from "./course";
import { students } from "./student";

/** Courses a student is enrolled in for the student's academic year. */
export const studentCourses = mysqlTable(
	"student_courses",
	{
		studentId: int("student_id")
			.notNull()
			.references(() => students.id, { onDelete: "cascade" }),
		courseId: int("course_id")
			.notNull()
			.references(() => courses.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.studentId, table.courseId], name: "student_courses_student_id_course_id_pk" }),
		index("student_courses_course_id_idx").on(table.courseId),
		index("student_courses_student_id_idx").on(table.studentId),
	],
);
