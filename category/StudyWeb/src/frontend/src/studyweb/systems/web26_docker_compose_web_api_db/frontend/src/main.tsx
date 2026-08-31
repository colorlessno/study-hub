import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:13026";

type Health = {
  ok: boolean;
  service: string;
};

type Task = {
  id: number;
  title: string;
  created_at: string;
};

function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadConnections() {
    setLoading(true);
    setError("");

    try {
      const healthResponse = await fetch(`${apiUrl}/health`);
      const tasksResponse = await fetch(`${apiUrl}/tasks`);
      if (!healthResponse.ok || !tasksResponse.ok) {
        throw new Error(`APIがHTTP ${healthResponse.status}/${tasksResponse.status}を返しました。`);
      }

      setHealth((await healthResponse.json()) as Health);
      setTasks((await tasksResponse.json()) as Task[]);
    } catch (loadError) {
      setHealth(null);
      setTasks([]);
      setError(loadError instanceof Error ? loadError.message : "APIへ接続できませんでした。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConnections();
  }, []);

  return (
    <main>
      <p>web26_docker_compose_web_api_db</p>
      <h1>Web画面・API・DBの接続</h1>
      <button type="button" onClick={() => void loadConnections()} disabled={loading}>
        {loading ? "確認中" : "接続を再確認"}
      </button>
      {error && <p className="error">接続エラー: {error}</p>}
      {health && (
        <section>
          <h2>APIの稼働状態</h2>
          <dl>
            <dt>状態</dt>
            <dd>{health.ok ? "正常" : "異常"}</dd>
            <dt>サービス</dt>
            <dd>{health.service}</dd>
          </dl>
        </section>
      )}
      {health && (
        <section>
          <h2>DBから取得したタスク</h2>
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                {task.id}: {task.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
