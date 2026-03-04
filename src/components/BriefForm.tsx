import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BriefResult from "./BriefResult";

const BriefForm = () => {
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("uk");
  const [region, setRegion] = useState("ua");
  const [contentType, setContentType] = useState("article");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-brief", {
        body: { keyword, language, region, contentType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.content);
    } catch (e: any) {
      console.error("Brief generation error:", e);
      toast.error(e.message || "Помилка генерації ТЗ");
    } finally {
      setIsLoading(false);
    }
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
            Введіть ключове слово та параметри для створення ТЗ на основі AI-аналізу
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
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI аналізує та створює ТЗ...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" /> Створити ТЗ</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && <BriefResult content={result} />}
    </div>
  );
};

export default BriefForm;
