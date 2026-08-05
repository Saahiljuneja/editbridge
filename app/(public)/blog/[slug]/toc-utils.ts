export interface TocItem {
  level: 2 | 3;
  text: string;
  id: string;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractToc(content: string): TocItem[] {
  const lines = content.split("\n");
  const items: TocItem[] = [];
  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h2) {
      const text = h2[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
      items.push({ level: 2, text, id: slugify(text) });
    } else if (h3) {
      const text = h3[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
      items.push({ level: 3, text, id: slugify(text) });
    }
  }
  return items;
}
