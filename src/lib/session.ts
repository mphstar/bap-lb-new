import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user || null;
}

export async function requireSuperAdmin() {
  const user = await getSessionUser();
  if (!user || (user as any).role !== "superadmin") {
    return null;
  }
  return user;
}

