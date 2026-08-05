"use client";
// v2
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  Save,
  Send,
  ArrowLeft,
  Wand2,
  Columns,
  List,
  Vote,
  X,
  Bold,
  Italic,
  Link2,
  Heading2,
  ListMinus,
  Code2,
  Table,
  ImagePlus,
  Share2,
  Sparkles,
  History,
  RotateCcw,
  Calendar,
  Link as LinkIcon,
  Mail,
  Info,
  Maximize2,
  Minimize2,
  Copy,
  ClipboardList,
  AlignLeft,
  FileClock,
  CheckCircle2,
  XCircle,
  Zap,
  Target
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/app/(public)/blog/markdown-renderer";

interface BlogEditorProps {
  post?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    readTime: string;
    status: "draft" | "published" | "in-review";
    thumbnailUrl?: string | null;
    publishedAt?: string | null;
    ogImageUrl?: string | null;
    twitterCardType?: string | null;
    canonicalUrl?: string | null;
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

const SLASH_ITEMS = [
  { label: "Heading 2", type: "h2", description: "Insert section heading" },
  { label: "Heading 3", type: "h3", description: "Insert sub-heading" },
  { label: "Bullet list", type: "list", description: "Insert simple list item" },
  { label: "Code block", type: "code", description: "Insert coding template" },
  { label: "Interactive Poll", type: "poll", description: "Build creator survey" },
  { label: "Table grid", type: "table", description: "Insert matrix table template" },
  { label: "Upload Image", type: "image", description: "Insert image block" },
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

// Inline line-diffing helper
function computeLineDiff(original: string, current: string) {
  const origLines = original.split("\n");
  const currLines = current.split("\n");
  
  const result: { type: "added" | "removed" | "unchanged"; text: string }[] = [];
  
  if (original === current) {
    return currLines.map((l) => ({ type: "unchanged" as const, text: l }));
  }
  
  let i = 0;
  let j = 0;
  while (i < origLines.length || j < currLines.length) {
    if (i < origLines.length && j < currLines.length && origLines[i] === currLines[j]) {
      result.push({ type: "unchanged", text: origLines[i] });
      i++;
      j++;
    } else if (j < currLines.length && (i >= origLines.length || !origLines.slice(i).includes(currLines[j]))) {
      result.push({ type: "added", text: currLines[j] });
      j++;
    } else {
      result.push({ type: "removed", text: origLines[i] });
      i++;
    }
  }
  return result.slice(0, 100); // Limit diff pane to first 100 lines for efficiency
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
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnailUrl ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(post?.ogImageUrl ?? "");
  const [twitterCardType, setTwitterCardType] = useState(post?.twitterCardType ?? "summary_large_image");
  const [canonicalUrl, setCanonicalUrl] = useState(post?.canonicalUrl ?? "");

  // Scheduled publishing date time state (datetime-local format: YYYY-MM-DDTHH:MM)
  const [publishedAt, setPublishedAt] = useState(
    post?.publishedAt
      ? new Date(post.publishedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );

  // Layout and dialog states
  const [layoutMode, setLayoutMode] = useState<"edit" | "preview" | "split">("edit");
  const [saving, setSaving] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollId, setPollId] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");

  // AI assistant helper states
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingExcerpt, setGeneratingExcerpt] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [showAiTitleDropdown, setShowAiTitleDropdown] = useState(false);

  // Social share previewer
  const [showSocialPreview, setShowSocialPreview] = useState(false);
  const [socialText, setSocialText] = useState("");
  const [activeSocialTab, setActiveSocialTab] = useState<"x" | "linkedin">("x");

  // Draft Backup and History recovery states
  const [recoveredDraft, setRecoveredDraft] = useState<any>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  
  // Diff viewer comparison targets
  const [diffModeActive, setDiffModeActive] = useState(false);
  const [diffOriginalText, setDiffOriginalText] = useState("");
  const [diffSnapshotIndex, setDiffSnapshotIndex] = useState<number | null>(null);

  // Sibling articles for SEO internal link suggestions
  const [siblingPosts, setSiblingPosts] = useState<any[]>([]);

  // Newsletter broadcast helper states
  const [subscribersCount, setSubscribersCount] = useState(0); // Fallback count initially 0
  const [broadcasting, setBroadcasting] = useState(false);
  const [showBroadcastPreview, setShowBroadcastPreview] = useState(false);

  // Word Target progress goal
  const [wordGoal, setWordGoal] = useState<number>(500);

  // Notion slash command menu states
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(-1);
  const [selectedSlashItem, setSelectedSlashItem] = useState(0);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ x: 24, y: 64 });

  // Selection formatting menu state (Medium Style)
  const [selectionMenu, setSelectionMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    start: number;
    end: number;
  }>({ show: false, x: 0, y: 0, start: 0, end: 0 });

  // Focus / Zen writing mode
  const [focusMode, setFocusMode] = useState(false);

  // Keep track of the last cursor position for file uploads (since focus leaves textarea on click)
  const lastCursorPosRef = useRef<number>(0);

  // Pre-publish checklist modal
  const [showPublishChecklist, setShowPublishChecklist] = useState(false);

  // Social share copy feedback
  const [copiedSocial, setCopiedSocial] = useState(false);

  // Element reference pointers
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  // Sync Slug
  useEffect(() => {
    if (!slugManual && title) setSlug(slugify(title));
  }, [title, slugManual]);

  // Sync Read Time
  useEffect(() => {
    if (content) setReadTime(estimateReadTime(content));
  }, [content]);

  // Load drafts, snapshots, sibling posts, and subscribers on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eb_draft_${post?.id || "new"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const diffTitle = parsed.title !== (post?.title ?? "");
        const diffContent = parsed.content !== (post?.content ?? "");
        if (diffTitle || diffContent) {
          setRecoveredDraft(parsed);
        }
      }

      // Load revision history list
      const historyRaw = localStorage.getItem(`eb_history_${post?.id || "new"}`);
      if (historyRaw) {
        setHistoryVersions(JSON.parse(historyRaw));
      }

      // Fetch all post titles for SEO internal linking matches
      fetch("/api/blog")
        .then((r) => r.json())
        .then((data) => {
          if (data.posts) {
            setSiblingPosts(data.posts.filter((p: any) => p.id !== post?.id));
          }
        })
        .catch(() => {});

      // Fetch actual subscriber count
      fetch("/api/blog/subscribe")
        .then((r) => r.json())
        .then((data) => { if (typeof data.count === "number") setSubscribersCount(data.count); })
        .catch(() => {});
    } catch {}
  }, [post]);

  // Focus mode ESC key listener
  useEffect(() => {
    if (!focusMode) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFocusMode(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode]);

  // Autosave current progress periodically
  useEffect(() => {
    if (!title.trim() && !content.trim()) return;

    const interval = setInterval(() => {
      try {
        const draft = { title, slug, excerpt, content, category, readTime, thumbnailUrl, publishedAt, ogImageUrl, twitterCardType, canonicalUrl };
        localStorage.setItem(`eb_draft_${post?.id || "new"}`, JSON.stringify(draft));
        
        // Periodically write historical backup snapshots (every 60s)
        const key = `eb_history_${post?.id || "new"}`;
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        const lastEntry = list[0];
        
        // Only append history if content has changed from the last snapshot
        if (!lastEntry || lastEntry.data.content !== content) {
          const newEntry = {
            timestamp: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
            data: draft,
          };
          const next = [newEntry, ...list].slice(0, 5); // Keep last 5 snapshots
          localStorage.setItem(key, JSON.stringify(next));
          setHistoryVersions(next);
        }
      } catch {}
    }, 15000); // Trigger checks every 15s

    return () => clearInterval(interval);
  }, [title, slug, excerpt, content, category, readTime, thumbnailUrl, publishedAt, ogImageUrl, twitterCardType, canonicalUrl, post]);

  // Sync scrolling splits
  const handleScroll = () => {
    if (layoutMode !== "split") return;
    const txt = textareaRef.current;
    const prv = previewRef.current;
    if (!txt || !prv) return;

    const scrollPct = txt.scrollTop / (txt.scrollHeight - txt.clientHeight);
    prv.scrollTop = scrollPct * (prv.scrollHeight - prv.clientHeight);
  };

  // Restore recovered local storage backup
  const handleRestoreDraft = () => {
    if (!recoveredDraft) return;
    setTitle(recoveredDraft.title);
    setSlug(recoveredDraft.slug);
    setExcerpt(recoveredDraft.excerpt);
    setContent(recoveredDraft.content);
    setCategory(recoveredDraft.category);
    setReadTime(recoveredDraft.readTime);
    setThumbnailUrl(recoveredDraft.thumbnailUrl || "");
    if (recoveredDraft.publishedAt) setPublishedAt(recoveredDraft.publishedAt);
    if (recoveredDraft.ogImageUrl !== undefined) setOgImageUrl(recoveredDraft.ogImageUrl || "");
    if (recoveredDraft.twitterCardType) setTwitterCardType(recoveredDraft.twitterCardType);
    if (recoveredDraft.canonicalUrl !== undefined) setCanonicalUrl(recoveredDraft.canonicalUrl || "");
    setRecoveredDraft(null);
    toast.success("Draft recovered successfully!");
  };

  // Restore dynamic history snapshots
  const handleRestoreHistory = (data: any) => {
    setTitle(data.title);
    setSlug(data.slug);
    setExcerpt(data.excerpt);
    setContent(data.content);
    setCategory(data.category);
    setReadTime(data.readTime);
    setThumbnailUrl(data.thumbnailUrl || "");
    if (data.publishedAt) setPublishedAt(data.publishedAt);
    if (data.ogImageUrl !== undefined) setOgImageUrl(data.ogImageUrl || "");
    if (data.twitterCardType) setTwitterCardType(data.twitterCardType);
    if (data.canonicalUrl !== undefined) setCanonicalUrl(data.canonicalUrl || "");
    toast.success("Past revision restored successfully!");
  };

  // Manually save a snapshot to history right now
  const handleSaveSnapshotNow = () => {
    try {
      const draft = { title, slug, excerpt, content, category, readTime, thumbnailUrl, publishedAt, ogImageUrl, twitterCardType, canonicalUrl };
      const key = `eb_history_${post?.id || "new"}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      const newEntry = {
        timestamp: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        data: draft,
      };
      const next = [newEntry, ...list].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(next));
      setHistoryVersions(next);
      toast.success("Snapshot saved!");
    } catch {
      toast.error("Failed to save snapshot");
    }
  };

  // Discard draft backup
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(`eb_draft_${post?.id || "new"}`);
    } catch {}
    setRecoveredDraft(null);
    toast.success("Draft backup cleared");
  };

  // AI Excerpt generator API integration
  const handleGenerateExcerpt = async () => {
    if (!content.trim()) {
      toast.error("Add some content first so the assistant can summarize it.");
      return;
    }
    setGeneratingExcerpt(true);
    try {
      const res = await fetch("/api/ai/excerpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setExcerpt(data.excerpt);
        toast.success("Excerpt auto-generated!");
      } else {
        toast.error("Failed to generate excerpt.");
      }
    } catch (err) {
      toast.error("An error occurred while generating excerpt.");
    } finally {
      setGeneratingExcerpt(false);
    }
  };

  // AI Title ideas generator API integration
  const handleGenerateTitle = async () => {
    const baseTitle = title.trim() || "Video Creation Guide";
    setGeneratingTitle(true);
    try {
      const res = await fetch("/api/ai/titles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: baseTitle }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiTitles(data.titles);
        setShowAiTitleDropdown(true);
      } else {
        toast.error("Failed to suggest titles.");
      }
    } catch (err) {
      toast.error("An error occurred while generating titles.");
    } finally {
      setGeneratingTitle(false);
    }
  };

  // Helper to save selection start position when text area is focused or selection changes
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    lastCursorPosRef.current = e.target.selectionStart;
  };

  // Helper to estimate cursor coordinates in monospaced text-sm leading-relaxed textarea
  const estimateCursorCoords = (txt: HTMLTextAreaElement, pos: number) => {
    const val = txt.value;
    const textBefore = val.slice(0, pos);
    const lines = textBefore.split("\n");
    const lineNumber = lines.length;
    const currentLineText = lines[lines.length - 1];
    
    const style = window.getComputedStyle(txt);
    const paddingTop = parseFloat(style.paddingTop) || 20;
    const paddingLeft = parseFloat(style.paddingLeft) || 20;
    const lineHeight = parseFloat(style.lineHeight) || 22;
    const charWidth = 8.1;
    
    const offsetTop = txt.offsetTop || 0;
    const offsetLeft = txt.offsetLeft || 0;
    
    const y = offsetTop + paddingTop + (lineNumber - 1) * lineHeight - txt.scrollTop;
    const x = offsetLeft + paddingLeft + Math.min(txt.clientWidth - 280, currentLineText.length * charWidth);
    
    return { x, y: y + 24 }; // Position dropdown just below the cursor line
  };

  // Helper to estimate selection midpoint coordinates
  const estimateSelectionCoords = (txt: HTMLTextAreaElement, start: number, end: number) => {
    const val = txt.value;
    const middlePos = Math.round((start + end) / 2);
    const textBefore = val.slice(0, middlePos);
    const lines = textBefore.split("\n");
    const lineNumber = lines.length;
    const currentLineText = lines[lines.length - 1];
    
    const style = window.getComputedStyle(txt);
    const paddingTop = parseFloat(style.paddingTop) || 20;
    const paddingLeft = parseFloat(style.paddingLeft) || 20;
    const lineHeight = parseFloat(style.lineHeight) || 22;
    const charWidth = 8.1;
    
    const offsetTop = txt.offsetTop || 0;
    const offsetLeft = txt.offsetLeft || 0;
    
    const y = offsetTop + paddingTop + (lineNumber - 1) * lineHeight - txt.scrollTop;
    const x = offsetLeft + paddingLeft + Math.min(txt.clientWidth - 200, currentLineText.length * charWidth);
    
    // Clamp y coordinate to be at least 8px to prevent clipping from parent overflow-hidden
    const yBubble = Math.max(8, y - 36);
    
    return { x, y: yBubble }; // Position formatting bubble 36px above selection line
  };

  // Text selection change highlight listener (Medium Style bubble positioning)
  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const txt = e.currentTarget;
    const start = txt.selectionStart;
    const end = txt.selectionEnd;
    
    // Track cursor position ref
    lastCursorPosRef.current = start;
    
    if (start !== end && start !== null && end !== null) {
      const coords = estimateSelectionCoords(txt, start, end);
      setSelectionMenu({
        show: true,
        x: coords.x,
        y: coords.y,
        start,
        end,
      });
    } else {
      setSelectionMenu((prev) => ({ ...prev, show: false }));
    }
  };

  // Combined scroll handler to sync scrolls and reposition sticky bubble menus
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    handleScroll();
    const txt = e.currentTarget;
    if (showSlashMenu && slashIndex !== -1) {
      setSlashMenuCoords(estimateCursorCoords(txt, slashIndex));
    }
    if (selectionMenu.show) {
      const coords = estimateSelectionCoords(txt, selectionMenu.start, selectionMenu.end);
      setSelectionMenu((prev) => ({ ...prev, x: coords.x, y: coords.y }));
    }
  };

  // Selection Formatting Bubble execution
  const handleFormat = (type: "bold" | "italic" | "link" | "heading" | "list" | "code" | "table") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let formatted = "";
    switch (type) {
      case "bold":
        formatted = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        formatted = `*${selectedText || "italic text"}*`;
        break;
      case "link":
        formatted = `[${selectedText || "link text"}](https://example.com)`;
        break;
      case "heading":
        formatted = `\n## ${selectedText || "Heading 2"}\n`;
        break;
      case "list":
        formatted = `\n- ${selectedText || "List item"}\n`;
        break;
      case "code":
        formatted = `\n\`\`\`javascript\n${selectedText || "// code here"}\n\`\`\`\n`;
        break;
      case "table":
        formatted = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`;
        break;
    }

    const newContent = text.substring(0, start) + formatted + text.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 50);
  };

  // Keyboard intelligence interceptors
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const txt = e.currentTarget;
    const cursor = txt.selectionStart;
    const val = txt.value;

    // Track cursor position ref
    lastCursorPosRef.current = cursor;

    if (showSlashMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashItem((p) => (p + 1) % SLASH_ITEMS.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashItem((p) => (p - 1 + SLASH_ITEMS.length) % SLASH_ITEMS.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectSlashItem(SLASH_ITEMS[selectedSlashItem]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    const autoCloseMap: Record<string, string> = {
      "[": "]",
      "(": ")",
      "{": "}",
      "`": "`",
    };

    if (autoCloseMap[e.key] !== undefined) {
      e.preventDefault();
      const closeChar = autoCloseMap[e.key];
      
      // If cursor is right before the closing character, just step over it
      if (val.charAt(cursor) === closeChar) {
        txt.setSelectionRange(cursor + 1, cursor + 1);
        return;
      }
      
      // Special backtick handling for triple backticks code fences
      if (e.key === "`") {
        const textBefore = val.substring(0, cursor);
        if (textBefore.endsWith("``")) {
          // Typing the third backtick completes the triple backtick code fence: don't auto-close!
          const newVal = val.substring(0, cursor) + "`" + val.substring(cursor);
          setContent(newVal);
          setTimeout(() => {
            txt.setSelectionRange(cursor + 1, cursor + 1);
          }, 50);
          return;
        }
      }
      
      const insert = e.key + closeChar;
      const newVal = val.substring(0, cursor) + insert + val.substring(cursor);
      setContent(newVal);
      setTimeout(() => {
        txt.setSelectionRange(cursor + 1, cursor + 1);
      }, 50);
      return;
    }

    if (e.key === "Enter") {
      const lineStart = val.lastIndexOf("\n", cursor - 1) + 1;
      const currentLine = val.substring(lineStart, cursor);
      
      if (currentLine.startsWith("- ")) {
        e.preventDefault();
        if (currentLine === "- ") {
          const newVal = val.substring(0, lineStart) + val.substring(cursor);
          setContent(newVal);
          setTimeout(() => {
            txt.setSelectionRange(lineStart, lineStart);
          }, 50);
        } else {
          const insert = "\n- ";
          const newVal = val.substring(0, cursor) + insert + val.substring(cursor);
          setContent(newVal);
          setTimeout(() => {
            txt.setSelectionRange(cursor + insert.length, cursor + insert.length);
          }, 50);
        }
      }
    }
  };

  // Textarea change listener (triggers slash commands menu detection)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const txt = e.currentTarget;
    const cursor = txt.selectionStart;

    // Track cursor position ref
    lastCursorPosRef.current = cursor;

    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/\/(\w*)$/);
    if (match) {
      setShowSlashMenu(true);
      const idx = cursor - match[1].length - 1;
      setSlashIndex(idx);
      setSelectedSlashItem(0);
      const coords = estimateCursorCoords(txt, idx);
      setSlashMenuCoords(coords);
    } else {
      setShowSlashMenu(false);
    }
  };

  // Slash Command option selection execute
  const handleSelectSlashItem = (item: typeof SLASH_ITEMS[number]) => {
    const textarea = textareaRef.current;
    if (!textarea || slashIndex === -1) return;

    const val = textarea.value;
    const cursor = textarea.selectionStart;
    
    let insert = "";
    switch (item.type) {
      case "h2": insert = "## "; break;
      case "h3": insert = "### "; break;
      case "list": insert = "- "; break;
      case "code": insert = "\n```javascript\n// code here\n```\n"; break;
      case "poll": insert = `\n\`\`\`poll\nid: new-poll-survey\nquestion: The question?\noptions: Yes, No\n\`\`\`\n`; break;
      case "table": insert = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`; break;
      case "image": insert = "\n![Image description](/uploads/image.jpg)\n"; break;
    }

    const newVal = val.substring(0, slashIndex) + insert + val.substring(cursor);
    setContent(newVal);
    setShowSlashMenu(false);
    
    setTimeout(() => {
      textarea.focus();
      const nextPos = slashIndex + insert.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  // File uploader helper to hit S3/R2 presigned API
  const uploadFile = async (file: File, uploadType: "cover" | "avatar"): Promise<string> => {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        fileName: file.name, 
        contentType: file.type, 
        uploadType, 
        fileSize: file.size 
      }),
    });
    
    if (!res.ok) {
      const errorMsg = await res.json().then(d => d.error || "Upload init failed").catch(() => "Upload init failed");
      throw new Error(errorMsg);
    }
    
    const { presignedUrl, publicUrl } = await res.json();
    
    await fetch(presignedUrl, { 
      method: "PUT", 
      body: file, 
      headers: { "Content-Type": file.type } 
    });
    
    return publicUrl as string;
  };

  // Image Uploader — inserts at cursor position instead of appending to end
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cursorPos = lastCursorPosRef.current;
    toast.loading("Uploading image to storage...", { id: "upload" });
    try {
      const publicUrl = await uploadFile(file, "cover");
      const markdownImage = `\n![${file.name.split(".")[0]}](${publicUrl})\n`;
      setContent((prev) => {
        if (cursorPos !== null && cursorPos !== undefined) {
          return prev.substring(0, cursorPos) + markdownImage + prev.substring(cursorPos);
        }
        return prev + markdownImage;
      });
      
      // Reset input element value so that same file can be uploaded again if needed
      e.target.value = "";
      
      toast.success("Image uploaded and inserted!", { id: "upload" });
      
      // Focus textarea and place cursor after inserted image
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = (cursorPos ?? 0) + markdownImage.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image", { id: "upload" });
    }
  };

  // Real Thumbnail Uploader
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.loading("Uploading thumbnail...", { id: "thumb-upload" });
    try {
      const publicUrl = await uploadFile(file, "cover");
      setThumbnailUrl(publicUrl);
      toast.success("Thumbnail uploaded successfully!", { id: "thumb-upload" });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload thumbnail", { id: "thumb-upload" });
    }
  };

  // Resend Broadcast newsletter blast real sender
  const handleNewsletterBroadcast = async () => {
    if (!title || !slug) {
      toast.error("Set title and slug first before broadcasting");
      return;
    }
    setBroadcasting(true);
    toast.loading(`Broadcasting newsletter to ${subscribersCount} subscribers...`, { id: "broadcast" });
    try {
      const res = await fetch("/api/blog/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, excerpt, slug }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Newsletter broadcasted successfully!`, { id: "broadcast" });
      } else {
        toast.error(data.error || "Failed to broadcast newsletter", { id: "broadcast" });
      }
    } catch {
      toast.error("Failed to broadcast newsletter due to server error", { id: "broadcast" });
    } finally {
      setBroadcasting(false);
    }
  };

  // Insert Poll template block helper
  const handleInsertPoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollId.trim() || !pollQuestion.trim()) {
      toast.error("ID and Question are required");
      return;
    }
    const cleanId = slugify(pollId);
    const syntax = `\n\`\`\`poll\nid: ${cleanId}\nquestion: ${pollQuestion}\noptions: ${pollOptions || "Yes, No"}\n\`\`\`\n`;
    setContent((prev) => prev + syntax);
    setShowPollModal(false);
    setPollId("");
    setPollQuestion("");
    setPollOptions("");
    toast.success("Poll block template inserted!");
  };

  // Auto Table of Contents generator
  const handleGenerateTOC = () => {
    const headings = content.match(/^(#{2,3}) (.+)$/gm);
    if (!headings || headings.length === 0) {
      toast.error("No H2 or H3 headings found in content");
      return;
    }
    const toc = headings.map((h) => {
      const match = h.match(/^(#{2,3}) (.+)$/);
      if (!match) return "";
      const level = match[1].length;
      const text = match[2].trim();
      const anchor = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const indent = level === 3 ? "  " : "";
      return `${indent}- [${text}](#${anchor})`;
    }).filter(Boolean).join("\n");
    const tocBlock = `## Table of Contents\n\n${toc}\n\n---\n\n`;
    const cursor = textareaRef.current?.selectionStart ?? 0;
    setContent((prev) => prev.substring(0, cursor) + tocBlock + prev.substring(cursor));
    toast.success("Table of Contents inserted!");
  };

  // Social caption copy to clipboard
  const handleCopySocialCaption = () => {
    const caption = socialText || `Check out our latest blog post: "${title}"! #creators #videoediting`;
    navigator.clipboard.writeText(caption).then(() => {
      setCopiedSocial(true);
      toast.success("Caption copied to clipboard!");
      setTimeout(() => setCopiedSocial(false), 2000);
    }).catch(() => toast.error("Clipboard access denied"));
  };

  // SEO Smart internal linking engine
  const internalLinkSuggestions = useMemo(() => {
    if (!content.trim() || siblingPosts.length === 0) return [];
    
    const matches: { title: string; slug: string; keyword: string }[] = [];
    siblingPosts.forEach((sibling) => {
      const titleClean = sibling.title.toLowerCase();
      // Look for matches of post titles inside content string
      const titleMatch = content.toLowerCase().includes(titleClean);
      const isAlreadyLinked = content.includes(`(/blog/${sibling.slug})`) || content.includes(`[${sibling.title}]`);
      
      if (titleMatch && !isAlreadyLinked) {
        matches.push({
          title: sibling.title,
          slug: sibling.slug,
          keyword: sibling.title,
        });
      }
    });

    return matches.slice(0, 3); // Max 3 linking recommendations
  }, [content, siblingPosts]);

  // Insert SEO recommended link wrapper
  const handleInsertInternalLink = (keyword: string, siblingSlug: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Replace the first match of the keyword in the content text
    const text = content;
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    
    if (idx !== -1) {
      const matchedWord = text.substring(idx, idx + keyword.length);
      const linkSyntax = `[${matchedWord}](/blog/${siblingSlug})`;
      const newVal = text.substring(0, idx) + linkSyntax + text.substring(idx + keyword.length);
      setContent(newVal);
      toast.success(`Linked "${keyword}" to guide!`);
    } else {
      // Append at bottom of content if exact match cannot be calculated
      const newVal = text + `\n\n*Related: [${keyword}](/blog/${siblingSlug})*`;
      setContent(newVal);
      toast.success(`Added link to bottom of post`);
    }
  };

  // Save database operations
  async function save(status: "draft" | "published" | "in-review") {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    if (!excerpt.trim()) { toast.error("Excerpt is required"); return; }
    if (!content.trim()) { toast.error("Content is required"); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/blog/${post!.id}` : "/api/blog";
      const method = isEdit ? "PATCH" : "POST";
      
      const payload: Record<string, any> = {
        title,
        slug,
        excerpt,
        content,
        category,
        readTime,
        status,
        thumbnailUrl: thumbnailUrl || null,
        ogImageUrl: ogImageUrl || null,
        twitterCardType: twitterCardType || "summary_large_image",
        canonicalUrl: canonicalUrl || null,
      };

      // Set ISO string representation for future schedules
      if (publishedAt) {
        payload.publishedAt = new Date(publishedAt).toISOString();
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        return;
      }
      
      try {
        localStorage.removeItem(`eb_draft_${post?.id || "new"}`);
      } catch {}

      toast.success(
        status === "published"
          ? (new Date(publishedAt).getTime() > Date.now() ? "Post scheduled!" : "Post published!")
          : status === "in-review"
          ? "Submitted for review!"
          : "Draft saved"
      );
      router.push("/admin/blog");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // SEO Score calculations
  const seoScore = useMemo(() => {
    let score = 0;
    if (!title.trim() || !content.trim()) return 0;

    const titleLen = title.length;
    if (titleLen >= 30 && titleLen <= 70) score += 20;
    else if (titleLen > 10) score += 10;

    const excLen = excerpt.length;
    if (excLen >= 100 && excLen <= 160) score += 20;
    else if (excLen > 20) score += 10;

    const kw = slugify(slug).replace(/-/g, " ");
    if (kw && title.toLowerCase().includes(kw)) score += 15;
    if (kw && excerpt.toLowerCase().includes(kw)) score += 15;

    if (/^(##|###) /m.test(content)) score += 15;

    if (wordCount >= 300) score += 15;
    else if (wordCount > 100) score += 5;

    return Math.min(100, score);
  }, [title, excerpt, content, slug, wordCount]);

  const seoCriteria = useMemo(() => {
    const kw = slugify(slug).replace(/-/g, " ");
    return [
      { label: "Title length is ideal (30-70 chars)", passed: title.length >= 30 && title.length <= 70 },
      { label: "Excerpt length is ideal (100-160 chars)", passed: excerpt.length >= 100 && excerpt.length <= 160 },
      { label: "Keywords match in Title text", passed: !!kw && title.toLowerCase().includes(kw) },
      { label: "Keywords match in Excerpt text", passed: !!kw && excerpt.toLowerCase().includes(kw) },
      { label: "Includes subheadings (H2 or H3 tags)", passed: /^(##|###) /m.test(content) },
      { label: "Content has at least 300 words", passed: wordCount >= 300 },
    ];
  }, [title, excerpt, content, slug, wordCount]);

  // SVG word target calculations
  const targetPct = Math.min(100, Math.round((wordCount / wordGoal) * 100));
  const strokeDashoffset = 125.6 - (125.6 * targetPct) / 100;

  // Flesch-Kincaid readability score (0-100, higher = easier to read)
  const readabilityScore = useMemo(() => {
    if (wordCount < 10) return null;
    const cleanText = content.replace(/```[\s\S]*?```/g, "").replace(/[#*`_\[\]()!>]/g, "");
    const sentences = Math.max(1, (cleanText.match(/[.!?]+/g) || []).length);
    const words = cleanText.trim().split(/\s+/).filter(Boolean);
    const syllables = words.reduce((acc, word) =>
      acc + Math.max(1, (word.toLowerCase().match(/[aeiou]+/g) || []).length), 0);
    const score = 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [content, wordCount]);

  function readabilityLabel(score: number | null) {
    if (score === null) return null;
    if (score >= 80) return { text: "Very Easy", color: "text-green-600", bg: "bg-green-50", bar: "bg-green-500" };
    if (score >= 70) return { text: "Easy", color: "text-green-500", bg: "bg-green-50", bar: "bg-green-400" };
    if (score >= 60) return { text: "Standard", color: "text-blue-500", bg: "bg-blue-50", bar: "bg-blue-500" };
    if (score >= 50) return { text: "Fairly Difficult", color: "text-amber-500", bg: "bg-amber-50", bar: "bg-amber-400" };
    if (score >= 30) return { text: "Difficult", color: "text-orange-500", bg: "bg-orange-50", bar: "bg-orange-400" };
    return { text: "Very Difficult", color: "text-red-500", bg: "bg-red-50", bar: "bg-red-400" };
  }

  // Pre-publish checklist items
  const publishChecklist = [
    { label: "Title is written", passed: title.trim().length > 0, blocker: true },
    { label: "URL slug is set", passed: slug.trim().length > 0, blocker: true },
    { label: "Excerpt written (≥ 50 chars)", passed: excerpt.trim().length >= 50, blocker: false },
    { label: "Content written (≥ 100 words)", passed: wordCount >= 100, blocker: false },
    { label: "Cover thumbnail is uploaded", passed: !!thumbnailUrl.trim(), blocker: false },
    { label: "SEO score is good (≥ 60/100)", passed: seoScore >= 60, blocker: false },
  ];
  const checklistBlockers = publishChecklist.filter((c) => c.blocker && !c.passed);

  // Visual diff lines processing
  const visualDiffResult = useMemo(() => {
    if (!diffModeActive) return [];
    return computeLineDiff(diffOriginalText, content);
  }, [diffModeActive, diffOriginalText, content]);

  const twitterShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialText || `Check out our latest blog post: "${title}"! #creators #videoediting`)}&url=${encodeURIComponent(`https://editbridge.in/blog/${slug}`)}`;
  const linkedInShareHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://editbridge.in/blog/${slug}`)}`;

  return (
    <div className={cn("min-h-screen bg-gray-50 text-gray-900 relative", focusMode && "overflow-hidden")}>

      {/* =========== FOCUS / ZEN MODE OVERLAY =========== */}
      {focusMode && (
        <div className="fixed inset-0 z-[100] bg-[#0f0e1a] flex flex-col">
          {/* Focus mode top bar */}
          <div className="flex items-center justify-between px-8 py-3 border-b border-white/5">
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
              Focus Mode · {wordCount} words · {readTime}
            </span>
            <button
              onClick={() => setFocusMode(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:text-white border border-white/10 hover:border-white/30 transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Exit Focus Mode
            </button>
          </div>
          {/* Focus mode editor */}
          <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-6 flex flex-col gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title…"
              className="text-3xl font-black bg-transparent text-white border-none outline-none placeholder:text-white/20"
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Write freely. Press Esc to exit focus mode."
              className="flex-1 bg-transparent text-white/80 text-sm font-mono leading-relaxed outline-none border-none resize-none placeholder:text-white/20 min-h-[70vh]"
            />
          </div>
        </div>
      )}
      {/* Top sticky header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Link href="/admin/blog" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          All posts
        </Link>
        <div className="h-4 w-px bg-gray-200 shrink-0" />
        <span className="text-xs font-semibold text-gray-500 flex-1 truncate min-w-0">
          {title || <span className="text-gray-300 italic">Untitled post</span>}
        </span>

        {/* Layout Modes — segmented control */}
        <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg shrink-0">
          <button
            onClick={() => setLayoutMode("edit")}
            className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all", layoutMode === "edit" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600")}
          >
            <List className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setLayoutMode("split")}
            className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all", layoutMode === "split" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600")}
          >
            <Columns className="w-3 h-3" /> Split
          </button>
          <button
            onClick={() => setLayoutMode("preview")}
            className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all", layoutMode === "preview" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400 hover:text-gray-600")}
          >
            <Eye className="w-3 h-3" /> Preview
          </button>
        </div>

        <div className="h-4 w-px bg-gray-200 shrink-0" />

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFocusMode(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#8B7FE8] hover:bg-[#8B7FE8]/8 transition-colors"
            title="Focus Mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Revision History"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-gray-200" />

          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40"
          >
            <Save className="w-3 h-3" />
            Save draft
          </button>

          {(!isEdit || post?.status === "draft" || post?.status === "in-review") && (
            <button
              onClick={() => save("in-review")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-sky-700 border border-sky-200 bg-sky-50/80 hover:bg-sky-100 transition-all disabled:opacity-40"
            >
              <FileClock className="w-3 h-3" />
              For review
            </button>
          )}

          <button
            onClick={() => setShowPublishChecklist(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#8B7FE8] hover:bg-[#7a6fd6] shadow-sm shadow-[#8B7FE8]/25 transition-all disabled:opacity-40"
          >
            <ClipboardList className="w-3 h-3" />
            {isEdit && post?.status === "published"
              ? "Update"
              : (new Date(publishedAt).getTime() > Date.now() ? "Schedule" : "Publish")}
          </button>
        </div>
      </div>

      {/* Unsaved draft backup alert banner */}
      {recoveredDraft && (
        <div className="bg-amber-50 border-b border-amber-100 px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs font-medium text-amber-800">
              We found an unsaved draft backup of this article in your local browser storage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreDraft}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Restore backup
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-3 py-1 bg-white hover:bg-gray-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Editor Body Grid layout */}
      <div className="px-8 py-6 max-w-[1600px] mx-auto">
        <div className={`grid ${layoutMode === "split" ? "grid-cols-1" : "lg:grid-cols-[1fr_320px]"} gap-6`}>
          
          {/* Split Mode Editor view vs Standard */}
          {layoutMode === "split" ? (
            <div className="grid lg:grid-cols-2 gap-6 items-stretch min-h-[calc(100vh-180px)]">
              {/* Left column editor block */}
              <div className="flex flex-col gap-4 relative">
                {/* Title */}
                <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Post title…"
                    className="w-full text-xl font-bold text-gray-900 placeholder:text-gray-300 outline-none border-none bg-transparent"
                  />
                </div>

                {/* Textarea toolbar and markdown edit block */}
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden flex flex-col flex-1 shadow-sm relative">
                  {/* Floating Slash menu overlays */}
                  {showSlashMenu && (
                    <div
                      className="absolute bg-white border border-gray-150 rounded-2xl shadow-xl z-30 p-2 w-64 space-y-0.5 max-h-60 overflow-y-auto"
                      style={{ left: `${slashMenuCoords.x}px`, top: `${slashMenuCoords.y}px` }}
                    >
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2.5 py-1">Insert Block</p>
                      {SLASH_ITEMS.map((item, idx) => (
                        <button
                          key={item.type}
                          onClick={() => handleSelectSlashItem(item)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between",
                            selectedSlashItem === idx ? "bg-purple-50 text-purple-700 font-bold" : "text-gray-600 hover:bg-gray-55"
                          )}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Floating Selection Toolbar Bubble (Medium Style) */}
                  {selectionMenu.show && (
                    <div
                      className="absolute bg-gray-900 border border-gray-800 text-white rounded-xl shadow-xl z-30 p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
                      style={{ left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px` }}
                    >
                      <button onClick={() => handleFormat("bold")} className="p-1 hover:bg-gray-800 rounded text-white" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("italic")} className="p-1 hover:bg-gray-800 rounded text-white" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("link")} className="p-1 hover:bg-gray-800 rounded text-white" title="Link"><Link2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("heading")} className="p-1 hover:bg-gray-800 rounded text-white" title="H2"><Heading2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50 flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleFormat("bold")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("italic")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("link")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Link"><Link2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("heading")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Heading"><Heading2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("list")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="List"><ListMinus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("code")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Code"><Code2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("table")} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Table"><Table className="w-3.5 h-3.5" /></button>
                      
                      <span className="w-px h-4 bg-gray-200 mx-1" />
                      
                      <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Upload Image"><ImagePlus className="w-3.5 h-3.5" /></button>
                      <button onClick={handleGenerateTOC} className="p-1.5 text-gray-500 hover:text-[#8B7FE8] hover:bg-gray-100 rounded-md transition-colors" title="Auto Table of Contents"><AlignLeft className="w-3.5 h-3.5" /></button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </div>

                    <button
                      onClick={() => setShowPollModal(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-[#8B7FE8] border border-[#8B7FE8]/25 bg-white hover:bg-[#8B7FE8]/5 transition-colors"
                    >
                      <Vote className="w-3 h-3" /> Insert Poll
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    onScroll={handleTextareaScroll}
                    onMouseUp={handleSelectionChange}
                    onKeyUp={handleSelectionChange}
                    onBlur={handleTextareaBlur}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Write article content using Markdown. Tip: type '/' for Notion slash commands block generator!"
                    className="w-full p-4 font-mono text-xs text-gray-755 outline-none border-none bg-transparent resize-none flex-1 leading-relaxed min-h-[500px]"
                  />
                </div>
              </div>

              {/* Right column preview split block */}
              <div className="bg-white rounded-2xl border border-gray-150 flex flex-col min-h-[calc(100vh-180px)] overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Live 1-to-1 Preview
                  </span>
                </div>
                <div
                  ref={previewRef}
                  className="p-6 overflow-y-auto flex-1 max-w-none text-gray-800 bg-[#f8f7ff]"
                >
                  <div className="bg-white border border-gray-100 rounded-2xl px-6 sm:px-8 py-8 shadow-sm">
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-4">{title || "Untitled Article"}</h1>
                    <MarkdownRenderer content={content} />
                  </div>
                </div>
              </div>
            </div>
          ) : layoutMode === "preview" ? (
            /* Full Preview mode */
            <div className="bg-[#f8f7ff] rounded-3xl border border-gray-150 p-8 min-h-[500px] shadow-sm max-w-4xl mx-auto w-full">
              <div className="bg-white border border-gray-100 rounded-2xl px-8 sm:px-12 py-12 shadow-sm">
                <h1 className="text-3xl font-black text-gray-900 mb-5 leading-tight">{title || "Untitled Article"}</h1>
                {excerpt && <p className="text-gray-500 italic text-base mb-6 pb-6 border-b border-gray-100">{excerpt}</p>}
                <MarkdownRenderer content={content} />
              </div>
            </div>
          ) : (
              <div className="space-y-3">
                {/* Title */}
                <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 shadow-sm relative group">
                  <p className="text-[10px] font-bold text-gray-350 uppercase tracking-[0.1em] mb-2">Title</p>
                  <div className="flex items-start justify-between gap-3">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Post title…"
                      className="w-full text-2xl font-bold text-gray-900 placeholder:text-gray-200 outline-none border-none bg-transparent leading-snug"
                    />
                    <div className="relative">
                      <button
                        onClick={handleGenerateTitle}
                        disabled={generatingTitle}
                        className="p-2 rounded-xl text-gray-400 hover:text-[#8B7FE8] hover:bg-purple-50 transition-colors"
                        title="AI Title Suggestions"
                      >
                        {generatingTitle ? (
                          <span className="w-4.5 h-4.5 border-2 border-purple-500/25 border-t-purple-600 rounded-full animate-spin block" />
                        ) : (
                          <Wand2 className="w-4.5 h-4.5" />
                        )}
                      </button>

                      {/* AI Dropdown list suggestions */}
                      {showAiTitleDropdown && aiTitles.length > 0 && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-150 rounded-2xl shadow-xl z-30 p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Title Suggestions</span>
                            <button onClick={() => setShowAiTitleDropdown(false)} className="text-gray-400 hover:text-gray-655">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {aiTitles.map((t, idx) => (
                            <button
                              key={idx}
                              onClick={() => { setTitle(t); setShowAiTitleDropdown(false); }}
                              className="w-full text-left text-xs text-gray-650 p-2 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors leading-relaxed font-semibold border border-transparent hover:border-purple-100"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Excerpt with AI summary helper */}
                <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-350 uppercase tracking-[0.1em]">Excerpt</p>
                      <p className="text-[10px] text-gray-350 mt-0.5">Shown on the blog index page</p>
                    </div>
                    <button
                      onClick={handleGenerateExcerpt}
                      disabled={generatingExcerpt}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#8B7FE8] border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 hover:bg-[#8B7FE8]/10 transition-colors disabled:opacity-50"
                    >
                      {generatingExcerpt ? (
                        <>
                          <span className="w-3 h-3 border-2 border-purple-500/25 border-t-purple-600 rounded-full animate-spin" />
                          Summarizing…
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3" /> Auto-Summarize
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="A short, compelling summary of what this post covers…"
                    rows={3}
                    maxLength={500}
                    className="w-full text-sm text-gray-700 placeholder:text-gray-300 outline-none border-none bg-transparent resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                      <div className="h-full bg-[#8B7FE8]/40 rounded-full transition-all duration-300" style={{ width: `${(excerpt.length / 500) * 100}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-300 font-semibold">{excerpt.length}/500</span>
                  </div>
                </div>

                {/* Textarea editor workspace */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                  {/* Floating Slash Command Menu */}
                  {showSlashMenu && (
                    <div
                      className="absolute bg-white border border-gray-150 rounded-2xl shadow-xl z-30 p-2 w-64 space-y-0.5 max-h-60 overflow-y-auto"
                      style={{ left: `${slashMenuCoords.x}px`, top: `${slashMenuCoords.y}px` }}
                    >
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2.5 py-1">Insert Block</p>
                      {SLASH_ITEMS.map((item, idx) => (
                        <button
                          key={item.type}
                          onClick={() => handleSelectSlashItem(item)}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between",
                            selectedSlashItem === idx ? "bg-purple-50 text-purple-700 font-bold" : "text-gray-600 hover:bg-gray-55"
                          )}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-gray-400 font-normal">{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Floating Selection Toolbar Bubble (Medium Style) */}
                  {selectionMenu.show && (
                    <div
                      className="absolute bg-gray-900 border border-gray-800 text-white rounded-xl shadow-xl z-30 p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
                      style={{ left: `${selectionMenu.x}px`, top: `${selectionMenu.y}px` }}
                    >
                      <button onClick={() => handleFormat("bold")} className="p-1 hover:bg-gray-800 rounded text-white" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("italic")} className="p-1 hover:bg-gray-800 rounded text-white" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("link")} className="p-1 hover:bg-gray-800 rounded text-white" title="Link"><Link2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("heading")} className="p-1 hover:bg-gray-800 rounded text-white" title="H2"><Heading2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Editor Formatting toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/60 flex-wrap gap-2">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleFormat("bold")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("italic")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("link")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Link"><Link2 className="w-3.5 h-3.5" /></button>
                      <span className="w-px h-4 bg-gray-200 mx-1" />
                      <button onClick={() => handleFormat("heading")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("list")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Bullet List"><ListMinus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("code")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Code Block"><Code2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleFormat("table")} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-white rounded-md transition-all" title="Table"><Table className="w-3.5 h-3.5" /></button>
                      <span className="w-px h-4 bg-gray-200 mx-1" />
                      <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-[#8B7FE8] hover:bg-[#8B7FE8]/5 rounded-md transition-all" title="Upload Image"><ImagePlus className="w-3.5 h-3.5" /></button>
                      <button onClick={handleGenerateTOC} className="p-1.5 text-gray-400 hover:text-[#8B7FE8] hover:bg-[#8B7FE8]/5 rounded-md transition-all" title="Auto TOC"><AlignLeft className="w-3.5 h-3.5" /></button>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageUpload} accept="image/*" />
                    </div>
                    <button
                      onClick={() => setShowPollModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#8B7FE8] border border-[#8B7FE8]/20 bg-white hover:bg-[#8B7FE8]/5 transition-all"
                    >
                      <Vote className="w-3 h-3" /> Poll
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    onScroll={handleTextareaScroll}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onMouseUp={handleSelectionChange}
                    onKeyUp={handleSelectionChange}
                    onBlur={handleTextareaBlur}
                    placeholder={`## Introduction\n\nWrite your post content here using Markdown.\nTip: type '/' to insert Notion blocks!\n\n## Section heading\n\nParagraph text, **bold text**, *italic text*, and \`inline code\`.\n\n- Bullet point\n- Another point`}
                    rows={22}
                    className="w-full px-6 py-5 text-sm font-mono text-gray-700 outline-none border-none bg-transparent resize-none leading-relaxed min-h-[400px] placeholder:text-gray-200"
                  />
                </div>

                {/* Social media sharing previews planner card */}
                <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setShowSocialPreview((p) => !p)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-55 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-[#8B7FE8]" />
                      <span className="text-xs font-bold text-gray-550 uppercase tracking-widest">
                        Social Share Planner & Previews
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold">{showSocialPreview ? "Hide" : "Show planner"}</span>
                  </button>

                  {showSocialPreview && (
                    <div className="p-5 border-t border-gray-100 bg-gray-50/20 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Custom Share Message</label>
                        <textarea
                          rows={2}
                          value={socialText}
                          onChange={(e) => setSocialText(e.target.value)}
                          placeholder="Write a custom caption for your social posts..."
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[#8B7FE8]/50 transition-all resize-none font-semibold text-gray-700"
                        />
                      </div>

                      {/* Previews platform tabs */}
                      <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div className="flex border-b border-gray-100 bg-gray-50/40 p-1 justify-between items-center pr-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveSocialTab("x")}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                                activeSocialTab === "x" ? "bg-white text-gray-800 shadow-xs" : "text-gray-400 hover:text-gray-600"
                              )}
                            >
                              X / Twitter
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSocialTab("linkedin")}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                                activeSocialTab === "linkedin" ? "bg-white text-gray-800 shadow-xs" : "text-gray-400 hover:text-gray-600"
                              )}
                            >
                              LinkedIn
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCopySocialCaption}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors shadow-xs"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedSocial ? "Copied!" : "Copy"}
                            </button>
                            <a
                              href={twitterShareHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 transition-colors shadow-xs"
                            >
                              Share X
                            </a>
                            <a
                              href={linkedInShareHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors shadow-xs"
                            >
                              LinkedIn
                            </a>
                          </div>
                        </div>

                        {/* Previews content card */}
                        <div className="p-4 bg-white">
                          {activeSocialTab === "x" ? (
                            /* X Mock UI */
                            <div className="max-w-md bg-white border border-gray-100 rounded-xl p-3.5 text-left font-sans text-xs">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-[10px]">EB</div>
                                <div>
                                  <p className="font-extrabold text-gray-900 leading-tight">EditBridge</p>
                                  <p className="text-[10px] text-gray-505 leading-none">@editbridge_in</p>
                                </div>
                              </div>
                              <p className="text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed font-medium">
                                {socialText || `Check out our latest blog post: "${title || "Untitled"}"! Read more details inside. #creators #videoediting`}
                              </p>
                              <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs cursor-pointer">
                                <div className="h-32 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-400 border-b border-gray-150">
                                  <Sparkles className="w-8 h-8 opacity-40 animate-pulse" />
                                </div>
                                <div className="p-2.5 bg-white space-y-0.5">
                                  <p className="text-[10px] text-gray-550 font-bold uppercase tracking-wider leading-none">editbridge.in</p>
                                  <p className="font-bold text-gray-900 text-xs truncate">{title || "Untitled Article"}</p>
                                  <p className="text-[10px] text-gray-500 truncate leading-tight">{excerpt || "Post excerpt details"}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* LinkedIn Mock UI */
                            <div className="max-w-md bg-white border border-gray-100 rounded-xl p-3.5 text-left font-sans text-xs">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-9 h-9 rounded-sm bg-gray-900 text-white font-black flex items-center justify-center text-[10px]">EB</div>
                                <div>
                                  <p className="font-extrabold text-gray-900 leading-tight">EditBridge</p>
                                  <p className="text-[9px] text-gray-400 leading-none">1,240 followers · Promoted</p>
                                </div>
                              </div>
                              <p className="text-gray-955 mb-3 whitespace-pre-wrap leading-relaxed">
                                {socialText || `We just published a new article on video creation workflows: "${title || "Untitled"}"! Read the full post on EditBridge blog. #videoediting`}
                              </p>
                              <div className="border border-gray-155 overflow-hidden cursor-pointer shadow-xs">
                                <div className="h-36 bg-gradient-to-tr from-purple-50 to-blue-50 flex items-center justify-center text-purple-400 border-b border-gray-150">
                                  <Share2 className="w-8 h-8 opacity-40" />
                                </div>
                                <div className="p-3 bg-gray-50 flex items-center justify-between gap-4">
                                  <div className="truncate">
                                    <p className="font-extrabold text-gray-900 text-xs truncate">{title || "Untitled post"}</p>
                                    <p className="text-[9px] text-gray-400 leading-none truncate">editbridge.in</p>
                                  </div>
                                  <span className="shrink-0 px-2.5 py-1 bg-white border border-gray-200 text-[10px] font-bold text-gray-650 rounded-lg">Register</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          )}

          {layoutMode !== "split" && layoutMode !== "preview" && (
            <div className="space-y-3 animate-in fade-in duration-200">
                {/* Scheduled Publishing */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gradient-to-r from-[#8B7FE8]/8 to-transparent border-b border-gray-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#8B7FE8]/12 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-[#8B7FE8]" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Publish Date</span>
                  </div>
                  <div className="p-4">
                    <input
                      type="datetime-local"
                      value={publishedAt}
                      onChange={(e) => setPublishedAt(e.target.value)}
                      className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#8B7FE8]/40 focus:bg-white transition-all font-semibold"
                    />
                    {new Date(publishedAt).getTime() > Date.now() ? (
                      <div className="mt-2.5 flex items-center gap-1.5 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <p className="text-[10px] text-amber-600 font-semibold">Scheduled for future release</p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-350 mt-2 ml-1">Publishes immediately on submit</p>
                    )}
                  </div>
                </div>

                {/* Newsletter Broadcast */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50/80 to-transparent border-b border-gray-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-100/60 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Newsletter</span>
                    <span className="ml-auto text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                      {subscribersCount} subscribers
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                      Send a visual summary of this post to your email list via Resend.
                    </p>
                    <button
                      onClick={() => setShowBroadcastPreview(true)}
                      disabled={broadcasting}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-100 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      {broadcasting ? (
                        <>
                          <span className="w-3 h-3 border-2 border-purple-500/25 border-t-purple-600 rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Preview & Send
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SEO Smart Internal Link Suggestions */}
                {internalLinkSuggestions.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-2">
                      <LinkIcon className="w-4 h-4 text-emerald-400" />
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                        SEO Internal Links
                      </label>
                    </div>
                    <div className="space-y-2">
                      {internalLinkSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="bg-emerald-50/15 border border-emerald-50/60 rounded-xl p-2.5 flex flex-col gap-1.5">
                          <p className="text-[10px] text-gray-650 leading-relaxed font-semibold">
                            Keyword &quot;{suggestion.keyword}&quot; matches sibling post:
                          </p>
                          <button
                            onClick={() => handleInsertInternalLink(suggestion.keyword, suggestion.slug)}
                            className="w-full inline-flex items-center justify-center gap-1 py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors shadow-xs"
                          >
                            <LinkIcon className="w-3 h-3" /> Auto-Link Post
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Writing Target */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-50/60 to-transparent border-b border-gray-100 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100/60 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Writing Target</span>
                  </div>
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <input
                        type="range"
                        min={100}
                        max={2000}
                        step={100}
                        value={wordGoal}
                        onChange={(e) => setWordGoal(Number(e.target.value))}
                        className="w-full accent-[#8B7FE8] h-1.5"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-2">
                        <span className="text-gray-600 font-bold">{wordCount} words</span>
                        <span>goal: {wordGoal}w</span>
                      </div>
                    </div>
                    <div className="relative w-14 h-14 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="transparent" stroke="#f3f4f6" strokeWidth="4.5" />
                        <circle
                          cx="24" cy="24" r="20" fill="transparent"
                          stroke={targetPct >= 100 ? "#10b981" : "#8B7FE8"}
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray="125.6"
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-gray-800">
                        {targetPct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* SEO Score */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-100/60 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-sky-500" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">SEO Score</span>
                    </div>
                    <span className={cn(
                      "text-xs font-black px-2.5 py-0.5 rounded-lg",
                      seoScore >= 80 ? "bg-emerald-50 text-emerald-700" : seoScore >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                    )}>
                      {seoScore}/100
                    </span>
                  </div>
                  <div className="px-4 pt-3 pb-1">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          seoScore >= 80 ? "bg-emerald-500" : seoScore >= 50 ? "bg-amber-400" : "bg-red-400"
                        )}
                        style={{ width: `${seoScore}%` }}
                      />
                    </div>
                    <div className="space-y-1 pb-3">
                      {seoCriteria.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          {c.passed
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          }
                          <span className={cn(
                            "text-[11px] leading-snug",
                            c.passed ? "text-gray-600" : "text-gray-400"
                          )}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Readability */}
                {readabilityScore !== null && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Readability</span>
                      <span className={cn(
                        "text-xs font-black px-2.5 py-0.5 rounded-lg",
                        readabilityLabel(readabilityScore)?.color,
                        readabilityLabel(readabilityScore)?.bg
                      )}>
                        {readabilityLabel(readabilityScore)?.text}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2.5">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700", readabilityLabel(readabilityScore)?.bar ?? "bg-emerald-500")}
                          style={{ width: `${readabilityScore}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">Flesch Reading Ease</span>
                        <span className={cn("text-[11px] font-bold", readabilityLabel(readabilityScore)?.color)}>
                          {readabilityScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Snippet Preview */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Google Preview</span>
                  </div>
                  <div className="p-3.5">
                    <div className="border border-gray-100 rounded-xl p-3.5 bg-white space-y-1.5 text-left">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex-shrink-0" />
                        <span className="text-[10px] text-gray-500 truncate">editbridge.in › blog › {slug || "slug-path"}</span>
                      </div>
                      <h4 className="text-[15px] text-[#1a0dab] font-normal leading-snug font-sans truncate hover:underline cursor-pointer">
                        {title || "Untitled blog post title"}
                      </h4>
                      <p className="text-[11px] text-[#4d5156] font-sans leading-relaxed line-clamp-2">
                        {excerpt || "Add an excerpt to preview the meta description here."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* URL Slug */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">URL Slug</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-0 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#8B7FE8]/40 focus-within:bg-white transition-all">
                      <span className="pl-3 text-[11px] text-gray-400 font-mono shrink-0">/blog/</span>
                      <input
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                        placeholder="post-url-slug"
                        className="flex-1 bg-transparent text-xs text-gray-700 py-2.5 pr-3 outline-none font-mono min-w-0"
                      />
                    </div>
                    {!slugManual && (
                      <p className="text-[10px] text-gray-350 mt-1.5 ml-1">Auto-generated from title</p>
                    )}
                  </div>
                </div>

                {/* Cover Thumbnail */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Cover Thumbnail</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {thumbnailUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-28 object-cover" />
                        <button
                          type="button"
                          onClick={() => setThumbnailUrl("")}
                          className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => thumbInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 hover:border-[#8B7FE8]/40 hover:bg-[#8B7FE8]/3 rounded-xl p-5 text-center cursor-pointer transition-all"
                      >
                        <ImagePlus className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-[10px] font-bold text-gray-350 uppercase tracking-wider">Click to upload</p>
                      </div>
                    )}
                    <input type="file" ref={thumbInputRef} className="hidden" onChange={handleThumbnailUpload} accept="image/*" />
                    <input
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="Or paste image URL…"
                      className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#8B7FE8]/40 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">Category</span>
                  </div>
                  <div className="p-4">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#8B7FE8]/40 focus:bg-white transition-all"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Read time */}
                <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Read time
                  </label>
                  <input
                    value={readTime}
                    onChange={(e) => setReadTime(e.target.value)}
                    className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8B7FE8]/50 transition-colors"
                  />
                  <p className="text-[10px] text-gray-300 mt-1">Auto-calculated from word count</p>
                </div>

                {/* Custom Meta Overrides */}
                <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm space-y-4">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Custom Meta Overrides
                  </label>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">OG Image URL</label>
                    <input
                      value={ogImageUrl}
                      onChange={(e) => setOgImageUrl(e.target.value)}
                      placeholder="https://... (overrides thumbnail)"
                      className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#8B7FE8]/50 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Twitter Card Type</label>
                    <select
                      value={twitterCardType}
                      onChange={(e) => setTwitterCardType(e.target.value)}
                      className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#8B7FE8]/50 transition-colors"
                    >
                      <option value="summary_large_image">Summary Large Image</option>
                      <option value="summary">Summary</option>
                      <option value="app">App</option>
                      <option value="player">Player</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Canonical URL</label>
                    <input
                      value={canonicalUrl}
                      onChange={(e) => setCanonicalUrl(e.target.value)}
                      placeholder="https://... (leave blank for default)"
                      className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#8B7FE8]/50 transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
          )}

        </div>
      </div>

      {/* Pre-publish Checklist Modal */}
      {showPublishChecklist && (
        <div className="fixed inset-0 bg-[#07050f]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#8B7FE8]" />
                <h3 className="font-extrabold text-gray-800 text-base">Pre-flight Checklist</h3>
              </div>
              <button
                onClick={() => setShowPublishChecklist(false)}
                className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Review these quality suggestions and hard requirements before finalizing your post:
              </p>

              <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {publishChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs font-semibold">
                    <span className="shrink-0 mt-0.5">
                      {item.passed ? (
                        <span className="text-green-500">✓</span>
                      ) : item.blocker ? (
                        <span className="text-red-500">✗</span>
                      ) : (
                        <span className="text-amber-500">⚠</span>
                      )}
                    </span>
                    <div className="flex-1">
                      <p className={cn("text-gray-700", !item.passed && item.blocker && "text-red-600 font-bold")}>
                        {item.label}
                      </p>
                      {item.blocker && !item.passed && (
                        <p className="text-[10px] text-red-500 font-medium mt-0.5">Required blocker</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {checklistBlockers.length > 0 ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-red-700 text-xs font-semibold leading-relaxed">
                  You have outstanding blockers (marked ✗) that must be resolved before publishing.
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-green-700 text-xs font-semibold leading-relaxed">
                  All systems go! Your post is ready to be published.
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPublishChecklist(false)}
                  className="px-4 py-2 rounded-xl border border-gray-150 text-xs font-semibold text-gray-550 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={checklistBlockers.length > 0 || saving}
                  onClick={() => {
                    setShowPublishChecklist(false);
                    save("published");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#8B7FE8] hover:bg-[#7a6fd6] shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Email Preview Modal (#40) */}
      {showBroadcastPreview && (
        <div className="fixed inset-0 bg-[#07050f]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-500" />
                <span className="font-extrabold text-gray-900 text-sm">Email Preview</span>
              </div>
              <button onClick={() => setShowBroadcastPreview(false)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email card preview */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Sending to {subscribersCount} subscriber{subscribersCount !== 1 ? "s" : ""}
              </p>
              {/* Simulated email card */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Email header bar */}
                <div className="bg-[#8B7FE8] px-6 py-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 mb-1">EditBridge Blog</p>
                  <h2 className="font-extrabold text-lg leading-snug">{title || "Untitled Post"}</h2>
                </div>
                {/* Thumbnail */}
                {thumbnailUrl && (
                  <div className="w-full aspect-video overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Body */}
                <div className="px-6 py-5 space-y-3 bg-white">
                  {excerpt && (
                    <p className="text-sm text-gray-700 leading-relaxed">{excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
                    {category && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{category}</span>}
                    {readTime && <span>{readTime}</span>}
                  </div>
                  <a
                    href={`/blog/${slug || "preview"}`}
                    className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 bg-[#8B7FE8] text-white text-xs font-bold rounded-xl cursor-default"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read the full article →
                  </a>
                </div>
                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-[10px] text-gray-400">
                  You received this because you subscribed to EditBridge updates. &nbsp;
                  <span className="underline cursor-default">Unsubscribe</span>
                </div>
              </div>
            </div>

            {/* Confirm action footer */}
            <div className="border-t border-gray-100 px-6 py-4 shrink-0 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowBroadcastPreview(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowBroadcastPreview(false);
                  await handleNewsletterBroadcast();
                }}
                disabled={broadcasting}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-[#8B7FE8] hover:bg-[#7a6fd6] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send to {subscribersCount} subscriber{subscribersCount !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stateful Poll builder modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-[#07050f]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-[#8B7FE8]" />
                <h3 className="font-extrabold text-gray-800 text-base">Poll Syntax Generator</h3>
              </div>
              <button
                onClick={() => setShowPollModal(false)}
                className="text-gray-400 hover:text-gray-655 p-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInsertPoll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Unique Poll ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. camera-choice"
                  value={pollId}
                  onChange={(e) => setPollId(e.target.value)}
                  className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8B7FE8]/50 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which camera do you shoot on?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8B7FE8]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Options (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony A7IV, Canon R5, Lumix GH6"
                  value={pollOptions}
                  onChange={(e) => setPollOptions(e.target.value)}
                  className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#8B7FE8]/50 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-155 text-xs font-semibold text-gray-550 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#8B7FE8] hover:bg-[#7a6fd6] shadow-sm transition-colors"
                >
                  Insert Poll Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collapsible Version History Sidebar Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div onClick={() => { setShowHistoryDrawer(false); setDiffModeActive(false); }} className="absolute inset-0 bg-[#07050f]/50 backdrop-blur-xs transition-opacity" />
          
          <div className="relative w-96 max-w-full bg-white h-full shadow-2xl border-l border-gray-150 flex flex-col animate-in slide-in-from-right duration-250">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#8B7FE8]" />
                <h3 className="font-extrabold text-gray-800 text-sm">
                  {diffModeActive ? "Git-Style Visual Diff" : "Revision History & Diffs"}
                </h3>
              </div>
              <button
                onClick={() => { setShowHistoryDrawer(false); setDiffModeActive(false); }}
                className="text-gray-400 hover:text-gray-655 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Save Snapshot Now button */}
            {!diffModeActive && (
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/40">
                <button
                  type="button"
                  onClick={handleSaveSnapshotNow}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[10px] font-bold text-[#8B7FE8] border border-[#8B7FE8]/20 bg-white hover:bg-[#8B7FE8]/5 transition-colors"
                >
                  <History className="w-3 h-3" /> Save Snapshot Now
                </button>
              </div>
            )}

            {/* Visual Line-diff pane overlays */}
            {diffModeActive ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-gray-950 font-mono text-[10px] text-gray-200">
                <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                    Comparing with Snapshot {diffSnapshotIndex}
                  </span>
                  <button
                    onClick={() => setDiffModeActive(false)}
                    className="text-xs text-[#8B7FE8] hover:underline"
                  >
                    ← Back to history list
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-0.5 leading-relaxed">
                  <div className="flex items-center gap-2 text-gray-500 border-b border-gray-800 pb-2 mb-2">
                    <span className="bg-red-950/40 text-red-500 px-1 rounded">- Deleted lines</span>
                    <span className="bg-emerald-950/40 text-emerald-500 px-1 rounded">+ Added lines</span>
                  </div>
                  {visualDiffResult.map((line, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "px-1.5 py-0.5 rounded-sm whitespace-pre-wrap font-mono",
                        line.type === "added" && "bg-emerald-950/30 text-emerald-400 border-l-2 border-emerald-500",
                        line.type === "removed" && "bg-red-950/30 text-red-400 line-through border-l-2 border-red-500",
                        line.type === "unchanged" && "text-gray-400"
                      )}
                    >
                      {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                      {line.text || " "}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Standard revisions list */
              <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-gray-50/20">
                {historyVersions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    No historical snapshots saved yet. Revision snapshots run every 15 seconds of active content edits.
                  </div>
                ) : (
                  historyVersions.map((ver, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-[#8B7FE8]/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Snapshot {historyVersions.length - idx}</span>
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{ver.timestamp}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 truncate mb-1">{ver.data.title || "Untitled"}</p>
                      <p className="text-[10px] text-gray-450 line-clamp-2 leading-relaxed mb-3">
                        {ver.data.content ? ver.data.content.slice(0, 100) : "Empty content"}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { handleRestoreHistory(ver.data); setShowHistoryDrawer(false); }}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold rounded-lg transition-colors border border-purple-100"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </button>
                        <button
                          onClick={() => {
                            setDiffOriginalText(ver.data.content || "");
                            setDiffSnapshotIndex(historyVersions.length - idx);
                            setDiffModeActive(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold rounded-lg transition-colors border border-gray-200"
                        >
                          <Info className="w-3 h-3" /> Compare Diff
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
