"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  postId: string;
  status: string;
}

export function BlogPostActions({ postId, status }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/blog/${postId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Post deleted successfully");
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error("Failed to delete post");
      }
    } catch {
      toast.error("An error occurred while deleting the post");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleStatus() {
    setToggling(true);
    const newStatus = status === "published" ? "draft" : "published";
    toast.loading(`Moving post to ${newStatus}...`, { id: "status-toggle" });
    try {
      const res = await fetch(`/api/blog/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Post is now a ${newStatus}!`, { id: "status-toggle" });
        router.refresh();
      } else {
        toast.error("Failed to update status", { id: "status-toggle" });
      }
    } catch {
      toast.error("An error occurred while toggling status", { id: "status-toggle" });
    } finally {
      setToggling(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={toggling}
        onClick={handleToggleStatus}
        className={`p-1.5 rounded-lg transition-all border shrink-0 ${
          status === "published"
            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100 hover:border-amber-200"
            : "bg-green-50 text-green-700 hover:bg-green-100 border-green-100 hover:border-green-200"
        }`}
        title={status === "published" ? "Quick Revert to Draft" : "Quick Publish Now"}
      >
        {status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-400 hover:text-red-650 p-1.5 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 shrink-0"
        title="Delete post"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Custom Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-[#07050f]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h3 className="font-extrabold text-gray-900 text-lg leading-tight mb-2">Delete blog post?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Are you sure you want to delete this blog post? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled={deleting}
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-150 text-xs font-semibold text-gray-500 hover:bg-gray-55 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
