import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { desc, eq } from "drizzle-orm";
import { db } from "./src/db";
import { account, session, user, verification, years } from "./src/db/schema";

const webOrigin = process.env.APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "成績管理システム",
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: { user, session, account, verification },
    camelCase: true,
    transaction: true,
  }),
  trustedOrigins: [webOrigin],
  user: {
    // Declaring these fields lets Better Auth return the authorization context.
    additionalFields: {
      // School-specific profile fields are filled by the hook below.
      nameHiragana: { type: "string", required: true, input: false, defaultValue: "" },
      age: { type: "number", required: true, input: false, defaultValue: 18 },
      gender: { type: "string", required: true, input: false, defaultValue: "その他" },
      isPasswordChanged: { type: "boolean", required: true, defaultValue: false, input: false },
      // The field is accepted by the seeder, but the create hook below only
      // honors `staff` when the server-only seed secret is present.
      role: { type: "string", required: true, input: true, defaultValue: "teacher" },
      yearId: { type: "number", required: true, input: false, defaultValue: () => Number(process.env.PUBLIC_SIGNUP_YEAR_ID ?? 1) },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 8,
  },
  databaseHooks: {
    user: {
      create: {
        async before(newUser, context) {
          const [latestYear] = await db.select({ id: years.id }).from(years).orderBy(desc(years.year)).limit(1);
          const requestedRole = newUser.role === "staff" ? "staff" : "teacher";
          const staffSeedSecret = process.env.STAFF_SEED_SECRET?.trim();
          const isAuthorizedStaffSeed = Boolean(
            staffSeedSecret && context?.headers?.get("x-staff-seed-secret") === staffSeedSecret,
          );
          return {
            data: {
              ...newUser,
              nameHiragana: typeof newUser.nameHiragana === "string" && newUser.nameHiragana.trim() ? newUser.nameHiragana : newUser.name,
              age: Number(newUser.age ?? 18),
              gender: newUser.gender ?? "その他",
              // Publicly-created accounts are always teachers. A staff role is
              // accepted only for the server-side seeder with a secret header.
              role: requestedRole === "staff" && isAuthorizedStaffSeed ? "staff" : "teacher",
              yearId: latestYear?.id ?? Number(process.env.PUBLIC_SIGNUP_YEAR_ID ?? 1),
              isPasswordChanged: false,
            },
          };
        },
      },
      update: {
        async before(updatedUser) {
          // `role` is input-enabled only so the server-side seeder can submit
          // it during sign-up. Never allow the public update-user endpoint to
          // promote an existing account.
          const userId = updatedUser.id;
          if (!userId) return updatedUser.role === undefined ? undefined : false;
          const [existingUser] = await db
            .select({ role: user.role })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
          return existingUser ? { data: { ...updatedUser, role: existingUser.role } } : undefined;
        },
      },
    },
    account: {
      update: {
        async after(account, ctx) {
          if (ctx?.path === "/change-password") {
            await db
              .update(user)
              .set({ isPasswordChanged: true })
              .where(eq(user.id, account.userId));
          }
        },
      },
    },
  },
});
