type HeaderProps = {
  currentSection: string;
};

export function Header({ currentSection }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{currentSection}</h1>
        <p className="text-sm text-slate-500">管理画面UIの基本構成を確認します。</p>
      </div>
      <span className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white">管理画面サンプル</span>
    </header>
  );
}
