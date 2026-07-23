import { redirect } from "next/navigation";

export default async function PackagesRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/editor/${id}`);
}
