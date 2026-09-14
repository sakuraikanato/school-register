ALTER TABLE `students` DROP FOREIGN KEY `students_course_id_courses_id_fk`;
--> statement-breakpoint
DROP INDEX `students_course_id_idx` ON `students`;--> statement-breakpoint
ALTER TABLE `students` DROP COLUMN `course_id`;