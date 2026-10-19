import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Compass, Search, Tag } from "lucide-react";
import { Header } from "../components/Header";
import { MapThumbnail } from "../components/MapThumbnail";
import { TagEditor } from "../components/TagEditor";
import { Chip } from "../components/ui/chip";
import { Input } from "../components/ui/input";
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
    <div className="theme-topojoy-dark min-h-screen bg-canvas text-text">
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-10 pt-24">
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-text-subtle" />
            <div>
              <h1 className="font-serif text-3xl">Browse the maps</h1>
              <p className="text-sm text-text-subtle">
                Pick a tag, then narrow by the tags that appear alongside it.
              </p>
            </div>
          </div>
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-subtle" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, file, or tag…"
              className="h-12 border-border bg-surface/70 pl-11 pr-4 text-base text-text placeholder:text-text-subtle/60"
            />
          </div>
        </div>

        {untagged && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Chip
              variant="warning"
              removable
              onClick={() => showUntagged(false)}
            >
              Untagged
            </Chip>
          </div>
        )}

        {selected.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {selected.map((s) => (
              <Chip
                key={s.key}
                variant="selected"
                removable
                onClick={() => deselect(s.key)}
              >
                {s.name}
              </Chip>
            ))}
            <button
              onClick={() => {
                setSelected([]);
                setUntagged(false);
                setQuery("");
                load([], false, "");
              }}
              className="text-xs text-text-subtle underline-offset-2 hover:underline"
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
                <p className="mb-1.5 text-xs uppercase tracking-[0.15em] text-text-subtle/70">
                  Status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip
                    variant="warning"
                    count={result?.untaggedCount}
                    onClick={() => showUntagged(true)}
                  >
                    Untagged
                  </Chip>
                </div>
              </div>
            )}
            {facetGroups.map((g) => (
              <div key={g.kind}>
                <p className="mb-1.5 text-xs uppercase tracking-[0.15em] text-text-subtle/70">
                  {g.kind === "tag" ? "Tags" : g.kind}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.facets.slice(0, 20).map((f) => (
                    <Chip key={f.key} count={f.count} onClick={() => select(f)}>
                      {f.name}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-text-subtle">Loading…</p>
        ) : !result || result.maps.length === 0 ? (
          <p className="text-sm text-text-subtle">
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
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <Link to={`/app/?configId=${m.id}`}>
                  <div className="flex aspect-video items-center justify-center bg-canvas/50 text-text-subtle">
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
                      <Chip
                        key={n.key}
                        variant="subtle"
                        size="sm"
                        onClick={() => select(n)}
                      >
                        {n.name}
                      </Chip>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-text-subtle/60">
                      {m.user.username ? `by ${m.user.username}` : ""}
                    </span>
                    <button
                      onClick={() => setTaggingMapId(m.id)}
                      className="inline-flex items-center gap-1 text-xs text-text-subtle hover:text-action-hover"
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
