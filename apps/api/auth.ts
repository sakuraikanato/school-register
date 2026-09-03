import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "./src/db";
import { account, session, user, verification } from "./src/db/schema";

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
    // Accounts are provisioned by staff-controlled master-data updates, not by public sign-up.
    // Declaring these fields lets Better Auth return the authorization context
    // while preventing callers from setting it themselves.
    additionalFields: {
      nameHiragana: { type: "string", required: true, input: false },
      age: { type: "number", required: true, input: false },
      gender: { type: "string", required: true, input: false },
      isPasswordChanged: { type: "boolean", required: true, defaultValue: false, input: false },
      role: { type: "string", required: true, input: false },
      yearId: { type: "number", required: true, input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  databaseHooks: {
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
