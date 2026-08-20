import { redirect } from "next/navigation";

export default function SupportRedirect() {
  redirect("/client/help?tab=support");
}
