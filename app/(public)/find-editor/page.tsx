import { redirect } from "next/navigation";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { FindEditorQuizClient } from "./quiz-client";

export default async function FindEditorPage() {
  if (!(await isFeatureEnabled("find_editor_quiz"))) {
    redirect("/browse");
  }

  return <FindEditorQuizClient />;
}
