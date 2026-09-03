import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { years } from "../../db/schema";
import { conflict, isDatabaseConstraintError, parseBodyRecord, requireActor, requireStaffResponse } from "../../lib/resource";
import { notFound, unauthorized, validationError } from "../../lib/http";

const yearBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "年度データを指定してください");
	if (typeof body.year !== "number" || !Number.isInteger(body.year) || body.year < 1 || body.year > 9999) {
		return validationError(c, "year は1〜9999の整数で指定してください", [{ field: "year", message: "年度が不正です" }]);
	}
	return { year: body.year };
});

const yearPatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "年度データを指定してください");
	if (body.year !== undefined && (typeof body.year !== "number" || !Number.isInteger(body.year) || body.year < 1 || body.year > 9999)) {
		return validationError(c, "year は1〜9999の整数で指定してください", [{ field: "year", message: "年度が不正です" }]);
	}
	if (body.year === undefined) return validationError(c, "編集する項目がありません");
	return { year: body.year as number };
});

const app = new Hono()
	.get("/", async (c) => {
		if (!(await requireActor(c))) return unauthorized(c);
		const items = await db.select().from(years).orderBy(asc(years.year));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		if (!(await requireActor(c))) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "年度");
		const [item] = await db.select().from(years).where(eq(years.id, id)).limit(1);
		return item ? c.json({ item }) : notFound(c, "年度");
	})
	.post("/", yearBodyValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const body = c.req.valid("json");
		try {
			const result = await db.insert(years).values(body);
			const [item] = await db.select().from(years).where(eq(years.id, Number(result[0].insertId))).limit(1);
			return c.json({ item }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度は登録できません");
			throw error;
		}
	})
	.patch("/:id", yearPatchValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "年度");
		const body = c.req.valid("json");
		const [existing] = await db.select().from(years).where(eq(years.id, id)).limit(1);
		if (!existing) return notFound(c, "年度");
		try {
			await db.update(years).set(body).where(eq(years.id, id));
			const [item] = await db.select().from(years).where(eq(years.id, id)).limit(1);
			return c.json({ item });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度は登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "年度");
		try {
			const result = await db.delete(years).where(eq(years.id, id));
			if (result[0].affectedRows === 0) return notFound(c, "年度");
			return c.json({ status: "deleted" as const, id });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "年度に紐づくデータがあるため削除できません");
			throw error;
		}
	});

export default app;
