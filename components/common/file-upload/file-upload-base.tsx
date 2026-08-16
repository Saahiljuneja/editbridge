"use client";

import { useRef, useState } from "react";
import { UploadCloud, Trash2, RefreshCw, CheckCircle, XCircle, FileText, FileVideo, FileImage, File } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  failed?: boolean;
}

export function getReadableFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return <FileVideo className="w-5 h-5 text-brand-primary" />;
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext))
    return <FileImage className="w-5 h-5 text-violet-500" />;
  if (["pdf"].includes(ext))
    return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function ExtBadge({ name }: { name: string }) {
  const ext = (name.split(".").pop() ?? "").toUpperCase().slice(0, 4);
  const colors: Record<string, string> = {
    MP4: "bg-brand-primary", MOV: "bg-blue-400", AVI: "bg-brand-primary",
    MKV: "bg-blue-900", PDF: "bg-red-500",
    JPG: "bg-violet-500", JPEG: "bg-violet-500", PNG: "bg-violet-400",
    GIF: "bg-pink-500", SVG: "bg-orange-500",
  };
  const bg = colors[ext] ?? "bg-gray-500";
  return (
    <span className={cn("absolute bottom-0 left-0 text-[8px] font-bold text-white px-1 py-0.5 rounded-sm leading-none", bg)}>
      {ext}
    </span>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

function Root({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}

// ── DropZone ─────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onDropFiles: (files: FileList) => void;
  accept?: string;
  isDisabled?: boolean;
  label?: string;
  hint?: string;
}

function DropZone({ onDropFiles, accept, isDisabled, label = "Click to upload or drag and drop", hint }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (isDisabled || !e.dataTransfer.files.length) return;
    onDropFiles(e.dataTransfer.files);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      onDropFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div
      onClick={() => !isDisabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
        isDisabled ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200"
          : dragOver ? "border-blue-400 bg-blue-50 cursor-pointer"
          : "border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100/80 cursor-pointer"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={isDisabled}
      />
      <div className="flex flex-col items-center gap-2.5">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border transition-colors",
          dragOver ? "border-blue-300 bg-blue-100" : "border-gray-200 bg-white"
        )}>
          <UploadCloud className={cn("w-5 h-5", dragOver ? "text-brand-primary" : "text-gray-400")} />
        </div>
        <div>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-brand-primary">Click to upload</span>{" "}
            or drag and drop
          </p>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

// ── List ─────────────────────────────────────────────────────────────────────

function List({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

// ── ListItemProgressBar ───────────────────────────────────────────────────────

interface ListItemProps extends UploadedFile {
  onDelete: () => void;
  onRetry?: () => void;
}

function ListItemProgressBar({ name, size, progress, failed, onDelete, onRetry }: ListItemProps) {
  const isComplete = !failed && progress >= 100;
  const isUploading = !failed && progress > 0 && progress < 100;

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border p-3.5 bg-white transition-colors",
      failed ? "border-red-300 bg-red-50/30" : "border-gray-200"
    )}>
      {/* File icon */}
      <div className="relative shrink-0 w-9 h-10 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        {getFileIcon(name)}
        <ExtBadge name={name} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-gray-800 truncate leading-snug">{name}</p>
          <button
            onClick={onDelete}
            className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>{getReadableFileSize(size)}</span>
          <span>·</span>
          {failed ? (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </span>
          ) : isComplete ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </span>
          ) : (
            <span className="text-gray-400">Uploading…</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              failed ? "bg-red-400" : isComplete ? "bg-emerald-500" : "bg-violet-500"
            )}
            style={{ width: `${failed ? 100 : progress}%` }}
          />
        </div>

        {/* Percentage or retry */}
        <div className="flex items-center justify-between mt-1">
          {failed ? (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          ) : (
            <span className="text-xs text-gray-400 ml-auto">{progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compound export ───────────────────────────────────────────────────────────

export const FileUpload = {
  Root,
  DropZone,
  List,
  ListItemProgressBar,
};
