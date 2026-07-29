"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Send, ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";

interface BlogEditorProps {
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    readTime: string;
    status: "draft" | "published";
  };
}

const CATEGORIES = [
  "Hiring guide",
  "Pricing",
  "YouTube",
  "Reels & Shorts",
  "Client guide",
  "Thumbnails",
  "Podcast",
  "Creator workflow",
  "Platform news",
  "General",
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

function renderMarkdownPreview(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.25rem;font-weight:600;margin:1.5rem 0 0.5rem">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1.05rem;font-weight:600;margin:1.25rem 0 0.4rem">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:1px 5px;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, (m) => `<ul style="list-style:disc;padding-left:1.5rem;margin:0.75rem 0">${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/^(?!<[hul]|<li)(.+)$/gm, '<p style="margin:0.6rem 0;line-height:1.7">$1</p>')
    .replace(/\n{2,}/g, "\n");
}

export function BlogEditor({ post }: BlogEditorProps) {
  const router = useRouter();
  const isEdit = !!post;

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [category, setCategory] = useState(post?.category ?? "General");
  const [readTime, setReadTime] = useState(post?.readTime ?? "5 min read");
  const [slugManual, setSlugManual] = useState(isEdit);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  // Auto-estimate read time
  useEffect(() => {
    if (content) setReadTime(estimateReadTime(content));
  }, [content]);

  async function save(status: "draft" | "published") {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    if (!excerpt.trim()) { toast.error("Excerpt is required"); return; }
    if (!content.trim()) { toast.error("Content is required"); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/blog/${post!.id}` : "/api/blog";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, excerpt, content, category, readTime, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      toast.success(status === "published" ? "Post published!" : "Draft saved");
      router.push("/admin/blog");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          All posts
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <span className="text-sm font-medium text-gray-700 flex-1 truncate">
          {title || "Untitled post"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save draft
          </button>
          <button
            onClick={() => save("published")}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--brand-client)" }}
          >
            <Send className="w-3.5 h-3.5" />
            {isEdit && post?.status === "published" ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 ">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Main editor */}
          <div className="space-y-4">
            {/* Title */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title…"
                className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-300 outline-none border-none bg-transparent"
              />
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Excerpt (shown on blog index)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short summary of what this post covers…"
                rows={3}
                maxLength={500}
                className="w-full text-sm text-gray-700 placeholder:text-gray-300 outline-none border-none bg-transparent resize-none leading-relaxed"
              />
              <p className="text-xs text-gray-300 mt-1 text-right">{excerpt.length}/500</p>
            </div>

            {/* Content editor / preview */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {preview ? "Preview" : "Content (Markdown)"}
                </span>
                {!preview && (
                  <span className="text-xs text-gray-300 ml-auto">
                    ## Heading · **bold** · *italic* · `code` · - list item
                  </span>
                )}
              </div>
              {preview ? (
                <div
                  className="p-6 prose prose-sm max-w-none text-gray-700 min-h-[400px]"
                  style={{ fontSize: "0.9rem", lineHeight: 1.75 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
                />
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`## Introduction\n\nWrite your post content here using Markdown.\n\n## Section heading\n\nParagraph text, **bold text**, *italic text*, and \`inline code\`.\n\n- Bullet point\n- Another point`}
                  rows={28}
                  className="w-full p-5 text-sm font-mono text-gray-700 placeholder:text-gray-300 outline-none border-none bg-transparent resize-none leading-relaxed"
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Slug */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                URL slug
              </label>
              <div className="text-xs text-gray-300 mb-2">/blog/</div>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="post-url-slug"
                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-client)] transition-colors font-mono"
              />
              {!slugManual && (
                <p className="text-xs text-gray-300 mt-1">Auto-generated from title</p>
              )}
            </div>

            {/* Category */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-client)] transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Read time */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Read time
              </label>
              <input
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--brand-client)] transition-colors"
              />
              <p className="text-xs text-gray-300 mt-1">Auto-calculated from word count</p>
            </div>

            {/* Markdown cheatsheet */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Markdown reference</p>
              <div className="space-y-1.5 text-xs font-mono text-gray-500">
                {[
                  ["## Heading 2", "Section heading"],
                  ["### Heading 3", "Sub-heading"],
                  ["**bold**", "Bold text"],
                  ["*italic*", "Italic text"],
                  ["`code`", "Inline code"],
                  ["- item", "Bullet list"],
                  ["1. item", "Numbered list"],
                ].map(([syntax, desc]) => (
                  <div key={syntax} className="flex items-center justify-between gap-2">
                    <code className="text-[var(--brand-client)] bg-[var(--brand-client)]/5 px-1.5 py-0.5 rounded">{syntax}</code>
                    <span className="text-gray-300 text-right">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Word count */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {content.trim() ? content.trim().split(/\s+/).length.toLocaleString() : 0}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">words · {readTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
