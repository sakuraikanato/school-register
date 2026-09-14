import { index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth-schema";
import { years } from "./years";

/** Year-scoped school membership for a Better Auth user identity. */
export const userYears = mysqlTable(
	"user_years",
	{
		id: varchar("id", { length: 36 }).primaryKey(),
		userId: varchar("user_id", { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		yearId: int("year_id")
			.notNull()
			.references(() => years.id),
	},
	(table) => [
		uniqueIndex("user_years_user_id_year_id_unique").on(table.userId, table.yearId),
		index("user_years_year_id_idx").on(table.yearId),
	],
);
