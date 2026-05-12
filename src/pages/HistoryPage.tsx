import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  History, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Search, FileText, Sparkles, BarChart3,
  FileBarChart, Gauge, Network, Link2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useHistory,
  HISTORY_TOOL_LABELS,
  HISTORY_TOOL_COLORS,
  HistoryToolType,
} from "@/contexts/HistoryContext";

const TOOL_ICONS: Record<HistoryToolType, React.ElementType> = {
  serp: Search,
  brief: FileText,
  content: Sparkles,
  seo: BarChart3,
  lsi: FileBarChart,
  pagespeed: Gauge,
  cluster: Network,
  linking: Link2,
};

const STRING_TOOLS: HistoryToolType[] = ["brief", "content", "seo"];

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function FullDataView({ type, data }: { type: HistoryToolType; data: unknown }) {
  if (STRING_TOOLS.includes(type) && typeof data === "string") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
      </div>
    );
  }
  return (
    <pre className="text-xs bg-secondary/60 rounded-lg p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

const EntryCard = ({
  entry,
  onRemove,
}: {
  entry: ReturnType<typeof useHistory>["entries"][0];
  onRemove: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[entry.type];
  const colorClass = HISTORY_TOOL_COLORS[entry.type];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3 gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 border ${colorClass}`}>
                {HISTORY_TOOL_LABELS[entry.type]}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
            </div>
            <p className="text-sm text-foreground/80 mt-1 line-clamp-2 leading-snug">{entry.preview}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Згорнути" : "Розгорнути"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            title="Видалити"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          <FullDataView type={entry.type} data={entry.fullData} />
        </div>
      )}
    </div>
  );
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { entries, removeEntry, clearHistory } = useHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    clearHistory();
    setConfirmClear(false);
  };

  return (
    <AppLayout title="Моя Історія" icon={History}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Моя Історія</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {entries.length === 0
                ? "Ще немає збережених результатів"
                : `${entries.length} ${entries.length === 1 ? "запис" : entries.length < 5 ? "записи" : "записів"}`}
            </p>
          </div>
          {entries.length > 0 && (
            <Button
              variant={confirmClear ? "destructive" : "outline"}
              size="sm"
              onClick={handleClearAll}
              onBlur={() => setConfirmClear(false)}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmClear ? "Підтвердити очищення" : "Очистити всю Історію"}
            </Button>
          )}
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Ще нічого не збережено</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Результати аналізів та генерацій з'являться тут автоматично
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mt-2"
              >
                Перейти до інструментів
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Confirm clear warning */}
        {confirmClear && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Натисніть ще раз, щоб видалити всі {entries.length} записів. Або клікніть будь-де, щоб скасувати.
          </div>
        )}

        {/* Entries list */}
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
