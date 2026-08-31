import { useState } from "react";

type CardItem = {
  title: string;
  description: string;
  tag: string;
};

const cards: CardItem[] = [
  {
    title: "HTML構造",
    description: "ページの骨組みを作り、意味のある見出しやリストを配置します。",
    tag: "構造",
  },
  {
    title: "CSS設計",
    description: "余白、色、枠線、影をユーティリティクラスで組み立てます。",
    tag: "見た目",
  },
  {
    title: "画面幅への対応",
    description: "画面幅に応じて1列、2列、4列へ自然に切り替えます。",
    tag: "配置",
  },
  {
    title: "カーソルを合わせた状態",
    description: "カーソルを合わせたときの状態変化をTailwindで指定します。",
    tag: "状態",
  },
];

export default function App() {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm font-bold text-teal-700">web11</p>
        <h1 className="mb-3 text-3xl font-bold">Tailwind CSSのカード画面</h1>
        <p className="mb-8 max-w-2xl text-slate-600">
          Tailwind CSSの簡潔な指定方法で、カード一覧の余白、色、画面幅への対応、カーソルを合わせたときの変化を確認します。
        </p>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex min-h-64 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-md"
            >
              <span className="mb-4 w-fit rounded-full bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700">
                {card.tag}
              </span>
              <h2 className="mb-3 text-xl font-bold">{card.title}</h2>
              <p className="mb-5 text-slate-600">{card.description}</p>
              <button
                className="mt-auto inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-teal-700 px-4 font-bold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                type="button"
                onClick={() => setSelectedTitle(card.title)}
              >
                表示例
              </button>
            </article>
          ))}
        </section>

        <p className="mt-5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-teal-900" aria-live="polite">
          {selectedTitle ? `「${selectedTitle}」の表示例を選びました。` : "カードの「表示例」を押すと、選択結果が表示されます。"}
        </p>
      </div>
    </main>
  );
}
