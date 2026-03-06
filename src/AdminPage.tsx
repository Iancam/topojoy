import React from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "./components/Header";
import { MapThumbnail } from "./components/MapThumbnail";
import { admin } from "./api";

type AdminMapItem = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  userId: string;
};

type Section = "maps";

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "maps", label: "All Maps", icon: "🗺️" },
];

function MapsSection({
  maps,
  error,
}: {
  maps: AdminMapItem[] | null;
  error: string | null;
}) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!maps) return [];
    const q = search.toLowerCase();
    if (!q) return maps;
    return maps.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.filename?.toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q),
    );
  }, [maps, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Maps</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filtered.length} of {maps?.length ?? 0} maps
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by title, filename, or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!maps ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400 text-sm">No maps found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <Link to={`/app/?configId=${m.id}`}>
                <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                  {m.s3Key ? (
                    <MapThumbnail title={m.title} s3Key={m.s3Key} />
                  ) : m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt={m.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs">No image</span>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {m.title}
                  </h3>
                  <div className="text-xs text-gray-400 truncate">
                    {m.filename}
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono truncate">
                    {m.userId}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(m.updatedAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [maps, setMaps] = React.useState<AdminMapItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<Section>("maps");

  const isAdmin = isLoaded && (user?.publicMetadata as any)?.role === "admin";

  React.useEffect(() => {
    if (!isLoaded || !isAdmin) return;
    admin
      .mapsAll()
      .then(setMaps)
      .catch((e) => setError(e.message));
  }, [isLoaded, isAdmin]);

  if (!isLoaded) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      <div className="flex flex-1 overflow-hidden pt-[60px]">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 bg-[#071e25] text-[#d5f7ff] flex flex-col py-6 overflow-y-auto">
          <div className="px-4 mb-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-1">
              Admin
            </div>
            <div className="text-xs text-gray-400 truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${
                  activeSection === item.id
                    ? "bg-teal-700/50 text-white"
                    : "text-[#a0ccd6] hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === "maps" && maps && (
                  <span className="ml-auto text-[10px] bg-teal-800 text-teal-200 rounded-full px-1.5 py-0.5 font-mono">
                    {maps.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeSection === "maps" && (
            <MapsSection maps={maps} error={error} />
          )}
        </main>
      </div>
    </div>
  );
}
