"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  postId: string;
  status: string;
}

export function BlogPostActions({ postId, status }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/blog/${postId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Post deleted");
      router.refresh();
    } else {
      toast.error("Failed to delete post");
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
      title="Delete post"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
