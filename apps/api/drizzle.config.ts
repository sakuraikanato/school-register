import dotenv from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "drizzle-kit";

expand(dotenv.config({debug: true}));

export default defineConfig({
	dialect: "mysql",
	schema: "./app/db/schema.ts",
	out: "./app/db/drizzle",
	dbCredentials: {
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "pass",
		host: String(process.env.DB_HOST) || "localhost",
		port: Number(process.env.DB_PORT) || 3306,
		database: String(process.env.DB_NAME || "dev"),
	},
});
