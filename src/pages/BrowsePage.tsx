import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Compass, Search, Tag } from "lucide-react";
import { Header } from "../components/Header";
import { MapThumbnail } from "../components/MapThumbnail";
import { TagEditor } from "../components/TagEditor";
import {
  tags as tagsAPI,
  netlifyImageUrl,
  BrowseResultDTO,
  TagNodeDTO,
} from "../api";

type Facet = BrowseResultDTO["facets"][number];

export default function BrowsePage() {
  const [selected, setSelected] = useState<TagNodeDTO[]>([]);
  const [untagged, setUntagged] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<BrowseResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [taggingMapId, setTaggingMapId] = useState<string | null>(null);

  const load = async (sel: TagNodeDTO[], untaggedOnly = false, q = "") => {
    setLoading(true);
    setResult(
      await tagsAPI.browse({
        nodes: sel.map((s) => s.key).join(","),
        ...(untaggedOnly ? { untagged: "true" } : {}),
        ...(q.trim() ? { q: q.trim() } : {}),
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => load(selected, untagged, query), 200);
    return () => clearTimeout(t);
  }, [selected.length, untagged, query]);

  const select = (node: {
    id?: string;
    key: string;
    name: string;
    kind?: string | null;
  }) => {
    if (selected.some((s) => s.key === node.key)) return;
    const next = [
      ...selected,
      {
        id: node.id || node.key,
        key: node.key,
        name: node.name,
        kind: node.kind ?? null,
      },
    ];
    setSelected(next);
    setUntagged(false);
    load(next, false, query);
  };

  const deselect = (key: string) => {
    const next = selected.filter((s) => s.key !== key);
    setSelected(next);
    load(next, untagged, query);
  };

  const showUntagged = (on: boolean) => {
    setUntagged(on);
    setSelected([]);
    load([], on, query);
  };

  const facetGroups = useMemo(() => {
    const groups = new Map<string, Facet[]>();
    for (const f of result?.facets || []) {
      const k = f.kind || "tag";
      groups.set(k, [...(groups.get(k) || []), f]);
    }
    return [...groups.entries()]
      .map(([kind, facets]) => ({
        kind,
        facets,
        total: facets.reduce((a, f) => a + f.count, 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [result]);

  return (
    <div className="min-h-screen bg-[#0a1a1d] text-[#d8e6de]">
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-10 pt-24">
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#79b7c4]" />
            <div>
              <h1 className="font-serif text-3xl">Browse the maps</h1>
              <p className="text-sm text-[#79b7c4]">
                Pick a tag, then narrow by the tags that appear alongside it.
              </p>
            </div>
          </div>
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#79b7c4]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, file, or tag…"
              className="w-full rounded border border-white/15 bg-white/5 py-3 pl-11 pr-4 text-base text-[#d8e6de] placeholder:text-[#79b7c4]/60 focus:border-teal-400/60 focus:outline-none"
            />
          </div>
        </div>

        {untagged && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => showUntagged(false)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-sm text-amber-200 hover:bg-amber-400/25"
            >
              untagged
              <span className="text-amber-300">×</span>
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selected.map((s) => (
              <button
                key={s.key}
                onClick={() => deselect(s.key)}
                className="inline-flex items-center gap-1 rounded-full border border-teal-400/60 bg-teal-400/15 px-3 py-1 text-sm text-teal-200 hover:bg-teal-400/25"
              >
                {s.name}
                <span className="text-teal-300">×</span>
              </button>
            ))}
            <button
              onClick={() => {
                setSelected([]);
                setUntagged(false);
                setQuery("");
                load([], false, "");
              }}
              className="text-xs text-[#79b7c4] underline-offset-2 hover:underline"
            >
              clear all
            </button>
          </div>
        )}

        {(facetGroups.length > 0 ||
          (!untagged && (result?.untaggedCount ?? 0) > 0)) && (
          <div className="mb-10 space-y-4">
            {!untagged && (result?.untaggedCount ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-[0.15em] text-[#79b7c4]/70">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => showUntagged(true)}
                    className="rounded-full border border-amber-400/30 px-3 py-1 text-sm text-amber-200/90 hover:border-amber-400/60"
                  >
                    Untagged
                    <span className="ml-1.5 text-xs text-amber-200/60">
                      {result?.untaggedCount}
                    </span>
                  </button>
                </div>
              </div>
            )}
            {facetGroups.map((g) => (
              <div key={g.kind}>
                <p className="mb-1.5 text-xs uppercase tracking-[0.15em] text-[#79b7c4]/70">
                  {g.kind === "tag" ? "Tags" : g.kind}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.facets.slice(0, 20).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => select(f)}
                      className="rounded-full border border-white/15 px-3 py-1 text-sm text-[#d8e6de]/90 hover:border-teal-400/60 hover:text-teal-200"
                    >
                      {f.name}
                      <span className="ml-1.5 text-xs text-[#79b7c4]/60">
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-[#79b7c4]">Loading…</p>
        ) : !result || result.maps.length === 0 ? (
          <p className="text-sm text-[#79b7c4]">
            {query.trim()
              ? `No maps match "${query.trim()}".`
              : untagged
                ? "Every map has been filed under a tag."
                : selected.length
                  ? "No maps match all of those tags yet."
                  : "No tagged maps yet. Be the first to file one."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.maps.map((m) => (
              <article
                key={m.id}
                className="overflow-hidden rounded-lg border border-white/10 bg-white/5"
              >
                <Link to={`/app/?configId=${m.id}`}>
                  <div className="flex aspect-video items-center justify-center bg-black/30 text-[#79b7c4]">
                    {m.s3Key ? (
                      <MapThumbnail title={m.title} s3Key={m.s3Key} />
                    ) : m.imageUrl ? (
                      <img
                        src={netlifyImageUrl(m.imageUrl, {
                          w: 640,
                          fit: "cover",
                        })}
                        alt={m.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">No image</span>
                    )}
                  </div>
                </Link>
                <div className="space-y-2 p-4">
                  <h2 className="truncate font-serif text-lg">{m.title}</h2>
                  <div className="flex flex-wrap gap-1">
                    {m.nodes.slice(0, 6).map((n) => (
                      <button
                        key={n.key}
                        onClick={() => select(n)}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#79b7c4] hover:border-teal-400/50 hover:text-teal-200"
                      >
                        {n.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#79b7c4]/60">
                      {m.user.username ? `by ${m.user.username}` : ""}
                    </span>
                    <button
                      onClick={() => setTaggingMapId(m.id)}
                      className="inline-flex items-center gap-1 text-xs text-[#79b7c4] hover:text-teal-200"
                    >
                      <Tag className="h-3 w-3" />
                      Tag
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {taggingMapId && (
        <TagEditor
          mapConfigId={taggingMapId}
          onClose={() => setTaggingMapId(null)}
          onChanged={() => load(selected, untagged, query)}
        />
      )}
    </div>
  );
}
