import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, List, X, Archive } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const BriefResult = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [activeId, setActiveId] = useState("");

  const toc = useMemo(() => {
    const items: TocItem[] = [];
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^(#{2,4})\s+(.+)/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\wа-яіїєґ\d]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        items.push({ id, text, level });
      }
    }
    return items;
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "technical-brief.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
    const zip = new JSZip();
    zip.file("technical-brief.md", content);

    // Convert markdown to simple HTML for convenience
    const htmlContent = `<!DOCTYPE html>
<html lang="uk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Технічне завдання</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}
h1,h2,h3{margin-top:1.5em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}ul,ol{padding-left:1.5em}</style></head><body>${content}</body></html>`;
    zip.file("technical-brief.html", htmlContent);
    zip.file("technical-brief.txt", content.replace(/[#*`|_\-\[\]]/g, ""));

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "technical-brief.zip");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    toc.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  const generateHeadingId = (text: string) =>
    text.toLowerCase().replace(/[^\wа-яіїєґ\d]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowToc(!showToc)} className="text-xs">
            {showToc ? <X className="mr-1 h-3.5 w-3.5" /> : <List className="mr-1 h-3.5 w-3.5" />}
            {showToc ? "Сховати зміст" : "Зміст"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Скопійовано" : "Копіювати"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />
            .md
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportZip} className="text-xs">
            <Archive className="mr-1 h-3.5 w-3.5" />
            .zip
          </Button>
        </div>
      </div>

      {/* Document layout */}
      <div className="flex gap-0 rounded-xl border border-border bg-card overflow-hidden">
        {/* TOC Sidebar */}
        {showToc && toc.length > 0 && (
          <aside className="w-72 shrink-0 border-r border-border bg-secondary/30 p-4 overflow-y-auto max-h-[80vh] hidden md:block">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Зміст документу</p>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors truncate ${
                    item.level === 3 ? "pl-5" : item.level === 4 ? "pl-8" : ""
                  } ${
                    activeId === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Content area */}
        <div className="flex-1 p-8 md:p-10 overflow-y-auto max-h-[80vh]">
          <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6 prose-h4:text-base prose-h4:font-medium prose-table:text-xs prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-1.5 prose-td:border-border prose-th:border-border">
            <ReactMarkdown
              components={{
                h2: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h3 id={id} {...props}>{children}</h3>;
                },
                h4: ({ children, ...props }) => {
                  const text = typeof children === "string" ? children : String(children);
                  const id = generateHeadingId(text);
                  return <h4 id={id} {...props}>{children}</h4>;
                },
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto rounded-lg border border-border my-4">
                    <table className="w-full" {...props}>{children}</table>
                  </div>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
};

export default BriefResult;
