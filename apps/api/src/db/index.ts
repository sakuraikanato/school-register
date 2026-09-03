import { expand } from "dotenv-expand";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

expand(dotenv.config());

/**
 * A pool is intentionally created without eagerly connecting.  This keeps
 * type-only imports of the Hono AppType (from the Next.js client) from opening
 * a database connection, while requests still use the same shared pool.
 */
export const connection = mysql.createPool({
	host: process.env.DB_HOST ?? "localhost",
	user: process.env.DB_USER ?? "root",
	password: process.env.DB_PASSWORD ?? "pass",
	database: process.env.DB_NAME ?? "school_register",
	port: Number(process.env.DB_PORT ?? 3306),
	connectionLimit: 10,
});

export const db = drizzle(connection, { schema, mode: "default" });
