import { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:13021";

const endpoints = [
  ["200", "/debug/success"],
  ["400", "/debug/bad-request"],
  ["404", "/debug/not-found"],
  ["500", "/debug/server-error"],
] as const;

export default function App() {
  const [result, setResult] = useState("ボタンを押してAPI通信を確認してください。");

  async function callApi(path: string) {
    try {
      const response = await fetch(`${apiUrl}${path}`);
      const body = await response.json();
      setResult(JSON.stringify({ "HTTP状態番号": response.status, "応答本文": body }, null, 2));
    } catch (error) {
      setResult(`通信エラー: ${(error as Error).message}`);
    }
  }

  return (
    <main className="app-shell">
      <p className="sample-label">web21</p>
      <h1>ブラウザ開発者ツールで通信を確認</h1>
      <div className="button-row">
        {endpoints.map(([label, path]) => (
          <button key={path} type="button" onClick={() => callApi(path)}>
            {label}
          </button>
        ))}
      </div>
      <pre>{result}</pre>
    </main>
  );
}
