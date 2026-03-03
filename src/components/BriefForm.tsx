import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, Download, Loader2 } from "lucide-react";

const BriefForm = () => {
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("uk");
  const [region, setRegion] = useState("ua");
  const [contentType, setContentType] = useState("article");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    // Simulate brief generation
    setTimeout(() => {
      setResult(`# Технічне завдання

## Ключове слово: "${keyword}"

### Рекомендовані параметри
- **Обсяг тексту:** 2500–3500 слів
- **Кількість заголовків H2:** 6–8
- **Кількість заголовків H3:** 10–15
- **Кількість абзаців:** 20–30
- **Кількість зображень:** 4–6

### Структура заголовків
1. Вступ — що таке ${keyword}
2. Основні переваги
3. Як це працює
4. Порівняння з аналогами
5. Практичні поради
6. Часті питання (FAQ)
7. Висновки

### SEO-вимоги
- Title: до 60 символів, включає "${keyword}"
- Meta Description: до 160 символів
- Density ключового слова: 1.5–2.5%
- LSI-ключові слова: включити 10–15 тематичних слів

### Конкуренти (ТОП-5)
1. example1.com — 3200 слів, 8 H2
2. example2.com — 2800 слів, 6 H2
3. example3.com — 4100 слів, 12 H2
4. example4.com — 2100 слів, 5 H2
5. example5.com — 3500 слів, 9 H2`);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Параметри для аналізу
          </CardTitle>
          <CardDescription>
            Введіть ключове слово та параметри для створення ТЗ на основі SERP-аналізу
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Ключове слово / тема</Label>
            <Input
              id="keyword"
              placeholder="Наприклад: як вибрати ноутбук для роботи"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Мова контенту</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uk">Українська</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label>Тип контенту</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Стаття</SelectItem>
                  <SelectItem value="landing">Лендінг</SelectItem>
                  <SelectItem value="product">Картка товару</SelectItem>
                  <SelectItem value="category">Категорія</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!keyword.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Аналізую SERP...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Створити ТЗ</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Результат — Технічне завдання
              </CardTitle>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Експорт
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-secondary/50 p-6">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{result}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BriefForm;
