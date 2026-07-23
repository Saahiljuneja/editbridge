"use client";

import { useState, useCallback } from "react";

type UploadType = "portfolio" | "delivery" | "kyc";

interface UploadResult {
  key: string;
  publicUrl: string;
}

interface UseUploadReturn {
  upload: (file: File, uploadType: UploadType, onProgress?: (pct: number) => void) => Promise<UploadResult | null>;
  uploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useUpload(): UseUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File, uploadType: UploadType, onProgress?: (pct: number) => void): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Step 1: get presigned URL
        const endpoint = uploadType === "kyc" ? "/api/upload/kyc" : "/api/upload";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size,
            uploadType,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to get upload URL");
        }

        const { presignedUrl, key, publicUrl } = await res.json();
        setProgress(5);
        onProgress?.(5);

        // Step 2: XHR upload for real progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              // 5–100% mapped to the actual upload progress
              const pct = Math.round(5 + (e.loaded / e.total) * 95);
              setProgress(pct);
              onProgress?.(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(100);
              onProgress?.(100);
              resolve();
            } else {
              reject(new Error("Upload to storage failed"));
            }
          };

          xhr.onerror = () => reject(new Error("Upload to storage failed"));
          xhr.send(file);
        });

        return { key, publicUrl };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, progress, error, reset };
}
