import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./src/db";
import { user } from "./src/db/schema";
export const auth = betterAuth({
  database: drizzleAdapter(db, {
      provider: "mysql",
  }),
  emailAndPassword: { 
      enabled: true, 
  }, 
  databaseHooks: {
    account: {
      update: {
        async after(account, ctx) {
          if (ctx?.path === "/change-password") {
            await db.update(user).set({isPasswordChanged: true});
          }
        }
      }
    }
  }
});