import { redirect } from "next/navigation";

// Portfolio management now lives as a tab on the My Profile page.
export default function PortfolioPage() {
  redirect("/editor/profile?tab=portfolio");
}
