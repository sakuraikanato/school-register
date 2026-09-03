import { Hono } from "hono";

import dashboardRoutes from "./dashboard";
import sessionRoutes from "./session";
import staffRoutes from "./staff";
import teacherRoutes from "./teacher";

const app = new Hono()
	.route("/", sessionRoutes)
	.route("/", dashboardRoutes)
	.route("/teacher", teacherRoutes)
	.route("/staff", staffRoutes);

export default app;
