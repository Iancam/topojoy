type Section = "maps" | "flags" | "donations";

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "maps", label: "All Maps", icon: "🗺️" },
  { id: "flags", label: "Feature Flags", icon: "🚩" },
  { id: "donations", label: "Donations", icon: "💰" },
];

const NavItem = ({
  item,
  activeSection,
  setActiveSection,
  maps,
  flags,
  donations,
}: {
  item: { id: string; label: string; icon: React.ReactNode };
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<Section>>;
  maps?: any[] | null;
  flags?: any[] | null;
  donations?: any[] | null;
}) => {
  const length =
    item.id === "maps"
      ? maps?.length
      : item.id === "flags"
        ? flags?.length
        : item.id === "donations"
          ? donations?.length
          : 0;
  return (
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
      {item.id === "flags" && flags && (
        <span className="ml-auto text-[10px] bg-teal-800 text-teal-200 rounded-full px-1.5 py-0.5 font-mono">
          {flags.length}
        </span>
      )}
      {item.id === "donations" && donations && (
        <span className="ml-auto text-[10px] bg-teal-800 text-teal-200 rounded-full px-1.5 py-0.5 font-mono">
          {donations.length}
        </span>
      )}
    </button>
  );
};

export const Nav = ({
  user,
  activeSection,
  setActiveSection,
  maps,
  flags,
  donations,
}: {
  user: any;
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<Section>>;
  maps?: any[] | null;
  flags?: any[] | null;
  donations?: any[] | null;
}) => {
  return (
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
          <NavItem
            key={item.id}
            item={item}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            maps={maps}
            flags={flags}
            donations={donations}
          />
        ))}
      </nav>
    </aside>
  );
};
