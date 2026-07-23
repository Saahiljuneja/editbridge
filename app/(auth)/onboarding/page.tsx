// Legacy route — onboarding is no longer needed.
// Users are now redirected straight to their dashboard after signup.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role === "editor") redirect("/editor/dashboard");
  redirect("/dashboard");
}
