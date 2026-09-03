import { Hono } from "hono";
import { validator } from "hono/validator";

import { auth } from "../../auth";
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

const withValidatedPasswordBody = (request: Request, body: ChangePasswordBody) => {
	const headers = new Headers(request.headers);
	headers.set("content-type", "application/json");
	headers.delete("content-length");
	return new Request(request.url, { method: request.method, headers, body: JSON.stringify(body) });
};

// Better Auth owns the authentication protocol.  The explicit change-password
// route adds the product password policy before forwarding to Better Auth.
const app = new Hono()
	.post("/change-password", changePasswordValidator, async (c) =>
		auth.handler(withValidatedPasswordBody(c.req.raw, c.req.valid("json"))),
	)
	.on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));

export default app;
