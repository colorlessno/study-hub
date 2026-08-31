import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:13019";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/tasks`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<Task[]>;
      })
      .then(setTasks)
      .catch((caught: Error) => setError(caught.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="app-shell">
      <p className="sample-label">web19</p>
      <h1>ReactからAPIを呼んで一覧表示</h1>
      {loading && <p>読み込み中です。</p>}
      {error && <p className="error">取得に失敗しました: {error}</p>}
      {!loading && !error && (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              {task.title} <span>{task.done ? "完了" : "未完了"}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
