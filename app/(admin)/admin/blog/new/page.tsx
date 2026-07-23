import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BlogEditor } from "../blog-editor";

export const metadata = { title: "New post — EditBridge Admin" };

export default async function NewBlogPostPage() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    redirect("/admin/dashboard");
  }

  return <BlogEditor />;
}
