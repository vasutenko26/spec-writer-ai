import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, List, X, Sparkles } from "lucide-react";
import { exportMarkdownToDocx } from "@/lib/exportDocx";
import { toast } from "sonner";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const generateHeadingId = (text: string) =>
  text.toLowerCase().replace(/[^\wа-яіїєґ\d]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const BriefResult = ({ content }: { content: string }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [activeId, setActiveId] = useState("");

  const toc = useMemo<TocItem[]>(() => {
    return content.split("\n").reduce<TocItem[]>((acc, line) => {
      const match = line.match(/^(#{2,4})\s+(.+)/);
      if (match) {
        acc.push({ id: generateHeadingId(match[2].trim()), text: match[2].trim(), level: match[1].length });
      }
      return acc;
    }, []);
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    try {
      await exportMarkdownToDocx(content, "technical-brief.docx");
      toast.success("Word-документ завантажено");
    } catch {
      toast.error("Помилка створення Word-документа");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) { setActiveId(entry.target.id); break; }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    toc.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 rounded-lg border border-border bg-card p-3 flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowToc(!showToc)} className="text-xs">
          {showToc ? <X className="mr-1 h-3.5 w-3.5" /> : <List className="mr-1 h-3.5 w-3.5" />}
          {showToc ? "Сховати зміст" : "Зміст"}
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => navigate("/tools/content", { state: { briefText: content } })}
            className="text-xs bg-hero-gradient border-0 text-white hover:opacity-90"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Згенерувати статтю за цим ТЗ
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Скопійовано" : "Копіювати"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportDocx} className="text-xs">
            <Download className="mr-1 h-3.5 w-3.5" />Word (.docx)
          </Button>
        </div>
      </div>

      {/* Document layout */}
      <div className="flex gap-0 rounded-xl border border-border bg-card overflow-hidden">
        {/* TOC */}
        {showToc && toc.length > 0 && (
          <aside className="w-64 shrink-0 border-r border-border bg-secondary/30 p-4 overflow-y-auto max-h-[80vh] hidden md:block">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Зміст</p>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors truncate
                    ${item.level === 3 ? "pl-5" : item.level === 4 ? "pl-8" : ""}
                    ${activeId === item.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Content */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto max-h-[80vh]">
          <article className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:scroll-mt-20
            prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8
            prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6
            prose-p:leading-relaxed prose-li:leading-relaxed
            prose-strong:text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => {
                  const id = generateHeadingId(typeof children === "string" ? children : String(children));
                  return <h2 id={id} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const id = generateHeadingId(typeof children === "string" ? children : String(children));
                  return <h3 id={id} {...props}>{children}</h3>;
                },
                h4: ({ children, ...props }) => {
                  const id = generateHeadingId(typeof children === "string" ? children : String(children));
                  return <h4 id={id} {...props}>{children}</h4>;
                },
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto rounded-lg border border-border my-4 not-prose">
                    <table className="w-full text-sm border-collapse" {...props}>{children}</table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="bg-secondary px-3 py-2 text-left font-semibold border border-border text-xs whitespace-nowrap" {...props}>{children}</th>
                ),
                td: ({ children, ...props }) => (
                  <td className="px-3 py-2 border border-border text-xs" {...props}>{children}</td>
                ),
                tr: ({ children, ...props }) => (
                  <tr className="even:bg-secondary/40 hover:bg-secondary/60 transition-colors" {...props}>{children}</tr>
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
