import { FormEvent, useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:13020";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function loadTasks() {
    const response = await fetch(`${apiUrl}/tasks`);
    if (!response.ok) {
      throw new Error(`一覧取得に失敗しました: HTTP ${response.status}`);
    }
    setTasks((await response.json()) as Task[]);
  }

  useEffect(() => {
    loadTasks().catch((caught: Error) => setError(caught.message));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) {
        setError(`保存に失敗しました: HTTP ${response.status}`);
        return;
      }

      setTitle("");
      await loadTasks();
    } catch (caught) {
      setError(`通信に失敗しました: ${(caught as Error).message}`);
    }
  }

  return (
    <main className="app-shell">
      <p className="sample-label">web20</p>
      <h1>Reactフォームからタスクを保存</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="title">タスクタイトル</label>
        <div className="form-row">
          <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <button type="submit">作成</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </main>
  );
}
