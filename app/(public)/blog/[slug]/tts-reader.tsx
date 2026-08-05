"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TTSReader() {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1); // 1x, 1.25x, 1.5x
  const [index, setIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const elementsRef = useRef<Element[]>([]);
  const currentIndexRef = useRef<number>(0);

  // Initialize SpeechSynthesisUtterance and load DOM text nodes on demand
  const setupSpeech = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Query article contents (headings and paragraphs)
    const elements = Array.from(document.querySelectorAll("#article-content p, #article-content h2, #article-content h3"));
    elementsRef.current = elements;
    currentIndexRef.current = 0;
    setIndex(null);
  };

  useEffect(() => {
    setupSpeech();
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update active element highlighted class in the DOM
  useEffect(() => {
    elementsRef.current.forEach((el, idx) => {
      if (idx === index) {
        el.classList.add("bg-[#8B7FE8]/10", "border-l-4", "border-[#8B7FE8]", "pl-3", "py-1", "rounded-r-lg", "transition-all", "duration-300");
      } else {
        el.classList.remove("bg-[#8B7FE8]/10", "border-l-4", "border-[#8B7FE8]", "pl-3", "py-1", "rounded-r-lg");
      }
    });
  }, [index]);

  const speakCurrentElement = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const elements = elementsRef.current;
    const curIdx = currentIndexRef.current;

    if (curIdx >= elements.length) {
      // Finished speaking the article
      setPlaying(false);
      setIndex(null);
      currentIndexRef.current = 0;
      return;
    }

    const element = elements[curIdx];
    const text = element.textContent || "";
    setIndex(curIdx);

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.rate = rate;

    // Handle end of block
    utterance.onend = () => {
      currentIndexRef.current += 1;
      speakCurrentElement();
    };

    utterance.onerror = () => {
      setPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        // If we are starting from the beginning or a new rate was set, cancel and start speak loop
        window.speechSynthesis.cancel();
        speakCurrentElement();
      }
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (playing) {
      // Re-read current block with the new speed
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        speakCurrentElement();
      }
    }
  };

  const handleReset = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    currentIndexRef.current = 0;
    setIndex(null);
    setPlaying(false);
  };

  if (typeof window !== "undefined" && !window.speechSynthesis) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6">
      <div className="flex items-center gap-2 text-gray-500 mr-2">
        <Volume2 className="w-4 h-4 text-[#8B7FE8]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Listen</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className={cn(
            "p-2 rounded-xl transition-all",
            playing ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#8B7FE8] text-white hover:bg-[#7a6fd6]"
          )}
          title={playing ? "Pause reading" : "Listen to article"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={handleReset}
          className="p-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-all"
          title="Restart from beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <span className="h-5 w-px bg-gray-200 mx-1" />

      {/* Speed Controls */}
      <div className="flex items-center gap-1">
        {[1, 1.25, 1.5].map((r) => (
          <button
            key={r}
            onClick={() => handleRateChange(r)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
              rate === r
                ? "bg-[#8B7FE8]/10 text-[#8B7FE8] border-[#8B7FE8]/30"
                : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
            )}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}
