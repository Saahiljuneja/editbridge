# EditBridge Premium Design System Guidelines

This document defines the visual patterns, rules, and layout tokens of the premium travel-explorer/camper-van booking aesthetic used in EditBridge. All future page implementations (Dashboards, Feed, Portfolios) must adhere strictly to these principles.

---

## 🎨 1. Core Color Palette & Backdrop

*   **Page Background:** `#ffffff` (pure white) for a clean, high-contrast, minimalist design.
*   **Card & Form Containers:** `#ffffff` (pure white).
    *   **Autofill Override:** All autofilled inputs must be styled to match this pure white color (`-webkit-box-shadow: 0 0 0 1000px #ffffff inset !important; -webkit-text-fill-color: #171717 !important;`).
*   **Main Text Color:** `#000000` (pure black) for rich typography contrast.
*   **Action Elements:** `#000000` (solid black) with soft border contours.
*   **Backdrop Pattern:** Subtly overlay the light gray typographic contour lines backdrop across page wrappers using strokeColor `#f3f4f6`.

---

## ✍️ 2. Typography & Text Hierarchy

*   **Fonts Used:**
    *   **Rubik:** Used exclusively for heading elements.
    *   **DM Sans:** Used for description blocks, body text, and general interface labels.
    *   **Geist Mono:** Used for numeric displays, states, and technical badges.
*   **Heading Styles:**
    *   Headings must use `font-black tracking-tight leading-none` weights.
    *   Keep font sizes large and compact, avoiding raw browser defaults.

---

## 🎛️ 3. UI Component Tokens

### 3.1. Stacked Input Fields
*   **Wrapper Container:** Rounded corners (`rounded-[20px]`), border (`border border-neutral-200`), padding (`px-4 py-2.5`), background (`bg-[#ffffff]`).
*   **Top Label:** Small, uppercase, bold, muted gray label (`text-[10px] font-bold text-neutral-400 uppercase tracking-wider select-none`).
*   **Input Box:** Transparent background (`bg-transparent`), borderless outline, text height (`h-6`), size (`text-[14px] text-neutral-900`).

### 3.2. Capsule Tab Toggles
*   **Wrapper Container:** Rounded capsule (`rounded-3xl` / `rounded-full`), padded (`p-1`), light gray background (`bg-[#f3f4f6]`), thin border (`border border-neutral-200`).
*   **Tab Links:** Symmetrical inline links, active tabs styled with a black background (`bg-[#000000]`), white text (`text-[#ffffff]`), and subtle drop shadow (`shadow-md`). Inactive tabs are transparent with gray text.

### 3.3. Polaroid-Style Media Widgets
*   **Visual Structure:** A thick white frame wrapper (`bg-[#ffffff] rounded-2xl shadow-lg p-2`), housing a rounded thumbnail/video element.
*   **Overlapping Badges:** Small floating tag pills (e.g., location labels like "Pacific Rim National Park Reserve") styled with blur filters or white backdrops.
*   **Label Footer:** Captions rendered underneath in a clean font with a small emoji prefix (e.g., `🚐 2001 Ford Econoline 150`).

### 3.4. KPI Cards & Action Buttons
*   **KPI Widgets:** Framed in white cards with high rounded corners (`rounded-[24px]`) and translucent blue/purple drop shadows.
*   **Buttons:** Curved pills (`rounded-2xl` / `rounded-full`), solid black, height `52px`, using `shadow-[0_8px_24px_rgba(0,0,0,0.12)]` for depth.
