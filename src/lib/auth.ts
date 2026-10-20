import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { db } from "@/db";

const statements = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

const ac = createAccessControl(statements);

const superadminRole = ac.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

const teknisiRole = ac.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "teknisi",
      adminRoles: ["superadmin"],
      roles: {
        superadmin: superadminRole,
        teknisi: teknisiRole,
      },
    }),
  ],
  trustedOrigins: [
    "https://mphstar.my.id",
    "https://*.mphstar.my.id",
    "http://mphstar.my.id",
    "http://*.mphstar.my.id",
  ],
});
