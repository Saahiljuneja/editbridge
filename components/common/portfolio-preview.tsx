"use client";

import { useState, useEffect } from "react";
import { PlayCircle } from "lucide-react";
import { getYouTubeId, getVimeoId, getVideoSource, getThumbnailUrl } from "@/lib/portfolio-media";

interface PortfolioPreviewProps {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  altText: string;
}

export function PortfolioPreview({ videoUrl, thumbnailUrl, altText }: PortfolioPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      setShouldPlay(false);
      return;
    }

    // Add a slight delay (250ms) to avoid triggering embeds on fast scroll/cursor swipes
    const timer = setTimeout(() => {
      setShouldPlay(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [isHovered]);

  // Determine active thumbnail (either user-uploaded or YouTube derived)
  const ytThumbnail = videoUrl ? getThumbnailUrl(videoUrl) : null;
  const activeThumbnail = thumbnailUrl || ytThumbnail;

  // If there is no video URL, just render the static cover image
  if (!videoUrl) {
    return (
      <div className="w-full h-full relative">
        {activeThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeThumbnail}
            alt={altText}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-300">
            <PlayCircle className="w-8 h-8 stroke-[1.25] mb-1.5" />
            <span className="text-[10px] font-medium tracking-wide uppercase">Portfolio Preview</span>
          </div>
        )}
      </div>
    );
  }

  const source = getVideoSource(videoUrl);
  const ytId = getYouTubeId(videoUrl);
  const vimeoId = getVimeoId(videoUrl);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background static cover image or video first frame */}
      {!shouldPlay && (
        <div className="absolute inset-0 w-full h-full bg-neutral-100">
          {activeThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeThumbnail}
              alt={altText}
              className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105"
            />
          ) : source === "direct" && videoUrl ? (
            <video
              src={videoUrl}
              preload="metadata"
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-300">
              <PlayCircle className="w-8 h-8 stroke-[1.25] mb-1.5" />
              <span className="text-[10px] font-medium tracking-wide uppercase">Portfolio Preview</span>
            </div>
          )}
        </div>
      )}

      {/* Placeholder with play icon when not hovered / before delay */}
      {!shouldPlay && (
        <div className="absolute inset-0 bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <PlayCircle className="w-5 h-5 text-black fill-black/10" />
          </div>
        </div>
      )}

      {/* Dynamic Hover Preview */}
      {shouldPlay && (
        <div className="absolute inset-0 w-full h-full bg-black">
          {source === "youtube" && ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&playsinline=1&showinfo=0&rel=0&iv_load_policy=3`}
              title={altText}
              className="w-[100%] h-[100%] absolute top-0 left-0 border-0 pointer-events-none scale-[1.35] object-cover"
              allow="autoplay; encrypted-media"
            />
          ) : source === "vimeo" && vimeoId ? (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&background=1&muted=1&byline=0&title=0&portrait=0`}
              title={altText}
              className="w-[100%] h-[100%] absolute top-0 left-0 border-0 pointer-events-none scale-[1.35] object-cover"
              allow="autoplay; encrypted-media"
            />
          ) : source === "direct" ? (
            <video
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            // Fallback back to thumbnail if type is unsupported or Google Drive
            thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={altText}
                className="w-full h-full object-cover"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
