import { and, asc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";

import { db } from "../../db";
import { courses, years } from "../../db/schema";
import { notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	requireStaffResponse,
	resourceQueryValidator,
} from "../../lib/resource";

const courseBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "コースデータを指定してください");
	const errors: { field: string; message: string }[] = [];
	const name = body.name;
	if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
		errors.push({ field: "name", message: "コース名は1〜255文字で指定してください" });
	}
	if (typeof body.yearId !== "number" || !Number.isSafeInteger(body.yearId) || body.yearId <= 0) {
		errors.push({ field: "yearId", message: "年度IDが不正です" });
	}
	if (errors.length > 0) return validationError(c, "コースの入力値を確認してください", errors);
	return { name: (name as string).trim(), yearId: body.yearId as number };
});

const coursePatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "コースデータを指定してください");
	const errors: { field: string; message: string }[] = [];
	const name = body.name;
	if (name !== undefined && (typeof name !== "string" || name.trim().length === 0 || name.length > 255)) {
		errors.push({ field: "name", message: "コース名は1〜255文字で指定してください" });
	}
	if (body.yearId !== undefined && (typeof body.yearId !== "number" || !Number.isSafeInteger(body.yearId) || body.yearId <= 0)) {
		errors.push({ field: "yearId", message: "年度IDが不正です" });
	}
	if (body.name === undefined && body.yearId === undefined) return validationError(c, "編集する項目がありません");
	if (errors.length > 0) return validationError(c, "コースの入力値を確認してください", errors);
	return {
		...(name === undefined ? {} : { name: (name as string).trim() }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
	};
});

const findCourse = async (id: number) => {
	const [item] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
	return item;
};

const ensureYear = async (yearId: number) => {
	const [item] = await db.select({ id: years.id }).from(years).where(eq(years.id, yearId)).limit(1);
	return item;
};

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		if (!(await requireActor(c))) return unauthorized(c);
		const query = c.req.valid("query");
		const conditions = [];
		if (query.yearId) conditions.push(eq(courses.yearId, query.yearId));
		if (query.search) conditions.push(like(courses.name, `%${query.search}%`));
		const items = conditions.length > 0
			? await db.select().from(courses).where(and(...conditions)).orderBy(asc(courses.name))
			: await db.select().from(courses).orderBy(asc(courses.name));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		if (!(await requireActor(c))) return unauthorized(c);
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "コース");
		const item = await findCourse(id);
		return item ? c.json({ item }) : notFound(c, "コース");
	})
	.post("/", courseBodyValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const body = c.req.valid("json");
		if (!(await ensureYear(body.yearId))) return notFound(c, "年度");
		try {
			const result = await db.insert(courses).values(body);
			const item = await findCourse(Number(result[0].insertId));
			return c.json({ item }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度に同名のコースは登録できません");
			throw error;
		}
	})
	.patch("/:id", coursePatchValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "コース");
		if (!(await findCourse(id))) return notFound(c, "コース");
		const body = c.req.valid("json");
		if (body.yearId !== undefined && !(await ensureYear(body.yearId))) return notFound(c, "年度");
		try {
			await db.update(courses).set(body).where(eq(courses.id, id));
			return c.json({ item: await findCourse(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じ年度に同名のコースは登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = Number(c.req.param("id"));
		if (!Number.isSafeInteger(id) || id <= 0) return notFound(c, "コース");
		try {
			const result = await db.delete(courses).where(eq(courses.id, id));
			if (result[0].affectedRows === 0) return notFound(c, "コース");
			return c.json({ status: "deleted" as const, id });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "生徒・科目が紐づくコースは削除できません");
			throw error;
		}
	});

export default app;
