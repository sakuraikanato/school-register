import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { years } from "../../db/schema";
import { parsePositiveInt, parseScreenQuery, type ScreenQuery, validationError } from "../../lib/http";

export const screenQueryValidator = validator("query", (value, c) => {
	const parsed = parseScreenQuery(value);
	return parsed.success ? parsed.data : validationError(c, parsed.message);
});

export const selectedYear = async (yearId?: number) => {
	if (yearId) {
		const [year] = await db.select().from(years).where(eq(years.id, yearId)).limit(1);
		return year;
	}

	const [year] = await db.select().from(years).orderBy(desc(years.year)).limit(1);
	return year;
};

export const isFirstTerm = (query: ScreenQuery): boolean => query.term === "first";

export const pathId = (value: string | undefined): number | undefined => parsePositiveInt(value);

// A tiny Hono instance keeps the path/validator helpers in the route tree
// without making them part of the exported API surface.
export const screenHelpers = new Hono();
