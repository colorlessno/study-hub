import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "web23 Next.jsのページと共通画面",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <strong>web23</strong>
          <nav>
            <Link href="/">トップ</Link>
            <Link href="/about">概要</Link>
            <Link href="/tasks">タスク</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">App Routerの共通画面・各ページ・画面遷移を確認</footer>
      </body>
    </html>
  );
}
