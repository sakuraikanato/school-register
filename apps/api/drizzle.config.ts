import dotenv from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "drizzle-kit";

expand(dotenv.config());

export default defineConfig({
	dialect: "mysql",
	schema: "./src/db/schema/index.ts",
	out: "./src/db/drizzle",
	dbCredentials: {
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "pass",
		host: process.env.DB_HOST ?? "localhost",
		port: Number(process.env.DB_PORT) || 3306,
		database: process.env.DB_NAME ?? "school_register",
	},
});
