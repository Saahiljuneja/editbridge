"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

interface ArticleEditorProps {
  categories: Category[];
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    readTime?: string;
    isPublished?: boolean;
    categoryId?: string;
  };
  mode: "create" | "edit";
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ArticleEditor({ categories, initialData = {}, mode }: ArticleEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData.title ?? "");
  const [slug, setSlug] = useState(initialData.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialData.excerpt ?? "");
  const [content, setContent] = useState(initialData.content ?? "");
  const [readTime, setReadTime] = useState(initialData.readTime ?? "3 min read");
  const [isPublished, setIsPublished] = useState(initialData.isPublished ?? false);
  const [categoryId, setCategoryId] = useState(initialData.categoryId ?? (categories[0]?.id ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (mode === "create") setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = { title, slug, excerpt, content, readTime, isPublished, categoryId };
    const url = mode === "create"
      ? "/api/admin/help/articles"
      : `/api/admin/help/articles/${initialData.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save article.");
        return;
      }

      router.push("/admin/help");
      router.refresh();
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* Title */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Article Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="e.g., How Escrow Works on EditBridge"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">URL Slug *</label>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#0EA5E9] focus-within:ring-2 focus-within:ring-[#0EA5E9]/10 transition-all">
            <span className="px-3 py-3 text-xs text-gray-400 border-r border-gray-200 bg-gray-50">/help/article/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              required
              className="flex-1 px-3 py-3 text-sm text-gray-900 outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Category *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0EA5E9] transition-all"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Short Summary</label>
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="One-sentence description shown in search results and category pages"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all"
          />
        </div>

        {/* Content (Markdown) */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Content (Markdown) *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={20}
            placeholder={`## Section Title\n\nYour policy content here.\n\n* Bullet point 1\n* Bullet point 2`}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all resize-y leading-relaxed"
          />
          <p className="text-xs text-gray-400">Use Markdown: ## Heading, **Bold**, * List item, ---</p>
        </div>

        {/* Read time */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Read Time</label>
          <input
            type="text"
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="e.g., 3 min read"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/10 transition-all"
          />
        </div>

        {/* Published toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Visibility</label>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${isPublished ? "bg-emerald-500" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${isPublished ? "translate-x-4.5" : "translate-x-0"}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {isPublished ? "Published (visible to everyone)" : "Draft (hidden from public)"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/admin/help")}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          ← Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#0EA5E9] hover:bg-sky-600 transition-colors shadow-sm disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Article" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
