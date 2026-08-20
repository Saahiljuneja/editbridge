import { redirect } from "next/navigation";

export default function SavedPortfolioRedirect() {
  redirect("/client/saved?tab=portfolio");
}
