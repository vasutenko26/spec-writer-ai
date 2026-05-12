// ── WordPress Integration ──────────────────────────────────────────────────────

export interface WpSettings {
  siteUrl: string;    // e.g. https://mysite.com
  username: string;   // WP login
  appPassword: string; // Application Password (with or without spaces)
}

export interface WpPublishResult {
  id: number;
  link: string;
  status: string;
}

const key = (username: string) => `cf_wp_${username}`;

export function getWpSettings(username: string): WpSettings | null {
  try {
    const raw = localStorage.getItem(key(username));
    return raw ? (JSON.parse(raw) as WpSettings) : null;
  } catch {
    return null;
  }
}

export function saveWpSettings(username: string, settings: WpSettings): void {
  localStorage.setItem(key(username), JSON.stringify(settings));
}

export function clearWpSettings(username: string): void {
  localStorage.removeItem(key(username));
}

/** Extract the first H1 from a Markdown string (returns empty string if not found) */
export function extractH1(markdown: string): string {
  const m = markdown.match(/^#\s+(.+)/m);
  return m ? m[1].replace(/\*\*/g, "").trim() : "";
}

/** Publish via server proxy (avoids CORS, converts MD→HTML on server) */
export async function publishToWordPress(
  settings: WpSettings,
  title: string,
  content: string,
  status: "draft" | "publish" = "draft"
): Promise<WpPublishResult> {
  const res = await apiFetch("/api/wp-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      siteUrl: settings.siteUrl.trim().replace(/\/+$/, ""),
      username: settings.username.trim(),
      appPassword: settings.appPassword.trim(),
      title: title.trim(),
      content,
      status,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Помилка ${res.status}`);
  return data as WpPublishResult;
}
