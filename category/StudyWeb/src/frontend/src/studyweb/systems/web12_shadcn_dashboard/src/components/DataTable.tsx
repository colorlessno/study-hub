type Row = {
  id: string;
  name: string;
  status: "active" | "pending" | "done";
  updatedAt: string;
};

const rows: Row[] = [
  { id: "001", name: "HTML構造の確認", status: "done", updatedAt: "2026-04-28" },
  { id: "002", name: "React部品の分割", status: "active", updatedAt: "2026-04-28" },
  { id: "003", name: "API接続の確認", status: "pending", updatedAt: "2026-04-29" },
];

export function DataTable() {
  const statusNames = { active: "作業中", pending: "未着手", done: "完了" } as const;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">名称</th>
            <th className="px-4 py-3">状態</th>
            <th className="px-4 py-3">更新日</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-200">
              <td className="px-4 py-3 font-mono">{row.id}</td>
              <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
              <td className="px-4 py-3">{statusNames[row.status]}</td>
              <td className="px-4 py-3 text-slate-500">{row.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
