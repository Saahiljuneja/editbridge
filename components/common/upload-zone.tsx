"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, FileIcon } from "lucide-react";
import { useUpload } from "@/lib/hooks/use-upload";
import { cn } from "@/lib/utils";

type UploadType = "portfolio" | "delivery" | "kyc";

interface UploadZoneProps {
  uploadType: UploadType;
  accept?: string;
  onUploaded: (result: { key: string; publicUrl: string; fileSize: number }) => void;
  onCleared?: () => void;
  label?: string;
  className?: string;
  maxSizeMb?: number;
  allowedTypes?: string[];
}

export function UploadZone({
  uploadType,
  accept,
  onUploaded,
  onCleared,
  label = "Drop files here or click to browse",
  className,
  maxSizeMb = 500,
  allowedTypes,
}: UploadZoneProps) {
  const { upload, uploading, progress, error } = useUpload();
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setFileName(file.name);
      const fileSize = file.size;
      const result = await upload(file, uploadType);
      if (result) {
        onUploaded({ key: result.key, publicUrl: result.publicUrl, fileSize });
      }
    },
    [upload, uploadType, onUploaded]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleClear() {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
    onCleared?.();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-[#0EA5E9] bg-purple-50"
            : "border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />

        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileIcon className="h-5 w-5 text-[#0EA5E9]" />
            <span className="text-sm text-gray-700 truncate max-w-xs">
              {fileName}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-xs text-gray-400">
              Max {maxSizeMb} MB{allowedTypes ? ` · ${allowedTypes.join(", ")}` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0EA5E9] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">Uploading…</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
