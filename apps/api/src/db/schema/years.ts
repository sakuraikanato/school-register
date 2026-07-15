import { check, int, mysqlTable, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const years = mysqlTable(
	"years",
	{
		id: int("id").autoincrement().primaryKey(),
		year: int("year").notNull(),
	},
	(table) => [
		uniqueIndex("years_year_unique").on(table.year),
		check("years_year_positive", sql`${table.year} > 0`),
	],
);