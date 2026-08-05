"use client";

import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import "highlight.js/styles/github-dark.css";
import { Copy, Check } from "lucide-react";
import { PollBlock } from "./[slug]/poll-block";

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(headingText).join("");
  if (children && typeof children === "object" && "props" in (children as object))
    return headingText((children as { props: { children: React.ReactNode } }).props.children);
  return "";
}

// ── Copy button for code blocks ───────────────────────────────────────────────
function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      title="Copy code"
      aria-label="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);

  function getText() {
    return ref.current?.innerText ?? "";
  }

  return (
    <div className="relative group my-6">
      <pre ref={ref} className="rounded-2xl overflow-x-auto text-sm shadow-md ring-1 ring-white/5">
        {children}
      </pre>
      <CopyButton getText={getText} />
    </div>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSlug, rehypeHighlight]}
      components={{
        h1: ({ children }) => {
          const id = slugify(headingText(children));
          return (
            <h1 id={id} className="text-3xl font-black text-gray-900 mt-10 mb-4 leading-tight scroll-mt-24">
              {children}
            </h1>
          );
        },
        h2: ({ children }) => {
          const id = slugify(headingText(children));
          return (
            <h2 id={id} className="text-2xl font-bold text-gray-900 mt-10 mb-3 leading-tight border-b border-gray-100 pb-2 scroll-mt-24">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const id = slugify(headingText(children));
          return (
            <h3 id={id} className="text-xl font-bold text-gray-800 mt-7 mb-2 scroll-mt-24">
              {children}
            </h3>
          );
        },
        h4: ({ children }) => (
          <h4 className="text-base font-bold text-gray-800 mt-4 mb-1">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="text-gray-700 leading-[1.85] text-base mb-5">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside pl-5 space-y-2 mb-5 text-gray-700">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside pl-5 space-y-2 mb-5 text-gray-700">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-base leading-relaxed pl-1">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-[#8B7FE8] pl-5 pr-4 py-3 my-6 bg-purple-50 rounded-r-2xl italic text-gray-600 text-base">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="bg-gray-100 text-purple-700 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
              {children}
            </code>
          );
        },
        // Use our custom CodeBlock wrapper instead of plain <pre>, but intercept polls
        pre: ({ children }) => {
          const childArray = React.Children.toArray(children);
          const firstChild = childArray[0] as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
          
          if (
            firstChild &&
            firstChild.props &&
            firstChild.props.className === "language-poll"
          ) {
            const rawContent = (firstChild.props.children as string) || "";
            
            // Parse content (simple YAML-like parsing)
            const lines = rawContent.split("\n");
            let id = "";
            let question = "";
            let options: string[] = [];

            lines.forEach((line) => {
              const colonIndex = line.indexOf(":");
              if (colonIndex === -1) return;
              const key = line.slice(0, colonIndex).trim();
              const val = line.slice(colonIndex + 1).trim();
              if (key === "id") id = val;
              if (key === "question") question = val;
              if (key === "options") {
                options = val.split(",").map((o) => o.trim()).filter(Boolean);
              }
            });

            if (id && question && options.length > 0) {
              return <PollBlock id={id} question={question} options={options} />;
            }
          }

          return <CodeBlock>{children}</CodeBlock>;
        },
        a: ({ href, children }) => (
          <a
            href={href}
            target={href?.startsWith("http") ? "_blank" : undefined}
            rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            className="text-[#8B7FE8] font-medium underline underline-offset-2 hover:text-purple-800 transition-colors"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-600">{children}</em>
        ),
        hr: () => (
          <hr className="border-0 border-t-2 border-gray-100 my-10" />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
        th: ({ children }) => (
          <th className="text-left font-bold text-gray-700 border-b border-gray-200 px-4 py-3">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border-b border-gray-100 px-4 py-3 text-gray-600">{children}</td>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ""}
            className="rounded-2xl max-w-full my-6 shadow-md mx-auto block"
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
