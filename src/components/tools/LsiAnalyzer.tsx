import { apiFetch } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, X, TrendingUp, FileBarChart, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAppState } from "@/contexts/AppStateContext";
import { useHistory } from "@/contexts/HistoryContext";

function exportLsiToExcel(lsiResult: NonNullable<ReturnType<typeof useAppState>["lsiResult"]>) {
  const rows = lsiResult.words.map((w, i) => ({
    "№": i + 1,
    "Слово / фраза": w.word,
    [`Зустрічається в (з ${lsiResult.pagesAnalyzed})`]: w.docFreq,
    "Частота загальна": w.totalFreq,
    "Рекомендовано вжити": w.recommended,
    "Покриття ТОП (%)": Math.round((w.docFreq / lsiResult.pagesAnalyzed) * 100),
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "LSI-слова");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `lsi-${lsiResult.keyword.slice(0, 30)}.xlsx`);
  toast.success("Excel завантажено");
}

const scoreColor = (docFreq: number, total: number) => {
  const ratio = docFreq / Math.max(total, 1);
  if (ratio >= 0.7) return "text-green-600 bg-green-500/10 border-green-500/30";
  if (ratio >= 0.4) return "text-orange-500 bg-orange-500/10 border-orange-500/30";
  return "text-muted-foreground bg-secondary border-border";
};

const LsiAnalyzer = () => {
  const { lsiResult, setLsiResult } = useAppState();
  const { addEntry } = useHistory();
  const [keyword, setKeyword] = useState(lsiResult?.keyword || "");
  const [region, setRegion] = useState("ua");
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setLsiResult(null);

    try {
      const res = await apiFetch("/api/lsi-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
      const lsiWithTs = { ...data, timestamp: Date.now() };
      setLsiResult(lsiWithTs);
      addEntry("lsi", `«${keyword.trim()}» — ${data.words.length} LSI-слів з ${data.pagesAnalyzed} сторінок`, lsiWithTs);
      toast.success(`Проаналізовано ${data.pagesAnalyzed} сторінок, знайдено ${data.words.length} LSI-слів`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка LSI-аналізу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Параметри аналізу
          </CardTitle>
          <CardDescription>
            Збирає тексти з ТОП-10 результатів пошуку та визначає найчастотніші LSI-слова
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="lsi-kw">Ключове слово / тема</Label>
              <Input
                id="lsi-kw"
                placeholder="Наприклад: купити ноутбук для роботи"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAnalyze()}
              />
            </div>
            <div className="space-y-2">
              <Label>Регіон</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ua">Україна</SelectItem>
                  <SelectItem value="us">США</SelectItem>
                  <SelectItem value="eu">Європа</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={!keyword.trim() || isLoading}
            className="bg-hero-gradient border-0 text-white hover:opacity-90 w-full sm:w-auto"
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Аналізую ТОП-10...</>
              : <><Search className="mr-2 h-4 w-4" />Аналізувати LSI</>
            }
          </Button>
        </CardContent>
      </Card>

      {lsiResult && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  LSI-слова для "{lsiResult.keyword}"
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Проаналізовано {lsiResult.pagesAnalyzed} сторінок · {lsiResult.words.length} рекомендованих слів
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => exportLsiToExcel(lsiResult)} className="h-7 text-xs gap-1.5">
                  <Download className="h-3 w-3" />Excel
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLsiResult(null)} className="h-7 text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" />Очистити
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-2.5 text-left font-semibold text-xs w-8">#</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-xs">Слово / фраза</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-xs">Зустрічається в</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-xs">Частота</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-xs">Рекомендовано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lsiResult.words.map((w, i) => (
                      <tr key={w.word} className="border-b border-border/50 hover:bg-secondary/30 transition-colors even:bg-secondary/10">
                        <td className="px-4 py-2 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-2">
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium ${scoreColor(w.docFreq, lsiResult.pagesAnalyzed)}`}
                          >
                            {w.word}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-xs">{w.docFreq}/{lsiResult.pagesAnalyzed} сторінок</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">{w.totalFreq}</td>
                        <td className="px-4 py-2 text-right">
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                            {w.recommended} раз
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-secondary/30 border-t border-border text-xs text-muted-foreground">
                Зелені — зустрічаються у 70%+ сторінок ТОП. Оранжеві — у 40–70%. Сірі — рідше зустрічаються, але варто розглянути.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LsiAnalyzer;
