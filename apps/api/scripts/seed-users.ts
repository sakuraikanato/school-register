import { eq } from "drizzle-orm";
import { createAuthClient } from "better-auth/client";

import { connection, db } from "../src/db";
import { years } from "../src/db/schema";

const seedYear = Number(process.env.SEED_YEAR ?? new Date().getFullYear());
const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8000",
  basePath: "/api/auth",
  fetchOptions: {
    headers: process.env.STAFF_SEED_SECRET
      ? { "x-staff-seed-secret": process.env.STAFF_SEED_SECRET }
      : undefined,
  },
});

const seedUsers = [
  {
    name: "担当講師",
    email: process.env.SEED_TEACHER_EMAIL ?? "teacher@example.com",
    password: process.env.SEED_TEACHER_PASSWORD ?? "Teacher123!",
    role: "teacher",
  },
  {
    name: "専任職員",
    email: process.env.SEED_STAFF_EMAIL ?? "staff@example.com",
    password: process.env.SEED_STAFF_PASSWORD ?? "Staff123!",
    role: "staff",
  },
] as const;
const staffSeedSecret = process.env.STAFF_SEED_SECRET?.trim();
const staffOnly = process.argv.includes("--staff-only");
const usersToSeed = staffOnly ? seedUsers.filter((seedUser) => seedUser.role === "staff") : seedUsers;

const ensureYear = async () => {
  const [existing] = await db.select().from(years).where(eq(years.year, seedYear)).limit(1);
  if (existing) return existing;

  await db.insert(years).values({ year: seedYear });
  const [created] = await db.select().from(years).where(eq(years.year, seedYear)).limit(1);
  if (!created) throw new Error(`年度 ${seedYear} を作成できませんでした`);
  return created;
};

try {
  if (!Number.isSafeInteger(seedYear) || seedYear <= 0) throw new Error("SEED_YEAR は正の整数で指定してください");
  if (staffOnly && !staffSeedSecret) {
    throw new Error("スタッフを作成するには STAFF_SEED_SECRET を設定してください（公開環境には露出させないでください）");
  }
  const year = await ensureYear();
  console.log(`年度 ${year.year} (id: ${year.id}) を準備しました`);
  console.log("Better Auth クライアントで初期ユーザーを作成します");

  for (const seedUser of usersToSeed) {
    const result = await (authClient.signUp.email as (body: {
      name: string;
      email: string;
      password: string;
      role: "teacher" | "staff";
    }) => Promise<{ data?: unknown; error?: { message?: string } }>)({
      name: seedUser.name,
      email: seedUser.email,
      password: seedUser.password,
      role: seedUser.role,
    });
    if (result.error) {
      console.log(`スキップ: ${seedUser.email} — ${result.error.message ?? "登録できませんでした（登録済みの可能性があります）"}`);
      continue;
    }
    console.log(`作成: ${seedUser.email} (${seedUser.role})`);
  }
} finally {
  await connection.end();
}
