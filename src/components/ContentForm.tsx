import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Copy, Check, Loader2, X, FileText, Download, Zap, Archive } from "lucide-react";
import { toast } from "sonner";
import { GEMINI_MODELS, callWithModelFallback, type GeminiModelId } from "@/lib/geminiFallback";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useAppState } from "@/contexts/AppStateContext";
import { useHistory } from "@/contexts/HistoryContext";
import { exportMarkdownToDocx } from "@/lib/exportDocx";
import ContentQuality from "@/components/tools/ContentQuality";
import ImageGenerator from "@/components/tools/ImageGenerator";
import WordPressModal from "@/components/WordPressModal";
import { getWpSettings } from "@/lib/wordpress";
import { useAuth, apiFetch } from "@/contexts/AuthContext";

// WP icon (inline SVG)
const WpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM3.73 12c0-1.25.27-2.43.74-3.5L8.1 19.47A8.28 8.28 0 0 1 3.73 12zm8.27 8.28c-.84 0-1.65-.12-2.42-.34l2.57-7.46 2.63 7.21c.02.04.04.08.06.11a8.3 8.3 0 0 1-2.84.48zm1.17-12.4c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.83 0-2.23-.11-2.23-.11-.46-.03-.52.65-.06.68 0 0 .44.05.91.08l1.34 3.68-1.89 5.66-3.14-9.34c.51-.03.97-.08.97-.08.46-.06.4-.72-.06-.69 0 0-1.37.11-2.26.11-.16 0-.34 0-.53-.01A8.28 8.28 0 0 1 12 3.72c2.17 0 4.15.83 5.63 2.19-.04 0-.07-.01-.11-.01-.83 0-1.42.72-1.42 1.5 0 .7.4 1.28.83 1.98.32.56.7 1.28.7 2.32 0 .72-.27 1.56-.63 2.72l-.83 2.76-3.0-8.34zm4.69 11.52-2.59-7.08.05-.14c.53-1.34.71-2.4.71-3.36 0-.35-.02-.67-.07-.97A8.27 8.27 0 0 1 20.27 12a8.27 8.27 0 0 1-3.41 6.94v.46z"/>
  </svg>
);

const ContentForm = () => {
  const { contentResult, setContentResult } = useAppState();
  const { addEntry } = useHistory();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [wpModalOpen, setWpModalOpen] = useState(false);
  const briefFromNav: string | undefined = (location.state as { briefText?: string } | null)?.briefText;

  const [topic, setTopic] = useState(briefFromNav || "");
  const [keywords, setKeywords] = useState("");
  const [briefLoaded, setBriefLoaded] = useState(!!briefFromNav);
  const [briefPreview, setBriefPreview] = useState(true);

  useEffect(() => {
    if (briefFromNav) {
      setTopic(briefFromNav);
      setBriefLoaded(true);
      toast.success("ТЗ завантажено — відредагуйте параметри і запустіть генерацію");
    }
  }, []);
  const [tone, setTone] = useState("informational");
  const [wordCount, setWordCount] = useState([2500]);
  const [geminiModel, setGeminiModel] = useState<GeminiModelId>("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPubId, setSavedPubId] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setActiveModel(null);
    setContentResult(null);
    setSavedPubId(null);

    try {
      const { data } = await callWithModelFallback(
        "/api/generate-content",
        { topic, keywords, tone, wordCount: wordCount[0] },
        geminiModel,
        (_id, label) => setActiveModel(label),
      );
      setContentResult(data.content);
      setActiveModel(GEMINI_MODELS.find((m) => m.id === data.modelUsed)?.label ?? data.modelUsed ?? null);
      addEntry("content", `${topic.trim().slice(0, 100)} — ~${wordCount[0]} слів`, data.content);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка генерації контенту");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!contentResult) return;
    navigator.clipboard.writeText(contentResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDocx = async () => {
    if (!contentResult) return;
    try {
      await exportMarkdownToDocx(contentResult, "article.docx");
      toast.success("Word-документ завантажено");
    } catch {
      toast.error("Помилка створення Word-документа");
    }
  };

  const savePublication = async () => {
    if (!contentResult) return;
    setSaving(true);
    try {
      const title = topic.split("\n")[0].slice(0, 120).trim() || "Без назви";
      const res = await apiFetch("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content_md: contentResult,
          status: "draft",
          tone: tone || null,
          meta_title: null,
          meta_description: null,
          slug: null,
          seo_score: null,
          project_id: null,
          folder_id: null,
          brief_id: null,
        }),
      });
      if (!res.ok) throw new Error("Помилка збереження");
      const data = await res.json();
      setSavedPubId(data.id);
      toast.success("Статтю збережено в «Мій контент»");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Параметри генерації
          </CardTitle>
          <CardDescription>
            Налаштуйте параметри для AI-генерації SEO-оптимізованого контенту
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {briefLoaded && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              <FileText className="h-4 w-4 shrink-0" />
              <span>ТЗ завантажено з інструменту "Генерація ТЗ"</span>
              <button
                onClick={() => { setTopic(""); setBriefLoaded(false); setBriefPreview(true); }}
                className="ml-auto text-xs underline opacity-70 hover:opacity-100"
              >
                Очистити
              </button>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="topic">{briefLoaded ? "ТЗ / Завдання для генерації" : "Тема статті"}</Label>
            {briefLoaded ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Режим перегляду / редагування</span>
                  <div className="flex rounded-md border overflow-hidden text-xs">
                    <button
                      onClick={() => setBriefPreview(true)}
                      className={`px-3 py-1 transition-colors ${briefPreview ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      Перегляд
                    </button>
                    <button
                      onClick={() => setBriefPreview(false)}
                      className={`px-3 py-1 transition-colors ${!briefPreview ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      Редагувати
                    </button>
                  </div>
                </div>
                {briefPreview ? (
                  <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-muted/10">
                    <article className="prose prose-sm max-w-none dark:prose-invert
                      prose-h1:text-xl prose-h1:font-bold
                      prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h2:mt-6
                      prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4
                      prose-table:text-xs
                      prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-th:border prose-th:border-border
                      prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
                      prose-p:leading-relaxed prose-li:leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic}</ReactMarkdown>
                    </article>
                  </div>
                ) : (
                  <Textarea
                    id="topic"
                    placeholder="Вставте ТЗ або опис статті..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={8}
                    className="font-mono text-xs"
                  />
                )}
              </div>
            ) : (
              <Input
                id="topic"
                placeholder="Наприклад: Як вибрати ноутбук для роботи у 2026 році"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Ключові слова (через кому)</Label>
            <Textarea
              id="keywords"
              placeholder="ноутбук для роботи, вибір ноутбука, найкращі ноутбуки 2026"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Тон тексту</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">Інформаційний</SelectItem>
                  <SelectItem value="commercial">Комерційний</SelectItem>
                  <SelectItem value="expert">Експертний</SelectItem>
                  <SelectItem value="casual">Розмовний</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Обсяг: {wordCount[0]} слів</Label>
              <Slider value={wordCount} onValueChange={setWordCount} min={500} max={5000} step={500} className="mt-3" />
            </div>
            <div className="space-y-2">
              <Label>Модель Gemini</Label>
              <Select value={geminiModel} onValueChange={(v) => setGeminiModel(v as GeminiModelId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">⚡ Автоматичний режим</SelectItem>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label} — {m.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI генерує контент...</span>
                {activeModel && (
                  <span className="text-xs opacity-75 flex items-center gap-1">
                    <Zap className="h-3 w-3" />Використовується: {activeModel}
                  </span>
                )}
              </div>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Згенерувати контент</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* WordPress publish modal */}
      {contentResult && (
        <WordPressModal
          open={wpModalOpen}
          onClose={() => setWpModalOpen(false)}
          content={contentResult}
        />
      )}

      {contentResult && (
        <ContentQuality
          text={contentResult}
          mainKeyword={keywords.split(",")[0]?.trim() || ""}
          lsiWords={keywords.split(",").map((k) => k.trim()).filter(Boolean)}
          metaTitle=""
          metaDescription=""
        />
      )}

      {contentResult && (
        <ImageGenerator
          content={contentResult}
          keyword={keywords.split(",")[0]?.trim() || topic.slice(0, 50)}
          onInsert={(updated) => setContentResult(updated)}
        />
      )}

      {contentResult && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Згенерований контент
                </CardTitle>
                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                  Збережено
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportDocx} className="h-8 text-xs">
                  <Download className="mr-1 h-3.5 w-3.5" />Word (.docx)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={savePublication}
                  disabled={saving || !!savedPubId}
                  className="h-8 text-xs gap-1"
                >
                  <Archive className="h-3.5 w-3.5" />
                  {savedPubId ? "✓ Збережено" : saving ? "Збереження..." : "Зберегти"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWpModalOpen(true)}
                  className={`h-8 text-xs gap-1 ${getWpSettings(currentUser?.username ?? "") ? "border-[#21759b]/40 text-[#21759b] hover:bg-[#21759b]/10" : ""}`}
                  title={getWpSettings(currentUser?.username ?? "") ? "Опублікувати в WordPress" : "Налаштувати WordPress"}
                >
                  <WpIcon className="h-3.5 w-3.5" />
                  {getWpSettings(currentUser?.username ?? "") ? "WordPress" : "Налаштувати WP"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs">
                  {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                  {copied ? "Скопійовано" : "Копіювати"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setContentResult(null)} className="h-8 text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" />Очистити
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm max-w-none dark:prose-invert
              prose-headings:scroll-mt-4
              prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
              prose-h2:text-xl prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mb-4 prose-h2:mt-8
              prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-6
              prose-table:text-xs
              prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-th:border prose-th:border-border
              prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
              prose-tr:even:bg-secondary/40
              prose-p:leading-relaxed
              prose-li:leading-relaxed
              prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}
                components={{
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto rounded-lg border border-border my-4 not-prose">
                      <table className="w-full text-sm border-collapse" {...props}>{children}</table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="bg-secondary px-3 py-2 text-left font-semibold border border-border text-xs" {...props}>{children}</th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="px-3 py-2 border border-border text-xs" {...props}>{children}</td>
                  ),
                  img: ({ src, alt, ...props }) => {
                    if (!src) return null;
                    return <img src={src} alt={alt || ""} {...props} className="max-w-full rounded-lg my-4 block" style={{ maxHeight: '500px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
                  },
                }}
              >
                {contentResult}
              </ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContentForm;
