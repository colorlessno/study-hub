import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <p className="sample-label">web24</p>
      <h1>Next.jsのサーバー側データ取得</h1>
      <p><Link href="/tasks">サーバー取得一覧を見る</Link></p>
      <p><Link href="/tasks?fail=1">取得失敗時の表示を確認する</Link></p>
    </main>
  );
}
