import { describe, expect, test } from "bun:test";

import { app } from "../index";

describe("screen API routing", () => {
	test("exposes the health endpoint", async () => {
		const response = await app.request("/");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ name: "school-register-api", status: "ok" });
	});

	test("returns an unauthenticated screen model without accessing protected data", async () => {
		const response = await app.request("/api/screens/session");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ authenticated: false, user: null, next: "/login" });
	});

	test("protects aggregate screen data", async () => {
		const response = await app.request("/api/screens/dashboard");
		expect(response.status).toBe(401);
		expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
	});

	test("enforces the password policy before forwarding to Better Auth", async () => {
		const response = await app.request("/api/auth/change-password", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ currentPassword: "old", newPassword: "short" }),
		});
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
	});

	test("mounts Drizzle resource endpoints behind authentication", async () => {
		for (const path of ["years", "courses", "subjects", "students", "weights", "grades"]) {
			const response = await app.request(`/api/${path}`);
			expect(response.status).toBe(401);
			expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
		}
	});
});
