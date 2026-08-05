"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PenLine,
  Plus,
  Eye,
  Clock,
  BarChart2,
  List,
  Calendar,
  Search,
  ArrowUpDown,
  CheckSquare,
  Square,
  Trash2,
  Send,
  Save,
  Mail,
  MessageSquare,
  Check,
  AlertOctagon,
  User,
  X,
  Pin,
  PinOff,
  Reply,
  GripVertical,
  FileClock,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { BlogPostActions } from "./blog-actions";
import { toast } from "sonner";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  status: "draft" | "published" | "in-review";
  createdAt: Date;
  publishedAt: Date | null;
  views: number | null;
  loveReactions: number;
  fireReactions: number;
  clapReactions: number;
}

interface Subscriber {
  id: string;
  email: string;
  createdAt: Date;
}

interface Comment {
  id: string;
  postId: string;
  postTitle: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: string;
  adminReply?: string | null;
  isPinned: boolean;
  createdAt: Date;
}

interface AdminBlogClientProps {
  posts: Post[];
  subscribers: Subscriber[];
  comments: Comment[];
}

const CHART_COLORS = ["#8B7FE8", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3 sm:px-6 mt-4 rounded-2xl shadow-sm">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-55 transition-colors disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-xl border border-gray-350 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-55 transition-colors disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-500 font-semibold">
            Showing Page <span className="font-extrabold text-gray-800">{currentPage}</span> of{" "}
            <span className="font-extrabold text-gray-800">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function AdminBlogClient({ posts, subscribers, comments }: AdminBlogClientProps) {
  const router = useRouter();
  
  // Tab Navigation state
  const [activeTab, setActiveTab] = useState<"list" | "calendar" | "analytics" | "subscribers" | "comments">("list");
  
  // Stats and processed analytics data
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);

  // Search & Filter states for posts list
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "published" | "draft" | "in-review">("all");

  // Search & Filter states for subscribers and comments tabs
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [commentStatusFilter, setCommentStatusFilter] = useState<"all" | "pending" | "approved" | "spam">("all");

  // Sorting state for posts list
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Checkbox multi-select states for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Dynamic Editorial Calendar month navigation states
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

  // Search filter state for comment moderation queue
  const [commentSearchQuery, setCommentSearchQuery] = useState("");

  // Drag-and-drop calendar reschedule states (#34)
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Bulk comment action states (#37)
  const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([]);
  const [bulkCommentLoading, setBulkCommentLoading] = useState(false);

  // Admin reply states (#35)
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);

  // Pagination states for all tables / lists
  const [postsPage, setPostsPage] = useState(1);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const itemsPerPage = 10;

  // Custom polished confirmation dialog state
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    show: boolean;
    type: "comment" | "subscriber" | "bulk" | "post";
    id?: string;
    bulkAction?: "publish" | "draft" | "delete";
  }>({ show: false, type: "post" });

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const inReview = posts.filter((p) => p.status === "in-review").length;

  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category));
    return ["All", ...Array.from(set).sort()];
  }, [posts]);

  // Process analytics data on load
  useEffect(() => {
    const data = posts.map((post) => {
      const love = post.loveReactions ?? 0;
      const fire = post.fireReactions ?? 0;
      const clap = post.clapReactions ?? 0;
      const totalReacts = love + fire + clap;
      const postViews = post.views ?? 0;

      return {
        ...post,
        views: postViews,
        love,
        fire,
        clap,
        totalReacts,
      };
    });

    setAnalyticsData(data);
  }, [posts]);

  // Aggregate metrics
  const totalViews = analyticsData.reduce((acc, p) => acc + p.views, 0);
  const totalReactions = analyticsData.reduce((acc, p) => acc + p.totalReacts, 0);
  const avgViews = posts.length > 0 ? Math.round(totalViews / posts.length) : 0;

  // Find top post by views
  const topPost = [...analyticsData].sort((a, b) => b.views - a.views)[0] || null;

  const categoryStats = useMemo(() => {
    const map: Record<string, { posts: number; views: number }> = {};
    analyticsData.forEach((post) => {
      if (!map[post.category]) map[post.category] = { posts: 0, views: 0 };
      map[post.category].posts += 1;
      map[post.category].views += post.views;
    });
    return Object.entries(map)
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.views - a.views);
  }, [analyticsData]);

  const totalCatViews = categoryStats.reduce((acc, c) => acc + c.views, 0);

  const cadenceData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleString("default", { month: "short" }).slice(0, 3);
      const count = posts.filter((p) => {
        const date = new Date(p.publishedAt || p.createdAt);
        return date.getFullYear() === year && date.getMonth() === month && p.status === "published";
      }).length;
      return { label, count };
    });
  }, [posts]);

  const maxCadence = Math.max(1, ...cadenceData.map((m) => m.count));

  const handleDuplicatePost = async (postId: string, postTitle: string, postSlug: string) => {
    setDuplicatingId(postId);
    try {
      const res = await fetch(`/api/blog/${postId}`);
      if (!res.ok) { toast.error("Failed to fetch post for duplication"); return; }
      const { post } = await res.json();
      const rand = Math.random().toString(36).slice(2, 6);
      const createRes = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Copy of ${postTitle}`,
          slug: `${postSlug}-copy-${rand}`,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          readTime: post.readTime,
          status: "draft",
          thumbnailUrl: post.thumbnailUrl ?? null,
          publishedAt: null,
        }),
      });
      const data = await createRes.json();
      if (!createRes.ok) { toast.error(data.error || "Failed to duplicate post"); return; }
      toast.success("Post duplicated as draft!");
      router.push(`/admin/blog/${data.post.id}/edit`);
    } catch {
      toast.error("Failed to duplicate post");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Visual Editorial Calendar logic (fully dynamic based on state)
  const calendarGrid = useMemo(() => {
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleString("default", { month: "long" });
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const cells: { day: number | null; dateKey: string | null }[] = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateKey: null });
    }
    
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey: dateString });
    }
    
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateKey: null });
    }

    return {
      monthLabel: `${monthName} ${calendarYear}`,
      cells,
    };
  }, [calendarYear, calendarMonth]);

  // Map posts to dates in the calendar
  const calendarPostsMap = useMemo(() => {
    const map: Record<string, Post[]> = {};
    posts.forEach((post) => {
      const date = post.publishedAt || post.createdAt;
      if (!date) return;
      
      const d = new Date(date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(post);
    });
    return map;
  }, [posts]);

  // Filter and Sort Table posts
  const filteredAndSortedPosts = useMemo(() => {
    let result = posts.map((post) => {
      const analytics = analyticsData.find((a) => a.id === post.id);
      return {
        ...post,
        views: analytics?.views ?? post.views ?? 0,
      };
    }).filter((p) => {
      const matchSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchStatus = selectedStatus === "all" || p.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });

    result.sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      switch (sortBy) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "category":
          aVal = a.category.toLowerCase();
          bVal = b.category.toLowerCase();
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "views":
          aVal = a.views;
          bVal = b.views;
          break;
        case "date":
        default:
          aVal = new Date(a.publishedAt || a.createdAt).getTime();
          bVal = new Date(b.publishedAt || b.createdAt).getTime();
          break;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [posts, analyticsData, searchQuery, selectedCategory, selectedStatus, sortBy, sortAsc]);

  // Column header toggle sorting trigger
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAndSortedPosts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectPost = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Bulk operations execute handler
  const handleBulkAction = async (action: "publish" | "draft" | "delete") => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    toast.loading(`${action === "delete" ? "Deleting" : "Updating"} posts...`, { id: "bulk" });

    try {
      const promises = selectedIds.map(async (id) => {
        if (action === "delete") {
          return fetch(`/api/blog/${id}`, { method: "DELETE" });
        } else {
          return fetch(`/api/blog/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: action === "publish" ? "published" : "draft" }),
          });
        }
      });

      await Promise.all(promises);
      toast.success("Bulk operation completed successfully!", { id: "bulk" });
      setSelectedIds([]);
      router.refresh();
    } catch {
      toast.error("Bulk operation failed", { id: "bulk" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Comment Moderation action triggers
  const handleCommentStatus = async (commentId: string, status: "approved" | "spam" | "pending") => {
    toast.loading("Updating comment status...", { id: "comment-update" });
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Comment marked as ${status}`, { id: "comment-update" });
        router.refresh();
      } else {
        toast.error("Failed to update comment", { id: "comment-update" });
      }
    } catch {
      toast.error("An error occurred", { id: "comment-update" });
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    toast.loading("Deleting comment...", { id: "comment-delete" });
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Comment deleted successfully", { id: "comment-delete" });
        router.refresh();
      } else {
        toast.error("Failed to delete comment", { id: "comment-delete" });
      }
    } catch {
      toast.error("An error occurred", { id: "comment-delete" });
    }
  };

  // Unsubscribe / Remove subscriber from list
  const handleRemoveSubscriber = async (subId: string) => {
    toast.loading("Removing subscriber...", { id: "sub-delete" });
    try {
      const res = await fetch(`/api/blog/subscribe?id=${subId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Subscriber removed successfully", { id: "sub-delete" });
        router.refresh();
      } else {
        toast.error("Failed to remove subscriber", { id: "sub-delete" });
      }
    } catch {
      toast.error("An error occurred", { id: "sub-delete" });
    }
  };

  // Export subscribers to CSV file
  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }
    const headers = ["ID", "Email Address", "Created At"];
    const rows = subscribers.map((sub) => [
      sub.id,
      sub.email,
      new Date(sub.createdAt).toISOString(),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `editbridge_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported as CSV!");
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 0) {
        setCalendarYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 11) {
        setCalendarYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  // Drag-and-drop calendar reschedule (#34)
  const handleDragStart = (e: React.DragEvent, postId: string) => {
    e.dataTransfer.setData("postId", postId);
    setDraggingPostId(postId);
  };

  const handleDragEnd = () => {
    setDraggingPostId(null);
    setDragOverDate(null);
  };

  const handleCalendarDrop = async (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    if (!postId || !dateKey) return;
    setDraggingPostId(null);
    setDragOverDate(null);
    const [y, m, d] = dateKey.split("-").map(Number);
    const newDate = new Date(y, m - 1, d, 12, 0, 0);
    toast.loading("Rescheduling post...", { id: "reschedule" });
    try {
      const res = await fetch(`/api/blog/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedAt: newDate.toISOString() }),
      });
      if (res.ok) {
        toast.success("Post rescheduled!", { id: "reschedule" });
        router.refresh();
      } else {
        toast.error("Failed to reschedule post", { id: "reschedule" });
      }
    } catch {
      toast.error("Failed to reschedule post", { id: "reschedule" });
    }
  };

  // Pin/unpin a comment (#36)
  const handlePinComment = async (commentId: string, currentlyPinned: boolean) => {
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentlyPinned }),
      });
      if (res.ok) {
        toast.success(currentlyPinned ? "Comment unpinned" : "Comment pinned to top!");
        router.refresh();
      } else {
        toast.error("Failed to update pin status");
      }
    } catch {
      toast.error("Failed to update pin status");
    }
  };

  // Save admin reply to a comment (#35)
  const handleAdminReply = async (commentId: string) => {
    const replyText = (replyTexts[commentId] ?? "").trim();
    if (!replyText) { toast.error("Reply cannot be empty"); return; }
    setSavingReplyId(commentId);
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText }),
      });
      if (res.ok) {
        toast.success("Reply saved!");
        setReplyingCommentId(null);
        router.refresh();
      } else {
        toast.error("Failed to save reply");
      }
    } catch {
      toast.error("Failed to save reply");
    } finally {
      setSavingReplyId(null);
    }
  };

  // Bulk comment actions (#37)
  const handleBulkCommentAction = async (action: "approved" | "spam" | "delete") => {
    if (selectedCommentIds.length === 0) return;
    setBulkCommentLoading(true);
    toast.loading(`Processing ${selectedCommentIds.length} comment${selectedCommentIds.length !== 1 ? "s" : ""}...`, { id: "bulk-comment" });
    try {
      await Promise.all(selectedCommentIds.map((id) => {
        if (action === "delete") return fetch(`/api/blog/comments/${id}`, { method: "DELETE" });
        return fetch(`/api/blog/comments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        });
      }));
      toast.success("Bulk operation complete!", { id: "bulk-comment" });
      setSelectedCommentIds([]);
      router.refresh();
    } catch {
      toast.error("Bulk operation failed", { id: "bulk-comment" });
    } finally {
      setBulkCommentLoading(false);
    }
  };

  // Filter subscribers list
  const filteredSubscribers = useMemo(() => {
    if (!subscriberSearch.trim()) return subscribers;
    return subscribers.filter((sub) => sub.email.toLowerCase().includes(subscriberSearch.toLowerCase()));
  }, [subscribers, subscriberSearch]);

  // Filter comments queue with status & query text search; pinned first
  const filteredComments = useMemo(() => {
    return comments
      .filter((c) => {
        const matchStatus = commentStatusFilter === "all" || c.status === commentStatusFilter;
        const matchSearch =
          !commentSearchQuery.trim() ||
          c.authorName.toLowerCase().includes(commentSearchQuery.toLowerCase()) ||
          c.authorEmail.toLowerCase().includes(commentSearchQuery.toLowerCase()) ||
          c.content.toLowerCase().includes(commentSearchQuery.toLowerCase());
        return matchStatus && matchSearch;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [comments, commentStatusFilter, commentSearchQuery]);

  return (
    <div className="px-8 py-6 text-gray-900 min-h-screen">
      {/* Top dashboard title row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Workspace</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {published} published · {drafts} draft{drafts !== 1 ? "s" : ""}{inReview > 0 ? ` · ${inReview} in review` : ""}
          </p>
        </div>

        {/* Tab Selector and Write button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-3.5 h-3.5" /> Posts
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "calendar" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "comments" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Comments
              {comments.filter((c) => c.status === "pending").length > 0 && (
                <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shrink-0">
                  {comments.filter((c) => c.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("subscribers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "subscribers" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Subscribers
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === "analytics" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>

          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#8B7FE8] hover:bg-[#7a6fd6] rounded-xl text-xs font-bold text-white shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New post
          </Link>
        </div>
      </div>

      {activeTab === "analytics" ? (
        /* Analytics Tab View */
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pageviews</p>
              <p className="text-3xl font-black text-gray-955">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Across all published articles</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Reactions</p>
              <p className="text-3xl font-black text-gray-955">{totalReactions.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">❤️ Love, 🔥 Fire, and 👏 Claps combined</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg. Views / Post</p>
              <p className="text-3xl font-black text-gray-955">{avgViews.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Overall performance average</p>
            </div>
          </div>

          {topPost && (
            <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-purple-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
                  Top Performing Article
                </span>
                <h3 className="font-extrabold text-gray-900 text-base leading-tight">{topPost.title}</h3>
                <p className="text-xs text-gray-405 mt-1">Slug: /blog/{topPost.slug} · Published {topPost.publishedAt ? formatDate(topPost.publishedAt) : formatDate(topPost.createdAt)}</p>
              </div>
              <div className="shrink-0 flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Views</p>
                  <p className="text-2xl font-black text-purple-600">{topPost.views.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reactions</p>
                  <p className="text-2xl font-black text-indigo-600">{topPost.totalReacts.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm">Post Performance breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/30">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Article</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Views</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Reactions breakdown</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Total Reacts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analyticsData.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-800 truncate max-w-xs">{post.title}</p>
                        <p className="text-xs text-gray-404 mt-0.5 text-gray-400">/blog/{post.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900">
                        {post.views.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-3 text-xs font-semibold text-gray-500">
                          <span className="flex items-center gap-1">❤️ <strong className="text-gray-800 font-bold">{post.love}</strong></span>
                          <span className="flex items-center gap-1">🔥 <strong className="text-gray-800 font-bold">{post.fire}</strong></span>
                          <span className="flex items-center gap-1">👏 <strong className="text-gray-800 font-bold">{post.clap}</strong></span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[#8B7FE8]">
                        {post.totalReacts.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-category views chart */}
          {categoryStats.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-sm">Views by Category</h3>
              </div>
              <div className="p-5 space-y-3">
                {categoryStats.map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs font-semibold text-gray-700">{cat.category}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {cat.views.toLocaleString()} views · {cat.posts} post{cat.posts !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: totalCatViews > 0 ? `${Math.max(1, (cat.views / totalCatViews) * 100)}%` : "1%",
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Publishing cadence sparkline — posts published per month */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 text-sm">
                Publishing Cadence
                <span className="text-xs font-normal text-gray-400 ml-2">last 12 months</span>
              </h3>
            </div>
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-end gap-1 h-16 mb-1">
                {cadenceData.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end">
                    {m.count > 0 && (
                      <span className="text-[8px] text-[#8B7FE8] font-extrabold mb-0.5 leading-none">{m.count}</span>
                    )}
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: m.count > 0 ? `${Math.max(4, (m.count / maxCadence) * 48)}px` : "2px",
                        backgroundColor: m.count > 0 ? "#8B7FE8" : "#F3F4F6",
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                {cadenceData.map((m, i) => (
                  <div key={i} className="flex-1 text-center text-[8px] text-gray-300 font-semibold overflow-hidden">{m.label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "calendar" ? (
        /* Visual Calendar View */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors shadow-xs"
              >
                ← Prev
              </button>
              <h3 className="font-extrabold text-gray-800 text-base min-w-[140px] text-center">{calendarGrid.monthLabel}</h3>
              <button
                type="button"
                onClick={handleNextMonth}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors shadow-xs"
              >
                Next →
              </button>
            </div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Editorial Calendar View</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-r border-gray-50 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-y divide-gray-100 bg-gray-50">
              {calendarGrid.cells.map((cell, idx) => {
                const dayPosts = cell.dateKey ? calendarPostsMap[cell.dateKey] || [] : [];
                const isToday = cell.dateKey && cell.dateKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                const isDragTarget = cell.dateKey && dragOverDate === cell.dateKey;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[100px] p-2 border-r border-gray-100 last:border-r-0 flex flex-col justify-between bg-white transition-colors hover:bg-gray-55",
                      !cell.day && "bg-gray-50/40",
                      isDragTarget && "bg-[#8B7FE8]/5 border-[#8B7FE8]/30 ring-1 ring-inset ring-[#8B7FE8]/20"
                    )}
                    onDragOver={(e) => { if (cell.dateKey) { e.preventDefault(); setDragOverDate(cell.dateKey); } }}
                    onDragLeave={() => setDragOverDate(null)}
                    onDrop={(e) => { if (cell.dateKey) handleCalendarDrop(e, cell.dateKey); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs font-bold font-mono text-gray-400",
                        isToday && "bg-[#8B7FE8] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                      )}>
                        {cell.day}
                      </span>
                      {dayPosts.length > 0 && (
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider">
                          {dayPosts.length} post{dayPosts.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5 flex-1 flex flex-col justify-start">
                      {dayPosts.map((p) => {
                        const isFuture = p.publishedAt ? new Date(p.publishedAt).getTime() > Date.now() : false;
                        return (
                          <div
                            key={p.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, p.id)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "text-[10px] p-1 rounded font-bold truncate leading-snug border transition-all cursor-grab active:cursor-grabbing flex items-center gap-1",
                              draggingPostId === p.id && "opacity-40 scale-95",
                              isFuture
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : p.status === "published"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : p.status === "in-review"
                                ? "bg-sky-50 text-sky-700 border-sky-100"
                                : "bg-gray-50 text-gray-700 border-gray-150"
                            )}
                            title={`${p.title} (${isFuture ? "scheduled" : p.status}) — drag to reschedule`}
                          >
                            <GripVertical className="w-2.5 h-2.5 shrink-0 opacity-40" />
                            <Link href={`/admin/blog/${p.id}/edit`} className="truncate hover:underline" onClick={(e) => { if (draggingPostId) e.preventDefault(); }}>
                              {p.title}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === "subscribers" ? (
        /* Newsletter Subscribers Tab View */
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search email subscribers..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-850 focus:outline-none focus:border-[#8B7FE8]/50 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-xs"
              >
                Export CSV
              </button>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                {filteredSubscribers.length} Subscriber{filteredSubscribers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Email Subscriber</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Joined Date</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-gray-400 text-xs">
                      No email subscribers found.
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.slice((subscribersPage - 1) * itemsPerPage, subscribersPage * itemsPerPage).map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-bold text-gray-900 font-mono">{sub.email}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide">
                            Active
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteModal({ show: true, type: "subscriber", id: sub.id })}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Unsubscribe / Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={subscribersPage}
            totalPages={Math.ceil(filteredSubscribers.length / itemsPerPage)}
            onPageChange={setSubscribersPage}
          />
        </div>
      ) : activeTab === "comments" ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Select-all checkbox */}
              <button
                onClick={() => {
                  const pageIds = filteredComments.slice((commentsPage - 1) * itemsPerPage, commentsPage * itemsPerPage).map((c) => c.id);
                  const allSelected = pageIds.every((id) => selectedCommentIds.includes(id));
                  if (allSelected) {
                    setSelectedCommentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                  } else {
                    setSelectedCommentIds((prev) => [...new Set([...prev, ...pageIds])]);
                  }
                }}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                title="Select all on this page"
              >
                {filteredComments.slice((commentsPage - 1) * itemsPerPage, commentsPage * itemsPerPage).every((c) => selectedCommentIds.includes(c.id)) && filteredComments.length > 0
                  ? <CheckSquare className="w-4 h-4 text-[#8B7FE8]" />
                  : <Square className="w-4 h-4" />
                }
              </button>
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                {(["all", "pending", "approved", "spam"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setCommentStatusFilter(filter); setCommentsPage(1); }}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                      commentStatusFilter === filter
                        ? "bg-white text-gray-800 shadow-xs"
                        : "text-gray-400 hover:text-gray-655"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-450 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search comments..."
                  value={commentSearchQuery}
                  onChange={(e) => { setCommentSearchQuery(e.target.value); setCommentsPage(1); }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#8B7FE8]/50 focus:bg-white transition-all font-semibold"
                />
              </div>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider shrink-0">
                {filteredComments.length} Comment{filteredComments.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {filteredComments.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-white text-gray-400 text-xs">
                No comments found matching this queue or search filter.
              </div>
            ) : (
              filteredComments.slice((commentsPage - 1) * itemsPerPage, commentsPage * itemsPerPage).map((c) => (
                <div key={c.id} className={cn(
                  "bg-white border rounded-2xl p-5 shadow-sm",
                  c.isPinned ? "border-[#8B7FE8]/25 ring-1 ring-[#8B7FE8]/10" : "border-gray-100"
                )}>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => setSelectedCommentIds((prev) =>
                        prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                      )}
                      className="mt-0.5 text-gray-400 hover:text-[#8B7FE8] transition-colors shrink-0"
                    >
                      {selectedCommentIds.includes(c.id)
                        ? <CheckSquare className="w-4 h-4 text-[#8B7FE8]" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.isPinned && (
                          <span className="flex items-center gap-1 text-[9px] font-black text-[#8B7FE8] bg-[#8B7FE8]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Pin className="w-2.5 h-2.5" /> Featured
                          </span>
                        )}
                        <span className="font-bold text-gray-900 text-sm">{c.authorName}</span>
                        <span className="text-xs text-gray-405 font-mono">({c.authorEmail})</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          Post: {c.postTitle}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed max-w-3xl whitespace-pre-wrap">{c.content}</p>

                      {/* Existing admin reply display */}
                      {c.adminReply && replyingCommentId !== c.id && (
                        <div className="bg-[#8B7FE8]/5 border border-[#8B7FE8]/15 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] font-bold text-[#8B7FE8] uppercase tracking-wider mb-1">Admin Reply</p>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.adminReply}</p>
                        </div>
                      )}

                      {/* Inline reply editor */}
                      {replyingCommentId === c.id && (
                        <div className="space-y-2 mt-1">
                          <textarea
                            autoFocus
                            rows={3}
                            placeholder="Write a public admin reply…"
                            value={replyTexts[c.id] ?? c.adminReply ?? ""}
                            onChange={(e) => setReplyTexts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            className="w-full text-xs text-gray-700 bg-gray-50 border border-[#8B7FE8]/30 rounded-xl px-3 py-2 outline-none focus:border-[#8B7FE8]/60 resize-none transition-colors leading-relaxed"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAdminReply(c.id)}
                              disabled={savingReplyId === c.id}
                              className="px-3 py-1.5 bg-[#8B7FE8] hover:bg-[#7a6fd6] text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {savingReplyId === c.id ? "Saving…" : "Save Reply"}
                            </button>
                            {c.adminReply && (
                              <button
                                onClick={async () => {
                                  await fetch(`/api/blog/comments/${c.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ adminReply: null }),
                                  });
                                  setReplyingCommentId(null);
                                  router.refresh();
                                }}
                                className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors"
                              >
                                Remove Reply
                              </button>
                            )}
                            <button
                              onClick={() => setReplyingCommentId(null)}
                              className="px-3 py-1.5 text-gray-500 text-[10px] font-bold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                          c.status === "approved" && "bg-green-50 text-green-700",
                          c.status === "pending" && "bg-amber-50 text-amber-700",
                          c.status === "spam" && "bg-red-50 text-red-700"
                        )}>
                          {c.status}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 md:self-start shrink-0 flex-wrap">
                      <button
                        onClick={() => handlePinComment(c.id, c.isPinned)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          c.isPinned
                            ? "bg-[#8B7FE8]/10 text-[#8B7FE8] hover:bg-[#8B7FE8]/20"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-400"
                        )}
                        title={c.isPinned ? "Unpin comment" : "Pin to top"}
                      >
                        {c.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          setReplyTexts((prev) => ({ ...prev, [c.id]: c.adminReply ?? "" }));
                          setReplyingCommentId(replyingCommentId === c.id ? null : c.id);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          replyingCommentId === c.id || c.adminReply
                            ? "bg-[#8B7FE8]/10 text-[#8B7FE8] hover:bg-[#8B7FE8]/20"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-400"
                        )}
                        title={c.adminReply ? "Edit admin reply" : "Add admin reply"}
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      {c.status !== "approved" && (
                        <button
                          onClick={() => handleCommentStatus(c.id, "approved")}
                          className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                          title="Approve Comment"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {c.status !== "spam" && (
                        <button
                          onClick={() => handleCommentStatus(c.id, "spam")}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                          title="Mark as Spam"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteModal({ show: true, type: "comment", id: c.id })}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition-colors"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )))
            }
          </div>

          <PaginationControls
            currentPage={commentsPage}
            totalPages={Math.ceil(filteredComments.length / itemsPerPage)}
            onPageChange={setCommentsPage}
          />

          {/* Floating Bulk Comment Actions Bar */}
          {selectedCommentIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-bold shrink-0">
                {selectedCommentIds.length} comment{selectedCommentIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="h-4 w-px bg-gray-700" />
              <div className="flex items-center gap-2">
                <button
                  disabled={bulkCommentLoading}
                  onClick={() => handleBulkCommentAction("approved")}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  disabled={bulkCommentLoading}
                  onClick={() => handleBulkCommentAction("spam")}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <AlertOctagon className="w-3.5 h-3.5" /> Spam
                </button>
                <button
                  disabled={bulkCommentLoading}
                  onClick={() => handleBulkCommentAction("delete")}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              <button
                onClick={() => setSelectedCommentIds([])}
                className="text-gray-400 hover:text-white transition-colors ml-1"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : posts.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 border border-dashed border-gray-200 rounded-2xl bg-white shadow-sm">
          <PenLine className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-medium">No posts yet</p>
          <p className="text-gray-300 text-xs mt-1 mb-6">Write your first blog post and publish it to the public blog.</p>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B7FE8] hover:bg-[#7a6fd6]"
          >
            <Plus className="w-4 h-4" /> Write a post
          </Link>
        </div>
      ) : (
        /* Standard posts list view with visual filters */
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            
            {/* Search + Category selects */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search admin articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-55 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#8B7FE8]/50 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-gray-55 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:border-[#8B7FE8]/50 focus:bg-white transition-all"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status filtering tabs */}
            <div className="flex items-center gap-1 bg-gray-55 p-1 rounded-xl shrink-0">
              {(["all", "published", "in-review", "draft"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors",
                    selectedStatus === status
                      ? "bg-white text-gray-800 shadow-xs"
                      : "text-gray-400 hover:text-gray-650"
                  )}
                >
                  {status === "in-review" ? "In Review" : status}
                </button>
              ))}
            </div>

          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 w-10">
                    <button
                      onClick={() => handleSelectAll(selectedIds.length !== filteredAndSortedPosts.length)}
                      className="text-gray-400 hover:text-gray-655"
                    >
                      {selectedIds.length === filteredAndSortedPosts.length && filteredAndSortedPosts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#8B7FE8]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th
                    onClick={() => handleSort("title")}
                    className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Title <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("category")}
                    className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Category <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Status <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("views")}
                    className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Views <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort("date")}
                    className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 select-none transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAndSortedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-xs">
                      No posts found matching the active search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPosts.slice((postsPage - 1) * itemsPerPage, postsPage * itemsPerPage).map((post) => {
                    const isSelected = selectedIds.includes(post.id);
                    const isFuture = post.publishedAt ? new Date(post.publishedAt).getTime() > Date.now() : false;
                    return (
                      <tr key={post.id} className={cn("hover:bg-gray-55 transition-colors group", isSelected && "bg-purple-50/10")}>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleSelectPost(post.id, !isSelected)}
                            className="text-gray-400 hover:text-gray-655"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#8B7FE8]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900 truncate max-w-sm">{post.title}</p>
                          <p className="text-xs text-gray-404 mt-0.5 font-mono text-gray-400">/blog/{post.slug}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            {post.category}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {isFuture ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                              <Calendar className="w-3 h-3 text-amber-600" /> Scheduled
                            </span>
                          ) : post.status === "published" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                              <Eye className="w-3 h-3" /> Published
                            </span>
                          ) : post.status === "in-review" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                              <FileClock className="w-3 h-3" /> In Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600">
                              <Clock className="w-3 h-3" /> Draft
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-gray-700">
                          {post.views.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                          {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isFuture && post.status === "published" && (
                              <Link
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                className="text-xs text-gray-400 hover:text-[#8B7FE8] transition-colors"
                              >
                                View →
                              </Link>
                            )}
                            <button
                              onClick={() => handleDuplicatePost(post.id, post.title, post.slug)}
                              disabled={duplicatingId === post.id}
                              className="text-xs text-gray-400 hover:text-indigo-500 transition-colors disabled:opacity-50"
                              title="Duplicate as draft"
                            >
                              {duplicatingId === post.id ? "Copying…" : "Duplicate"}
                            </button>
                            <Link
                              href={`/admin/blog/${post.id}/edit`}
                              className="text-xs font-bold text-[#8B7FE8] hover:text-[#7a6fd6]"
                            >
                              Edit
                            </Link>
                            <BlogPostActions postId={post.id} status={post.status} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={postsPage}
            totalPages={Math.ceil(filteredAndSortedPosts.length / itemsPerPage)}
            onPageChange={setPostsPage}
          />

          {/* Floating Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl z-40 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300">
              <span className="text-xs font-bold shrink-0">
                {selectedIds.length} post{selectedIds.length !== 1 ? "s" : ""} selected
              </span>
              <div className="h-4 w-px bg-gray-800" />
              <div className="flex items-center gap-2">
                <button
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkAction("publish")}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Publish
                </button>
                <button
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkAction("draft")}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Revert to draft
                </button>
                <button
                  disabled={bulkActionLoading}
                  onClick={() => setConfirmDeleteModal({ show: true, type: "bulk", bulkAction: "delete" })}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Delete Modal */}
      {confirmDeleteModal.show && (
        <div className="fixed inset-0 bg-[#07050f]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="font-extrabold text-gray-900 text-lg mb-2">Confirm Action</h3>
            <p className="text-xs text-gray-500 font-semibold leading-relaxed mb-6">
              {confirmDeleteModal.type === "comment" && "Are you sure you want to delete this comment? This cannot be undone."}
              {confirmDeleteModal.type === "subscriber" && "Are you sure you want to unsubscribe and remove this email from your list?"}
              {confirmDeleteModal.type === "bulk" && `Are you sure you want to delete all ${selectedIds.length} selected posts? This action is permanent.`}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ show: false, type: "post" })}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-650 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { type, id } = confirmDeleteModal;
                  setConfirmDeleteModal({ show: false, type: "post" });
                  if (type === "comment" && id) {
                    await handleCommentDelete(id);
                  } else if (type === "subscriber" && id) {
                    await handleRemoveSubscriber(id);
                  } else if (type === "bulk") {
                    await handleBulkAction("delete");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-650 hover:bg-red-750 transition-colors shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
