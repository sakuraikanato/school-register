import { Hono } from "hono";
import { validator } from "hono/validator";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { auth } from "../../auth";
import { db } from "../db";
import { account, user } from "../db/schema";
import { isRecord, validationError } from "../lib/http";

type ChangePasswordBody = {
	currentPassword: string;
	newPassword: string;
	revokeOtherSessions?: boolean;
};

const strongPassword = (password: string) =>
	password.length >= 8 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

const changePasswordValidator = validator("json", (value, c) => {
	if (!isRecord(value) || typeof value.currentPassword !== "string" || typeof value.newPassword !== "string") {
		return validationError(c, "現在のパスワードと新しいパスワードを入力してください");
	}
	if (value.revokeOtherSessions !== undefined && typeof value.revokeOtherSessions !== "boolean") {
		return validationError(c, "revokeOtherSessions は真偽値で指定してください");
	}
	if (!strongPassword(value.newPassword)) {
		return validationError(c, "新しいパスワードは8文字以上で、英大文字・英小文字・数字をそれぞれ含めてください", [
			{ field: "newPassword", message: "パスワード強度が要件を満たしていません" },
		]);
	}
	return {
		currentPassword: value.currentPassword,
		newPassword: value.newPassword,
		...(value.revokeOtherSessions === undefined ? {} : { revokeOtherSessions: value.revokeOtherSessions }),
	};
});

type CompletePasswordChangeBody = {
	newPassword: string;
};

const completePasswordChangeValidator = validator("json", (value, c) => {
	if (!isRecord(value) || typeof value.newPassword !== "string") {
		return validationError(c, "新しいパスワードを入力してください");
	}
	if (!strongPassword(value.newPassword)) {
		return validationError(c, "新しいパスワードは8文字以上で、英大文字・英小文字・数字をそれぞれ含めてください", [
			{ field: "newPassword", message: "パスワード強度が要件を満たしていません" },
		]);
	}
	return { newPassword: value.newPassword } satisfies CompletePasswordChangeBody;
});

const withValidatedPasswordBody = (request: Request, body: ChangePasswordBody) => {
	const headers = new Headers(request.headers);
	headers.set("content-type", "application/json");
	headers.delete("content-length");
	return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
};

// Better Auth owns the authentication protocol.  The explicit change-password
// route adds the product password policy before forwarding to Better Auth.
const app = new Hono()
	.post("/complete-password-change", completePasswordChangeValidator, async (c) => {
		const authSession = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!authSession?.user?.id) {
			return c.json({ error: { code: "UNAUTHENTICATED", message: "ログインが必要です" } }, 401);
		}

		const [actor] = await db
			.select({ id: user.id, isPasswordChanged: user.isPasswordChanged })
			.from(user)
			.where(eq(user.id, authSession.user.id))
			.limit(1);
		if (!actor) return c.json({ error: { code: "UNAUTHENTICATED", message: "ログインが必要です" } }, 401);
		if (actor.isPasswordChanged) {
			return c.json({ error: { code: "PASSWORD_ALREADY_CHANGED", message: "パスワードはすでに変更されています" } }, 409);
		}

		const [credential] = await db
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.userId, actor.id), eq(account.providerId, "credential")))
			.limit(1);
		if (!credential) {
			return c.json({ error: { code: "CREDENTIAL_NOT_FOUND", message: "パスワードを変更できるアカウントが見つかりません" } }, 409);
		}

		const { newPassword } = c.req.valid("json");
		const password = await hashPassword(newPassword);
		const now = new Date();
		await db.transaction(async (tx) => {
			await tx.update(account).set({ password, updatedAt: now }).where(eq(account.id, credential.id));
			await tx.update(user).set({ isPasswordChanged: true, updatedAt: now }).where(eq(user.id, actor.id));
		});

		return c.json({ status: true as const });
	})
	.post("/change-password", changePasswordValidator, async (c) =>
		auth.handler(withValidatedPasswordBody(c.req.raw, c.req.valid("json"))),
	)
	.on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));

export default app;
