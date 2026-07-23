"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle, Camera, Heart, Briefcase, Mic, ShoppingBag, Music, Film, Sparkles, Home, Gamepad2, Plane, ImageIcon, Palette, Layers, GraduationCap, Laugh, Dumbbell, Shirt } from "lucide-react";
import { CATEGORY_PAGES, HOMEPAGE_FEATURED_SLUGS } from "@/lib/category-seo";

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  "youtube-video-editing":   PlayCircle,
  "instagram-reels":         Camera,
  "wedding-videography":     Heart,
  "corporate-video-editing": Briefcase,
  "podcast-video-editing":   Mic,
  "product-ads-commercials": ShoppingBag,
  "music-video-editing":     Music,
  "documentary-editing":     Film,
  "animated-explainer-videos": Sparkles,
  "real-estate-video-editing": Home,
  "gaming-streaming-editing":  Gamepad2,
  "travel-vlog-editing":     Plane,
  "thumbnail-design":        ImageIcon,
  "color-grading":           Palette,
  "motion-graphics":         Layers,
  "education-tutorial-editing": GraduationCap,
  "comedy-skits-editing":    Laugh,
  "sports-fitness-editing":  Dumbbell,
  "fashion-lifestyle-editing": Shirt,
};

export function CategoryBrowseSection() {
  const featured = HOMEPAGE_FEATURED_SLUGS
    .map((slug) => CATEGORY_PAGES.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <section className="bg-white py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-bold text-[#0EA5E9] uppercase tracking-widest mb-2">Browse by category</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Find an editor for<br className="hidden sm:block" /> exactly what you make
            </h2>
          </div>
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0EA5E9] hover:underline shrink-0"
          >
            All editors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {featured.map((cat, i) => {
            const Icon = CATEGORY_ICON_MAP[cat.slug] ?? Film;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.025, boxShadow: `0 20px 48px ${cat.accentColor}30` }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={`/editors/${cat.slug}`}
                  className="group relative rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 p-6 transition-all duration-200 overflow-hidden flex flex-col h-full"
                >
                  {/* Icon container */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110"
                    style={{ background: `${cat.accentColor}14`, border: `1px solid ${cat.accentColor}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cat.accentColor }} strokeWidth={1.5} />
                  </div>
                  <p className="font-bold text-gray-900 leading-snug mb-1">{cat.name}</p>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 pr-4 flex-1">
                    {cat.metaDescription.split(".")[0]}.
                  </p>
                  <span
                    className="inline-flex items-center gap-1 mt-4 text-xs font-semibold transition-colors"
                    style={{ color: cat.accentColor }}
                  >
                    View editors
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
