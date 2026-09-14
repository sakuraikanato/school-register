import { randomUUID } from "node:crypto";

import { and, asc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { hashPassword } from "better-auth/crypto";

import { db } from "../../db";
import { account, user, userYears, years } from "../../db/schema";
import { forbidden, notFound, unauthorized, validationError } from "../../lib/http";
import {
	conflict,
	isDatabaseConstraintError,
	parseBodyRecord,
	requireActor,
	requireStaffResponse,
	resourceQueryValidator,
} from "../../lib/resource";

const roles = ["teacher", "staff"] as const;
const genders = ["男", "女", "その他"] as const;
const strongPassword = (value: string) => value.length >= 8 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);

const validateProfile = (body: Record<string, unknown>, partial: boolean) => {
	const errors: { field: string; message: string }[] = [];
	for (const [field, max] of [["name", 255], ["nameHiragana", 255], ["email", 255]] as const) {
		if (partial && body[field] === undefined) continue;
		if (typeof body[field] !== "string" || body[field].trim().length === 0 || body[field].length > max) errors.push({ field, message: `${field}は1〜${max}文字で指定してください` });
	}
	if (!partial || body.age !== undefined) {
		if (typeof body.age !== "number" || !Number.isInteger(body.age) || body.age < 18 || body.age > 100) errors.push({ field: "age", message: "ageは18〜100の整数で指定してください" });
	}
	if (!partial || body.gender !== undefined) {
		if (typeof body.gender !== "string" || !genders.includes(body.gender as (typeof genders)[number])) errors.push({ field: "gender", message: "genderが不正です" });
	}
	if (!partial || body.role !== undefined) {
		if (typeof body.role !== "string" || !roles.includes(body.role as (typeof roles)[number])) errors.push({ field: "role", message: "roleはteacherまたはstaffで指定してください" });
	}
	if (!partial || body.yearId !== undefined) {
		if (typeof body.yearId !== "number" || !Number.isSafeInteger(body.yearId) || body.yearId <= 0) errors.push({ field: "yearId", message: "yearIdが不正です" });
	}
	return errors;
};

const userBodyValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "ユーザーデータを指定してください");
	const errors = validateProfile(body, false);
	if (typeof body.initialPassword !== "string" || !strongPassword(body.initialPassword)) errors.push({ field: "initialPassword", message: "初期パスワードは8文字以上で英大文字・英小文字・数字を含めてください" });
	if (errors.length > 0) return validationError(c, "ユーザーの入力値を確認してください", errors);
	return {
		name: (body.name as string).trim(),
		nameHiragana: (body.nameHiragana as string).trim(),
		email: (body.email as string).trim().toLowerCase(),
		age: body.age as number,
		gender: body.gender as (typeof genders)[number],
		role: body.role as (typeof roles)[number],
		yearId: body.yearId as number,
		initialPassword: body.initialPassword as string,
	};
});

const userPatchValidator = validator("json", (value, c) => {
	const body = parseBodyRecord(value, c);
	if (!body) return validationError(c, "ユーザーデータを指定してください");
	if (Object.keys(body).length === 0) return validationError(c, "編集する項目がありません");
	const errors = validateProfile(body, true);
	if (body.initialPassword !== undefined && (typeof body.initialPassword !== "string" || !strongPassword(body.initialPassword))) errors.push({ field: "initialPassword", message: "初期パスワードは8文字以上で英大文字・英小文字・数字を含めてください" });
	if (errors.length > 0) return validationError(c, "ユーザーの入力値を確認してください", errors);
	return {
		...(body.name === undefined ? {} : { name: (body.name as string).trim() }),
		...(body.nameHiragana === undefined ? {} : { nameHiragana: (body.nameHiragana as string).trim() }),
		...(body.email === undefined ? {} : { email: (body.email as string).trim().toLowerCase() }),
		...(body.age === undefined ? {} : { age: body.age as number }),
		...(body.gender === undefined ? {} : { gender: body.gender as (typeof genders)[number] }),
		...(body.role === undefined ? {} : { role: body.role as (typeof roles)[number] }),
		...(body.yearId === undefined ? {} : { yearId: body.yearId as number }),
		...(body.initialPassword === undefined ? {} : { initialPassword: body.initialPassword as string }),
	};
});

const profileSelect = {
	id: user.id,
	name: user.name,
	nameHiragana: user.nameHiragana,
	email: user.email,
	age: user.age,
	gender: user.gender,
	role: user.role,
	yearId: user.yearId,
	isPasswordChanged: user.isPasswordChanged,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
};

const findUser = async (id: string) => {
	const [item] = await db.select(profileSelect).from(user).where(eq(user.id, id)).limit(1);
	return item;
};

const ensureYear = async (yearId: number) => {
	const [item] = await db.select({ id: years.id }).from(years).where(eq(years.id, yearId)).limit(1);
	return item;
};

const app = new Hono()
	.get("/", resourceQueryValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const query = c.req.valid("query");
		const conditions = [];
		if (query.search) conditions.push(like(user.name, `%${query.search}%`));
		const items = query.yearId
			? await db.select(profileSelect).from(user).innerJoin(userYears, eq(userYears.userId, user.id)).where(and(eq(userYears.yearId, query.yearId), ...conditions)).orderBy(asc(user.name))
			: await db.select(profileSelect).from(user).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(asc(user.name));
		return c.json({ items, total: items.length });
	})
	.get("/:id", async (c) => {
		const actor = await requireActor(c);
		if (!actor) return unauthorized(c);
		const id = c.req.param("id");
		const item = await findUser(id);
		if (!item) return notFound(c, "ユーザー");
		if (actor.role !== "staff" && actor.id !== id) return forbidden(c);
		return c.json({ item });
	})
	.post("/", userBodyValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const body = c.req.valid("json");
		if (!(await ensureYear(body.yearId))) return notFound(c, "年度");
		const id = randomUUID();
		const now = new Date();
		try {
			await db.transaction(async (tx) => {
				await tx.insert(user).values({
					id,
					name: body.name,
					nameHiragana: body.nameHiragana,
					email: body.email,
					age: body.age,
					gender: body.gender,
					role: body.role,
					yearId: body.yearId,
					isPasswordChanged: false,
					createdAt: now,
					updatedAt: now,
				});
				await tx.insert(account).values({
					id: randomUUID(),
					accountId: body.email,
					providerId: "credential",
					userId: id,
					password: await hashPassword(body.initialPassword),
					createdAt: now,
					updatedAt: now,
				});
				await tx.insert(userYears).values({ id: randomUUID(), userId: id, yearId: body.yearId });
			});
			return c.json({ item: await findUser(id) }, 201);
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じメールアドレスのユーザーは登録できません");
			throw error;
		}
	})
	.patch("/:id", userPatchValidator, async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = c.req.param("id");
		if (!(await findUser(id))) return notFound(c, "ユーザー");
		const body = c.req.valid("json");
		if (body.yearId !== undefined && !(await ensureYear(body.yearId))) return notFound(c, "年度");
		const { initialPassword, ...profile } = body;
		try {
			await db.transaction(async (tx) => {
				if (Object.keys(profile).length > 0) await tx.update(user).set({ ...profile, ...(initialPassword === undefined ? {} : { isPasswordChanged: false }) }).where(eq(user.id, id));
				if (body.yearId !== undefined) await tx.insert(userYears).values({ id: randomUUID(), userId: id, yearId: body.yearId }).catch(async () => {
					const [existingMembership] = await tx.select({ id: userYears.id }).from(userYears).where(and(eq(userYears.userId, id), eq(userYears.yearId, body.yearId as number))).limit(1);
					if (!existingMembership) throw new Error("ユーザーの年度所属を登録できませんでした");
				});
				if (initialPassword !== undefined) {
					await tx.update(account).set({ password: await hashPassword(initialPassword), updatedAt: new Date() }).where(and(eq(account.userId, id), eq(account.providerId, "credential")));
				}
			});
			return c.json({ item: await findUser(id) });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "同じメールアドレスのユーザーは登録できません");
			throw error;
		}
	})
	.delete("/:id", async (c) => {
		const actor = await requireStaffResponse(c);
		if (actor instanceof Response) return actor;
		const id = c.req.param("id");
		if (actor.id === id) return conflict(c, "自分自身は削除できません");
		if (!(await findUser(id))) return notFound(c, "ユーザー");
		try {
			await db.delete(user).where(eq(user.id, id));
			return c.json({ status: "deleted" as const, id });
		} catch (error) {
			if (isDatabaseConstraintError(error)) return conflict(c, "科目・評価基準・成績確定履歴が紐づくユーザーは削除できません");
			throw error;
		}
	});

export default app;
