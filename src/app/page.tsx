import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  professor: "/dashboard/professor",
  chair: "/dashboard/chair",
  dean: "/dashboard/dean",
  admin: "/dashboard/admin",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role) {
    redirect("/login");
  }
  redirect(ROLE_HOME[session.user.role] ?? "/login");
}
