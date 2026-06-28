import React from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { maps as mapAPI, netlifyImageUrl } from "../api";
import { MapThumbnail } from "../components/MapThumbnail";
export type MapListItem = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
  s3Key?: string | null;
};

export default function MyMaps() {
  const { userId } = useAuth();
  const [maps, setMaps] = React.useState<MapListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [removingIds, setRemovingIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!userId) return;
      setLoading(true);
      const json = await mapAPI.all({ userId });
      setMaps(json as MapListItem[]);
      setLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!userId) return;
    const confirmed = window.confirm(
      "Delete this map? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const json = await mapAPI.delete({ id, userId });

      setRemovingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setTimeout(() => {
        setMaps((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
        setRemovingIds((prev) => prev.filter((x) => x !== id));
      }, 300);
    } catch (e: any) {
      setError(e.message || "Failed to delete map");
    } finally {
      setDeletingId(null);
    }
  };

  if (!userId) {
    return <div className="p-6">You must be signed in to view your maps.</div>;
  }

  if (loading) {
    return <div className="p-6">Loading your maps…</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-700 bg-red-50 border border-red-200 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="min-h-screen p-6">
        <h1 className="text-2xl font-semibold mb-4">My Maps</h1>
        {!maps || maps.length === 0 ? (
          <div className="text-gray-600">You haven't created any maps yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((m) => (
              <article
                key={m.id}
                className={`rounded-lg border border-gray-200 bg-white shadow hover:shadow-md overflow-hidden transition-opacity duration-300 ${
                  removingIds.includes(m.id) ? "opacity-0" : "opacity-100"
                }`}
              >
                <Link to={`/app/?configId=${m.id}`}>
                  <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                    {m.s3Key ? (
                      <MapThumbnail title={m.title} s3Key={m.s3Key} />
                    ) : m.imageUrl ? (
                      <img
                        src={netlifyImageUrl(m.imageUrl, {
                          w: 640,
                          fit: "cover",
                        })}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm">No image</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <h2 className="text-lg font-medium text-gray-900 truncate">
                      {m.title}
                    </h2>

                    <div className="text-xs text-gray-500 truncate">
                      {m.filename}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-medium text-gray-700">
                          Updated:
                        </span>{" "}
                        {new Date(m.updatedAt).toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Created:
                        </span>{" "}
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        disabled={deletingId === m.id}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === m.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
