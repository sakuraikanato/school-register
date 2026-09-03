import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

import { connection, db } from "../src/db";
import { account, user, years } from "../src/db/schema";

type SeedUser = {
  name: string;
  nameHiragana: string;
  email: string;
  age: number;
  gender: "男" | "女" | "その他";
  role: "teacher" | "staff";
  password: string;
};

const seedUsers: SeedUser[] = [
  {
    name: "専任職員",
    nameHiragana: "せんにんしょくいん",
    email: process.env.SEED_STAFF_EMAIL ?? "staff@example.com",
    age: 35,
    gender: "その他",
    role: "staff",
    password: process.env.SEED_STAFF_PASSWORD ?? "Staff123!",
  },
  {
    name: "担当講師",
    nameHiragana: "たんとうこうし",
    email: process.env.SEED_TEACHER_EMAIL ?? "teacher@example.com",
    age: 30,
    gender: "その他",
    role: "teacher",
    password: process.env.SEED_TEACHER_PASSWORD ?? "Teacher123!",
  },
];

const seedYear = Number(process.env.SEED_YEAR ?? new Date().getFullYear());
const resetPassword = process.env.SEED_RESET_PASSWORD === "1";

const ensureYear = async () => {
  const [existing] = await db.select().from(years).where(eq(years.year, seedYear)).limit(1);
  if (existing) return existing;

  await db.insert(years).values({ year: seedYear });
  const [created] = await db.select().from(years).where(eq(years.year, seedYear)).limit(1);
  if (!created) throw new Error(`年度 ${seedYear} を作成できませんでした`);
  return created;
};

const upsertUser = async (seedUser: SeedUser, yearId: number) => {
  const now = new Date();
  const [existing] = await db.select().from(user).where(eq(user.email, seedUser.email)).limit(1);
  const id = existing?.id ?? randomUUID();

  if (existing) {
    await db.update(user).set({
      name: seedUser.name,
      nameHiragana: seedUser.nameHiragana,
      age: seedUser.age,
      gender: seedUser.gender,
      role: seedUser.role,
      yearId,
      updatedAt: now,
    }).where(eq(user.id, id));
  } else {
    await db.insert(user).values({
      id,
      name: seedUser.name,
      nameHiragana: seedUser.nameHiragana,
      email: seedUser.email,
      emailVerified: true,
      age: seedUser.age,
      gender: seedUser.gender,
      role: seedUser.role,
      yearId,
      isPasswordChanged: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [credential] = await db.select().from(account).where(and(eq(account.userId, id), eq(account.providerId, "credential"))).limit(1);
  if (!credential) {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: seedUser.email,
      providerId: "credential",
      userId: id,
      password: await hashPassword(seedUser.password),
      createdAt: now,
      updatedAt: now,
    });
  } else if (resetPassword) {
    await db.update(account).set({ password: await hashPassword(seedUser.password), updatedAt: now }).where(eq(account.id, credential.id));
    await db.update(user).set({ isPasswordChanged: false, updatedAt: now }).where(eq(user.id, id));
  }

  return { id, email: seedUser.email, role: seedUser.role, created: !existing, passwordReset: !credential || resetPassword };
};

try {
  if (!Number.isSafeInteger(seedYear) || seedYear <= 0) throw new Error("SEED_YEAR は正の整数で指定してください");
  const year = await ensureYear();
  const results = [];
  for (const seedUser of seedUsers) results.push(await upsertUser(seedUser, year.id));

  console.log(`年度 ${year.year} (id: ${year.id}) を準備しました`);
  for (const result of results) {
    const passwordMessage = result.passwordReset ? "初期パスワードを設定" : "既存パスワードを維持";
    console.log(`${result.created ? "作成" : "更新"}: ${result.email} (${result.role}) — ${passwordMessage}`);
  }
  if (!resetPassword) console.log("既存ユーザーのパスワードも更新する場合は SEED_RESET_PASSWORD=1 を指定してください");
} finally {
  await connection.end();
}
