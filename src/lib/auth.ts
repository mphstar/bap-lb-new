import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [
    "https://mphstar.my.id",
    "https://*.mphstar.my.id",
    "http://mphstar.my.id",
    "http://*.mphstar.my.id",
  ],
});
