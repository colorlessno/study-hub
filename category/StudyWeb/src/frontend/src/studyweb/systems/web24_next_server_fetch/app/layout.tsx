import "./globals.css";

export const metadata = {
  title: "web24 Next.jsのサーバー側データ取得",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
