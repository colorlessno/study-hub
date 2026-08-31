import { useMemo, useState } from "react";
import { FilterButtons } from "./components/FilterButtons";
import { TaskList } from "./components/TaskList";
import type { Filter, Task } from "./types";

const tasks: Task[] = [
  { id: "1", title: "HTMLの構造を確認する", done: true, dueDate: "1日目" },
  { id: "2", title: "CSS Gridで一覧を並べる", done: false, dueDate: "2日目" },
  { id: "3", title: "props（親から子へ渡す値）を確認する", done: false, dueDate: "3日目" },
  { id: "4", title: "state（画面内で保持する状態）で表示条件を切り替える", done: true, dueDate: "3日目" },
];

export default function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const filteredTasks = useMemo(() => {
    if (filter === "active") {
      return tasks.filter((task) => !task.done);
    }
    if (filter === "done") {
      return tasks.filter((task) => task.done);
    }
    return tasks;
  }, [filter]);

  return (
    <main className="app-shell">
      <p className="sample-label">web09</p>
      <h1>Reactのデータ受渡し・状態・一覧表示</h1>
      <FilterButtons currentFilter={filter} onChange={setFilter} />
      <TaskList tasks={filteredTasks} />
    </main>
  );
}
