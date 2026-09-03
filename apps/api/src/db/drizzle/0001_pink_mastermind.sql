ALTER TABLE `grades` ADD `is_confirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `grades` ADD `confirmed_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `grades` ADD `confirmed_by` varchar(36);--> statement-breakpoint
ALTER TABLE `grades` ADD CONSTRAINT `grades_confirmed_by_user_id_fk` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `grades_confirmation_idx` ON `grades` (`subject_id`,`year_id`,`is_first_term`);