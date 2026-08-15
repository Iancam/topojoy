import { admin, netlifyImageUrl } from "@/api";
import { MapThumbnail } from "../../components/MapThumbnail";
import { useMemo, useState } from "react";
import { Link } from "react-router";

const BASE_URL = "https://topojoy.studio";

export type AdminVariant = {
  id: string;
  title: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminMapItem = {
  id: string;
  title: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string | null;
  s3Key?: string | null;
  userId: string;
  status?: string | null;
  ownerEmail?: string | null;
  variants: AdminVariant[];
};

function statusBadge(status: string | null | undefined, variantCount: number) {
  if (status === "submitted") {
    if (variantCount > 0)
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700">
          variants ready
        </span>
      );
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
        submitted
      </span>
    );
  }
  return null;
}

function MapThumbBox({
  title,
  s3Key,
  imageUrl,
}: {
  title: string;
  s3Key?: string | null;
  imageUrl?: string | null;
}) {
  if (s3Key) return <MapThumbnail title={title} s3Key={s3Key} />;
  if (imageUrl)
    return (
      <img
        src={netlifyImageUrl(imageUrl, { w: 480, fit: "cover" })}
        alt={title}
        className="w-full h-full object-cover"
      />
    );
  return <span className="text-xs text-gray-400">No image</span>;
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 font-mono truncate flex-1 min-w-0">
        /choose/{url.split("/choose/")[1]}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        title="Copy shareable link"
        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors"
      >
        {copied ? "✓ copied" : "copy link"}
      </button>
    </div>
  );
}

function NotifyVariantsReadyButton({
  mapId,
  disabled,
}: {
  mapId: string;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const handleClick = async () => {
    setState("sending");
    try {
      await admin.notifyVariantsReady({ mapId });
      setState("sent");
      setTimeout(() => setState("idle"), 3000);
    } catch (e: any) {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label =
    state === "sending"
      ? "sending…"
      : state === "sent"
        ? "✓ sent"
        : state === "error"
          ? "failed — retry"
          : "notify submitter";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "sending"}
      title={
        disabled
          ? "No email on file for submitter"
          : "Email the submitter that their variants are ready for review"
      }
      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:hover:text-gray-500"
    >
      {label}
    </button>
  );
}

function SubmissionCard({ m }: { m: AdminMapItem }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Link to={`/app/?configId=${m.id}`} className="block">
        <div className="aspect-video bg-gray-100 flex items-center justify-center">
          <MapThumbBox title={m.title} s3Key={m.s3Key} imageUrl={m.imageUrl} />
        </div>
      </Link>
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/app/?configId=${m.id}`}
            className="text-sm font-medium text-gray-900 truncate hover:underline"
          >
            {m.title}
          </Link>
          {statusBadge(m.status, m.variants.length)}
        </div>
        {m.ownerEmail && (
          <div className="text-xs text-blue-500 truncate">{m.ownerEmail}</div>
        )}
        <div className="text-[10px] text-gray-300 font-mono truncate">
          userid: {m.userId}
        </div>
        <div className="text-xs text-gray-400">
          {new Date(m.updatedAt).toLocaleString()}
        </div>

        {m.variants.length > 0 && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
            >
              <span>{open ? "▾" : "▸"}</span>
              <span>
                {m.variants.length} variant{m.variants.length !== 1 ? "s" : ""}
              </span>
            </button>
            {open && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {m.variants.map((v) => (
                  <Link
                    key={v.id}
                    to={`/app/?configId=${v.id}`}
                    className="shrink-0 w-28 rounded border border-gray-200 overflow-hidden hover:border-teal-400 transition-colors"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <MapThumbBox
                        title={v.title}
                        s3Key={v.s3Key}
                        imageUrl={v.imageUrl}
                      />
                    </div>
                    <div className="px-1.5 py-1">
                      <p className="text-[10px] text-gray-700 truncate">
                        {v.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {m.variants.length > 0 && (
          <>
            <CopyLink url={`${BASE_URL}/choose/${m.id}`} />
            <div className="mt-1.5 flex items-center">
              <NotifyVariantsReadyButton
                mapId={m.id}
                disabled={!m.ownerEmail}
              />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function MapsSection({
  maps,
  error,
}: {
  maps: AdminMapItem[] | null;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const [showStandalones, setShowStandalones] = useState(false);

  const { submissions, standalones } = useMemo(() => {
    if (!maps) return { submissions: [], standalones: [] };
    const q = search.toLowerCase();
    const matchesSearch = (m: AdminMapItem) => {
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.filename?.toLowerCase().includes(q) ||
        m.userId.toLowerCase().includes(q) ||
        m.ownerEmail?.toLowerCase().includes(q) ||
        m.variants.some((v) => v.title.toLowerCase().includes(q))
      );
    };
    const filtered = maps.filter(matchesSearch);
    return {
      submissions: filtered.filter((m) => m.status === "submitted"),
      standalones: filtered.filter((m) => m.status !== "submitted"),
    };
  }, [maps, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">All Maps</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
            {standalones.length > 0 &&
              `, ${standalones.length} standalone${standalones.length !== 1 ? "s" : ""}`}
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
      ) : (
        <>
          {submissions.length === 0 && !search && (
            <div className="text-gray-400 text-sm">No submissions yet.</div>
          )}
          {submissions.length === 0 && search && (
            <div className="text-gray-400 text-sm">No submissions match.</div>
          )}
          {submissions.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Submissions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {submissions.map((m) => (
                  <SubmissionCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          )}

          {standalones.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowStandalones((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 mb-3"
              >
                <span>{showStandalones ? "▾" : "▸"}</span>
                <span>Standalone maps ({standalones.length})</span>
              </button>
              {showStandalones && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {standalones.map((m) => (
                    <SubmissionCard key={m.id} m={m} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
