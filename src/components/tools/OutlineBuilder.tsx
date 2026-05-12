import { apiFetch } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown,
  Globe, Loader2, FileText, LayoutList,
} from "lucide-react";
import { toast } from "sonner";
import type { SerpPage } from "@/contexts/AppStateContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompetitorPage {
  url: string;
  domain: string;
  headings: { tag: string; text: string }[];
}

export interface OutlineItem {
  id: string;
  tag: "H2" | "H3" | "H4";
  text: string;
  source?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert SerpPage[] (from SERP analysis) → CompetitorPage[] for the builder */
export function serpPagesToCompetitors(pages: SerpPage[]): CompetitorPage[] {
  return pages
    .filter((p) => p.h1.length || p.h2.length || p.h3.length || p.headings?.length)
    .map((p) => {
      let domain = p.url;
      try { domain = new URL(p.url).hostname.replace(/^www\./, ""); } catch {}
      const headings: { tag: string; text: string }[] =
        p.headings ||
        [
          ...(p.h1 || []).map((t) => ({ tag: "H1", text: t })),
          ...(p.h2 || []).map((t) => ({ tag: "H2", text: t })),
          ...(p.h3 || []).map((t) => ({ tag: "H3", text: t })),
        ];
      return { url: p.url, domain, headings };
    });
}

// ── Style maps ────────────────────────────────────────────────────────────────

const TAG_COLOR: Record<string, string> = {
  H1: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  H2: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  H3: "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  H4: "border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  H5: "border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  H6: "border-gray-300 bg-gray-50 text-gray-500 dark:bg-gray-800/30 dark:text-gray-500",
};

const LEFT_INDENT: Record<string, string> = {
  H1: "", H2: "", H3: "pl-4", H4: "pl-8", H5: "pl-10", H6: "pl-12",
};

const RIGHT_INDENT: Record<string, string> = {
  H2: "", H3: "ml-4", H4: "ml-8",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  keyword: string;
  region?: string;
  initialPages?: CompetitorPage[];
  outline: OutlineItem[];
  onOutlineChange: (items: OutlineItem[]) => void;
}

const OutlineBuilder = ({ keyword, region = "ua", initialPages, outline, onOutlineChange }: Props) => {
  const [pages, setPages] = useState<CompetitorPage[]>(initialPages || []);
  const [loadingPages, setLoadingPages] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState("");
  const [customTag, setCustomTag] = useState<"H2" | "H3" | "H4">("H2");

  // ── Competitor fetch ───────────────────────────────────────────────────────

  const fetchPages = async () => {
    if (!keyword.trim()) { toast.error("Введіть ключове слово"); return; }
    setLoadingPages(true);
    try {
      const res = await apiFetch("/api/fetch-competitor-headings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages(data.pages || []);
      if ((data.pages || []).length) {
        // Auto-expand first competitor
        const first = data.pages[0]?.domain;
        if (first) setExpanded(new Set([first]));
        toast.success(`Завантажено заголовки ${data.pages.length} конкурентів`);
      } else {
        toast.info("Заголовки конкурентів не знайдено");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoadingPages(false);
    }
  };

  // ── Outline mutations ──────────────────────────────────────────────────────

  const push = useCallback((item: OutlineItem) => onOutlineChange([...outline, item]), [outline, onOutlineChange]);

  const addFromCompetitor = (h: { tag: string; text: string }, domain: string) => {
    const allowedTags = ["H2", "H3", "H4"];
    const tag = (allowedTags.includes(h.tag) ? h.tag : "H2") as "H2" | "H3" | "H4";
    push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, tag, text: h.text, source: domain });
  };

  const addCustom = () => {
    if (!customText.trim()) return;
    push({ id: `custom-${Date.now()}`, tag: customTag, text: customText.trim() });
    setCustomText("");
  };

  const remove = (id: string) => onOutlineChange(outline.filter((i) => i.id !== id));

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...outline];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onOutlineChange(next);
  };

  const toggleDomain = (domain: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(domain) ? s.delete(domain) : s.add(domain);
      return s;
    });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Конструктор структури статті</span>
          {outline.length > 0 && (
            <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
              {outline.length} заголовків
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchPages}
          disabled={loadingPages || !keyword.trim()}
          className="h-7 text-xs"
        >
          {loadingPages
            ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Завантажую...</>
            : <><Globe className="mr-1 h-3 w-3" />{pages.length ? "Оновити конкурентів" : "Завантажити конкурентів"}</>}
        </Button>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[320px]">
        {/* ── Left: competitors ──────────────────────────────────────────────── */}
        <div className="border-b md:border-b-0 md:border-r border-border p-4 overflow-y-auto max-h-[480px]">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Заголовки конкурентів ({pages.length})
          </p>

          {!pages.length ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Globe className="h-9 w-9 opacity-20" />
              <p className="text-sm">Натисніть «Завантажити конкурентів»</p>
              <p className="text-xs opacity-60">Ключове слово береться з поля вище</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {pages.map((page) => {
                const isOpen = expanded.has(page.domain);
                const visible = page.headings.filter((h) => ["H1","H2","H3","H4"].includes(h.tag));
                return (
                  <div key={page.url} className="rounded-lg border border-border overflow-hidden">
                    {/* Domain toggle */}
                    <button
                      onClick={() => toggleDomain(page.domain)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                    >
                      {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      <span className="text-sm font-medium truncate flex-1">{page.domain}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">{visible.length} заг.</span>
                    </button>

                    {/* Headings list */}
                    {isOpen && (
                      <div className="border-t border-border bg-background divide-y divide-border/40">
                        {visible.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-2">Заголовків не знайдено</p>
                        ) : visible.map((h, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 px-3 py-1.5 group hover:bg-secondary/30 transition-colors ${LEFT_INDENT[h.tag] || ""}`}
                          >
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 px-1 shrink-0 mt-0.5 font-mono ${TAG_COLOR[h.tag] || ""}`}
                            >
                              {h.tag}
                            </Badge>
                            <span className="text-xs flex-1 leading-relaxed">{h.text}</span>
                            {["H2","H3","H4"].includes(h.tag) && (
                              <button
                                onClick={() => addFromCompetitor(h, page.domain)}
                                title="Додати до структури"
                                className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: my structure ────────────────────────────────────────────── */}
        <div className="p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Моя структура ({outline.length})
          </p>

          {/* Custom heading input */}
          <div className="flex items-center gap-2">
            <Select value={customTag} onValueChange={(v) => setCustomTag(v as "H2" | "H3" | "H4")}>
              <SelectTrigger className="w-[72px] h-8 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H2">H2</SelectItem>
                <SelectItem value="H3">H3</SelectItem>
                <SelectItem value="H4">H4</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-xs flex-1"
              placeholder="Свій заголовок..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <Button
              size="sm"
              onClick={addCustom}
              disabled={!customText.trim()}
              className="h-8 px-3 text-xs"
              title="Додати свій заголовок"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Додати
            </Button>
          </div>

          {/* Outline list */}
          <div className="flex-1 overflow-y-auto max-h-[360px] space-y-1.5 pr-0.5">
            {!outline.length ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <FileText className="h-9 w-9 opacity-20" />
                <p className="text-sm">Структура порожня</p>
                <p className="text-xs opacity-60">Додайте заголовки зліва або введіть свої</p>
              </div>
            ) : outline.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 rounded-lg px-2 py-1.5 border border-border hover:bg-secondary/30 transition-colors group ${RIGHT_INDENT[item.tag] || ""}`}
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] h-4 px-1 shrink-0 mt-0.5 font-mono ${TAG_COLOR[item.tag] || ""}`}
                >
                  {item.tag}
                </Badge>
                <span className="text-xs flex-1 leading-relaxed min-w-0 break-words">{item.text}</span>
                {item.source && (
                  <span className="text-[10px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-70 transition-opacity">
                    {item.source}
                  </span>
                )}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    title="Вгору"
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === outline.length - 1}
                    title="Вниз"
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    title="Видалити"
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {outline.length > 0 && (
            <button
              onClick={() => onOutlineChange([])}
              className="self-end text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Очистити структуру
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutlineBuilder;
