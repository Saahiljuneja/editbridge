import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { FindEditorResultsClient } from "./results-client";

export default async function FindEditorResultsPage() {
  if (!(await isFeatureEnabled("find_editor_quiz"))) {
    redirect("/browse");
  }

  return <FindEditorResultsClient />;
}
