import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import NavBar from "@/components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <NavBar displayName={user.displayName} />
      <main className="flex-1 overflow-x-hidden px-4 pb-20 pt-4 md:px-8 md:py-6">
        {children}
      </main>
    </div>
  );
}
