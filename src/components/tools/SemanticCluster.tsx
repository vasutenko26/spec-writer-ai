import { apiFetch } from "@/contexts/AuthContext";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Network, Loader2, X, Tag, Unlink, Download, Square } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAppState } from "@/contexts/AppStateContext";

const CLUSTER_COLORS = [
  "bg-blue-500/10 border-blue-500/30 text-blue-600",
  "bg-purple-500/10 border-purple-500/30 text-purple-600",
  "bg-green-500/10 border-green-500/30 text-green-600",
  "bg-orange-500/10 border-orange-500/30 text-orange-600",
  "bg-pink-500/10 border-pink-500/30 text-pink-600",
  "bg-teal-500/10 border-teal-500/30 text-teal-600",
];

function formatEta(seconds: number) {
  if (seconds < 60) return `~${seconds} сек`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `~${m} хв ${s} сек` : `~${m} хв`;
}

function exportToExcel(clusterResult: NonNullable<ReturnType<typeof useAppState>["clusterResult"]>) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Clusters
  const clusterRows: Record<string, string | number>[] = [];
  clusterResult.clusters.forEach((cluster, i) => {
    clusterRows.push({
      "Кластер №": i + 1,
      "Головне слово": cluster.mainKeyword,
      "Кількість ключів": cluster.keywords.length,
      "Всі ключові слова": cluster.keywords.join(" | "),
      "Спільні URL": cluster.commonUrls.join(" | "),
    });
  });
  if (clusterRows.length) {
    const ws1 = XLSX.utils.json_to_sheet(clusterRows);
    ws1["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 70 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Кластери");
  }

  // Sheet 2: Unclustered
  if (clusterResult.unclustered.length) {
    const ws2 = XLSX.utils.json_to_sheet(
      clusterResult.unclustered.map((kw) => ({ "Унікальний запит (окрема сторінка)": kw }))
    );
    ws2["!cols"] = [{ wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Унікальні запити");
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), "semantic-clusters.xlsx");
  toast.success("Excel завантажено");
}

const SemanticCluster = () => {
  const { clusterResult, setClusterResult } = useAppState();
  const [rawKeywords, setRawKeywords] = useState("");
  const [region, setRegion] = useState("ua");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string; eta: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const kwList = rawKeywords.split("\n").map((k) => k.trim()).filter(Boolean);
  const kwCount = kwList.length;

  const handleCluster = async () => {
    if (kwCount < 2) return;
    setIsLoading(true);
    setProgress({ done: 0, total: kwCount, current: "", eta: 0 });
    setClusterResult(null);

    abortRef.current = new AbortController();

    try {
      const res = await apiFetch("/api/semantic-cluster-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: kwList.slice(0, 5000), region }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Помилка ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: typeof clusterResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "progress") {
              setProgress({ done: event.done, total: event.total, current: event.keyword, eta: event.eta || 0 });
            } else if (event.type === "result") {
              finalResult = { clusters: event.clusters, unclustered: event.unclustered, total: event.total, timestamp: Date.now() };
            }
          } catch { /* skip malformed line */ }
        }
      }

      if (finalResult) {
        setClusterResult(finalResult);
        toast.success(
          `Знайдено ${finalResult.clusters.length} кластер${finalResult.clusters.length !== 1 ? "ів" : ""} з ${finalResult.total} ключових слів`
        );
      }
    } catch (e: unknown) {
      if ((e as Error).name === "AbortError") {
        toast.info("Кластеризацію скасовано");
      } else {
        toast.error(e instanceof Error ? e.message : "Помилка кластеризації");
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Семантична кластеризація
          </CardTitle>
          <CardDescription>
            Порівнює пошукову видачу для кожного ключа: слова з 3+ спільними URL об'єднуються в кластер.
            Черга запитів із затримкою 2–4 с для захисту SearXNG від блокування.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="cluster-kw">
                Ключові слова
                <span className="ml-1.5 text-xs text-muted-foreground">(кожне з нового рядка, макс. 5000)</span>
              </Label>
              <Textarea
                id="cluster-kw"
                placeholder={"купити ноутбук\nноутбук для роботи\nкращі ноутбуки 2026\nноутбук ціна\nноутбук огляд"}
                value={rawKeywords}
                onChange={(e) => setRawKeywords(e.target.value)}
                rows={8}
                className="font-mono text-sm resize-y"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {kwCount > 0
                  ? `${kwCount} ключових слів · Орієнтовний час: ~${Math.ceil(kwCount * 3 / 60)} хв`
                  : "Введіть ключові слова"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Регіон</Label>
              <Select value={region} onValueChange={setRegion} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ua">Україна</SelectItem>
                  <SelectItem value="us">США</SelectItem>
                  <SelectItem value="eu">Європа</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Запити йдуть послідовно з 2–4 с паузою між ними — так Google не блокує SearXNG.
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleCluster}
              disabled={kwCount < 2 || isLoading}
              className="bg-hero-gradient border-0 text-white hover:opacity-90"
            >
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Кластеризую...</>
                : <><Network className="mr-2 h-4 w-4" />Кластеризувати</>
              }
            </Button>
            {isLoading && (
              <Button variant="outline" size="default" onClick={handleCancel} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                <Square className="h-3.5 w-3.5" />
                Зупинити
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {isLoading && progress && (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Оброблено {progress.done} / {progress.total} фраз
                </span>
                <span className="text-muted-foreground">
                  {progress.total > 0 ? `${Math.round((progress.done / progress.total) * 100)}%` : ""}
                  {progress.eta > 0 && ` · залишилось ${formatEta(progress.eta)}`}
                </span>
              </div>
              <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} className="h-2" />
              {progress.current && (
                <p className="text-xs text-muted-foreground truncate">
                  Зараз: <span className="font-mono text-foreground">"{progress.current}"</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {clusterResult && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-sm py-1 px-3">
                {clusterResult.clusters.length} кластер{clusterResult.clusters.length !== 1 ? "ів" : ""}
              </Badge>
              {clusterResult.unclustered.length > 0 && (
                <Badge variant="outline" className="text-sm py-1 px-3">
                  {clusterResult.unclustered.length} унікальних
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToExcel(clusterResult)}
                className="h-8 text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Експорт в Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setClusterResult(null)} className="h-8 text-xs text-muted-foreground">
                <X className="h-3 w-3 mr-1" />Очистити
              </Button>
            </div>
          </div>

          {clusterResult.clusters.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {clusterResult.clusters.map((cluster, i) => {
                const colorClass = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
                const [bg, border, text] = colorClass.split(" ");
                return (
                  <Card key={cluster.mainKeyword} className={`border ${border}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm flex items-center gap-2 ${text}`}>
                        <Tag className="h-4 w-4 shrink-0" />
                        Кластер {i + 1}
                        <Badge variant="outline" className="ml-auto text-xs">
                          {cluster.keywords.length} ключів
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className={`space-y-3 rounded-b-xl ${bg}`}>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Головне слово</p>
                        <span className="font-semibold text-sm">{cluster.mainKeyword}</span>
                      </div>
                      {cluster.keywords.length > 1 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Пов'язані ключі</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cluster.keywords.slice(1).map((kw) => (
                              <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {cluster.commonUrls.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Спільні URL</p>
                          <div className="space-y-0.5">
                            {cluster.commonUrls.slice(0, 3).map((url) => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                                className="block text-xs text-primary hover:underline truncate">
                                {url.replace(/^https?:\/\//, "").slice(0, 60)}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {clusterResult.unclustered.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Unlink className="h-4 w-4" />
                  Унікальні запити (немає перетинів — кожен потребує окремої сторінки)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {clusterResult.unclustered.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SemanticCluster;
