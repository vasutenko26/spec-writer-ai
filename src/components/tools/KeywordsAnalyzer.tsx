import { apiFetch } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tags, Loader2, Download, X, TrendingUp, Target, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/contexts/AppStateContext";
import { useHistory } from "@/contexts/HistoryContext";
import type { KeywordsCluster } from "@/contexts/AppStateContext";

const INTENT_COLORS: Record<string, string> = {
  "Комерційний":    "text-green-600 bg-green-500/10 border-green-500/30",
  "Інформаційний":  "text-blue-600 bg-blue-500/10 border-blue-500/30",
  "Навігаційний":   "text-yellow-600 bg-yellow-500/10 border-yellow-500/30",
  "Локальний":      "text-orange-600 bg-orange-500/10 border-orange-500/30",
};

const SEO_PRIORITY_COLORS: Record<string, string> = {
  "Високий":               "text-green-600",
  "Середній":              "text-yellow-600",
  "Низький / Довгостроково": "text-muted-foreground",
};

function exportToCsv(clusters: KeywordsCluster[], seed: string) {
  const rows: string[] = [
    '"Кластер","Ключове слово","Об\'єм","CPC","KD","Інтент","Ставка","Тип оголошення","SEO пріоритет"',
  ];
  for (const cluster of clusters) {
    for (const kw of cluster.keywords) {
      const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      rows.push(
        [
          escape(cluster.name),
          escape(kw.keyword),
          escape(kw.volume),
          escape(kw.cpc.toFixed(2)),
          escape(kw.difficulty),
          escape(cluster.intent),
          escape(kw.bid_recommendation),
          escape(kw.ad_type),
          escape(kw.seo_priority),
        ].join(","),
      );
    }
  }
  // UTF-8 BOM для корректного отображения кириллицы в Excel
  const csvContent = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keywords-${seed.slice(0, 30).replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV завантажено");
}

async function exportToExcel(keyword: string, region: string) {
  try {
    toast.loading("Генерація Excel файлу...");

    const response = await apiFetch("/api/keywords-research-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, region }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Помилка генерації Excel");
    }

    // Получаем blob из ответа
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${keyword.slice(0, 30).replace(/\s+/g, "-")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    toast.dismiss();
    toast.success("Excel файл завантажено");
  } catch (error) {
    toast.dismiss();
    toast.error(error instanceof Error ? error.message : "Помилка завантаження Excel");
  }
}

const ClusterTab = ({ cluster }: { cluster: KeywordsCluster }) => (
  <div className="space-y-4">
    {/* Cluster meta */}
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Badge variant="outline" className={`text-xs font-medium ${INTENT_COLORS[cluster.intent] ?? "text-muted-foreground"}`}>
        {cluster.intent}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {cluster.keywords.length} ключів · Об'єм: <strong>{cluster.total_volume.toLocaleString()}</strong> ·
        CPC: <strong>${cluster.avg_cpc.toFixed(2)}</strong> ·
        KD: <strong>{cluster.avg_difficulty}</strong> ·
        Score: <strong>{cluster.priority_score}</strong>
      </span>
    </div>

    {/* Keywords table */}
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-3 py-2 text-left text-xs font-semibold w-6">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Ключове слово</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Об'єм</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">CPC</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">KD</th>
              <th className="px-3 py-2 text-left text-xs font-semibold hidden md:table-cell">Ставка</th>
              <th className="px-3 py-2 text-left text-xs font-semibold hidden lg:table-cell">Тип оголошення</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">SEO</th>
            </tr>
          </thead>
          <tbody>
            {cluster.keywords.map((kw, i) => (
              <tr
                key={kw.keyword}
                className="border-b border-border/50 hover:bg-secondary/30 transition-colors even:bg-secondary/10"
              >
                <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-xs">{kw.keyword}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{kw.volume.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">${kw.cpc.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{kw.difficulty}</td>
                <td className="px-3 py-2 text-xs hidden md:table-cell max-w-[160px] truncate" title={kw.bid_recommendation}>
                  {kw.bid_recommendation}
                </td>
                <td className="px-3 py-2 text-xs hidden lg:table-cell max-w-[200px] truncate" title={kw.ad_type}>
                  {kw.ad_type}
                </td>
                <td className={`px-3 py-2 text-xs font-medium ${SEO_PRIORITY_COLORS[kw.seo_priority] ?? "text-muted-foreground"}`}>
                  {kw.seo_priority}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const KeywordsAnalyzer = () => {
  const { keywordsResult, setKeywordsResult } = useAppState();
  const { addEntry } = useHistory();
  const [keyword, setKeyword] = useState(keywordsResult?.seed ?? "");
  const [region, setRegion] = useState(keywordsResult?.region ?? "ru");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setKeywordsResult(null);

    try {
      const res = await apiFetch("/api/keywords-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);

      const result = { ...data, timestamp: Date.now() };
      setKeywordsResult(result);
      addEntry(
        "keywords",
        `«${keyword.trim()}» — ${data.total_keywords} ключів, ${data.clusters?.length ?? 0} кластерів`,
        result,
      );
      toast.success(`Зібрано ${data.total_keywords} ключів у ${data.clusters?.length ?? 0} кластерах`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка дослідження ключових слів");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            Параметри дослідження
          </CardTitle>
          <CardDescription>
            Збирає ключові слова через SE Ranking API і кластеризує за допомогою Claude AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="kw-seed">Seed-ключове слово</Label>
              <Input
                id="kw-seed"
                placeholder="Наприклад: купити ноутбук"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label>Регіон</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Росія</SelectItem>
                  <SelectItem value="ua">Україна</SelectItem>
                  <SelectItem value="us">США</SelectItem>
                  <SelectItem value="de">Німеччина</SelectItem>
                  <SelectItem value="pl">Польща</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={!keyword.trim() || isLoading}
            className="bg-hero-gradient border-0 text-white hover:opacity-90 w-full sm:w-auto"
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Збираю та кластеризую... (30–60 сек)</>
              : <><Tags className="mr-2 h-4 w-4" />Зібрати семантику</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {keywordsResult && (
        <div className="animate-fade-in space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">«{keywordsResult.seed}»</span>
              <span className="text-muted-foreground text-xs">
                · {keywordsResult.total_keywords} ключів · {keywordsResult.clusters.length} кластерів · регіон: {keywordsResult.region}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCsv(keywordsResult.clusters, keywordsResult.seed)}
                className="h-7 text-xs gap-1.5"
              >
                <Download className="h-3 w-3" />CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => exportToExcel(keywordsResult.seed, keywordsResult.region)}
                className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
              >
                <FileSpreadsheet className="h-3 w-3" />Excel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setKeywordsResult(null)}
                className="h-7 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />Очистити
              </Button>
            </div>
          </div>

          {/* Cluster overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {keywordsResult.clusters.slice(0, 4).map((c) => (
              <div key={c.name} className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-medium truncate mb-1" title={c.name}>{c.name}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${INTENT_COLORS[c.intent] ?? ""}`}>
                    {c.intent}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{c.keywords.length} кл.</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>Score {c.priority_score}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs per cluster */}
          <Tabs defaultValue={keywordsResult.clusters[0]?.name ?? ""}>
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto gap-1 flex-nowrap">
                {keywordsResult.clusters.map((c) => (
                  <TabsTrigger key={c.name} value={c.name} className="text-xs whitespace-nowrap">
                    {c.name}
                    <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 border-border">
                      {c.keywords.length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {keywordsResult.clusters.map((c) => (
              <TabsContent key={c.name} value={c.name}>
                <ClusterTab cluster={c} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default KeywordsAnalyzer;
