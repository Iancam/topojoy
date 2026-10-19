// type Section = "maps" | "flags" | "donations" | "orders";

import { Section } from "./AdminPage";

const NavItem = ({
  item,
  activeSection,
  setActiveSection,
  sections,
}: {
  item: Section;
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
  sections: Section[];
}) => {
  return (
    <button
      key={item.id}
      type="button"
      onClick={() => setActiveSection(item.id)}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${
        activeSection === item.id
          ? "bg-teal-700/50 text-white"
          : "text-text-muted hover:bg-white/10 hover:text-white"
      }`}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
      <span className="ml-auto text-[10px] bg-teal-800 text-teal-200 rounded-full px-1.5 py-0.5 font-mono">
        {sections.find((s) => s.id === item.id)?.items?.length || 0}
      </span>
    </button>
  );
};

export const Nav = ({
  user,
  activeSection,
  setActiveSection,
  sections,
}: {
  user: any;
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
  sections: Section[];
}) => {
  return (
    <aside className="w-52 shrink-0 theme-topojoy-dark bg-canvas text-text flex flex-col py-6 overflow-y-auto">
      <div className="px-4 mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-1">
          Admin
        </div>
        <div className="text-xs text-gray-400 truncate">
          {user?.primaryEmailAddress?.emailAddress}
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {sections.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            sections={sections}
          />
        ))}
      </nav>
    </aside>
  );
};
