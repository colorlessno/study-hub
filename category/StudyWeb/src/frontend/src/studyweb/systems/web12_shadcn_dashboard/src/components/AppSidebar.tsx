import { BarChart3, ClipboardList, Home, Settings } from "lucide-react";

const items = [
  { label: "概要", icon: Home },
  { label: "タスク", icon: ClipboardList },
  { label: "レポート", icon: BarChart3 },
  { label: "設定", icon: Settings },
];

type AppSidebarProps = {
  currentSection: string;
  onSelect: (section: string) => void;
};

export function AppSidebar({ currentSection, onSelect }: AppSidebarProps) {
  return (
    <aside className="border-r border-slate-200 bg-white p-4 lg:min-h-screen">
      <p className="mb-6 text-sm font-bold text-slate-500">web12</p>
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm font-bold ${
                currentSection === item.label ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              type="button"
              aria-current={currentSection === item.label ? "page" : undefined}
              onClick={() => onSelect(item.label)}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
