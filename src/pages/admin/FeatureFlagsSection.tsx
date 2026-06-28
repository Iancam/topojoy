type AdminFeatureFlag = {
  id: string;
  key: string;
  enabled: boolean;
  updatedAt: string;
};

export function FeatureFlagsSection({
  flags,
  error,
  updatingKey,
  creating,
  createKey,
  createEnabled,
  onCreateKeyChange,
  onCreateEnabledChange,
  onCreate,
  onToggle,
}: {
  flags: AdminFeatureFlag[] | null;
  error: string | null;
  updatingKey: string | null;
  creating: boolean;
  createKey: string;
  createEnabled: boolean;
  onCreateKeyChange: (value: string) => void;
  onCreateEnabledChange: (value: boolean) => void;
  onCreate: () => Promise<void>;
  onToggle: (key: string, enabled: boolean) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Feature Flags</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Control app behavior without deploys.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm font-medium text-gray-900 mb-3">
          Create feature flag
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={createKey}
            onChange={(e) => onCreateKeyChange(e.target.value)}
            placeholder="example_flag_key"
            className="w-72 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={createEnabled}
              onChange={(e) => onCreateEnabledChange(e.target.checked)}
            />
            Enabled
          </label>
          <button
            type="button"
            disabled={creating}
            onClick={onCreate}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              creating
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!flags ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : flags.length === 0 ? (
        <div className="text-gray-400 text-sm">No flags yet.</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {flags.map((flag) => {
            const isUpdating = updatingKey === flag.key;
            return (
              <div
                key={flag.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 font-mono truncate">
                    {flag.key}
                  </div>
                  <div className="text-xs text-gray-400">
                    Updated {new Date(flag.updatedAt).toLocaleString()}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onToggle(flag.key, !flag.enabled)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    flag.enabled
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {isUpdating
                    ? "Saving…"
                    : flag.enabled
                      ? "Enabled"
                      : "Disabled"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
