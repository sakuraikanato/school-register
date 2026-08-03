CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_hiragana` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`age` int NOT NULL,
	`gender` enum('男','女','その他') NOT NULL,
	`is_password_changed` boolean DEFAULT false,
	`role` enum('teacher','staff') NOT NULL,
	`year_id` int NOT NULL,
	`image` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`year_id` int NOT NULL,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_year_id_name_unique` UNIQUE(`year_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`attendance` int NOT NULL,
	`attitude` int NOT NULL,
	`assignment` int NOT NULL,
	`is_first_term` boolean NOT NULL DEFAULT false,
	`year_id` int NOT NULL,
	`score` int NOT NULL,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `grades_student_id_subject_id_year_id_is_first_term_unique` UNIQUE(`student_id`,`subject_id`,`year_id`,`is_first_term`),
	CONSTRAINT `grades_attendance_range` CHECK(`grades`.`attendance` between 0 and 100),
	CONSTRAINT `grades_attitude_range` CHECK(`grades`.`attitude` between 1 and 10),
	CONSTRAINT `grades_assignment_range` CHECK(`grades`.`assignment` between 1 and 10),
	CONSTRAINT `grades_score_range` CHECK(`grades`.`score` between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_id` int NOT NULL,
	`student_number` varchar(50) NOT NULL,
	`school_grade` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_hiragana` varchar(255) NOT NULL,
	`birth_date` date NOT NULL,
	`gender` enum('male','female','other') NOT NULL,
	`email` varchar(255) NOT NULL,
	`tel` varchar(50) NOT NULL,
	`post_code` varchar(20) NOT NULL,
	`address` varchar(512) NOT NULL,
	`year_id` int NOT NULL,
	`is_attending` boolean NOT NULL DEFAULT true,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_student_number_unique` UNIQUE(`student_number`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`teacher_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`year_id` int NOT NULL,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_year_id_course_id_name_unique` UNIQUE(`year_id`,`course_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	CONSTRAINT `years_id` PRIMARY KEY(`id`),
	CONSTRAINT `years_year_unique` UNIQUE(`year`),
	CONSTRAINT `years_year_positive` CHECK(`years`.`year` > 0)
);
--> statement-breakpoint
CREATE TABLE `weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` varchar(191) NOT NULL,
	`subject_id` int NOT NULL,
	`attendance_weight` int NOT NULL,
	`attitude_weight` int NOT NULL,
	`assignment_weight` int NOT NULL,
	`is_first_term` boolean NOT NULL DEFAULT false,
	`year_id` int NOT NULL,
	CONSTRAINT `weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `weights_teacher_id_subject_id_year_id_is_first_term_unique` UNIQUE(`teacher_id`,`subject_id`,`year_id`,`is_first_term`),
	CONSTRAINT `weights_attendance_range` CHECK(`weights`.`attendance_weight` between 1 and 10),
	CONSTRAINT `weights_attitude_range` CHECK(`weights`.`attitude_weight` between 1 and 10),
	CONSTRAINT `weights_assignment_range` CHECK(`weights`.`assignment_weight` between 1 and 10),
	CONSTRAINT `weights_sum_to_ten` CHECK(`weights`.`attendance_weight` + `weights`.`attitude_weight` + `weights`.`assignment_weight` = 10)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_teacher_id_user_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_course_id_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weights` ADD CONSTRAINT `weights_teacher_id_user_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weights` ADD CONSTRAINT `weights_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weights` ADD CONSTRAINT `weights_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `courses_year_id_idx` ON `courses` (`year_id`);--> statement-breakpoint
CREATE INDEX `grades_student_id_idx` ON `grades` (`student_id`);--> statement-breakpoint
CREATE INDEX `grades_subject_id_idx` ON `grades` (`subject_id`);--> statement-breakpoint
CREATE INDEX `grades_year_id_idx` ON `grades` (`year_id`);--> statement-breakpoint
CREATE INDEX `students_course_id_idx` ON `students` (`course_id`);--> statement-breakpoint
CREATE INDEX `students_year_id_idx` ON `students` (`year_id`);--> statement-breakpoint
CREATE INDEX `subjects_teacher_id_idx` ON `subjects` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `subjects_course_id_idx` ON `subjects` (`course_id`);--> statement-breakpoint
CREATE INDEX `subjects_year_id_idx` ON `subjects` (`year_id`);--> statement-breakpoint
CREATE INDEX `weights_teacher_id_idx` ON `weights` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `weights_subject_id_idx` ON `weights` (`subject_id`);--> statement-breakpoint
CREATE INDEX `weights_year_id_idx` ON `weights` (`year_id`);