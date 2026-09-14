CREATE TABLE `student_courses` (
	`student_id` int NOT NULL,
	`course_id` int NOT NULL,
	CONSTRAINT `student_courses_student_id_course_id_pk` PRIMARY KEY(`student_id`,`course_id`)
);
--> statement-breakpoint
INSERT INTO `student_courses` (`student_id`, `course_id`)
SELECT `id`, `course_id` FROM `students` WHERE `course_id` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `students` MODIFY COLUMN `course_id` int;--> statement-breakpoint
ALTER TABLE `student_courses` ADD CONSTRAINT `student_courses_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_courses` ADD CONSTRAINT `student_courses_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `student_courses_course_id_idx` ON `student_courses` (`course_id`);--> statement-breakpoint
CREATE INDEX `student_courses_student_id_idx` ON `student_courses` (`student_id`);
