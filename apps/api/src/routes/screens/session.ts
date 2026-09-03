import { Hono } from "hono";

import { getCurrentActor } from "../../lib/session";

const app = new Hono()
	.get("/session", async (c) => {
		const actor = await getCurrentActor(c);
		if (!actor) {
			return c.json({ authenticated: false, user: null, next: "/login" });
		}

		return c.json({
			authenticated: true,
			user: actor,
			requiresPasswordChange: !actor.isPasswordChanged,
			next: actor.isPasswordChanged ? "/" : "/password/change",
		});
	});

export default app;
