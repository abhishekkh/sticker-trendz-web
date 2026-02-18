import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateAdminToken } from "@/middleware";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login — Sticker Trendz",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const secret = process.env.ADMIN_SECRET ?? "";

  if (token && validateAdminToken(token, secret)) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Admin Login
          </h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
