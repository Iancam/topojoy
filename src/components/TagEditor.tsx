import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { X } from "lucide-react";
import { tags as tagsAPI, TagPathDTO, TagNodeDTO } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Segment = { name: string; kind?: string; existing?: TagNodeDTO };

export function TagEditor({
  mapConfigId,
  onClose,
  onChanged,
}: {
  mapConfigId: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { isSignedIn } = useAuth();
  const [paths, setPaths] = useState<TagPathDTO[] | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<TagNodeDTO[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPaths = async () => {
    setPaths(await tagsAPI.mapTags({ mapConfigId }));
  };

  useEffect(() => {
    loadPaths();
  }, [mapConfigId]);

  useEffect(() => {
    const q = input.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setSuggestions(await tagsAPI.suggest({ q }));
      setHighlight(0);
    }, 200);
    return () => clearTimeout(t);
  }, [input]);

  const addSegment = (seg: Segment) => {
    if (!seg.name.trim()) return;
    setSegments((s) => [...s, { ...seg, name: seg.name.trim() }]);
    setInput("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const save = async () => {
    if (!segments.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      await tagsAPI.assign({
        mapConfigId,
        path: segments.map(({ name, kind }) => ({ name, kind })),
      });
      setSegments([]);
      await loadPaths();
      onChanged?.();
    } catch (e: any) {
      setError(e.message || "Failed to save tag");
    } finally {
      setSaving(false);
    }
  };

  const removePath = async (id: string) => {
    await tagsAPI.deleteAssignment({ id });
    await loadPaths();
    onChanged?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab" || e.key === "/") {
      e.preventDefault();
      if (suggestions.length) {
        const s = suggestions[highlight];
        addSegment({ name: s.name, existing: s, kind: s.kind ?? undefined });
      } else {
        addSegment({ name: input });
      }
    } else if (e.key === "Backspace" && !input && segments.length) {
      setSegments((s) => s.slice(0, -1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Tag this map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
          {paths && paths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Filed under
              </p>
              {paths.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-sm text-gray-800">
                      {p.path.map((n, i) => (
                        <React.Fragment key={n.id}>
                          {i > 0 && (
                            <span className="text-gray-400 text-xs">/</span>
                          )}
                          <span>{n.name}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      by {p.taggedBy || "someone"}
                    </div>
                  </div>
                  {p.mine && (
                    <button
                      type="button"
                      onClick={() => removePath(p.id)}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isSignedIn ? (
            <p className="text-sm text-gray-500">
              Sign in to file this map under your own tags.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Add a path
              </p>
              <div className="relative">
                <div className="flex flex-wrap items-center gap-1.5 rounded border-2 border-gray-400 bg-gray-50 px-2 py-2 focus-within:border-teal-600 focus-within:bg-white">
                  {segments.map((seg, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <span className="text-gray-400 text-xs">/</span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-sm text-teal-900">
                        {seg.name}
                        {!seg.existing && (
                          <span className="text-[10px] text-teal-500">new</span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setSegments((s) => s.filter((_, j) => j !== i))
                          }
                          className="text-teal-600 hover:text-teal-900"
                        >
                          ×
                        </button>
                      </span>
                    </React.Fragment>
                  ))}
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={
                      segments.length
                        ? "next segment…"
                        : "e.g. colvig / spruce / 2026 — type a tag, / or Enter to nest"
                    }
                    className="h-auto min-w-[140px] flex-1 border-none bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
                {suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded border border-gray-200 bg-white shadow-lg">
                    {suggestions.map((s, i) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addSegment({
                              name: s.name,
                              existing: s,
                              kind: s.kind ?? undefined,
                            });
                          }}
                          onMouseEnter={() => setHighlight(i)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                            i === highlight ? "bg-teal-50" : ""
                          }`}
                        >
                          <span>{s.name}</span>
                          {s.kind && (
                            <span className="text-xs text-gray-400">
                              {s.kind}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {segments.some((s) => !s.existing && !s.kind) && (
                <div className="flex flex-wrap gap-2">
                  {segments.map((seg, i) =>
                    !seg.existing && !seg.kind ? (
                      <input
                        key={i}
                        value={seg.kind || ""}
                        onChange={(e) =>
                          setSegments((s) =>
                            s.map((x, j) =>
                              j === i ? { ...x, kind: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder={`kind for "${seg.name}" (optional)`}
                        list="tag-kinds"
                        className="w-48 rounded border border-gray-400 bg-gray-50 px-2 py-1 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-teal-600 focus:bg-white"
                      />
                    ) : null,
                  )}
                  <datalist id="tag-kinds">
                    {[
                      "camp",
                      "dorm",
                      "session",
                      "term",
                      "year",
                      "trail",
                      "region",
                      "person",
                    ].map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={save}
                  disabled={!segments.length || saving}
                  className="rounded bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save tag"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
