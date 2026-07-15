import { index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { years } from "./years";

export const courses = mysqlTable(
	"courses",
	{
		id: int("id").autoincrement().primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
	},
	(table) => [
		uniqueIndex("courses_year_id_name_unique").on(table.yearId, table.name),
		index("courses_year_id_idx").on(table.yearId),
	],
);