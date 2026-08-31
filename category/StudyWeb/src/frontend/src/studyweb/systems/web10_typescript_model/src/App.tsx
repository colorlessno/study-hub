import { articles, tasks, users } from "./data/sampleData";
import type { Article } from "./models/article";
import type { Task } from "./models/task";
import type { User } from "./models/user";

function UserCard({ user }: { user: User }) {
  const roleNames = { learner: "学習者", mentor: "指導担当", admin: "管理者" } as const;
  return (
    <article className="card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>役割: {roleNames[user.role]}</p>
      {user.bio && <p>{user.bio}</p>}
    </article>
  );
}

function TaskList({ items }: { items: Task[] }) {
  const statusNames = { todo: "未着手", doing: "作業中", done: "完了" } as const;
  return (
    <ul className="list">
      {items.map((task) => (
        <li key={task.id}>
          {task.title} <span>{statusNames[task.status]}</span>
        </li>
      ))}
    </ul>
  );
}

function ArticleList({ items }: { items: Article[] }) {
  return (
    <ul className="list">
      {items.map((article) => (
        <li key={article.id}>
          {article.title} <span>{article.published ? "公開済み" : "下書き"}</span>
          <p>{article.summary}</p>
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <main className="app-shell">
      <p className="sample-label">web10</p>
      <h1>TypeScriptのデータ型</h1>

      <section>
        <h2>ユーザー</h2>
        <div className="grid">
          {users.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      </section>

      <section>
        <h2>タスク</h2>
        <TaskList items={tasks} />
      </section>

      <section>
        <h2>記事</h2>
        <ArticleList items={articles} />
      </section>
    </main>
  );
}
