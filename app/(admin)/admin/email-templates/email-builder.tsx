"use client";

import { useState, useEffect } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Trash2, Copy, Plus,
  Type, Heading1, Image, Minus, AlignLeft, AlignCenter,
  AlignRight, List, LayoutTemplate, Columns,
  MousePointer, MoveVertical, Code, Eye, Send, Download,
  FolderOpen, ChevronDown, X, Sparkles, Monitor, Smartphone,
  ChevronRight, Layers, PanelTop, PanelBottom, Pencil,
} from "lucide-react";
import { EMAIL_LAYOUT_DEFAULTS, type EmailLayoutOptions } from "@/lib/email-layout";
import { wrapEmailHtml } from "@/lib/email-layout";
import { SECTIONS } from "./config";
import { toast } from "sonner";

// ─── Block types ──────────────────────────────────────────────────────────────

export type BlockType =
  | "hero" | "heading" | "text" | "button" | "image"
  | "divider" | "spacer" | "list" | "columns" | "html";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, string | string[] | boolean | number>;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── HTML / text → blocks parser ─────────────────────────────────────────────

export function parseToBlocks(content: string): Block[] {
  if (!content.trim()) return [];

  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    // Plain text: each double-newline-separated paragraph becomes a text block
    const paras = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    return paras.map(para => ({
      id: uid(),
      type: "text" as BlockType,
      props: { ...DEFAULTS_TEXT, html: para },
    }));
  }

  // HTML: parse DOM and walk top-level nodes
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="root">${content}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return [{ id: uid(), type: "html", props: { code: content } }];

  const blocks: Block[] = [];

  for (const node of Array.from(root.children)) {
    // Blocks saved by the builder carry metadata — reconstruct them exactly
    const el = node as HTMLElement;
    if (el.dataset.blockType) {
      try {
        const type = el.dataset.blockType as BlockType;
        const props = JSON.parse(decodeURIComponent(el.dataset.blockProps ?? "{}"));
        blocks.push({ id: uid(), type, props });
        continue;
      } catch { /* fall through to generic parser */ }
    }

    const tag = node.tagName.toLowerCase();
    const text = node.textContent?.trim() ?? "";
    const html = node.innerHTML?.trim() ?? "";
    const style = (node as HTMLElement).style;

    // Heading
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      blocks.push({ id: uid(), type: "heading", props: {
        text,
        level: tag,
        color: style.color || "#0f172a",
        align: (style.textAlign as string) || "left",
        size: tag === "h1" ? "32" : tag === "h2" ? "24" : "18",
        weight: "700",
      }});
      continue;
    }

    // <hr> → divider
    if (tag === "hr") {
      blocks.push({ id: uid(), type: "divider", props: { ...DEFAULTS.divider } });
      continue;
    }

    // <img> or <p> containing only an img
    if (tag === "img") {
      const el = node as HTMLImageElement;
      blocks.push({ id: uid(), type: "image", props: {
        src: el.src || el.getAttribute("src") || "",
        alt: el.alt || "",
        width: "100",
        align: "center",
        link: "",
        radius: "0",
      }});
      continue;
    }

    // <p> containing only a button-like <a>
    if (tag === "p" || tag === "div") {
      const anchor = node.querySelector("a");
      const imgs = node.querySelectorAll("img");
      const onlyImg = imgs.length === 1 && text === (imgs[0].alt || "");

      if (onlyImg) {
        const img = imgs[0] as HTMLImageElement;
        blocks.push({ id: uid(), type: "image", props: {
          src: img.src || img.getAttribute("src") || "",
          alt: img.alt || "",
          width: "100",
          align: (style.textAlign as string) || "center",
          link: anchor?.href || "",
          radius: "0",
        }});
        continue;
      }

      if (anchor && node.children.length === 1) {
        const aStyle = (anchor as HTMLElement).style;
        const bg = aStyle.background || aStyle.backgroundColor;
        if (bg && bg !== "transparent" && bg !== "initial") {
          blocks.push({ id: uid(), type: "button", props: {
            label: anchor.textContent?.trim() || "Click here",
            url: anchor.href || anchor.getAttribute("href") || "#",
            bgColor: bg || "#4f46e5",
            textColor: aStyle.color || "#ffffff",
            align: (style.textAlign as string) || "left",
            radius: aStyle.borderRadius ? aStyle.borderRadius.replace("px","") : "8",
            paddingX: "28",
            paddingY: "14",
            fontSize: "15",
            fontWeight: "600",
          }});
          continue;
        }
      }
    }

    // <ul> / <ol> → list
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.querySelectorAll("li")).map(li => li.textContent?.trim() ?? "");
      if (items.length) {
        blocks.push({ id: uid(), type: "list", props: {
          items,
          style: tag === "ol" ? "numbered" : "bullet",
          color: "#374151",
          size: "15",
          lineHeight: "1.75",
          iconColor: "#4f46e5",
        }});
        continue;
      }
    }

    // <table> patterns
    if (tag === "table") {
      const cells = Array.from(node.querySelectorAll("td"));

      // Single-cell table with an <a> on a coloured background → button block
      if (cells.length === 1) {
        const td = cells[0] as HTMLElement;
        const tdBg = td.style.background || td.style.backgroundColor;
        const anchor = td.querySelector("a") as HTMLAnchorElement | null;
        if (anchor && tdBg && tdBg !== "transparent") {
          const aEl = anchor as HTMLElement;
          blocks.push({ id: uid(), type: "button", props: {
            label: anchor.textContent?.trim() || "Click here",
            url: anchor.getAttribute("href") || "#",
            bgColor: tdBg || "#0f172a",
            textColor: aEl.style.color || "#ffffff",
            align: "center",
            radius: td.style.borderRadius ? td.style.borderRadius.replace("px","") : "8",
            paddingX: "28",
            paddingY: "13",
            fontSize: "15",
            fontWeight: "600",
          }});
          continue;
        }
        // Single-cell info/summary box → raw html block (renders visually, not as code)
        if (tdBg && tdBg !== "transparent") {
          blocks.push({ id: uid(), type: "html", props: { code: node.outerHTML } });
          continue;
        }
      }

      // Two-cell table → columns
      if (cells.length === 2) {
        blocks.push({ id: uid(), type: "columns", props: {
          leftHtml: cells[0].innerHTML.trim(),
          rightHtml: cells[1].innerHTML.trim(),
          leftColor: "#374151",
          rightColor: "#374151",
          gap: "24",
          split: "50",
        }});
        continue;
      }

      // Any other table → raw html block
      blocks.push({ id: uid(), type: "html", props: { code: node.outerHTML } });
      continue;
    }

    // <p> or <div> with text → text block
    if ((tag === "p" || tag === "div") && text) {
      blocks.push({ id: uid(), type: "text", props: {
        html: text,
        color: style.color || "#374151",
        size: style.fontSize ? style.fontSize.replace("px","") : "15",
        lineHeight: "1.75",
        align: (style.textAlign as string) || "left",
      }});
      continue;
    }

    // Anything else → raw html
    if (node.outerHTML.trim()) {
      blocks.push({ id: uid(), type: "html", props: { code: node.outerHTML } });
    }
  }

  return blocks.length ? blocks : [{ id: uid(), type: "html", props: { code: content } }];
}

const DEFAULTS_TEXT = { html: "", color: "#374151", size: "15", lineHeight: "1.75", align: "left" };

// ─── Default props per block type ─────────────────────────────────────────────

const DEFAULTS: Record<BlockType, Block["props"]> = {
  hero: {
    heading: "Welcome to EditBridge",
    subtext: "India's professional video editing marketplace. We're thrilled to have you on board.",
    buttonText: "Get Started →",
    buttonUrl: "https://editbridge.com",
    align: "left",
    headingColor: "#0f172a",
    subtextColor: "#475569",
    bgColor: "#ffffff",
    paddingTop: "40",
    paddingBottom: "32",
  },
  heading: {
    text: "Section Heading",
    level: "h2",
    color: "#0f172a",
    align: "left",
    size: "24",
    weight: "700",
  },
  text: {
    html: "This is a paragraph of text. Click to edit.",
    color: "#374151",
    size: "15",
    lineHeight: "1.75",
    align: "left",
  },
  button: {
    label: "Click Here →",
    url: "https://editbridge.com",
    bgColor: "#4f46e5",
    textColor: "#ffffff",
    align: "left",
    radius: "8",
    paddingX: "28",
    paddingY: "14",
    fontSize: "15",
    fontWeight: "600",
  },
  image: {
    src: "",
    alt: "Image",
    width: "100",
    align: "center",
    link: "",
    radius: "0",
  },
  divider: {
    color: "#e2e8f0",
    thickness: "1",
    style: "solid",
    marginTop: "16",
    marginBottom: "16",
  },
  spacer: {
    height: "24",
  },
  list: {
    items: ["First item", "Second item", "Third item"] as string[],
    style: "bullet",
    color: "#374151",
    size: "15",
    lineHeight: "1.75",
    iconColor: "#4f46e5",
  },
  columns: {
    leftHtml: "Left column content goes here.",
    rightHtml: "Right column content goes here.",
    leftColor: "#374151",
    rightColor: "#374151",
    gap: "24",
    split: "50",
  },
  html: {
    code: "<p style=\"color:#374151;font-size:15px;line-height:1.75;\">Custom HTML block</p>",
  },
};

// ─── Block → HTML renderer ────────────────────────────────────────────────────

const F = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`;

function renderBlock(b: Block): string {
  const p = b.props;
  const align = String(p.align ?? "left");

  switch (b.type) {
    case "hero": {
      const btnHtml = p.buttonText
        ? `<p style="margin:24px 0 0;text-align:${align};">
            <a href="${p.buttonUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:${F};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">${p.buttonText}</a>
           </p>` : "";
      return `<div style="background:${p.bgColor};padding:${p.paddingTop}px 0 ${p.paddingBottom}px;text-align:${align};">
        <h1 style="margin:0 0 12px;font-family:${F};font-size:32px;font-weight:800;color:${p.headingColor};line-height:1.2;letter-spacing:-0.5px;">${p.heading}</h1>
        ${p.subtext ? `<p style="margin:0;font-family:${F};font-size:16px;color:${p.subtextColor};line-height:1.7;">${p.subtext}</p>` : ""}
        ${btnHtml}
      </div>`;
    }
    case "heading": {
      const tag = String(p.level ?? "h2");
      const sizes: Record<string, string> = { h1: "32", h2: "24", h3: "18" };
      const sz = String(p.size ?? sizes[tag] ?? "24");
      return `<${tag} style="margin:0;font-family:${F};font-size:${sz}px;font-weight:${p.weight ?? 700};color:${p.color ?? "#0f172a"};line-height:1.3;text-align:${align};">${p.text}</${tag}>`;
    }
    case "text": {
      const lines = String(p.html).split(/\n\n+/);
      return lines.map(l => `<p style="margin:0 0 16px;font-family:${F};font-size:${p.size}px;color:${p.color};line-height:${p.lineHeight};text-align:${align};">${l.replace(/\n/g,"<br>")}</p>`).join("");
    }
    case "button": {
      return `<p style="margin:0;text-align:${align};">
        <a href="${p.url}" style="display:inline-block;background:${p.bgColor};color:${p.textColor};font-family:${F};font-size:${p.fontSize}px;font-weight:${p.fontWeight};text-decoration:none;padding:${p.paddingY}px ${p.paddingX}px;border-radius:${p.radius}px;">${p.label}</a>
      </p>`;
    }
    case "image": {
      const w = Number(p.width) > 0 ? `width="${p.width}%" style="max-width:${p.width}%;border-radius:${p.radius}px;"` : `style="border-radius:${p.radius}px;"`;
      const img = p.src ? `<img src="${p.src}" alt="${p.alt}" ${w} border="0"/>` : `<div style="width:100%;min-height:80px;background:#f1f5f9;border-radius:${p.radius}px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;font-family:${F};">No image URL set</div>`;
      const wrapped = p.link ? `<a href="${p.link}" style="text-decoration:none;">${img}</a>` : img;
      return `<p style="margin:0;text-align:${align};">${wrapped}</p>`;
    }
    case "divider":
      return `<div style="margin:${p.marginTop}px 0 ${p.marginBottom}px;"><hr style="border:none;border-top:${p.thickness}px ${p.style} ${p.color};margin:0;"/></div>`;
    case "spacer":
      return `<div style="height:${p.height}px;line-height:${p.height}px;font-size:0;">&nbsp;</div>`;
    case "list": {
      const items = (p.items as string[]).map(item =>
        `<li style="margin-bottom:6px;color:${p.color};font-family:${F};font-size:${p.size}px;line-height:${p.lineHeight};">${item}</li>`
      ).join("");
      const tag = p.style === "numbered" ? "ol" : "ul";
      const listStyle = p.style === "bullet" ? "disc" : "decimal";
      return `<${tag} style="margin:0;padding-left:20px;list-style-type:${listStyle};">${items}</${tag}>`;
    }
    case "columns": {
      const split = Number(p.split ?? 50);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="${split}%" style="vertical-align:top;padding-right:${Number(p.gap)/2}px;font-family:${F};font-size:15px;color:${p.leftColor};line-height:1.7;">${p.leftHtml}</td>
          <td width="${100 - split}%" style="vertical-align:top;padding-left:${Number(p.gap)/2}px;font-family:${F};font-size:15px;color:${p.rightColor};line-height:1.7;">${p.rightHtml}</td>
        </tr>
      </table>`;
    }
    case "html":
      return String(p.code);
    default:
      return "";
  }
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(b => {
    const meta = encodeURIComponent(JSON.stringify(b.props));
    return `<div data-block-type="${b.type}" data-block-props="${meta}" style="padding:0 0 20px;">${renderBlock(b)}</div>`;
  }).join("\n");
}

// ─── Palette block defs ───────────────────────────────────────────────────────

const PALETTE: { type: BlockType; label: string; icon: React.ElementType; desc: string; color: string; bg: string }[] = [
  { type: "hero",    label: "Hero",     icon: Sparkles,       desc: "Heading + text + CTA button",  color: "#7c3aed", bg: "#ede9fe" },
  { type: "heading", label: "Heading",  icon: Heading1,       desc: "H1, H2 or H3 title",           color: "#1d4ed8", bg: "#dbeafe" },
  { type: "text",    label: "Text",     icon: Type,           desc: "Paragraph of text",             color: "#0369a1", bg: "#e0f2fe" },
  { type: "button",  label: "Button",   icon: MousePointer,   desc: "Call-to-action button",         color: "#0f766e", bg: "#ccfbf1" },
  { type: "image",   label: "Image",    icon: Image,          desc: "Image with optional link",      color: "#b45309", bg: "#fef3c7" },
  { type: "list",    label: "List",     icon: List,           desc: "Bullet or numbered list",       color: "#be185d", bg: "#fce7f3" },
  { type: "columns", label: "Columns",  icon: Columns,        desc: "Two-column side-by-side",       color: "#6d28d9", bg: "#ede9fe" },
  { type: "divider", label: "Divider",  icon: Minus,          desc: "Horizontal rule",               color: "#64748b", bg: "#f1f5f9" },
  { type: "spacer",  label: "Spacer",   icon: MoveVertical,   desc: "Blank vertical space",          color: "#64748b", bg: "#f1f5f9" },
  { type: "html",    label: "Raw HTML", icon: Code,           desc: "Custom HTML snippet",           color: "#d97706", bg: "#fef9c3" },
];

const PALETTE_GROUPS = [
  { label: "Content", types: ["hero", "heading", "text", "button"] },
  { label: "Media",   types: ["image", "list", "columns"] },
  { label: "Layout",  types: ["divider", "spacer", "html"] },
];

// ─── Sortable block wrapper ───────────────────────────────────────────────────

function SortableBlock({ block, selected, onSelect, onDelete, onDuplicate, onChange }: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChange: (props: Block["props"]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  const def = PALETTE.find(p => p.type === block.type);

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}
      className={`group relative rounded-xl border-2 transition-all cursor-pointer ${selected ? "border-indigo-500 bg-indigo-50/30 shadow-md shadow-indigo-100/60" : "border-transparent hover:border-slate-200 hover:bg-slate-50/50"}`}>
      {/* block type badge */}
      <div className={`absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: def?.bg ?? "#f1f5f9", color: def?.color ?? "#64748b" }}>
        {def && <def.icon className="w-2.5 h-2.5"/>}
        {def?.label ?? block.type}
      </div>
      {/* block preview */}
      <div className="pt-1">
        <BlockPreview block={block}/>
      </div>
      {/* action bar — always show on selected, show on hover otherwise */}
      <div className={`absolute top-2 right-2 flex items-center gap-0.5 bg-white border border-gray-100 shadow-sm rounded-lg px-1 py-0.5 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        <button onClick={e=>{e.stopPropagation();onDuplicate();}} className="p-1 rounded-md hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors" title="Duplicate">
          <Copy className="w-3 h-3"/>
        </button>
        <button onClick={e=>{e.stopPropagation();onDelete();}} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
          <Trash2 className="w-3 h-3"/>
        </button>
        <div className="w-px h-3 bg-gray-200 mx-0.5"/>
        <button {...attributes} {...listeners} className="cursor-grab p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 active:cursor-grabbing transition-colors" title="Drag to reorder">
          <GripVertical className="w-3 h-3"/>
        </button>
      </div>
    </div>
  );
}

// ─── Block visual preview (inside canvas) ─────────────────────────────────────

function BlockPreview({ block }: { block: Block }) {
  const p = block.props;

  switch (block.type) {
    case "hero":
      return (
        <div className="p-5 rounded-xl" style={{background:String(p.bgColor),textAlign:String(p.align) as "left"|"center"|"right"}}>
          <p className="font-extrabold text-2xl leading-tight" style={{color:String(p.headingColor),margin:0}}>{String(p.heading)}</p>
          {p.subtext && <p className="mt-2 text-sm leading-relaxed" style={{color:String(p.subtextColor),margin:"8px 0 0"}}>{String(p.subtext)}</p>}
          {p.buttonText && (
            <div className="mt-4" style={{textAlign:String(p.align) as "left"|"center"|"right"}}>
              <span className="inline-block text-sm font-semibold px-5 py-2.5 rounded-lg text-white" style={{background:"#4f46e5"}}>{String(p.buttonText)}</span>
            </div>
          )}
        </div>
      );
    case "heading": {
      const sizes: Record<string, string> = { h1: "26px", h2: "20px", h3: "16px" };
      return <div className="px-4 py-3 font-bold" style={{fontSize:sizes[String(p.level)]??sizes.h2,color:String(p.color),textAlign:String(p.align) as "left"|"center"|"right"}}>{String(p.text)}</div>;
    }
    case "text":
      return <div className="px-4 py-3 text-sm leading-relaxed" style={{color:String(p.color),textAlign:String(p.align) as "left"|"center"|"right"}}>{String(p.html)}</div>;
    case "button":
      return (
        <div className="px-4 py-3" style={{textAlign:String(p.align) as "left"|"center"|"right"}}>
          <span className="inline-block text-sm font-semibold rounded-lg" style={{background:String(p.bgColor),color:String(p.textColor),padding:`${p.paddingY}px ${p.paddingX}px`,borderRadius:`${p.radius}px`}}>{String(p.label)}</span>
        </div>
      );
    case "image":
      return (
        <div className="px-4 py-3" style={{textAlign:String(p.align) as "left"|"center"|"right"}}>
          {p.src
            ? <img src={String(p.src)} alt={String(p.alt)} className="inline-block max-w-full" style={{maxWidth:`${p.width}%`,borderRadius:`${p.radius}px`}}/>
            : <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-400 text-sm"><Image className="w-4 h-4"/>No image URL</div>
          }
        </div>
      );
    case "divider":
      return <div className="px-4 py-2"><hr style={{border:"none",borderTop:`${p.thickness}px ${p.style} ${p.color}`,margin:0}}/></div>;
    case "spacer":
      return (
        <div className="px-4 flex items-center justify-center" style={{height:Math.max(Number(p.height),20)}}>
          <span className="text-[10px] text-gray-300 font-mono">{p.height}px space</span>
        </div>
      );
    case "list": {
      const items = p.items as string[];
      return (
        <div className="px-4 py-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5 text-sm" style={{color:String(p.color)}}>
              <span className="mt-1 w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{background:String(p.iconColor)}}>
                {p.style === "numbered" ? i+1 : "•"}
              </span>
              {item}
            </div>
          ))}
        </div>
      );
    }
    case "columns":
      return (
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          <div className="text-sm border-r border-dashed border-gray-200 pr-4" style={{color:String(p.leftColor)}}>{String(p.leftHtml)}</div>
          <div className="text-sm" style={{color:String(p.rightColor)}}>{String(p.rightHtml)}</div>
        </div>
      );
    case "html":
      return <div className="px-4 py-3 text-sm overflow-hidden max-h-32" dangerouslySetInnerHTML={{ __html: String(p.code) }} />;
    default:
      return <div className="px-4 py-3 text-xs text-gray-400">Unknown block</div>;
  }
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"/>
        <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"/>
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
      }
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, unit }: { label: string; value: string|number; onChange: (v: string) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}{unit && <span className="normal-case font-normal ml-1 text-gray-300">({unit})</span>}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: {value:string;label:string}[] }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function AlignField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex gap-1">
        {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as [string, React.ElementType][]).map(([v, Icon]) => (
          <button key={v} onClick={() => onChange(v)} className={`flex-1 py-1.5 rounded-lg border text-xs flex items-center justify-center transition-colors ${value === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            <Icon className="w-3.5 h-3.5"/>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1 border-t border-gray-100 mt-1 first:pt-0 first:border-0 first:mt-0">
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</p>
      <div className="flex-1 h-px bg-gray-100"/>
    </div>
  );
}

function BlockSettings({ block, onChange }: { block: Block; onChange: (props: Block["props"]) => void }) {
  const p = block.props;
  const set = (key: string, value: string | string[] | boolean | number) => onChange({ ...p, [key]: value });

  const section = (title: string) => <SectionDivider title={title}/>;

  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          {section("Content")}
          <TextField label="Heading" value={String(p.heading)} onChange={v => set("heading", v)}/>
          <TextField label="Sub-text" value={String(p.subtext)} onChange={v => set("subtext", v)} multiline/>
          <TextField label="Button label" value={String(p.buttonText)} onChange={v => set("buttonText", v)} placeholder="Leave blank to hide"/>
          <TextField label="Button URL" value={String(p.buttonUrl)} onChange={v => set("buttonUrl", v)}/>
          {section("Style")}
          <AlignField label="Alignment" value={String(p.align)} onChange={v => set("align", v)}/>
          <ColorField label="Heading color" value={String(p.headingColor)} onChange={v => set("headingColor", v)}/>
          <ColorField label="Sub-text color" value={String(p.subtextColor)} onChange={v => set("subtextColor", v)}/>
          <ColorField label="Background" value={String(p.bgColor)} onChange={v => set("bgColor", v)}/>
          {section("Spacing")}
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Padding top" value={String(p.paddingTop)} onChange={v => set("paddingTop", v)} unit="px" min={0}/>
            <NumberField label="Padding bottom" value={String(p.paddingBottom)} onChange={v => set("paddingBottom", v)} unit="px" min={0}/>
          </div>
        </div>
      );
    case "heading":
      return (
        <div className="space-y-3">
          {section("Content")}
          <TextField label="Text" value={String(p.text)} onChange={v => set("text", v)}/>
          {section("Style")}
          <SelectField label="Level" value={String(p.level)} onChange={v => set("level", v)} options={[{value:"h1",label:"H1 — Largest"},{value:"h2",label:"H2 — Medium"},{value:"h3",label:"H3 — Small"}]}/>
          <AlignField label="Alignment" value={String(p.align)} onChange={v => set("align", v)}/>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Font size" value={String(p.size)} onChange={v => set("size", v)} unit="px" min={10} max={72}/>
            <SelectField label="Weight" value={String(p.weight)} onChange={v => set("weight", v)} options={[{value:"400",label:"Regular"},{value:"600",label:"Semibold"},{value:"700",label:"Bold"},{value:"800",label:"Extra Bold"}]}/>
          </div>
          <ColorField label="Color" value={String(p.color)} onChange={v => set("color", v)}/>
        </div>
      );
    case "text":
      return (
        <div className="space-y-3">
          {section("Content")}
          <TextField label="Text (use double line break for new paragraph)" value={String(p.html)} onChange={v => set("html", v)} multiline/>
          {section("Style")}
          <AlignField label="Alignment" value={String(p.align)} onChange={v => set("align", v)}/>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Font size" value={String(p.size)} onChange={v => set("size", v)} unit="px" min={10} max={36}/>
            <NumberField label="Line height" value={String(p.lineHeight)} onChange={v => set("lineHeight", v)} min={1} max={3}/>
          </div>
          <ColorField label="Text color" value={String(p.color)} onChange={v => set("color", v)}/>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          {section("Content")}
          <TextField label="Label" value={String(p.label)} onChange={v => set("label", v)}/>
          <TextField label="URL" value={String(p.url)} onChange={v => set("url", v)}/>
          {section("Style")}
          <AlignField label="Alignment" value={String(p.align)} onChange={v => set("align", v)}/>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Background" value={String(p.bgColor)} onChange={v => set("bgColor", v)}/>
            <ColorField label="Text" value={String(p.textColor)} onChange={v => set("textColor", v)}/>
          </div>
          {section("Size")}
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Padding X" value={String(p.paddingX)} onChange={v => set("paddingX", v)} unit="px"/>
            <NumberField label="Padding Y" value={String(p.paddingY)} onChange={v => set("paddingY", v)} unit="px"/>
            <NumberField label="Font size" value={String(p.fontSize)} onChange={v => set("fontSize", v)} unit="px"/>
            <NumberField label="Radius" value={String(p.radius)} onChange={v => set("radius", v)} unit="px"/>
          </div>
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          {section("Content")}
          <TextField label="Image URL" value={String(p.src)} onChange={v => set("src", v)} placeholder="https://…"/>
          <TextField label="Alt text" value={String(p.alt)} onChange={v => set("alt", v)}/>
          <TextField label="Link URL (optional)" value={String(p.link)} onChange={v => set("link", v)} placeholder="https://…"/>
          {section("Style")}
          <AlignField label="Alignment" value={String(p.align)} onChange={v => set("align", v)}/>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Width" value={String(p.width)} onChange={v => set("width", v)} unit="%" min={10} max={100}/>
            <NumberField label="Radius" value={String(p.radius)} onChange={v => set("radius", v)} unit="px"/>
          </div>
        </div>
      );
    case "divider":
      return (
        <div className="space-y-3">
          {section("Style")}
          <ColorField label="Color" value={String(p.color)} onChange={v => set("color", v)}/>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Thickness" value={String(p.thickness)} onChange={v => set("thickness", v)} unit="px" min={1} max={8}/>
            <SelectField label="Style" value={String(p.style)} onChange={v => set("style", v)} options={[{value:"solid",label:"Solid"},{value:"dashed",label:"Dashed"},{value:"dotted",label:"Dotted"}]}/>
          </div>
          {section("Spacing")}
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Margin top" value={String(p.marginTop)} onChange={v => set("marginTop", v)} unit="px"/>
            <NumberField label="Margin bottom" value={String(p.marginBottom)} onChange={v => set("marginBottom", v)} unit="px"/>
          </div>
        </div>
      );
    case "spacer":
      return (
        <div className="space-y-3">
          {section("Size")}
          <NumberField label="Height" value={String(p.height)} onChange={v => set("height", v)} unit="px" min={4} max={200}/>
        </div>
      );
    case "list": {
      const items = p.items as string[];
      return (
        <div className="space-y-3">
          {section("Items")}
          {items.map((item, i) => (
            <div key={i} className="flex gap-1.5">
              <input value={item} onChange={e => { const next = [...items]; next[i] = e.target.value; set("items", next); }}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
              <button onClick={() => { const next = items.filter((_,j) => j !== i); set("items", next); }} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50">
                <Trash2 className="w-3 h-3"/>
              </button>
            </div>
          ))}
          <button onClick={() => set("items", [...items, "New item"])} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            <Plus className="w-3 h-3"/>Add item
          </button>
          {section("Style")}
          <SelectField label="List style" value={String(p.style)} onChange={v => set("style", v)} options={[{value:"bullet",label:"Bullet"},{value:"numbered",label:"Numbered"}]}/>
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Text color" value={String(p.color)} onChange={v => set("color", v)}/>
            <ColorField label="Icon color" value={String(p.iconColor)} onChange={v => set("iconColor", v)}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Font size" value={String(p.size)} onChange={v => set("size", v)} unit="px"/>
            <NumberField label="Line height" value={String(p.lineHeight)} onChange={v => set("lineHeight", v)}/>
          </div>
        </div>
      );
    }
    case "columns":
      return (
        <div className="space-y-3">
          {section("Left column")}
          <TextField label="Content" value={String(p.leftHtml)} onChange={v => set("leftHtml", v)} multiline/>
          <ColorField label="Text color" value={String(p.leftColor)} onChange={v => set("leftColor", v)}/>
          {section("Right column")}
          <TextField label="Content" value={String(p.rightHtml)} onChange={v => set("rightHtml", v)} multiline/>
          <ColorField label="Text color" value={String(p.rightColor)} onChange={v => set("rightColor", v)}/>
          {section("Layout")}
          <NumberField label="Left column width" value={String(p.split)} onChange={v => set("split", v)} unit="%" min={20} max={80}/>
          <NumberField label="Gap between columns" value={String(p.gap)} onChange={v => set("gap", v)} unit="px"/>
        </div>
      );
    case "html":
      return (
        <div className="space-y-3">
          {section("Code")}
          <TextField label="Raw HTML" value={String(p.code)} onChange={v => set("code", v)} multiline/>
          <p className="text-[10px] text-gray-400">Inline styles only — no external CSS or scripts.</p>
        </div>
      );
    default:
      return null;
  }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

// Default builder-local header/footer opts (same as global defaults)
const HEADER_DEFAULTS: Pick<EmailLayoutOptions,
  "logoText"|"logoImageUrl"|"logoImageHeight"|"headerTagline"|"headerBg"|"headerTextColor"|"headerTaglineColor"|"accentColor"
> = {
  logoText: EMAIL_LAYOUT_DEFAULTS.logoText,
  logoImageUrl: EMAIL_LAYOUT_DEFAULTS.logoImageUrl,
  logoImageHeight: EMAIL_LAYOUT_DEFAULTS.logoImageHeight,
  headerTagline: EMAIL_LAYOUT_DEFAULTS.headerTagline,
  headerBg: EMAIL_LAYOUT_DEFAULTS.headerBg,
  headerTextColor: EMAIL_LAYOUT_DEFAULTS.headerTextColor,
  headerTaglineColor: EMAIL_LAYOUT_DEFAULTS.headerTaglineColor,
  accentColor: EMAIL_LAYOUT_DEFAULTS.accentColor,
};

const FOOTER_DEFAULTS: Pick<EmailLayoutOptions,
  "supportEmail"|"websiteUrl"|"helpUrl"|"unsubscribeUrl"|"copyright"|"bodyBg"
> = {
  supportEmail: EMAIL_LAYOUT_DEFAULTS.supportEmail,
  websiteUrl: EMAIL_LAYOUT_DEFAULTS.websiteUrl,
  helpUrl: EMAIL_LAYOUT_DEFAULTS.helpUrl,
  unsubscribeUrl: EMAIL_LAYOUT_DEFAULTS.unsubscribeUrl,
  copyright: EMAIL_LAYOUT_DEFAULTS.copyright,
  bodyBg: EMAIL_LAYOUT_DEFAULTS.bodyBg,
};

export function EmailBuilder({
  onUseAsTemplate,
  templates,
  loadTemplate,
}: {
  onUseAsTemplate?: (html: string, label?: string) => void;
  templates?: Record<string, string>;
  loadTemplate?: { label: string; body: string } | null;
}) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: uid(), type: "hero", props: { ...DEFAULTS.hero } },
    { id: uid(), type: "text", props: { ...DEFAULTS.text, html: "If you have questions, visit our Help Center or reply to this email." } },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [selectedPanel, setSelectedPanel] = useState<"header"|"footer"|null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadedLabel, setLoadedLabel] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop"|"mobile">("desktop");
  const [headerOpts, setHeaderOpts] = useState({ ...HEADER_DEFAULTS });
  const [footerOpts, setFooterOpts] = useState({ ...FOOTER_DEFAULTS });

  function setHdr(key: keyof typeof HEADER_DEFAULTS, value: string) {
    setHeaderOpts(prev => ({ ...prev, [key]: value }));
  }
  function setFtr(key: keyof typeof FOOTER_DEFAULTS, value: string) {
    setFooterOpts(prev => ({ ...prev, [key]: value }));
  }

  function layoutOpts(): EmailLayoutOptions {
    return { ...headerOpts, ...footerOpts };
  }

  // Load a template passed from outside (e.g. "Edit in Builder" button)
  useEffect(() => {
    if (!loadTemplate) return;
    const parsed = parseToBlocks(loadTemplate.body);
    setBlocks(parsed);
    setSelectedId(parsed[0]?.id ?? null);
    setLoadedLabel(loadTemplate.label);
    toast.success(`"${loadTemplate.label}" loaded — edit freely`);
  }, [loadTemplate]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selected = blocks.find(b => b.id === selectedId) ?? null;

  function selectBlock(id: string) {
    setSelectedId(id);
    setSelectedPanel(null);
  }

  function selectPanel(panel: "header"|"footer") {
    setSelectedPanel(panel);
    setSelectedId(null);
  }

  function addBlock(type: BlockType) {
    const nb: Block = { id: uid(), type, props: { ...DEFAULTS[type] } };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === selectedId);
      const next = [...prev];
      next.splice(idx >= 0 ? idx + 1 : next.length, 0, nb);
      return next;
    });
    setSelectedId(nb.id);
    setSelectedPanel(null);
  }

  function deleteBlock(id: string) {
    setBlocks(prev => {
      const next = prev.filter(b => b.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  }

  function duplicateBlock(id: string) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const clone: Block = { ...prev[idx], id: uid(), props: { ...prev[idx].props } };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      setSelectedId(clone.id);
      return next;
    });
  }

  function updateBlock(id: string, props: Block["props"]) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, props } : b));
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (over && active.id !== over.id) {
      setBlocks(prev => {
        const oldIdx = prev.findIndex(b => b.id === active.id);
        const newIdx = prev.findIndex(b => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  function openPreview() {
    setPreviewHtml(wrapEmailHtml(blocksToHtml(blocks), "", layoutOpts()));
    setPreview(true);
  }

  function copyHtml() {
    navigator.clipboard.writeText(wrapEmailHtml(blocksToHtml(blocks), "", layoutOpts()));
    toast.success("HTML copied to clipboard");
  }

  function downloadHtml() {
    const full = wrapEmailHtml(blocksToHtml(blocks), "", layoutOpts());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([full], { type: "text/html" }));
    a.download = `email-${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    toast.success("Downloaded");
  }

  function useAsTemplate() {
    onUseAsTemplate?.(blocksToHtml(blocks), loadedLabel ?? undefined);
    toast.success("Saved to template editor — switch to Templates tab");
  }

  function loadFromPicker(label: string, bodyKey: string) {
    const body = templates?.[bodyKey] ?? "";
    const parsed = parseToBlocks(body);
    setBlocks(parsed);
    setSelectedId(parsed[0]?.id ?? null);
    setLoadedLabel(label);
    setPickerOpen(false);
    toast.success(`"${label}" loaded`);
  }

  function resetCanvas() {
    const fresh: Block[] = [
      { id: uid(), type: "hero", props: { ...DEFAULTS.hero } },
      { id: uid(), type: "text", props: { ...DEFAULTS.text, html: "If you have questions, visit our Help Center or reply to this email." } },
    ];
    setBlocks(fresh);
    setSelectedId(fresh[0].id);
    setSelectedPanel(null);
    setLoadedLabel(null);
    setHeaderOpts({ ...HEADER_DEFAULTS });
    setFooterOpts({ ...FOOTER_DEFAULTS });
  }

  const activeBlock = blocks.find(b => b.id === activeId);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Info */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-white"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {loadedLabel ?? "Email Builder"}
              </h2>
              <p className="text-[11px] text-gray-400 leading-tight">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}{loadedLabel ? " · editing" : " · blank canvas"}
              </p>
            </div>
          </div>

          {/* Template picker */}
          {templates && (
            <div className="relative">
              <button onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
                <FolderOpen className="w-3.5 h-3.5 text-gray-400"/>
                Load template
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${pickerOpen ? "rotate-180" : ""}`}/>
              </button>
              {pickerOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-30 w-72 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Templates</span>
                    <button onClick={() => setPickerOpen(false)} className="w-5 h-5 rounded-md hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                      <X className="w-3 h-3"/>
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1.5">
                    {SECTIONS.map(sec => (
                      <div key={sec.section}>
                        <p className="px-4 pt-2 pb-1 text-[9px] font-bold text-gray-300 uppercase tracking-widest">{sec.section}</p>
                        {sec.groups.map(g => (
                          <button key={g.body} onClick={() => loadFromPicker(g.label, g.body)}
                            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between group transition-colors">
                            <span>{g.label}</span>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 transition-colors"/>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 px-4 py-2.5">
                    <button onClick={() => { resetCanvas(); setPickerOpen(false); }}
                      className="w-full text-left text-xs font-semibold text-gray-400 hover:text-gray-700 py-1 flex items-center gap-1.5 transition-colors">
                      <Plus className="w-3 h-3"/>Blank canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-1 bg-gray-50">
            <button onClick={copyHtml} className="flex items-center gap-1.5 text-gray-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all">
              <Code className="w-3.5 h-3.5"/>Copy HTML
            </button>
            <button onClick={downloadHtml} className="flex items-center gap-1.5 text-gray-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all">
              <Download className="w-3.5 h-3.5"/>Download
            </button>
          </div>
          <button onClick={openPreview}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
            <Eye className="w-3.5 h-3.5"/>Preview
          </button>
          {onUseAsTemplate && (
            <button onClick={useAsTemplate}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              <Send className="w-3.5 h-3.5"/>Use as template
            </button>
          )}
        </div>
      </div>

      {/* ── Three-panel body ────────────────────────────────────────────── */}
      <div className="flex gap-0 min-h-0 flex-1 rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">

        {/* Left — Block palette */}
        <div className="w-44 shrink-0 bg-gray-50 border-r border-gray-100 overflow-y-auto">
          <div className="p-3 space-y-4">
            {PALETTE_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">{group.label}</p>
                <div className="space-y-1">
                  {PALETTE.filter(p => group.types.includes(p.type)).map(({ type, label, icon: Icon, desc, color, bg }) => (
                    <button key={type} onClick={() => addBlock(type)} title={desc}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-white hover:shadow-sm text-left transition-all group border border-transparent hover:border-gray-200">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all" style={{ background: bg }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }}/>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">{label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-slate-100/60">
          <div className="p-6">
            <div className="max-w-[580px] mx-auto">
              {/* Email chrome */}
              <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/80 border border-slate-200/60 overflow-hidden">

                {/* ── Clickable Header ── */}
                <div
                  onClick={() => selectPanel("header")}
                  className={`relative group cursor-pointer transition-all ${selectedPanel === "header" ? "ring-2 ring-inset ring-indigo-500" : "hover:ring-2 hover:ring-inset hover:ring-indigo-200"}`}
                >
                  <div className="px-7 py-5" style={{ background: headerOpts.headerBg }}>
                    {headerOpts.logoImageUrl ? (
                      <div className="text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={headerOpts.logoImageUrl} alt={headerOpts.logoText} style={{ height: `${headerOpts.logoImageHeight}px`, display: "inline-block" }}/>
                        {headerOpts.headerTagline && (
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: headerOpts.headerTaglineColor }}>{headerOpts.headerTagline}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[15px] tracking-tight" style={{ color: headerOpts.headerTextColor }}>{headerOpts.logoText}</span>
                        {headerOpts.headerTagline && (
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: headerOpts.headerTaglineColor }}>{headerOpts.headerTagline}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="h-[3px]" style={{ background: headerOpts.accentColor }}/>
                  {/* Edit hint */}
                  <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-opacity ${selectedPanel === "header" ? "opacity-100 bg-indigo-600" : "opacity-0 group-hover:opacity-100 bg-slate-700/80"}`}>
                    <Pencil className="w-2.5 h-2.5"/>Edit Header
                  </div>
                </div>

                {/* Blocks */}
                <div className="px-8 py-5">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {blocks.length === 0 && (
                          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                            <Layers className="w-8 h-8 mx-auto mb-3 text-slate-200"/>
                            <p className="text-sm font-semibold text-slate-400">Canvas is empty</p>
                            <p className="text-xs text-slate-300 mt-1">Click a block type on the left to get started</p>
                          </div>
                        )}
                        {blocks.map(block => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            selected={selectedId === block.id}
                            onSelect={() => selectBlock(block.id)}
                            onDelete={() => deleteBlock(block.id)}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onChange={props => updateBlock(block.id, props)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeBlock && (
                        <div className="bg-white rounded-xl border-2 border-indigo-400 shadow-2xl opacity-95 pointer-events-none scale-[1.02]">
                          <BlockPreview block={activeBlock}/>
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>

                {/* ── Clickable Footer ── */}
                <div
                  onClick={() => selectPanel("footer")}
                  className={`relative group cursor-pointer border-t border-slate-100 transition-all ${selectedPanel === "footer" ? "ring-2 ring-inset ring-indigo-500" : "hover:ring-2 hover:ring-inset hover:ring-indigo-200"}`}
                >
                  <div className="px-7 py-5 text-center" style={{ background: "#f8fafc" }}>
                    <p className="text-xs text-slate-400">
                      Questions?{" "}
                      <span className="font-semibold" style={{ color: headerOpts.accentColor }}>{footerOpts.supportEmail}</span>
                    </p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {footerOpts.websiteUrl?.replace(/^https?:\/\//, "")} · Help Center · Unsubscribe
                    </p>
                    <p className="text-[10px] text-slate-200 mt-1">{footerOpts.copyright}</p>
                  </div>
                  {/* Edit hint */}
                  <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-opacity ${selectedPanel === "footer" ? "opacity-100 bg-indigo-600" : "opacity-0 group-hover:opacity-100 bg-slate-700/80"}`}>
                    <Pencil className="w-2.5 h-2.5"/>Edit Footer
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Right — Settings panel */}
        <div className="w-56 shrink-0 border-l border-gray-100 overflow-y-auto bg-white">
          {selectedPanel === "header" ? (
            <div>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-slate-800">
                    <PanelTop className="w-3.5 h-3.5 text-white"/>
                  </span>
                  <span className="text-xs font-bold text-gray-900">Header Settings</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <SectionDivider title="Logo"/>
                <TextField label="Logo text" value={headerOpts.logoText ?? ""} onChange={v => setHdr("logoText", v)}/>
                <TextField label="Logo image URL" value={headerOpts.logoImageUrl ?? ""} onChange={v => setHdr("logoImageUrl", v)} placeholder="https://… (leave blank for text)"/>
                {headerOpts.logoImageUrl && (
                  <NumberField label="Image height" value={headerOpts.logoImageHeight ?? "40"} onChange={v => setHdr("logoImageHeight", v)} unit="px" min={20} max={120}/>
                )}
                <SectionDivider title="Tagline"/>
                <TextField label="Tagline text" value={headerOpts.headerTagline ?? ""} onChange={v => setHdr("headerTagline", v)} placeholder="Leave blank to hide"/>
                <ColorField label="Tagline color" value={headerOpts.headerTaglineColor ?? "#94a3b8"} onChange={v => setHdr("headerTaglineColor", v)}/>
                <SectionDivider title="Colors"/>
                <ColorField label="Background" value={headerOpts.headerBg ?? "#0f172a"} onChange={v => setHdr("headerBg", v)}/>
                <ColorField label="Logo text color" value={headerOpts.headerTextColor ?? "#ffffff"} onChange={v => setHdr("headerTextColor", v)}/>
                <ColorField label="Accent stripe" value={headerOpts.accentColor ?? "#4f46e5"} onChange={v => setHdr("accentColor", v)}/>
                <SectionDivider title="Reset"/>
                <button
                  onClick={() => setHeaderOpts({ ...HEADER_DEFAULTS })}
                  className="w-full text-xs font-semibold text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          ) : selectedPanel === "footer" ? (
            <div>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-slate-100">
                    <PanelBottom className="w-3.5 h-3.5 text-slate-500"/>
                  </span>
                  <span className="text-xs font-bold text-gray-900">Footer Settings</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <SectionDivider title="Contact"/>
                <TextField label="Support email" value={footerOpts.supportEmail ?? ""} onChange={v => setFtr("supportEmail", v)} placeholder="support@…"/>
                <SectionDivider title="Links"/>
                <TextField label="Website URL" value={footerOpts.websiteUrl ?? ""} onChange={v => setFtr("websiteUrl", v)} placeholder="https://…"/>
                <TextField label="Help center URL" value={footerOpts.helpUrl ?? ""} onChange={v => setFtr("helpUrl", v)} placeholder="https://…"/>
                <TextField label="Unsubscribe URL" value={footerOpts.unsubscribeUrl ?? ""} onChange={v => setFtr("unsubscribeUrl", v)} placeholder="https://…"/>
                <SectionDivider title="Legal"/>
                <TextField label="Copyright line" value={footerOpts.copyright ?? ""} onChange={v => setFtr("copyright", v)} placeholder="© 2026 Your Company"/>
                <SectionDivider title="Background"/>
                <ColorField label="Email body bg" value={footerOpts.bodyBg ?? "#f1f5f9"} onChange={v => setFtr("bodyBg", v)}/>
                <SectionDivider title="Reset"/>
                <button
                  onClick={() => setFooterOpts({ ...FOOTER_DEFAULTS })}
                  className="w-full text-xs font-semibold text-gray-400 hover:text-gray-700 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors"
                >
                  Reset to defaults
                </button>
              </div>
            </div>
          ) : selected ? (() => {
            const def = PALETTE.find(p => p.type === selected.type);
            const Icon = def?.icon ?? Type;
            return (
              <div>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: def?.bg ?? "#f1f5f9" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: def?.color ?? "#64748b" }}/>
                    </span>
                    <span className="text-xs font-bold text-gray-900">{def?.label ?? selected.type} Settings</span>
                  </div>
                </div>
                <div className="p-4">
                  <BlockSettings block={selected} onChange={props => updateBlock(selected.id, props)}/>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
              <div className="space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-2">
                    <PanelTop className="w-4 h-4 text-white"/>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Click the header</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">to edit logo, tagline & colors</p>
                </div>
                <div className="h-px bg-gray-100"/>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                    <Layers className="w-4 h-4 text-slate-400"/>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Click a block</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">to edit its content & style</p>
                </div>
                <div className="h-px bg-gray-100"/>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                    <PanelBottom className="w-4 h-4 text-slate-400"/>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Click the footer</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">to edit links & copyright</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Preview modal ───────────────────────────────────────────────── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">Email Preview</span>
                {/* Device switcher */}
                <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-white">
                  <button onClick={() => setPreviewDevice("desktop")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${previewDevice === "desktop" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    <Monitor className="w-3 h-3"/>Desktop
                  </button>
                  <button onClick={() => setPreviewDevice("mobile")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${previewDevice === "mobile" ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    <Smartphone className="w-3 h-3"/>Mobile
                  </button>
                </div>
              </div>
              <button onClick={() => setPreview(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
                <X className="w-4 h-4"/>
              </button>
            </div>
            {/* Preview frame */}
            <div className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center p-6">
              <div className={`transition-all duration-300 w-full ${previewDevice === "mobile" ? "max-w-sm" : "max-w-2xl"}`}>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0 rounded-xl shadow-xl"
                  style={{ minHeight: "600px", colorScheme: "light" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
