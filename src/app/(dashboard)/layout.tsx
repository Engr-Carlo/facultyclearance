import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/ui/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f0fdfa,_#f8fafc_38%,_#f8fafc_100%)] flex flex-col">
      <DashboardNav session={session} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl lg:py-8">
        {children}
      </main>
    </div>
  );
}
