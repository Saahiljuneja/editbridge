// Category SEO landing pages — each entry targets a real search query
// ("wedding video editor india", "youtube video editor india", etc.) and maps
// to how editors actually tag themselves in this app, so the editor grid on
// each page is a real, filtered result — not a generic "all editors" list.
//
// matchField determines which real DB field is queried:
//   "niche"           -> editors.niche ILIKE any of matchKeywords (niche stores
//                         free text or a JSON array of NICHE_PRESETS strings —
//                         see profile-client.tsx)
//   "skill"           -> editor has a row in `skills` with name ILIKE any of
//                         matchKeywords (skills.name is free text editors add)
//   "packageCategory" -> editor has an active package with
//                         packages.video_category = matchKeywords[0] (the
//                         VIDEO_CATEGORIES value from package-builder-form.tsx)

export interface CategoryFaq {
  q: string;
  a: string;
}

export interface CategoryPage {
  slug: string;
  name: string; // short category name, e.g. "YouTube Video Editors"
  h1: string;
  metaTitle: string;
  metaDescription: string;
  heroDescription: string;
  icon: string;
  accentColor: string;
  matchField: "niche" | "skill" | "packageCategory";
  matchKeywords: string[];
  faqs: CategoryFaq[];
  relatedCategories: string[]; // slugs
}

export const CATEGORY_PAGES: CategoryPage[] = [
  {
    slug: "youtube-video-editing",
    name: "YouTube Video Editors",
    h1: "Hire YouTube Video Editors in India",
    metaTitle: "YouTube Video Editors in India — EditBridge",
    metaDescription:
      "Hire KYC-verified YouTube video editors in India. Retention-focused cuts, chapters, captions, and thumbnails. Packages from ₹2,000. Escrow-protected payments.",
    heroDescription:
      "YouTube editors who understand watch-time, pattern interrupts, and chapter markers — not just cutting clips together. Get videos ready to publish, not just ready to review.",
    icon: "🎬",
    accentColor: "#ef4444",
    matchField: "niche",
    matchKeywords: ["YouTube"],
    faqs: [
      { q: "How much does YouTube video editing cost in India?", a: "Most YouTube editing packages on EditBridge start around ₹2,000 for a single video, scaling with length, revisions, and add-ons like motion graphics or color grading. You can compare editor packages directly on their profiles before booking." },
      { q: "How long does a YouTube video take to edit?", a: "Typical turnaround is 2–5 days for a standard long-form video, though many editors offer 24–48 hour rush delivery for an extra fee. Delivery time is shown on every package before you order." },
      { q: "Do YouTube editors add captions, chapters, and end screens?", a: "Most editors on EditBridge include captions and chapter markers by default for long-form content — check the package description, since inclusions vary by editor." },
      { q: "What footage do I need to send?", a: "Send your raw clips, any B-roll, a reference video or two showing the style you like, and a short brief describing pacing and tone. Everything is uploaded directly through the order page." },
      { q: "Is payment protected if I'm not happy with the edit?", a: "Yes — every order is held in escrow until you approve the final delivery. If changes are needed, you can request a revision within your package's revision limit before releasing payment." },
      { q: "Can I see an editor's past YouTube work before hiring?", a: "Every editor profile has a portfolio section with sample edits and client reviews, so you can check their style and track record before placing an order." },
    ],
    relatedCategories: ["instagram-reels", "thumbnail-design", "color-grading"],
  },
  {
    slug: "instagram-reels",
    name: "Instagram Reels & Shorts Editors",
    h1: "Hire Instagram Reels & YouTube Shorts Editors",
    metaTitle: "Instagram Reels & Shorts Video Editors — EditBridge",
    metaDescription:
      "Hire short-form video editors for Instagram Reels and YouTube Shorts. Hook-driven cuts, trending pacing, 9:16 delivery. Fast 24-48 hour turnaround.",
    heroDescription:
      "Short-form editors who know how to hook a viewer in the first second and hold attention for the next thirty. Vertical, fast, and built for the algorithm.",
    icon: "📱",
    accentColor: "#a855f7",
    matchField: "niche",
    matchKeywords: ["Reels", "Shorts"],
    faqs: [
      { q: "What's the turnaround time for a Reel or Short?", a: "Most short-form edits are delivered within 24–48 hours. Many editors on EditBridge offer same-day delivery for an additional fee — check the package details." },
      { q: "What format and resolution do I get?", a: "Reels and Shorts are delivered in 9:16 vertical format at 1080×1920 by default. You can request other aspect ratios if your package includes them." },
      { q: "Can the editor suggest trending audio or effects?", a: "Editors can suggest trending audio and transition styles, but for licensing safety the final audio choice is usually confirmed with you before the video is exported." },
      { q: "How much does Reels editing cost?", a: "Short-form packages are typically the most affordable on EditBridge, often starting under ₹1,500 per video, with batch pricing available from many editors for multiple clips." },
      { q: "Can I get several Reels from one shoot?", a: "Yes — many editors offer batch packages that turn one raw footage session into multiple cut-down Reels or Shorts. Message the editor to confirm batch pricing." },
      { q: "Do I need to shoot vertically for the editor to use it?", a: "No — editors can reframe horizontal footage for vertical delivery, though shooting with some vertical headroom in mind gives better results." },
    ],
    relatedCategories: ["youtube-video-editing", "gaming-streaming-editing", "motion-graphics"],
  },
  {
    slug: "wedding-videography",
    name: "Wedding Video Editors",
    h1: "Hire Wedding & Event Video Editors in India",
    metaTitle: "Wedding Video Editors in India — EditBridge",
    metaDescription:
      "Hire experienced wedding and event video editors in India. Cinematic highlight reels, full ceremony cuts, and same-day edits. KYC-verified, escrow-protected.",
    heroDescription:
      "Wedding films are one shot — the footage never gets reshot. Our editors specialise in cinematic highlight reels and full-ceremony cuts that do justice to the day.",
    icon: "💍",
    accentColor: "#ec4899",
    matchField: "niche",
    matchKeywords: ["Wedding"],
    faqs: [
      { q: "How long does wedding video editing take?", a: "A cinematic highlight reel typically takes 5–10 days; a full ceremony edit with multiple events can take 2–3 weeks depending on footage volume. Exact delivery time is listed on each package." },
      { q: "Can editors handle multi-day, multi-event footage?", a: "Yes — many wedding editors on EditBridge regularly handle sangeet, haldi, mehendi, and reception footage from multiple cameras and stitch it into one coherent story." },
      { q: "Do you offer same-day edit (SDE) service?", a: "Some editors offer rush same-day edits for reception screening — filter by delivery time on the browse page or message editors directly to confirm same-day availability." },
      { q: "What music can be used in the final video?", a: "Editors typically use royalty-free or licensed music libraries to avoid copyright strikes on platforms like YouTube and Instagram. Discuss specific song requests with your editor before booking." },
      { q: "How much raw footage can I send?", a: "This varies by package — check the 'max raw footage' detail on each listing, since multi-camera wedding shoots can run into hundreds of GB. Editors usually accept transfers via Google Drive or similar." },
      { q: "Is my footage kept private?", a: "Yes — footage and deliveries are only accessible to you and the assigned editor through the order page, and files are stored securely." },
    ],
    relatedCategories: ["corporate-video-editing", "documentary-editing", "color-grading"],
  },
  {
    slug: "corporate-video-editing",
    name: "Corporate & Brand Video Editors",
    h1: "Hire Corporate & Brand Video Editors",
    metaTitle: "Corporate & Brand Video Editors in India — EditBridge",
    metaDescription:
      "Hire professional corporate video editors for brand films, training videos, and company promos. Polished, on-brand edits with fast turnaround.",
    heroDescription:
      "Brand and corporate videos need to look polished on the first watch — no room for jump cuts or rough transitions. Our editors deliver clean, on-brand cuts every time.",
    icon: "🏢",
    accentColor: "#3b82f6",
    matchField: "niche",
    matchKeywords: ["Corporate"],
    faqs: [
      { q: "What kind of corporate videos can editors handle?", a: "Brand promos, company culture videos, training and onboarding content, investor pitch videos, and internal communications are all common projects for corporate editors on EditBridge." },
      { q: "Can editors match our brand's colours and fonts?", a: "Yes — share your brand kit (logo, colour codes, fonts) in the order brief and the editor will apply it consistently across lower-thirds, titles, and graphics." },
      { q: "How long does a corporate video edit take?", a: "Typical turnaround is 3–7 business days depending on length and the amount of graphics/animation involved. Check individual package delivery times before ordering." },
      { q: "Do editors add subtitles for accessibility?", a: "Most corporate editors include subtitle/caption options — useful for LinkedIn and internal training portals where videos are often watched on mute." },
      { q: "Can we request multiple rounds of stakeholder feedback?", a: "Each package specifies a revision count. If you expect several internal review rounds, look for packages with higher revision limits or message the editor to discuss an add-on." },
      { q: "Is there a minimum project size?", a: "No fixed minimum — editors offer packages ranging from short internal clips to multi-video corporate campaigns. Compare packages by price and scope on the editor's profile." },
    ],
    relatedCategories: ["product-ads-commercials", "animated-explainer-videos", "motion-graphics"],
  },
  {
    slug: "podcast-video-editing",
    name: "Podcast Editors",
    h1: "Hire Podcast Editors in India",
    metaTitle: "Podcast Video & Audio Editors in India — EditBridge",
    metaDescription:
      "Hire podcast editors for audio cleanup, video podcast formatting, and chapter markers. Noise removal and multi-cam editing included.",
    heroDescription:
      "From raw multi-mic recordings to a polished video podcast with chapters and captions — our editors handle the cleanup so you can focus on the conversation.",
    icon: "🎙️",
    accentColor: "#3b82f6",
    matchField: "niche",
    matchKeywords: ["Podcast"],
    faqs: [
      { q: "What audio issues can editors fix?", a: "Noise removal, de-essing, level normalisation, and cross-talk cleanup are standard in most podcast packages on EditBridge." },
      { q: "Can editors turn our audio podcast into a video podcast?", a: "Yes — many podcast editors format audio-only recordings into video podcasts with waveforms, captions, and B-roll, suitable for YouTube." },
      { q: "How do you handle multi-camera or multi-guest recordings?", a: "Editors sync multiple camera angles and mic feeds, then cut between speakers — mention your recording setup (number of cameras, mics) in the order brief." },
      { q: "What file formats can I send?", a: "Editors accept common audio and video formats — MP3, WAV, MP4, MOV — usually shared via Google Drive or WeTransfer link in the order." },
      { q: "Do editors add chapter markers and timestamps?", a: "Yes, chapter markers and timestamps for YouTube descriptions are commonly included — confirm inclusion on the specific package before ordering." },
      { q: "Can I get show notes or a transcript too?", a: "Some editors offer show notes and AI-assisted transcripts as an add-on. Check the package extras or message the editor to ask." },
    ],
    relatedCategories: ["youtube-video-editing", "corporate-video-editing", "documentary-editing"],
  },
  {
    slug: "product-ads-commercials",
    name: "Product Ad & Commercial Editors",
    h1: "Hire Product Ad & Commercial Video Editors",
    metaTitle: "Product Ads & Commercial Video Editors — EditBridge",
    metaDescription:
      "Hire editors for product ads, e-commerce videos, and commercials. Punchy cuts built to convert, with fast delivery for launch deadlines.",
    heroDescription:
      "Product ads and commercials live or die in the first three seconds. Our editors build punchy, conversion-focused cuts for e-commerce, D2C, and paid campaigns.",
    icon: "🛍️",
    accentColor: "#f97316",
    matchField: "niche",
    matchKeywords: ["Product Ads"],
    faqs: [
      { q: "What kind of product videos can editors make?", a: "Unboxing videos, feature walkthroughs, e-commerce listing videos, and paid ad creatives for platforms like Meta and Google are all common projects." },
      { q: "How fast can I get a commercial edited before a launch?", a: "Many editors offer 2–3 day turnaround for short commercial cuts, with rush options for tighter launch deadlines — check delivery time per package." },
      { q: "Can editors create multiple ad variants for A/B testing?", a: "Yes, several editors offer multi-variant packages (different hooks, lengths, or CTAs from the same footage) for ad testing. Message the editor to confirm before ordering." },
      { q: "Do you add on-screen text and pricing overlays?", a: "Text overlays, pricing call-outs, and CTA graphics are standard for e-commerce and ad-focused edits — specify what you need in the brief." },
      { q: "What aspect ratios do I get for social ad platforms?", a: "Editors can deliver in square (1:1), vertical (9:16), and horizontal (16:9) depending on where the ad will run — mention your target platforms upfront." },
      { q: "Can the editor work from a product photoshoot instead of video?", a: "Some editors combine still product photography with motion graphics to create video ads even without video footage — check the editor's portfolio for this style." },
    ],
    relatedCategories: ["corporate-video-editing", "motion-graphics", "animated-explainer-videos"],
  },
  {
    slug: "music-video-editing",
    name: "Music Video Editors",
    h1: "Hire Music Video Editors in India",
    metaTitle: "Music Video Editors in India — EditBridge",
    metaDescription:
      "Hire music video editors for artist MVs, lyric videos, and audio visualisers. Beat-synced cuts and creative color grading.",
    heroDescription:
      "Music video editing is about rhythm — cuts synced to the beat, colour that matches the mood, and pacing that keeps the energy up from first frame to last.",
    icon: "🎵",
    accentColor: "#8b5cf6",
    matchField: "niche",
    matchKeywords: ["Music"],
    faqs: [
      { q: "Can editors sync cuts to the beat of the track?", a: "Yes, beat-synced editing is a core skill for music video editors on EditBridge — share the final audio track early so cuts can be timed precisely." },
      { q: "Do editors create lyric videos too?", a: "Many music video editors also offer lyric video and audio visualiser packages, which are typically faster and cheaper than a full narrative music video." },
      { q: "How long does a music video edit take?", a: "A lyric video can be done in 2–4 days; a full narrative music video with color grading and effects usually takes 1–2 weeks depending on complexity." },
      { q: "Can the editor add visual effects or color grading?", a: "Yes — many music video packages include creative color grading, and some editors offer VFX add-ons like light leaks, glitch effects, or double exposure." },
      { q: "What footage should I send for a music video?", a: "Multiple camera angles, performance takes, and any B-roll or narrative scenes, along with the final mastered audio track for syncing." },
      { q: "Can I get a preview cut before the full edit?", a: "Some editors offer a rough-cut preview for approval before final grading and effects — ask the editor about this option before placing a large order." },
    ],
    relatedCategories: ["color-grading", "motion-graphics", "documentary-editing"],
  },
  {
    slug: "documentary-editing",
    name: "Documentary & Short Film Editors",
    h1: "Hire Documentary & Short Film Editors",
    metaTitle: "Documentary & Short Film Editors in India — EditBridge",
    metaDescription:
      "Hire documentary and short film editors for narrative structure, interview cutting, and long-form storytelling.",
    heroDescription:
      "Documentaries and short films are built in the edit — finding the story inside hours of footage. Our editors specialise in narrative structure and pacing.",
    icon: "🎥",
    accentColor: "#6366f1",
    matchField: "niche",
    matchKeywords: ["Documentary"],
    faqs: [
      { q: "How much footage can editors handle for a documentary?", a: "Documentary editors are used to working with large volumes of raw footage and interviews — mention your approximate footage volume in the brief so the editor can scope the project accurately." },
      { q: "How long does a documentary or short film edit take?", a: "Timelines vary widely by length and footage volume — short films (5–15 min) often take 1–2 weeks, while feature-length documentaries can take a month or more." },
      { q: "Can editors help structure the story, not just cut clips?", a: "Yes — many documentary editors contribute to narrative structure and pacing decisions, not just technical cutting. Discuss your rough story arc with the editor upfront." },
      { q: "Do editors handle interview syncing and multi-camera cuts?", a: "Multi-camera interview syncing, jump-cut cleanup, and B-roll integration are all standard parts of documentary editing on EditBridge." },
      { q: "Can editors add lower-thirds for interview subjects?", a: "Yes, name/title lower-thirds for interview subjects are commonly included — specify the styling you want in your brief." },
      { q: "What if the story changes during editing?", a: "Revisions are built into every package. If the edit needs a structural change mid-project, discuss it with your editor — larger scope changes may need a package upgrade." },
    ],
    relatedCategories: ["wedding-videography", "color-grading", "podcast-video-editing"],
  },
  {
    slug: "animated-explainer-videos",
    name: "Animated Explainer Video Editors",
    h1: "Hire Animated Explainer Video Creators",
    metaTitle: "Animated Explainer Video Editors — EditBridge",
    metaDescription:
      "Hire animators for 2D explainer videos, onboarding animations, and product walkthroughs. Clear, engaging motion design.",
    heroDescription:
      "Explainer videos turn a complex product or idea into something a viewer understands in 60 seconds. Our animators specialise in clean, engaging motion design.",
    icon: "🧩",
    accentColor: "#10b981",
    matchField: "niche",
    matchKeywords: ["Explainer", "Animated"],
    faqs: [
      { q: "What software do explainer video editors use?", a: "Most animators work in Adobe After Effects, with some using Cinema 4D or Blender for 3D elements. Ask an editor about their toolset if you have a specific style in mind." },
      { q: "How long does an explainer video take to produce?", a: "A simple 60–90 second explainer typically takes 1–2 weeks including script-to-storyboard alignment; more complex animations take longer." },
      { q: "Do I need a script and storyboard ready?", a: "A script helps a lot, but many editors can help refine or restructure it for pacing. A storyboard isn't required — some animators will draft one as part of the package." },
      { q: "Can the animator use my brand's illustration style?", a: "Yes — share brand guidelines, existing illustrations, or reference videos, and the animator will match colours, character style, and typography." },
      { q: "Do I get source files (AEP) at the end?", a: "Source file delivery depends on the package — check the listing for an AEP/source file add-on if you need to make future edits in-house." },
      { q: "Can you add voiceover to the animation?", a: "Some editors offer voiceover recording or syncing as an add-on; otherwise you can supply your own voiceover track for the animator to sync to." },
    ],
    relatedCategories: ["motion-graphics", "corporate-video-editing", "product-ads-commercials"],
  },
  {
    slug: "real-estate-video-editing",
    name: "Real Estate Video Editors",
    h1: "Hire Real Estate Video Editors",
    metaTitle: "Real Estate Video Editors in India — EditBridge",
    metaDescription:
      "Hire editors for property walkthrough videos, listing videos, and agent promos. Clean, professional real estate video editing.",
    heroDescription:
      "Property walkthroughs and listing videos need to feel spacious, bright, and professional — our editors know how to make a property's best features stand out.",
    icon: "🏠",
    accentColor: "#1e40af",
    matchField: "niche",
    matchKeywords: ["Real Estate"],
    faqs: [
      { q: "What kind of real estate videos can editors produce?", a: "Property walkthroughs, drone footage integration, agent introduction videos, and listing videos for platforms like YouTube or property portals." },
      { q: "How long does a property video take to edit?", a: "Most listing walkthroughs are delivered in 2–4 days. Multi-property or agency showcase reels may take longer depending on volume." },
      { q: "Can editors combine drone and handheld footage?", a: "Yes — combining drone exterior shots with handheld interior walkthroughs into one smooth video is a common request for real estate editors." },
      { q: "Do editors add property details as on-screen text?", a: "Yes, price, square footage, location, and contact details can be added as text overlays — provide the details in your brief." },
      { q: "Can you add background music suited for real estate videos?", a: "Editors typically use calm, professional royalty-free music tracks suited to walkthrough videos — you can request a specific mood or genre." },
      { q: "Do you offer branded intros/outros for real estate agencies?", a: "Many editors can build a reusable branded intro/outro with your agency logo, which can be reused across future listing videos for a consistent lower cost." },
    ],
    relatedCategories: ["corporate-video-editing", "color-grading", "motion-graphics"],
  },
  {
    slug: "gaming-streaming-editing",
    name: "Gaming & Streaming Video Editors",
    h1: "Hire Gaming & Streaming Content Editors",
    metaTitle: "Gaming & Streaming Video Editors — EditBridge",
    metaDescription:
      "Hire editors for gaming highlights, stream recaps, and montage videos. Fast-paced cuts with overlays and sound effects.",
    heroDescription:
      "Gaming content editing is about pace and reaction — highlight reels, stream recaps, and montages that keep viewers hooked clip after clip.",
    icon: "🎮",
    accentColor: "#22c55e",
    matchField: "niche",
    matchKeywords: ["Gaming"],
    faqs: [
      { q: "What kind of gaming content do editors work on?", a: "Highlight reels, stream VOD recaps, montages, and 'best moments' compilations for YouTube, Twitch, and short-form platforms." },
      { q: "How fast can I get a stream recap edited?", a: "Recap edits are usually fast-turnaround work — many editors deliver within 24–48 hours so recaps stay relevant while the stream is fresh." },
      { q: "Can editors add sound effects and reaction cams?", a: "Yes — sound effect stingers, webcam reaction overlays, and kill-cam style replays are common in gaming edits. Mention what you want in the brief." },
      { q: "Do you handle long stream VODs?", a: "Editors are used to scrubbing through multi-hour VODs to find highlight-worthy moments — mention approximate VOD length so the editor can price accordingly." },
      { q: "Can editors add game-specific overlays or HUD elements?", a: "Some editors offer custom overlay graphics matching a specific game's aesthetic — check the editor's portfolio for relevant game titles they've worked with." },
      { q: "What output format works best for gaming clips?", a: "Editors deliver in whatever format your target platform needs — 16:9 for YouTube, 9:16 for Shorts/Reels/TikTok, or both if your package includes multi-format delivery." },
    ],
    relatedCategories: ["instagram-reels", "youtube-video-editing", "motion-graphics"],
  },
  {
    slug: "travel-vlog-editing",
    name: "Travel & Lifestyle Vlog Editors",
    h1: "Hire Travel & Lifestyle Vlog Editors",
    metaTitle: "Travel & Lifestyle Vlog Editors in India — EditBridge",
    metaDescription:
      "Hire editors for travel vlogs, day-in-the-life content, and lifestyle videos. Cinematic pacing and color grading for travel footage.",
    heroDescription:
      "Travel and lifestyle vlogs live or die on pacing and mood. Our editors turn hours of raw travel footage into a story worth watching to the end.",
    icon: "✈️",
    accentColor: "#06b6d4",
    matchField: "niche",
    matchKeywords: ["Travel", "Lifestyle Vlog"],
    faqs: [
      { q: "How much footage do travel vloggers usually send?", a: "Travel shoots often generate hours of footage across multiple days — mention your approximate footage volume so the editor can scope timeline and price accordingly." },
      { q: "How long does a travel vlog edit take?", a: "A standard 8–15 minute vlog typically takes 3–7 days depending on footage volume and how much color grading or graphics are involved." },
      { q: "Can editors add maps or location graphics?", a: "Yes — animated map graphics showing travel routes are a popular addition for travel vlogs. Mention it in your brief if you'd like one included." },
      { q: "Do editors handle drone and action camera footage?", a: "Most travel vlog editors are comfortable working with drone, GoPro, and action camera footage alongside standard camera clips." },
      { q: "Can the editor apply a consistent cinematic color grade?", a: "Yes, cinematic colour grading tailored to travel content (warm tones, teal-orange looks, etc.) is a common part of these packages." },
      { q: "What music works for travel vlogs?", a: "Editors typically use upbeat, royalty-free music libraries suited for travel content, avoiding tracks that would trigger copyright claims on YouTube." },
    ],
    relatedCategories: ["youtube-video-editing", "color-grading", "documentary-editing"],
  },
  {
    slug: "thumbnail-design",
    name: "YouTube Thumbnail Designers",
    h1: "Hire YouTube Thumbnail Designers",
    metaTitle: "YouTube Thumbnail Designers in India — EditBridge",
    metaDescription:
      "Hire thumbnail designers who create high-CTR YouTube thumbnails. Fast turnaround, multiple revisions, PSD source files available.",
    heroDescription:
      "A great thumbnail can double your click-through rate. Our designers understand colour psychology, facial expressions, and text hierarchy that gets clicks.",
    icon: "🖼️",
    accentColor: "#eab308",
    matchField: "skill",
    matchKeywords: ["Thumbnail"],
    faqs: [
      { q: "How many revisions are included in a thumbnail package?", a: "Most thumbnail packages include 2–3 revision rounds — check the specific package for the exact count before ordering." },
      { q: "What resolution are thumbnails delivered in?", a: "Standard delivery is 1280×720 PNG, YouTube's recommended thumbnail size. Some designers also provide the PSD source file as an add-on." },
      { q: "Can I see before/after examples of a designer's work?", a: "Every editor profile has a portfolio tab with sample thumbnails, so you can judge style and CTR-focused design before placing an order." },
      { q: "Do designers need a photo of my face for the thumbnail?", a: "For face-based, reaction-style thumbnails, yes — send a clear photo via the order chat. Stock-style or text-based thumbnails can be made without one." },
      { q: "How fast can I get a thumbnail?", a: "Most thumbnail designers deliver within 24–48 hours, making this one of the fastest categories on EditBridge — useful for time-sensitive uploads." },
      { q: "Can a designer make a batch of thumbnails in a consistent style?", a: "Yes — many designers offer batch packages for channels wanting a consistent thumbnail template across multiple videos." },
    ],
    relatedCategories: ["youtube-video-editing", "color-grading", "motion-graphics"],
  },
  {
    slug: "color-grading",
    name: "Video Color Grading Experts",
    h1: "Hire Video Color Grading Experts",
    metaTitle: "Video Color Grading Services in India — EditBridge",
    metaDescription:
      "Hire professional colorists for cinematic color grading, LUT creation, and color correction. Working in DaVinci Resolve and Premiere Pro.",
    heroDescription:
      "Colour grading is the difference between footage that looks 'fine' and footage that looks cinematic. Our colorists work in DaVinci Resolve and Premiere Pro.",
    icon: "🎨",
    accentColor: "#f97316",
    matchField: "skill",
    matchKeywords: ["Color Grading", "Colour Grading"],
    faqs: [
      { q: "What's the difference between colour correction and colour grading?", a: "Colour correction fixes technical issues like exposure and white balance. Grading is the creative step that gives footage a distinct, intentional look." },
      { q: "Do colorists deliver a custom LUT file?", a: "Many colorists include a custom .cube LUT with delivery, so you can apply the same look to future footage yourself." },
      { q: "What footage formats and codecs are supported?", a: "Most colorists work with H.264, H.265, ProRes, and camera RAW formats — mention your camera model in the brief so they can plan the right workflow." },
      { q: "Can I see a sample grade before the full project?", a: "Yes, most colorists offer a short sample grade (usually around a minute) for approval before processing the full timeline." },
      { q: "How long does color grading take?", a: "A short-form video can be graded in 1–3 days; longer projects with multiple scenes and lighting conditions may take a week or more." },
      { q: "Do I need to shoot in log or flat profile for the best results?", a: "It helps — log/flat footage gives colorists more room to grade, but experienced colorists can also work with standard footage." },
    ],
    relatedCategories: ["wedding-videography", "music-video-editing", "travel-vlog-editing"],
  },
  {
    slug: "motion-graphics",
    name: "Motion Graphics Artists",
    h1: "Hire Motion Graphics Artists",
    metaTitle: "Motion Graphics Artists in India — EditBridge",
    metaDescription:
      "Hire motion graphics artists for logo animations, kinetic typography, and animated intros. After Effects and Cinema 4D specialists.",
    heroDescription:
      "From animated logos to kinetic typography and branded intros — our motion graphics artists bring static brand assets to life using After Effects and Cinema 4D.",
    icon: "✨",
    accentColor: "#10b981",
    matchField: "skill",
    matchKeywords: ["Motion Graphics"],
    faqs: [
      { q: "What software do motion graphics artists use?", a: "Primarily Adobe After Effects and Premiere Pro, with some artists also using Cinema 4D for 3D elements or DaVinci Resolve's Fusion page." },
      { q: "How long does a logo animation take?", a: "Simple logo animations are usually delivered in 2–3 days. More complex animated sequences or explainer-style motion graphics may take 5–10 days." },
      { q: "Do I get the After Effects source file?", a: "Source file delivery depends on the package — most artists offer an AEP source file as an add-on if you need to edit it in-house later." },
      { q: "Can motion graphics artists match my brand kit?", a: "Yes — share your logo, brand colours, and fonts in the brief and the artist will apply them consistently across all animated elements." },
      { q: "What's used for lower-thirds and title animations?", a: "Motion graphics artists commonly build reusable lower-third and title templates that can be reused across a whole video series for consistency." },
      { q: "Can they add motion graphics to my existing edited video?", a: "Yes — many artists work directly with an already-edited video, adding titles, callouts, and animated elements on top without needing the raw footage." },
    ],
    relatedCategories: ["animated-explainer-videos", "product-ads-commercials", "corporate-video-editing"],
  },
  {
    slug: "education-tutorial-editing",
    name: "Educational & Tutorial Video Editors",
    h1: "Hire Educational & Tutorial Video Editors",
    metaTitle: "Educational & Course Video Editors — EditBridge",
    metaDescription:
      "Hire editors for online courses, tutorials, and how-to videos. Clear pacing, screen recording cleanup, and callout graphics.",
    heroDescription:
      "Course and tutorial videos need clarity above all — clean pacing, legible on-screen text, and edits that never leave a learner confused about what to do next.",
    icon: "📚",
    accentColor: "#1e3a8a",
    matchField: "packageCategory",
    matchKeywords: ["education"],
    faqs: [
      { q: "Can editors clean up screen recordings?", a: "Yes — trimming dead air, fixing mouse-cursor jitter, and adding zoom-ins on key screen areas are common requests for tutorial and course editors." },
      { q: "Do editors add captions for accessibility?", a: "Most course and tutorial editors include captions by default, which also helps with learners who watch on mute or need accessibility support." },
      { q: "How long does an online course video take to edit?", a: "A single tutorial video (5–15 min) is typically delivered in 2–5 days. Multi-module course edits are priced and scheduled per module — discuss volume with the editor." },
      { q: "Can editors add callout graphics and step numbers?", a: "Yes, numbered step call-outs, arrows, and highlight boxes on screen recordings are standard additions for instructional content." },
      { q: "Do you edit webinar or recorded lecture footage?", a: "Yes — trimming long lecture or webinar recordings into a clean, watchable module is a common project for these editors." },
      { q: "Can editors combine slides with talking-head footage?", a: "Yes, picture-in-picture layouts combining presentation slides with a talking-head webcam feed are commonly requested for course content." },
    ],
    relatedCategories: ["corporate-video-editing", "animated-explainer-videos", "podcast-video-editing"],
  },
  {
    slug: "comedy-skits-editing",
    name: "Comedy & Skit Video Editors",
    h1: "Hire Comedy & Skit Video Editors",
    metaTitle: "Comedy & Skit Video Editors in India — EditBridge",
    metaDescription:
      "Hire editors for comedy skits, meme edits, and parody videos. Sharp comedic timing and punchy cuts for social platforms.",
    heroDescription:
      "Comedy lives and dies on timing. Our editors know how to cut for the punchline, not just the footage — sharp, punchy edits built for social sharing.",
    icon: "😂",
    accentColor: "#f59e0b",
    matchField: "packageCategory",
    matchKeywords: ["comedy"],
    faqs: [
      { q: "What makes comedy editing different from regular editing?", a: "Comedy editing is about precise timing — trimming beats before and after a punchline, adding sound-effect stings, and pacing cuts for maximum laughs." },
      { q: "Can editors add meme-style text and effects?", a: "Yes, meme-style captions, zoom punches, and sound effect stings are common in skit and comedy editing on EditBridge." },
      { q: "How fast can a comedy skit be edited?", a: "Most skits are short-form and quick to turn around — typically 24–72 hours depending on footage length and effects needed." },
      { q: "Do editors add subtitles for comedic timing?", a: "Yes — many editors add styled captions that reinforce jokes visually, which also boosts engagement on platforms like Instagram and YouTube Shorts." },
      { q: "Can multiple takes be combined into one skit?", a: "Yes, editors regularly combine the best takes from multiple recordings into a single tight, well-paced skit." },
      { q: "What formats do comedy editors deliver in?", a: "Vertical 9:16 for Reels/Shorts or horizontal 16:9 for YouTube — specify your target platform and the editor will deliver accordingly." },
    ],
    relatedCategories: ["instagram-reels", "gaming-streaming-editing", "youtube-video-editing"],
  },
  {
    slug: "sports-fitness-editing",
    name: "Sports & Fitness Video Editors",
    h1: "Hire Sports & Fitness Video Editors",
    metaTitle: "Sports & Fitness Video Editors in India — EditBridge",
    metaDescription:
      "Hire editors for workout videos, sports highlights, and fitness content. Dynamic cuts synced to energy and pacing.",
    heroDescription:
      "Sports and fitness content needs energy — cuts that match the intensity of a workout or the drama of a match-winning moment.",
    icon: "🏋️",
    accentColor: "#dc2626",
    matchField: "packageCategory",
    matchKeywords: ["sports"],
    faqs: [
      { q: "What kind of sports and fitness videos do editors handle?", a: "Workout program videos, gym reels, sports highlight reels, and match recap videos are all common projects in this category." },
      { q: "Can editors sync cuts to workout tempo or music beat?", a: "Yes — fitness content editors often sync cuts to a track's beat to match workout intensity and keep energy high throughout." },
      { q: "Do you add rep counters or timer overlays?", a: "Yes, on-screen rep counts, timers, and exercise name call-outs are common additions for workout program videos." },
      { q: "How fast can a sports highlight reel be turned around?", a: "Highlight reels are typically fast-turnaround, often 24–48 hours, so content stays relevant right after a match or event." },
      { q: "Can editors combine slow-motion replays with regular footage?", a: "Yes, slow-motion highlight moments mixed with standard-speed footage is a common editing style for sports content." },
      { q: "What music works for fitness content?", a: "High-energy, royalty-free tracks are typically used — you can request a specific genre or tempo range to match your brand." },
    ],
    relatedCategories: ["gaming-streaming-editing", "instagram-reels", "motion-graphics"],
  },
  {
    slug: "fashion-lifestyle-editing",
    name: "Fashion & Lifestyle Video Editors",
    h1: "Hire Fashion & Lifestyle Video Editors",
    metaTitle: "Fashion & Lifestyle Video Editors in India — EditBridge",
    metaDescription:
      "Hire editors for lookbooks, haul videos, and lifestyle & beauty content. Stylish pacing and colour treatment for fashion brands and creators.",
    heroDescription:
      "Fashion and lifestyle content needs a stylish eye — pacing, transitions, and colour treatment that feel as polished as the outfits and products on screen.",
    icon: "👗",
    accentColor: "#db2777",
    matchField: "packageCategory",
    matchKeywords: ["fashion"],
    faqs: [
      { q: "What kind of fashion content do editors work on?", a: "Lookbooks, haul videos, get-ready-with-me content, and brand lifestyle campaigns are all common projects for editors in this category." },
      { q: "Can editors apply a specific aesthetic or colour palette?", a: "Yes — share reference videos or a mood board, and the editor will match pacing, transitions, and colour treatment to that aesthetic." },
      { q: "How long does a lookbook or haul video take?", a: "Most fashion and lifestyle edits are delivered in 2–5 days depending on length and the number of outfit or product segments." },
      { q: "Do editors add product tags or on-screen labels?", a: "Yes, on-screen product names, prices, or links can be added as text overlays — provide the details you want displayed in your brief." },
      { q: "Can editors work with vertical Reels-style fashion content?", a: "Yes — many editors deliver both horizontal YouTube-style lookbooks and vertical Reels/TikTok-style fashion clips from the same shoot." },
      { q: "What music fits fashion and lifestyle content?", a: "Editors typically use trendy, upbeat royalty-free tracks suited to fashion content — you can request a specific mood or reference track style." },
    ],
    relatedCategories: ["instagram-reels", "color-grading", "travel-vlog-editing"],
  },
];

export function getCategoryBySlug(slug: string): CategoryPage | undefined {
  return CATEGORY_PAGES.find((c) => c.slug === slug);
}

// Curated for the homepage "Browse by category" section — highest search-volume,
// broadest-appeal categories first.
export const HOMEPAGE_FEATURED_SLUGS = [
  "youtube-video-editing",
  "instagram-reels",
  "wedding-videography",
  "thumbnail-design",
  "corporate-video-editing",
  "podcast-video-editing",
];
