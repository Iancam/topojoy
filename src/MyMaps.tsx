import React from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "./components/Header";

export type MapListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
};

export default function MyMaps() {
  const { userId } = useAuth();
  const [maps, setMaps] = React.useState<MapListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/.netlify/functions/map-all?userId=${encodeURIComponent(userId)}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load maps (${res.status})`);
        }
        const json = await res.json();
        if (json.success && mounted) {
          setMaps(json.data as MapListItem[]);
        } else if (mounted) {
          setError(json.message || "Failed to load maps");
        }
      } catch (e: any) {
        if (mounted) setError(e.message || "Network error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

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
                className="rounded-lg border border-gray-200 bg-white shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                  {/* Placeholder for future thumbnail */}
                  <span className="text-sm">No image</span>
                </div>
                <div className="p-4">
                  <Link to={`/app/?configId=${m.id}`}>
                    <h2 className="text-lg font-medium text-gray-900 truncate">
                      {m.title}
                    </h2>
                  </Link>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
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
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
