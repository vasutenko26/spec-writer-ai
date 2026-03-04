import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContentForm = () => {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState("informational");
  const [wordCount, setWordCount] = useState([2500]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { topic, keywords, tone, wordCount: wordCount[0] },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data.content);
    } catch (e: any) {
      console.error("Content generation error:", e);
      toast.error(e.message || "Помилка генерації контенту");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <div className="space-y-2">
            <Label htmlFor="topic">Тема статті</Label>
            <Input
              id="topic"
              placeholder="Наприклад: Як вибрати ноутбук для роботи у 2026 році"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Slider
                value={wordCount}
                onValueChange={setWordCount}
                min={500}
                max={5000}
                step={500}
                className="mt-3"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topic.trim() || isLoading}
            className="w-full bg-hero-gradient border-0 text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI генерує контент...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Згенерувати контент</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Згенерований контент
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Скопійовано" : "Копіювати"}
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

export default ContentForm;
