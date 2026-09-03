import { eq } from "drizzle-orm";
import type { Context } from "hono";

import { auth } from "../../auth";
import { db } from "../db";
import { user } from "../db/schema";

export type SchoolRole = "teacher" | "staff";

export type CurrentActor = {
	id: string;
	name: string;
	nameHiragana: string;
	email: string;
	age: number;
	gender: "男" | "女" | "その他";
	role: SchoolRole;
	yearId: number;
	isPasswordChanged: boolean | null;
};

/** Resolve permissions from the signed Better Auth session, never request input. */
export const getCurrentActor = async (c: Context): Promise<CurrentActor | null> => {
	const authSession = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!authSession?.user?.id) return null;

	const [actor] = await db
		.select({
			id: user.id,
			name: user.name,
			nameHiragana: user.nameHiragana,
			email: user.email,
			age: user.age,
			gender: user.gender,
			role: user.role,
			yearId: user.yearId,
			isPasswordChanged: user.isPasswordChanged,
		})
		.from(user)
		.where(eq(user.id, authSession.user.id))
		.limit(1);

	return actor ?? null;
};

export const isStaff = (actor: CurrentActor): boolean => actor.role === "staff";
