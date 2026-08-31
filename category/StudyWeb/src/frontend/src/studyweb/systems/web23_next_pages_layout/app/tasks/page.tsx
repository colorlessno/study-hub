const tasks = ["layout.tsx を読む", "Linkで遷移する", "page.tsx の場所を確認する"];

export default function TasksPage() {
  return (
    <main className="page">
      <h1>タスク</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task}>{task}</li>
        ))}
      </ul>
    </main>
  );
}
