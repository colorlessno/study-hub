import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ConfigResponse = {
  status: string;
  apiPort: number;
  hasDatabaseUrl: boolean;
  message: string;
};

const apiUrl = import.meta.env.VITE_API_URL;

function App() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/config-check`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<ConfigResponse>;
      })
      .then(setConfig)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  return (
    <main className="page">
      <section className="panel">
        <p className="label">web28</p>
        <h1>.envファイルによる設定切替</h1>
        <dl>
          <dt>VITE_API_URL</dt>
          <dd>{apiUrl}</dd>
        </dl>
        {config && (
          <dl>
            <dt>APIの状態</dt>
            <dd>{config.status === "ok" ? "正常" : config.status}</dd>
            <dt>APIの待受ポート番号</dt>
            <dd>{config.apiPort}</dd>
            <dt>DB接続先の設定</dt>
            <dd>{config.hasDatabaseUrl ? "設定済み" : "未設定"}</dd>
            <dt>環境別メッセージ</dt>
            <dd>{config.message}</dd>
          </dl>
        )}
        {error && <p className="error">API接続エラー: {error}</p>}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
