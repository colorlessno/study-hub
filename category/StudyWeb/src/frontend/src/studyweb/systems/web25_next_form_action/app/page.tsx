import { FormClient } from "./FormClient";

export default function HomePage() {
  return (
    <main className="page">
      <p className="sample-label">web25</p>
      <h1>Next.jsのフォーム送信</h1>
      <FormClient />
      <p>
        サーバー側でフォームを処理するServer Actionは、<code>app/actions.ts</code>に定義しています。
      </p>
    </main>
  );
}
