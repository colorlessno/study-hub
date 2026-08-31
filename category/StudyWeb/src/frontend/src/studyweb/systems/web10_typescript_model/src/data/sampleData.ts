import type { Article } from "../models/article";
import type { Task } from "../models/task";
import type { User } from "../models/user";

export const users: User[] = [
  {
    id: "u1",
    name: "Web学習者",
    email: "learner@example.com",
    role: "learner",
    bio: "HTMLからReactまで順番に学習中です。",
  },
  {
    id: "u2",
    name: "レビュー担当",
    email: "mentor@example.com",
    role: "mentor",
  },
];

export const tasks: Task[] = [
  { id: "t1", title: "型定義を読む", status: "done", assigneeId: "u1" },
  { id: "t2", title: "任意プロパティを確認する", status: "doing", assigneeId: "u1" },
  { id: "t3", title: "union型を変更して型エラーを見る", status: "todo" },
];

export const articles: Article[] = [
  {
    id: "a1",
    title: "TypeScriptの型定義",
    summary: "画面で扱うデータの形を明確にします。",
    published: true,
  },
  {
    id: "a2",
    title: "propsと型安全",
    summary: "コンポーネント間のデータ受け渡しを安全にします。",
    published: false,
  },
];
