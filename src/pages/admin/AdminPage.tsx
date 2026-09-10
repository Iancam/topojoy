import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Header } from "../../components/Header";

import { admin } from "../../api";
import { FeatureFlagsSection } from "./FeatureFlagsSection";
import {
  AdminDonation,
  AdminGiftToken,
  DonationsSection,
} from "./donationsSection";
import { MapsSection, AdminMapItem } from "./mapsSection";
import { AdminOrder, OrdersSection } from "./ordersSection";
import { Nav } from "./Nav";

type AdminFeatureFlag = {
  id: string;
  key: string;
  enabled: boolean;
  updatedAt: string;
};
export type Section = {
  id: string;
  label: string;
  icon: string;
  items: any[];
  component: React.ReactNode;
};

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [maps, setMaps] = useState<AdminMapItem[] | null>(null);
  const [flags, setFlags] = useState<AdminFeatureFlag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<string>("maps");
  const [donations, setDonations] = useState<AdminDonation[] | null>(null);
  const [giftTokens, setGiftTokens] = useState<AdminGiftToken[] | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const isAdmin = isLoaded && (user?.publicMetadata as any)?.role === "admin";

  const refreshOrders = () => {
    admin
      .ordersList()
      .then(setOrders)
      .catch((e: any) => setOrdersError(e.message));
  };

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

    refreshOrders();
  }, [isLoaded, isAdmin]);

  const sections = [
    {
      id: "maps",
      items: maps,
      label: "All Maps",
      icon: "🗺️",
      component: <MapsSection maps={maps} error={error} />,
    },
    {
      id: "flags",
      items: flags,
      label: "Feature Flags",
      icon: "🚩",
      component: <FeatureFlagsSection flags={flags} setFlags={setFlags} />,
    },
    {
      id: "donations",
      items: donations,
      label: "Donations",
      icon: "💰",
      component: (
        <DonationsSection
          donations={donations}
          giftTokens={giftTokens}
          setDonations={setDonations}
          setGiftTokens={setGiftTokens}
        />
      ),
    },
    {
      id: "orders",
      items: orders,
      label: "Order History",
      icon: "📦",
      component: (
        <OrdersSection
          orders={orders}
          error={ordersError}
          onRefresh={refreshOrders}
        />
      ),
    },
  ];

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
          sections={sections}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {sections.find((s) => s.id === activeSection)?.component}
        </main>
      </div>
    </div>
  );
}
