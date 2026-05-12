import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Image, Loader2, RefreshCw, Wand2, ChevronDown, ChevronUp } from "lucide-react";

interface ImagePlacement {
  afterHeading: string;
  prompt: string;
  altText: string;
  caption?: string;
}

interface GeneratedImage {
  placement: ImagePlacement;
  b64: string;
  mimeType: string;
  loading?: boolean;
  error?: string;
}

interface Props {
  content: string;
  keyword: string;
  onInsert: (updatedContent: string) => void;
}

const ImageGenerator = ({ content, keyword, onInsert }: Props) => {
  const [placements, setPlacements] = useState<ImagePlacement[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [planningImages, setPlanningImages] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [imageCount, setImageCount] = useState(3);

  async function planImages() {
    setPlanningImages(true);
    setPlacements([]);
    setImages([]);
    try {
      const res = await apiFetch("/api/plan-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, keyword, count: imageCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlacements(data.placements || []);
      toast.success(`Заплановано ${data.placements?.length} зображень`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setPlanningImages(false);
    }
  }

  async function generateAll() {
    if (!placements.length) return;
    setGeneratingAll(true);
    setImages(placements.map((p) => ({ placement: p, b64: "", mimeType: "", loading: true })));
    try {
      const res = await apiFetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: placements.map((p) => ({ prompt: p.prompt, position: p.afterHeading })),
          aspectRatio: "16:9",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages(
        data.images.map((img: { b64: string; mimeType: string }, i: number) => ({
          placement: placements[i],
          b64: img.b64,
          mimeType: img.mimeType,
          loading: false,
        }))
      );
      toast.success(`Згенеровано ${data.images.length} зображень`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
      setImages([]);
    } finally {
      setGeneratingAll(false);
    }
  }

  async function regenerateOne(index: number) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, loading: true, error: undefined } : img))
    );
    try {
      const res = await apiFetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompts: [{ prompt: placements[index].prompt, position: placements[index].afterHeading }],
          aspectRatio: "16:9",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? { ...img, b64: data.images[0].b64, mimeType: data.images[0].mimeType, loading: false }
            : img
        )
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Помилка";
      setImages((prev) =>
        prev.map((img, i) => (i === index ? { ...img, loading: false, error: msg } : img))
      );
      toast.error(msg);
    }
  }

  function insertIntoContent() {
    let updated = content;
    images.forEach(({ placement, b64, mimeType }) => {
      if (!b64) return;
      const imgMarkdown =
        `\n\n![${placement.altText}](data:${mimeType};base64,${b64})\n` +
        (placement.caption ? `*${placement.caption}*\n` : "");

      if (placement.afterHeading === "intro") {
        const firstParaEnd = updated.indexOf("\n\n");
        if (firstParaEnd !== -1) {
          updated = updated.slice(0, firstParaEnd) + imgMarkdown + updated.slice(firstParaEnd);
        }
      } else {
        const escaped = placement.afterHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const headingRegex = new RegExp(`(#{1,6}\\s+${escaped}[^\n]*\n)`, "i");
        updated = updated.replace(headingRegex, `$1${imgMarkdown}`);
      }
    });
    onInsert(updated);
    toast.success("Зображення вставлено в статтю");
  }

  const readyImages = images.filter((img) => img.b64 && !img.loading);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4 text-pink-500" />
            Генерація зображень
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((o) => !o)} className="h-7 text-xs">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Кількість:</span>
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setImageCount(n)}
                  className={`w-7 h-7 rounded border text-xs font-medium transition-colors
                    ${imageCount === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {n}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={planImages}
              disabled={planningImages || !content}
              className="gap-1"
            >
              {planningImages ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 text-pink-500" />
              )}
              {placements.length > 0 ? "Перепланувати" : "Автопланування"}
            </Button>

            {placements.length > 0 && images.length === 0 && (
              <Button
                size="sm"
                onClick={generateAll}
                disabled={generatingAll}
                className="gap-1 bg-pink-600 hover:bg-pink-700 text-white border-0"
              >
                {generatingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Image className="h-3.5 w-3.5" />
                )}
                Згенерувати {placements.length} зображень
              </Button>
            )}

            {readyImages.length > 0 && (
              <Button
                size="sm"
                onClick={insertIntoContent}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                Вставити в статтю ({readyImages.length})
              </Button>
            )}
          </div>

          {/* Placements list */}
          {placements.length > 0 && images.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Заплановані місця
              </p>
              {placements.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border bg-muted/10 text-xs">
                  <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                    після "{p.afterHeading}"
                  </Badge>
                  <span className="text-muted-foreground flex-1">{p.prompt.slice(0, 80)}…</span>
                </div>
              ))}
            </div>
          )}

          {/* Generated images grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {images.map((img, i) => (
                <div key={i} className="rounded-lg border overflow-hidden">
                  {img.loading ? (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : img.error ? (
                    <div className="aspect-video bg-red-500/5 flex items-center justify-center text-xs text-red-500 p-4 text-center">
                      {img.error}
                    </div>
                  ) : (
                    <img
                      src={`data:${img.mimeType};base64,${img.b64}`}
                      alt={img.placement.altText}
                      className="w-full aspect-video object-cover"
                    />
                  )}
                  <div className="p-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        після "{img.placement.afterHeading}"
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => regenerateOne(i)}
                        disabled={img.loading}
                        className="h-6 w-6 p-0 shrink-0"
                        title="Перегенерувати"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Alt: {img.placement.altText}</p>
                    {img.placement.caption && (
                      <p className="text-xs italic text-muted-foreground">{img.placement.caption}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ImageGenerator;
