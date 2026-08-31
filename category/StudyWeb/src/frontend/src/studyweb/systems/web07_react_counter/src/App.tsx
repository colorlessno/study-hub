import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="counter-shell">
      <p className="sample-label">web07</p>
      <h1>Reactカウンター</h1>
      <p>値を保持するuseStateと、クリック時の処理を指定するonClickによる再描画を確認します。</p>

      <output className="count-display" aria-label="現在のカウント">
        {count}
      </output>

      <div className="button-row">
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          加算
        </button>
        <button type="button" onClick={() => setCount((value) => value - 1)}>
          減算
        </button>
        <button type="button" onClick={() => setCount(0)}>
          リセット
        </button>
      </div>
    </main>
  );
}
