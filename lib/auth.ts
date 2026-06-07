import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export { authOptions };

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
 
  const userId = (session.user as any).id;
  if (!userId) return null;
  return session as typeof session & { user: { id: string } };
}
