CREATE TABLE `user_years` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`year_id` int NOT NULL,
	CONSTRAINT `user_years_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_years_user_id_year_id_unique` UNIQUE(`user_id`,`year_id`)
);
--> statement-breakpoint
ALTER TABLE `subjects` ADD `teacher_year_id` varchar(36);--> statement-breakpoint
ALTER TABLE `user_years` ADD CONSTRAINT `user_years_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_years` ADD CONSTRAINT `user_years_year_id_years_id_fk` FOREIGN KEY (`year_id`) REFERENCES `years`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_years_year_id_idx` ON `user_years` (`year_id`);--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_teacher_year_id_user_years_id_fk` FOREIGN KEY (`teacher_year_id`) REFERENCES `user_years`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `user_years` (`id`, `user_id`, `year_id`)
SELECT UUID(), `id`, `year_id` FROM `user`;
--> statement-breakpoint
UPDATE `subjects` AS s
INNER JOIN `user_years` AS uy ON uy.`user_id` = s.`teacher_id` AND uy.`year_id` = s.`year_id`
SET s.`teacher_year_id` = uy.`id`
WHERE s.`teacher_year_id` IS NULL;
