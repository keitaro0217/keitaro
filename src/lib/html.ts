export function cleanHtml(raw: string): string {
  return raw
    .replace(/^```html\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
