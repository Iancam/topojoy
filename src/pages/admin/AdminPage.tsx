import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "../../components/Header";

import { admin } from "../../api";
import { FeatureFlagsSection } from "./FeatureFlagsSection";
import { AdminDonation, DonationsSection } from "./donationsSection";
import { MapsSection, AdminMapItem } from "./mapsSection";
import { Nav } from "./Nav";

type AdminFeatureFlag = {
  id: string;
  key: string;
  enabled: boolean;
  updatedAt: string;
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [maps, setMaps] = useState<AdminMapItem[] | null>(null);
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [updatingFlagKey, setUpdatingFlagKey] = useState<string | null>(null);
  const [creatingFlag, setCreatingFlag] = useState(false);
  const [createFlagKey, setCreateFlagKey] = useState("");
  const [createFlagEnabled, setCreateFlagEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("maps");
  const [donations, setDonations] = useState<AdminDonation[] | null>(null);
  const [donationsError, setDonationsError] = useState<string | null>(null);

  const isAdmin = isLoaded && (user?.publicMetadata as any)?.role === "admin";

  useEffect(() => {
    if (!isLoaded || !isAdmin) return;
    admin
      .mapsAll({})
      .then((data: AdminMapItem[]) => {
        setMaps(data);
      })
      .catch((e: any) => {
        setError(e.message);
      });

    admin
      .featureFlagsList()
      .then(setFlags)
      .catch((e: any) => setFlagsError(e.message));

    admin
      .donationsList()
      .then(setDonations)
      .catch((e: any) => setDonationsError(e.message));
  }, [isLoaded, isAdmin]);

  const handleToggleFlag = async (key: string, enabled: boolean) => {
    setFlagsError(null);
    setUpdatingFlagKey(key);

    const prev = flags;
    if (prev) {
      setFlags(
        prev.map((f) =>
          f.key === key
            ? { ...f, enabled, updatedAt: new Date().toISOString() }
            : f,
        ),
      );
    }

    try {
      const updated = await admin.featureFlagsUpdate({ key, enabled });
      setFlags((curr) =>
        (curr ?? []).map((f) => (f.key === key ? updated : f)),
      );
    } catch (e: any) {
      if (prev) setFlags(prev);
      setFlagsError(e?.message || "Failed to update flag");
    } finally {
      setUpdatingFlagKey(null);
    }
  };

  const handleCreateFlag = async () => {
    setFlagsError(null);

    const key = createFlagKey.trim().toLowerCase();
    if (!key) {
      setFlagsError("Flag key is required");
      return;
    }

    if (!/^[a-z0-9_\-.]{1,128}$/.test(key)) {
      setFlagsError(
        "Flag key may contain lowercase letters, numbers, underscore, dash, and dot",
      );
      return;
    }

    setCreatingFlag(true);
    try {
      const updated = await admin.featureFlagsUpdate({
        key,
        enabled: createFlagEnabled,
      });

      setFlags((curr) => {
        const next = [
          ...(curr ?? []).filter((f) => f.key !== updated.key),
          updated,
        ];
        return next.sort((a, b) => a.key.localeCompare(b.key));
      });
      setCreateFlagKey("");
      setCreateFlagEnabled(false);
    } catch (e: any) {
      setFlagsError(e?.message || "Failed to create flag");
    } finally {
      setCreatingFlag(false);
    }
  };

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
        <Nav
          user={user}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          maps={maps}
          flags={flags}
          donations={donations}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeSection === "maps" && (
            <MapsSection maps={maps} error={error} />
          )}
          {activeSection === "flags" && (
            <FeatureFlagsSection
              flags={flags}
              error={flagsError}
              updatingKey={updatingFlagKey}
              creating={creatingFlag}
              createKey={createFlagKey}
              createEnabled={createFlagEnabled}
              onCreateKeyChange={setCreateFlagKey}
              onCreateEnabledChange={setCreateFlagEnabled}
              onCreate={handleCreateFlag}
              onToggle={handleToggleFlag}
            />
          )}
          {activeSection === "donations" && (
            <DonationsSection
              donations={donations}
              error={donationsError}
              onAllocationCreated={(donationId, allocation) => {
                setDonations((curr) =>
                  (curr ?? []).map((d) =>
                    d.id === donationId
                      ? {
                          ...d,
                          allocations: [...d.allocations, allocation],
                          totalAmountDrawn:
                            d.totalAmountDrawn + allocation.amountDrawn,
                          effectiveAmountDrawn:
                            d.effectiveAmountDrawn +
                            (allocation.amountDrawn > 0
                              ? allocation.amountDrawn
                              : (allocation.maxAmountDrawn ?? 0)),
                        }
                      : d,
                  ),
                );
              }}
              onAllocationDeleted={(donationId, allocationId) => {
                setDonations((curr) =>
                  (curr ?? []).map((d) => {
                    if (d.id !== donationId) return d;
                    const removed = d.allocations.find(
                      (a) => a.id === allocationId,
                    );
                    return {
                      ...d,
                      allocations: d.allocations.filter(
                        (a) => a.id !== allocationId,
                      ),
                      effectiveAmountDrawn:
                        d.effectiveAmountDrawn - (removed?.maxAmountDrawn ?? 0),
                    };
                  }),
                );
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
