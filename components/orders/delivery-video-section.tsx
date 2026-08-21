"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { DeliveryComments } from "@/components/orders/delivery-comments";

interface DeliveryVideoSectionProps {
  deliveryId: string;
  fileName: string;
  fileUrl: string;
  versionNumber: number;
  createdAt: string;
  currentUserId: string;
  isVideo: boolean;
}

export function DeliveryVideoSection({
  deliveryId,
  fileName,
  fileUrl,
  versionNumber,
  createdAt,
  currentUserId,
  isVideo,
}: DeliveryVideoSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-neutral-50/50 rounded-2xl px-4 py-3.5 border border-neutral-200/50">
        <div className="min-w-0 mr-3">
          <p className="text-sm font-bold text-neutral-900 truncate">{fileName}</p>
          <p className="text-xs text-neutral-400 font-semibold mt-0.5">
            v{versionNumber} · {formatDateTime(createdAt)}
          </p>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-colors shadow-sm inline-flex items-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>
      {isVideo && (
        <div className="rounded-2xl overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            src={fileUrl}
            controls
            preload="metadata"
            className="w-full h-full"
          />
        </div>
      )}
      <DeliveryComments
        deliveryId={deliveryId}
        currentUserId={currentUserId}
        videoRef={isVideo ? videoRef : undefined}
      />
    </div>
  );
}
