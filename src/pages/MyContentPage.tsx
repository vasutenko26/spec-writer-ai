import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { apiFetch, useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive, Plus, Folder, FolderOpen, Search, MoreHorizontal,
  FileText, Sparkles, Trash2, Pencil, Calendar, Tag, Globe, Share2,
  MousePointerClick, Eye, TrendingUp, Hash, Loader2, CheckCircle2, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import ContentQuality from "@/components/tools/ContentQuality";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FolderItem {
  id: number;
  name: string;
  project_id: number | null;
  parent_id: number | null;
  brief_count: number;
  publication_count: number;
  created_at: string;
}

interface Publication {
  id: number;
  title: string;
  status: "draft" | "review" | "published";
  tone: string | null;
  meta_title: string | null;
  meta_description: string | null;
  slug: string | null;
  seo_score: number | null;
  project_id: number | null;
  folder_id: number | null;
  brief_id: number | null;
  created_at: string;
  updated_at: string;
}

interface Brief {
  id: number;
  title: string;
  keyword: string | null;
  language: string | null;
  region: string | null;
  notes: string | null;
  project_id: number | null;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
}

interface GscRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  draft:     "border-slate-400/30 text-slate-400 bg-slate-500/5",
  review:    "border-amber-400/30 text-amber-500 bg-amber-500/5",
  published: "border-emerald-400/30 text-emerald-500 bg-emerald-500/5",
};

const STATUS_LABELS = {
  draft:     "Чернетка",
  review:    "На утвердженні",
  published: "Опубліковано",
};

// ── API helpers (exact ProjectsPage pattern) ──────────────────────────────────

const API = "/api";

async function apiGet(path: string) {
  const res = await apiFetch(`${API}${path}`);
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPost(path: string, body: object) {
  const res = await apiFetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPatch(path: string, body: object) {
  const res = await apiFetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiPut(path: string, body: object) {
  const res = await apiFetch(`${API}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

async function apiDelete(path: string) {
  const res = await apiFetch(`${API}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ── GSC mini-badges ───────────────────────────────────────────────────────────

const GscBadges = ({ row }: { row: GscRow }) => (
  <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-border/50">
    <span className="flex items-center gap-1 text-[11px] text-blue-500">
      <MousePointerClick className="h-3 w-3" />
      {row.clicks.toLocaleString()}
    </span>
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Eye className="h-3 w-3" />
      {row.impressions.toLocaleString()}
    </span>
    <span className="flex items-center gap-1 text-[11px] text-emerald-500">
      <TrendingUp className="h-3 w-3" />
      {(row.ctr * 100).toFixed(1)}%
    </span>
    <span className="flex items-center gap-1 text-[11px] text-amber-500">
      <Hash className="h-3 w-3" />
      {row.position.toFixed(1)}
    </span>
  </div>
);

// ── Publication Card ──────────────────────────────────────────────────────────

const PublicationCard = ({
  pub,
  projects,
  gscData,
  onOpen,
  onEdit,
  onStatusChange,
  onDelete,
  onAssignProject,
  onShare,
}: {
  pub: Publication;
  projects: { id: number; name: string }[];
  gscData: Map<string, GscRow> | null;
  onOpen: (pub: Publication) => void;
  onEdit: (pub: Publication, e: React.MouseEvent) => void;
  onStatusChange: (id: number, status: Publication["status"]) => void;
  onDelete: (id: number, title: string) => void;
  onAssignProject: (type: "publication" | "brief", id: number, currentProjectId: number | null) => void;
  onShare: (type: "publication" | "brief" | "folder", id: number) => void;
}) => {
  const gscRow = useMemo(() => {
    if (!gscData || !pub.slug) return null;
    const slug = pub.slug.replace(/^\/+/, "").replace(/\/+$/, "");
    for (const [page, row] of gscData) {
      const pagePath = page.replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "").replace(/\/+$/, "");
      if (pagePath === slug || page.endsWith(`/${slug}`) || page.endsWith(`/${slug}/`)) return row;
    }
    return null;
  }, [gscData, pub.slug]);

  return (
  <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer" onClick={() => onOpen(pub)}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <h3 className="font-semibold text-sm leading-snug flex-1 line-clamp-2">{pub.title}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-sm">Змінити статус</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(["draft", "review", "published"] as const).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={(e) => { e.stopPropagation(); onStatusChange(pub.id, s); }}
                  className={`text-sm ${pub.status === s ? "font-semibold" : ""}`}
                >
                  {STATUS_LABELS[s]}
                  {pub.status === s && " ✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => onEdit(pub, e)} className="text-sm">
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Редагувати
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignProject("publication", pub.id, pub.project_id); }} className="text-sm">
            <FolderOpen className="h-3.5 w-3.5 mr-2" />
            Прив'язати до проекту
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare("publication", pub.id); }} className="text-sm">
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Надати доступ
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(pub.id, pub.title); }}
            className="text-destructive focus:text-destructive text-sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div className="flex items-center gap-2 flex-wrap mb-3">
      <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-5 ${STATUS_COLORS[pub.status]}`}>
        {STATUS_LABELS[pub.status]}
      </Badge>
      {pub.tone && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-muted-foreground">
          {pub.tone}
        </Badge>
      )}
      {pub.project_id && projects.find((p) => p.id === pub.project_id) && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-violet-500 border-violet-400/30 bg-violet-500/5">
          {projects.find((p) => p.id === pub.project_id)?.name}
        </Badge>
      )}
    </div>

    {pub.meta_title && (
      <p className="text-xs text-muted-foreground mb-2 line-clamp-1 italic">
        {pub.meta_title}
      </p>
    )}

    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
      <span className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {formatDate(pub.created_at)}
      </span>
      {pub.seo_score != null && (
        <span className="flex items-center gap-1 text-emerald-500">
          SEO {pub.seo_score}
        </span>
      )}
    </div>
    {gscRow && <GscBadges row={gscRow} />}
  </div>
  );
};

// ── Brief Card ────────────────────────────────────────────────────────────────

const BriefCard = ({
  brief,
  projects,
  onOpen,
  onEdit,
  onDelete,
  onAssignProject,
  onShare,
}: {
  brief: Brief;
  projects: { id: number; name: string }[];
  onOpen: (brief: Brief) => void;
  onEdit: (brief: Brief, e: React.MouseEvent) => void;
  onDelete: (id: number, title: string) => void;
  onAssignProject: (type: "publication" | "brief", id: number, currentProjectId: number | null) => void;
  onShare: (type: "publication" | "brief" | "folder", id: number) => void;
}) => (
  <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer" onClick={() => onOpen(brief)}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <h3 className="font-semibold text-sm leading-snug flex-1 line-clamp-2">{brief.title}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={(e) => onEdit(brief, e)} className="text-sm">
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Редагувати
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignProject("brief", brief.id, brief.project_id); }} className="text-sm">
            <FolderOpen className="h-3.5 w-3.5 mr-2" />
            Прив'язати до проекту
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare("brief", brief.id); }} className="text-sm">
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Надати доступ
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(brief.id, brief.title); }}
            className="text-destructive focus:text-destructive text-sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div className="flex items-center gap-2 flex-wrap mb-3">
      {brief.keyword && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-blue-500 border-blue-400/30 bg-blue-500/5">
          <Tag className="h-2.5 w-2.5 mr-1" />
          {brief.keyword}
        </Badge>
      )}
      {brief.language && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-muted-foreground">
          {brief.language.toUpperCase()}
        </Badge>
      )}
      {brief.region && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-muted-foreground">
          <Globe className="h-2.5 w-2.5 mr-1" />
          {brief.region.toUpperCase()}
        </Badge>
      )}
      {brief.project_id && projects.find((p) => p.id === brief.project_id) && (
        <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 text-violet-500 border-violet-400/30 bg-violet-500/5">
          {projects.find((p) => p.id === brief.project_id)?.name}
        </Badge>
      )}
    </div>

    {brief.notes && (
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
        {brief.notes}
      </p>
    )}

    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Calendar className="h-3 w-3" />
      {formatDate(brief.created_at)}
    </div>
  </div>
);

// ── Folder sidebar item ───────────────────────────────────────────────────────

const FolderSidebarItem = ({
  folder,
  selected,
  onClick,
  onRename,
  onDelete,
}: {
  folder: FolderItem;
  selected: boolean;
  onClick: () => void;
  onRename: (folder: FolderItem) => void;
  onDelete: (folder: FolderItem) => void;
}) => (
  <div
    className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
      selected
        ? "bg-primary/10 text-primary"
        : "hover:bg-secondary text-foreground"
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {selected
        ? <FolderOpen className="h-4 w-4 shrink-0" />
        : <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      }
      <span className="text-sm truncate">{folder.name}</span>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-xs text-muted-foreground">
        {folder.brief_count + folder.publication_count}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onRename(folder); }}
            className="text-sm"
          >
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Перейменувати
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(folder); }}
            className="text-destructive focus:text-destructive text-sm"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Видалити
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const MyContentPage = () => {
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [gscData, setGscData] = useState<Map<string, GscRow> | null>(null);
  const [viewingPub, setViewingPub] = useState<Publication | null>(null);
  const [viewingPubContent, setViewingPubContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [viewingBrief, setViewingBrief] = useState<Brief | null>(null);
  const [viewingBriefContent, setViewingBriefContent] = useState<string>("");
  const [loadingBriefContent, setLoadingBriefContent] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);
  const [editPubContent, setEditPubContent] = useState("");
  const [editPubTitle, setEditPubTitle] = useState("");
  const [editPubPreview, setEditPubPreview] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingBrief, setEditingBrief] = useState<Brief | null>(null);
  const [editBriefNotes, setEditBriefNotes] = useState("");
  const [editBriefTitle, setEditBriefTitle] = useState("");

  // Assign project dialog
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);
  const [assigningItem, setAssigningItem] = useState<{ type: "publication" | "brief"; id: number } | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<string>("");

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingItem, setSharingItem] = useState<{ type: "publication" | "brief" | "folder"; id: number } | null>(null);
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [sharing, setSharing] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [shareSearchResult, setShareSearchResult] = useState<{ id: number; username: string; role?: string } | null | "not_found">(null);
  const [searchingUser, setSearchingUser] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [pubSearch, setPubSearch] = useState("");
  const [briefSearch, setBriefSearch] = useState("");

  // Folder dialogs
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [renameFolder, setRenameFolder] = useState<FolderItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(false);

  // Load all data on mount
  useEffect(() => {
    Promise.all([
      apiGet("/publications"),
      apiGet("/briefs"),
      apiGet("/folders"),
      apiGet("/projects"),
      apiGet("/auth/users-list"),
    ])
      .then(([pubs, brs, fols, projs, usrs]) => {
        setPublications(pubs);
        setBriefs(brs);
        setFolders(fols);
        setProjects(projs);
        setUsers((usrs as { id: number; username: string }[]).filter((u) => u.id !== currentUser?.id));
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Load GSC analytics silently (don't block the page)
  useEffect(() => {
    apiFetch("/api/gsc/status")
      .then((r) => r.ok ? r.json() : null)
      .then((status) => {
        if (!status?.connected || !status?.site_url) return;
        return apiFetch("/api/gsc/analytics?days=30").then((r) => r.ok ? r.json() : null);
      })
      .then((data) => {
        if (!data?.rows) return;
        const map = new Map<string, GscRow>();
        for (const row of data.rows as GscRow[]) map.set(row.page, row);
        setGscData(map);
      })
      .catch(() => { /* GSC errors are non-critical */ });
  }, []);

  // Filtered lists
  const filteredPublications = useMemo(() => {
    let list = publications;
    if (selectedFolder !== null) list = list.filter((p) => p.folder_id === selectedFolder);
    if (pubSearch.trim()) {
      const q = pubSearch.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    return list;
  }, [publications, selectedFolder, pubSearch]);

  const filteredBriefs = useMemo(() => {
    let list = briefs;
    if (selectedFolder !== null) list = list.filter((b) => b.folder_id === selectedFolder);
    if (briefSearch.trim()) {
      const q = briefSearch.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(q));
    }
    return list;
  }, [briefs, selectedFolder, briefSearch]);

  // ── Publication viewer ──────────────────────────────────────────────────────

  const openPublication = async (pub: Publication) => {
    setViewingPub(pub);
    setViewingPubContent("");
    setLoadingContent(true);
    try {
      const data = await apiGet(`/publications/${pub.id}`);
      setViewingPubContent(data.content_md || data.content || "");
    } catch {
      toast.error("Помилка завантаження");
    } finally {
      setLoadingContent(false);
    }
  };

  const openBrief = async (brief: Brief) => {
    setViewingBrief(brief);
    setViewingBriefContent("");
    setLoadingBriefContent(true);
    try {
      const data = await apiGet(`/briefs/${brief.id}`);
      let content = "";

      let parsed = data.content_json;
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { /* not JSON */ }
      }

      if (typeof parsed === "object" && parsed?.content) {
        content = parsed.content;
      } else if (typeof parsed === "string") {
        content = parsed;
      } else {
        content = data.content_json || "";
      }

      content = content.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
      setViewingBriefContent(content);
    } catch {
      toast.error("Помилка завантаження ТЗ");
    } finally {
      setLoadingBriefContent(false);
    }
  };

  const openEditPublication = async (pub: Publication, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPub(pub);
    setEditPubTitle(pub.title);
    setEditPubPreview(false);
    setSavingEdit(false);
    try {
      const data = await apiGet(`/publications/${pub.id}`);
      setEditPubContent(data.content_md || data.content || "");
    } catch { setEditPubContent(""); }
  };

  const openEditBrief = (brief: Brief, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBrief(brief);
    setEditBriefTitle(brief.title);
    setEditBriefNotes(brief.notes || "");
  };

  const savePublicationEdit = async () => {
    if (!editingPub) return;
    setSavingEdit(true);
    try {
      await apiPut(`/publications/${editingPub.id}`, { title: editPubTitle, content_md: editPubContent });
      setPublications((prev) => prev.map((p) => p.id === editingPub.id ? { ...p, title: editPubTitle } : p));
      toast.success("Збережено");
      setEditingPub(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSavingEdit(false);
    }
  };

  const saveBriefEdit = async () => {
    if (!editingBrief) return;
    setSavingEdit(true);
    try {
      await apiPut(`/briefs/${editingBrief.id}`, { title: editBriefTitle, notes: editBriefNotes });
      setBriefs((prev) => prev.map((b) => b.id === editingBrief.id ? { ...b, title: editBriefTitle, notes: editBriefNotes } : b));
      toast.success("Збережено");
      setEditingBrief(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Folder actions ──────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return toast.error("Введіть назву папки");
    setCreatingFolder(true);
    try {
      const folder = await apiPost("/folders", { name: newFolderName.trim() });
      setFolders((prev) => [folder, ...prev]);
      setShowNewFolder(false);
      setNewFolderName("");
      toast.success("Папку створено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!renameFolder || !renameName.trim()) return;
    setRenamingFolder(true);
    try {
      await apiPut(`/folders/${renameFolder.id}`, { name: renameName.trim() });
      setFolders((prev) =>
        prev.map((f) => f.id === renameFolder.id ? { ...f, name: renameName.trim() } : f)
      );
      setRenameFolder(null);
      toast.success("Папку перейменовано");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Видалити папку «${folder.name}»?`)) return;
    try {
      await apiDelete(`/folders/${folder.id}`);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      if (selectedFolder === folder.id) setSelectedFolder(null);
      toast.success("Папку видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  // ── Publication actions ─────────────────────────────────────────────────────

  const handleStatusChange = async (id: number, status: Publication["status"]) => {
    try {
      await apiPatch(`/publications/${id}/status`, { status });
      setPublications((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      toast.success("Статус оновлено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  const handleDeletePublication = async (id: number, title: string) => {
    if (!confirm(`Видалити публікацію «${title}»?`)) return;
    try {
      await apiDelete(`/publications/${id}`);
      setPublications((prev) => prev.filter((p) => p.id !== id));
      toast.success("Видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  // ── Assign project ──────────────────────────────────────────────────────────

  const handleOpenAssignProject = (type: "publication" | "brief", id: number, currentProjectId: number | null) => {
    setAssigningItem({ type, id });
    setAssignProjectId(currentProjectId ? String(currentProjectId) : "0");
    setAssignProjectOpen(true);
  };

  const handleSaveAssignProject = async () => {
    if (!assigningItem) return;
    const project_id = assignProjectId === "0" ? null : Number(assignProjectId);
    const path = assigningItem.type === "publication"
      ? `/publications/${assigningItem.id}/project`
      : `/briefs/${assigningItem.id}/project`;
    try {
      await apiPatch(path, { project_id });
      if (assigningItem.type === "publication") {
        setPublications((prev) => prev.map((p) => p.id === assigningItem.id ? { ...p, project_id } : p));
      } else {
        setBriefs((prev) => prev.map((b) => b.id === assigningItem.id ? { ...b, project_id } : b));
      }
      toast.success("Прив'язано до проекту");
      setAssignProjectOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  // ── Share item ───────────────────────────────────────────────────────────────

  const handleOpenShare = (type: "publication" | "brief" | "folder", id: number) => {
    setSharingItem({ type, id });
    setSharePermission("view");
    setShareSearchQuery("");
    setShareSearchResult(null);
    setShareOpen(true);
  };

  const searchUser = () => {
    if (!shareSearchQuery.trim()) return;
    setSearchingUser(true);
    setShareSearchResult(null);
    const found = users.find((u) => u.username.toLowerCase() === shareSearchQuery.trim().toLowerCase());
    setShareSearchResult(found ? { id: found.id, username: found.username } : "not_found");
    setSearchingUser(false);
  };

  const shareItem = async () => {
    if (!sharingItem || !shareSearchResult || shareSearchResult === "not_found") return;
    setSharing(true);
    try {
      await apiPost("/shares", {
        shared_user_id: shareSearchResult.id,
        item_type: sharingItem.type,
        item_id: sharingItem.id,
        permission: sharePermission,
      });
      toast.success(`Доступ надано користувачу @${shareSearchResult.username}`);
      setShareOpen(false);
      setShareSearchQuery("");
      setShareSearchResult(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    } finally {
      setSharing(false);
    }
  };

  // ── Brief actions ───────────────────────────────────────────────────────────

  const handleDeleteBrief = async (id: number, title: string) => {
    if (!confirm(`Видалити ТЗ «${title}»?`)) return;
    try {
      await apiDelete(`/briefs/${id}`);
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      toast.success("Видалено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Мій контент" icon={Archive}>
      <div className="flex gap-6 min-h-[calc(100vh-120px)]">

        {/* ── Left sidebar — Folders ── */}
        <aside className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Папки</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { setNewFolderName(""); setShowNewFolder(true); }}
              title="Нова папка"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-0.5">
            {/* "All" item */}
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                selectedFolder === null
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary text-foreground"
              }`}
              onClick={() => setSelectedFolder(null)}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 shrink-0" />
                <span className="text-sm">Всі</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {publications.length + briefs.length}
              </span>
            </div>

            {/* Folder list */}
            {folders.map((folder) => (
              <FolderSidebarItem
                key={folder.id}
                folder={folder}
                selected={selectedFolder === folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                onRename={(f) => { setRenameFolder(f); setRenameName(f.name); }}
                onDelete={handleDeleteFolder}
              />
            ))}

            {folders.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground px-3 py-2">Папок ще немає</p>
            )}
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="publications">
            <TabsList className="mb-4">
              <TabsTrigger value="publications" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Публікації
                {publications.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({publications.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="briefs" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                ТЗ
                {briefs.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({briefs.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Publications tab ── */}
            <TabsContent value="publications" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Пошук публікацій..."
                  value={pubSearch}
                  onChange={(e) => setPubSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loading ? (
                <SkeletonCards />
              ) : filteredPublications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {pubSearch || selectedFolder !== null ? "Нічого не знайдено" : "Публікацій ще немає"}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {pubSearch || selectedFolder !== null
                      ? "Спробуйте змінити пошуковий запит або виберіть іншу папку"
                      : "Згенеруйте статтю в інструменті Контент — вона з'явиться тут після збереження"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPublications.map((pub) => (
                    <PublicationCard
                      key={pub.id}
                      pub={pub}
                      projects={projects}
                      gscData={gscData}
                      onOpen={openPublication}
                      onEdit={openEditPublication}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeletePublication}
                      onAssignProject={handleOpenAssignProject}
                      onShare={handleOpenShare}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Briefs tab ── */}
            <TabsContent value="briefs" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Пошук ТЗ..."
                  value={briefSearch}
                  onChange={(e) => setBriefSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loading ? (
                <SkeletonCards />
              ) : filteredBriefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {briefSearch || selectedFolder !== null ? "Нічого не знайдено" : "ТЗ ще немає"}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {briefSearch || selectedFolder !== null
                      ? "Спробуйте змінити пошуковий запит або виберіть іншу папку"
                      : "Створіть бріф в інструменті ТЗ — він з'явиться тут після збереження"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBriefs.map((brief) => (
                    <BriefCard
                      key={brief.id}
                      brief={brief}
                      projects={projects}
                      onOpen={openBrief}
                      onEdit={openEditBrief}
                      onDelete={handleDeleteBrief}
                      onAssignProject={handleOpenAssignProject}
                      onShare={handleOpenShare}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── New folder dialog ── */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" />
              Нова папка
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Назва папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Скасувати</Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder}>
              {creatingFolder ? "Створення..." : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename folder dialog ── */}
      <Dialog open={!!renameFolder} onOpenChange={(open) => !open && setRenameFolder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Перейменувати папку
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Нова назва"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolder(null)}>Скасувати</Button>
            <Button onClick={handleRenameFolder} disabled={renamingFolder}>
              {renamingFolder ? "Збереження..." : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign project dialog ── */}
      <Dialog open={assignProjectOpen} onOpenChange={setAssignProjectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Прив'язати до проекту</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={assignProjectId} onValueChange={setAssignProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть проект..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">— Без проекту —</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleSaveAssignProject}>
              Зберегти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share dialog ── */}
      <Dialog open={shareOpen} onOpenChange={(o) => { if (!o) { setShareOpen(false); setShareSearchQuery(""); setShareSearchResult(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Надати доступ</DialogTitle>
            <DialogDescription>
              Користувач побачить цей елемент у своєму «Мій контент»
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ім'я користувача</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Введіть username..."
                  value={shareSearchQuery}
                  onChange={(e) => { setShareSearchQuery(e.target.value); setShareSearchResult(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") searchUser(); }}
                />
                <Button variant="outline" size="sm" onClick={searchUser} disabled={searchingUser || !shareSearchQuery.trim()}>
                  {searchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Знайти"}
                </Button>
              </div>
              {shareSearchResult === "not_found" && (
                <p className="text-xs text-red-500 mt-2">Користувача не знайдено</p>
              )}
              {shareSearchResult && shareSearchResult !== "not_found" && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium">@{shareSearchResult.username}</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Рівень доступу</label>
              <Select value={sharePermission} onValueChange={(v) => setSharePermission(v as "view" | "edit")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Перегляд</SelectItem>
                  <SelectItem value="edit">Редагування</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={shareItem} disabled={sharing || !shareSearchResult || shareSearchResult === "not_found"}>
              {sharing ? "Надання доступу..." : "Надати доступ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Publication viewer ── */}
      <Dialog open={!!viewingPub} onOpenChange={(o) => { if (!o) { setViewingPub(null); setViewingPubContent(""); setShowQuality(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="flex-1">{viewingPub?.title}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuality((o) => !o)}
                className="shrink-0 text-xs gap-1"
              >
                <BarChart2 className="h-3.5 w-3.5" />
                {showQuality ? "Сховати аналіз" : "Аналіз якості"}
              </Button>
            </div>
          </DialogHeader>
          {loadingContent ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <>
              {showQuality && viewingPubContent && (
                <div className="border-b pb-4 mb-4">
                  <ContentQuality
                    text={viewingPubContent}
                    mainKeyword=""
                    metaTitle={viewingPub?.meta_title || ""}
                    metaDescription={viewingPub?.meta_description || ""}
                  />
                </div>
              )}
              <article className="prose prose-sm max-w-none dark:prose-invert
                prose-h1:text-xl prose-h1:font-bold
                prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h2:mt-6
                prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4
                prose-table:text-xs prose-th:bg-secondary prose-th:px-3 prose-th:py-2
                prose-th:border prose-th:border-border prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
                prose-p:leading-relaxed prose-li:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                  img: ({ src, alt, ...props }) => {
                    if (!src) return null;
                    return <img src={src} alt={alt || ""} {...props} className="max-w-full rounded-lg my-4 block" style={{ maxHeight: '500px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
                  },
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
                }}>{viewingPubContent}</ReactMarkdown>
              </article>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Brief viewer ── */}
      <Dialog open={!!viewingBrief} onOpenChange={(o) => { if (!o) { setViewingBrief(null); setViewingBriefContent(""); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingBrief?.title}</DialogTitle>
          </DialogHeader>
          {loadingBriefContent ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <article className="prose prose-sm max-w-none dark:prose-invert
              prose-h1:text-xl prose-h1:font-bold
              prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h2:mt-6
              prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4
              prose-table:text-xs prose-th:bg-secondary prose-th:px-3 prose-th:py-2
              prose-th:border prose-th:border-border prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
              prose-p:leading-relaxed prose-li:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                img: ({ src, alt, ...props }) => {
                  if (!src) return null;
                  return <img src={src} alt={alt || ""} {...props} className="max-w-full rounded-lg my-4 block" style={{ maxHeight: '500px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
                },
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
              }}>{viewingBriefContent}</ReactMarkdown>
            </article>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit publication ── */}
      <Dialog open={!!editingPub} onOpenChange={(o) => { if (!o) setEditingPub(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редагування публікації</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Назва</label>
              <Input value={editPubTitle} onChange={(e) => setEditPubTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Контент</label>
                <div className="flex rounded-md border overflow-hidden text-xs">
                  <button
                    onClick={() => setEditPubPreview(false)}
                    className={`px-3 py-1 transition-colors ${!editPubPreview ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >Редагувати</button>
                  <button
                    onClick={() => setEditPubPreview(true)}
                    className={`px-3 py-1 transition-colors ${editPubPreview ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >Перегляд</button>
                </div>
              </div>
              {editPubPreview ? (
                <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto bg-muted/10">
                  <article className="prose prose-sm max-w-none dark:prose-invert
                    prose-h1:text-xl prose-h1:font-bold
                    prose-h2:text-lg prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h2:mt-6
                    prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4
                    prose-table:text-xs prose-th:bg-secondary prose-th:px-3 prose-th:py-2
                    prose-th:border prose-th:border-border prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
                    prose-p:leading-relaxed prose-li:leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{
                      img: ({ src, alt, ...props }) => {
                        if (!src) return null;
                        return <img src={src} alt={alt || ""} {...props} className="max-w-full rounded-lg my-4 block" style={{ maxHeight: '500px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
                      },
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
                    }}>{editPubContent}</ReactMarkdown>
                  </article>
                </div>
              ) : (
                <Textarea
                  value={editPubContent}
                  onChange={(e) => setEditPubContent(e.target.value)}
                  rows={20}
                  className="font-mono text-xs"
                />
              )}
            </div>
            <Button className="w-full" onClick={savePublicationEdit} disabled={savingEdit}>
              {savingEdit ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit brief ── */}
      <Dialog open={!!editingBrief} onOpenChange={(o) => { if (!o) setEditingBrief(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редагування ТЗ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Назва</label>
              <Input value={editBriefTitle} onChange={(e) => setEditBriefTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Нотатки</label>
              <Textarea
                value={editBriefNotes}
                onChange={(e) => setEditBriefNotes(e.target.value)}
                rows={4}
                placeholder="Додаткові вимоги або коментарі..."
              />
            </div>
            <Button className="w-full" onClick={saveBriefEdit} disabled={savingEdit}>
              {savingEdit ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MyContentPage;
