"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { KnowledgeSource } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const fetcher = (url: string) => api.get<{ sources: KnowledgeSource[]; total: number; page: number }>(url);

function statusBadge(status: KnowledgeSource["status"]) {
  const map: Record<string, "green" | "amber" | "red" | "gray"> = {
    active: "green", processing: "amber", pending: "gray", failed: "red",
  };
  return <Badge variant={map[status] ?? "gray"}>{status}</Badge>;
}

export default function KnowledgePage() {
  const { data, mutate, isLoading } = useSWR("/api/v1/knowledge/sources?limit=50", fetcher, { refreshInterval: 5000 });
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function ingest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("name", name);
      if (fileRef.current?.files?.[0]) {
        form.append("file", fileRef.current.files[0]);
      } else if (url.trim()) {
        form.append("url", url.trim());
      } else {
        alert("Provide a file or URL");
        return;
      }
      await api.postForm("/api/v1/knowledge/ingest", form);
      setName(""); setUrl("");
      if (fileRef.current) fileRef.current.value = "";
      mutate();
    } finally {
      setUploading(false);
    }
  }

  async function deleteSource(id: string) {
    if (!confirm("Remove this knowledge source?")) return;
    await api.delete(`/api/v1/knowledge/sources/${id}`);
    mutate();
  }

  async function reingest(id: string) {
    await api.post(`/api/v1/knowledge/sources/${id}/reingest`, {});
    mutate();
  }

  const inputCls = "w-full bg-bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors";

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Knowledge Base</h1>
        <p className="text-sm text-text-secondary mt-0.5">Documents the agent uses to answer questions</p>
      </div>

      <div className="bg-bg-surface border border-border rounded-xl p-5 mb-5">
        <p className="text-sm font-semibold text-text-primary mb-4">Add a source</p>
        <form onSubmit={ingest} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Display name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Product FAQ" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Upload file (PDF or Markdown)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.md,.markdown"
                className="w-full text-sm text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-bg-elevated file:text-text-secondary hover:file:bg-bg-hover cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Or enter a URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." type="url" className={inputCls} />
            </div>
          </div>
          <Button type="submit" disabled={uploading || !name.trim()}>
            {uploading && <Spinner className="w-3.5 h-3.5" />}
            {uploading ? "Ingesting…" : "Add source"}
          </Button>
        </form>
      </div>

      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Sources</p>
          <span className="text-xs text-text-muted">{data?.total ?? 0} total</span>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center"><Spinner className="w-5 h-5 text-text-muted" /></div>
        ) : !data?.sources.length ? (
          <p className="text-sm text-text-muted text-center py-8">No sources yet. Add one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-base text-xs text-text-muted font-medium">
                <th className="px-5 py-2.5 text-left">Name</th>
                <th className="px-3 py-2.5 text-left">Type</th>
                <th className="px-3 py-2.5 text-left">Status</th>
                <th className="px-3 py-2.5 text-right">Chunks</th>
                <th className="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.sources.map((s) => (
                <tr key={s.id} className="hover:bg-bg-hover/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-primary truncate max-w-xs">{s.name}</p>
                    {s.error_message && <p className="text-xs text-danger mt-0.5 truncate">{s.error_message}</p>}
                  </td>
                  <td className="px-3 py-3 text-text-muted">{s.source_type}</td>
                  <td className="px-3 py-3">{statusBadge(s.status)}</td>
                  <td className="px-3 py-3 text-right text-text-muted">{s.chunk_count}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => reingest(s.id)}>Re-ingest</Button>
                      <Button variant="danger" size="sm" onClick={() => deleteSource(s.id)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
