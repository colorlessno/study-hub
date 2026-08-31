type Task = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
};

async function fetchTasks(simulateFailure = false): Promise<Task[]> {
  if (simulateFailure) {
    throw new Error("学習用にデータ取得失敗を再現しました。");
  }
  return [
    { id: "1", title: "サーバー側の部品で取得する", status: "done" },
    { id: "2", title: "初期HTMLにデータを含める", status: "doing" },
    { id: "3", title: "ブラウザ側で取得する場合との違いをREADMEで確認", status: "todo" },
  ];
}

type TasksPageProps = {
  searchParams: Promise<{ fail?: string }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { fail } = await searchParams;

  try {
    const tasks = await fetchTasks(fail === "1");

    return (
      <main className="page">
        <p className="sample-label">web24</p>
        <h1>サーバー側で取得した一覧</h1>
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              {task.title} <span>{{ todo: "未着手", doing: "作業中", done: "完了" }[task.status]}</span>
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (caught) {
    return (
      <main className="page">
        <p className="sample-label">web24</p>
        <h1>データ取得に失敗しました</h1>
        <p role="alert">{(caught as Error).message}</p>
      </main>
    );
  }
}
