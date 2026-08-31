import { useState } from "react";
import { AppSidebar } from "./components/AppSidebar";
import { DataTable } from "./components/DataTable";
import { Header } from "./components/Header";
import { StatCard } from "./components/StatCard";

const stats = [
  { label: "教材数", value: "31", note: "計画中のWeb教材" },
  { label: "完了", value: "12", note: "現在の画面確認地点" },
  { label: "未完了", value: "19", note: "APIと基盤構築の教材" },
];

export default function App() {
  const [currentSection, setCurrentSection] = useState("概要");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[240px_1fr]">
      <AppSidebar currentSection={currentSection} onSelect={setCurrentSection} />
      <div>
        <Header currentSection={currentSection} />
        <main className="grid gap-5 p-5">
          <p className="rounded-md border border-slate-200 bg-white px-4 py-3" aria-live="polite">
            「{currentSection}」を選択しています。
          </p>
          <section className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </section>
          <DataTable />
        </main>
      </div>
    </div>
  );
}
