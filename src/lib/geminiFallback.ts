import { toast } from "sonner";
import { apiFetch } from "@/contexts/AuthContext";

export const GEMINI_MODELS = [
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   desc: "Найпотужніша" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Швидка, збалансована" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Максимальна швидкість" },
] as const;

export type GeminiModelId = typeof GEMINI_MODELS[number]["id"] | "auto";

export interface FallbackResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  modelUsed: string;
}

export async function callWithModelFallback(
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>,
  selectedModel: GeminiModelId,
  onModelChange?: (modelId: string, modelLabel: string) => void,
): Promise<FallbackResult> {
  const modelsToTry = selectedModel === "auto"
    ? GEMINI_MODELS.map((m) => m.id)
    : [selectedModel];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];
    const modelLabel = GEMINI_MODELS.find((m) => m.id === modelId)?.label ?? modelId;

    onModelChange?.(modelId, modelLabel);

    const res = await apiFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model: modelId }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = await res.json();

    if (res.ok) {
      return { data, modelUsed: data.modelUsed ?? modelId };
    }

    // Fallback: overloaded (503), rate-limited (429), or model not found (404) — try next
    const shouldFallback = (res.status === 503 || res.status === 429 || res.status === 404 || data.overloaded);
    if (shouldFallback && i < modelsToTry.length - 1) {
      const nextLabel = GEMINI_MODELS.find((m) => m.id === modelsToTry[i + 1])?.label ?? modelsToTry[i + 1];
      const reason = res.status === 404
        ? "модель недоступна"
        : res.status === 429
          ? "перевищено ліміт запитів"
          : "сервер перевантажений";
      toast.warning(`${modelLabel} — ${reason}, перемикаюсь на ${nextLabel}...`, {
        description: "Підбираємо доступну модель",
        duration: 4000,
      });
      continue;
    }

    throw new Error(data.error || `Помилка ${res.status}`);
  }

  throw new Error("Всі моделі Gemini тимчасово недоступні. Спробуйте пізніше.");
}
