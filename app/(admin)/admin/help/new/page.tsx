export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { helpCategories } from "@/lib/db/schema";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "../article-editor";

export default async function AdminHelpNewPage() {
  const session = await auth();
  if (!session || !["admin", "staff_support"].includes(session.user?.role ?? "")) {
    redirect("/admin/dashboard");
  }

  const categories = await db
    .select({ id: helpCategories.id, name: helpCategories.name })
    .from(helpCategories)
    .orderBy(helpCategories.sortOrder);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-8 py-6">
          <Link href="/admin/help" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Help Center
          </Link>
          <h1 className="text-xl font-bold text-gray-900">New Help Article</h1>
          <p className="text-sm text-gray-400 mt-0.5">Create a new policy, guide, or FAQ article</p>
        </div>
      </div>
      <div className="px-8 py-6 max-w-4xl">
        <ArticleEditor categories={categories} mode="create" />
      </div>
    </div>
  );
}
