# Webフロントエンド 学習が必要な知識
## AIシステム開発向け・React + TypeScript + Vite 構成

---

## 推奨スタック

```
React + TypeScript + Vite
```

業界標準・求人が多い・AIシステムのUI（チャット・ダッシュボード・フォーム）と相性がいい。

---

## 1. 基礎（必須）

### HTML / CSS
- セマンティックなHTML構造
- Flexbox / Grid レイアウト
- レスポンシブデザイン（モバイル対応）

### JavaScript基礎
- 変数・関数・配列・オブジェクト
- 非同期処理（Promise・async/await）
- fetch API（FastAPIへのHTTPリクエスト）
- モジュールシステム（import / export）

---

## 2. 開発環境・ツール（必須）

### Vite
- プロジェクト作成・開発サーバー起動
- ビルド・FastAPIとの連携
- パスエイリアス設定（`@/components`等）

### コード品質
- **ESLint**：静的解析（バグの早期発見）
- **Prettier**：コード自動整形
- **環境変数管理**：`.env`でAPIのURLを管理（本番・開発の切り替え）

### パッケージ管理
- npm / yarn / pnpm の使い分け

---

## 3. React + TypeScript（必須）

### React基礎
- 関数コンポーネント
- Props / State の概念
- イベントハンドリング

### Reactフック

| フック | 用途 |
|-------|------|
| `useState` | コンポーネントの状態管理 |
| `useEffect` | 副作用処理（APIコール・タイマー等） |
| `useRef` | DOM参照・タイマー管理・前回値の保持 |
| `useMemo` | 重い計算のキャッシュ（パフォーマンス最適化） |
| `useCallback` | 関数の再生成防止（パフォーマンス最適化） |
| `useReducer` | 複雑な状態管理（Zustandの前段階として理解） |
| `useContext` | グローバルな値の受け渡し |
| **カスタムフック** | ロジックの再利用（`useFetch`・`useChat`等を自作） |

### TypeScript基礎
- 型定義（interface・type）
- APIレスポンスの型付け
- コンポーネントのProps型定義
- Generics・Union型・Optional型

---

## 4. ルーティング（必須）

### React Router v6
- ページ遷移・URL管理（SPAで複数画面を作るために必須）
- ネストされたルート
- パラメータ付きルート（例：`/patients/:id`）
- ルートガード（未ログイン時にリダイレクト）
- `useNavigate` / `useParams` / `useLocation` フック

---

## 5. FastAPIとの連携（必須）

```
React（フロントエンド）
    ↕ HTTP / REST API
FastAPI（バックエンド）
```

- CORSの設定（FastAPI側）
- fetch / axiosでAPIを呼ぶ
- JSONレスポンスの受け取りと表示
- ファイルアップロード（multipart/form-data）
- ストリーミングレスポンスの表示（Server-Sent Events）
- エラーレスポンスのハンドリング（4xx・5xx）

---

## 6. サーバー状態管理（重要）

### TanStack Query（旧React Query）
- APIデータのフェッチ・キャッシュ・再取得を一元管理
- ローディング・エラー状態の管理が簡単になる
- AIシステムのダッシュボード・一覧画面で必須レベル

> 📝 **ZustandとTanStack Queryの役割の違い**
> ZustandはUIの状態管理（チャット履歴・選択状態・サイドバー開閉等）。
> TanStack QueryはAPIで取得したデータの状態管理（キャッシュ・ローディング・再取得）。
> 役割が異なるため、両方を使い分ける。

---

## 7. UI状態管理（中規模以上のシステムで必要）

### Zustand
- 軽量・シンプルな状態管理ライブラリ
- セッション情報・チャット履歴・ユーザー設定の管理
- Reduxより学習コストが低く、AIシステムのUIに適している

---

## 8. フォーム管理（重要）

### React Hook Form
- バリデーション付きフォームの実装
- System 05（カルテ入力）・System 12（ギフト条件入力）で特に必要
- 非制御コンポーネントによるパフォーマンス最適化

### Zod（スキーマバリデーション）
- TypeScriptと親和性が高いバリデーションライブラリ
- React Hook Formと組み合わせて使う
- APIリクエスト・レスポンスのスキーマ定義にも使える

---

## 9. UIコンポーネントライブラリ（効率化）

ゼロからCSSを書かずに済む。

### Tailwind CSS
- ユーティリティCSS・最も普及
- クラス名でスタイルを直接指定する設計思想

### shadcn/ui
- Tailwindベースのコンポーネント集
- Button・Input・Dialog・Table・Card等をコピー&ペーストして使う
- カスタマイズしやすい

---

## 10. AIシステム固有のUI実装（重要）

### チャットUI（System 03・06・12・13）
- メッセージのリスト表示（ユーザー / AI の区別）
- 入力フォーム・送信処理
- **ストリーミング表示**（文字が順番に出てくる・SSE実装）
- セッション管理
- 自動スクロール（最新メッセージへ）

### ファイルアップロードUI（System 01・02・03・07・15）
- ドラッグ&ドロップ
- アップロード進捗の表示
- 処理結果の表示
- 複数ファイル対応

### ダッシュボードUI（System 04・06・14）
- グラフ・チャート表示（**Recharts** 推奨）
- テーブル表示・フィルタリング・ソート
- リアルタイム更新（ポーリング / WebSocket）
- KPIカード（件数・スコア・コストの一覧表示）

### フォームUI（System 05・06・12）
- 入力バリデーション（React Hook Form + Zod）
- 多段階フォーム（ウィザード形式）
- 条件付き表示（回答によって次の質問が変わる）

---

## 11. リアルタイム通信（AIシステム固有・重要）

### Server-Sent Events（SSE）
- LLMが文字を逐次生成する表示（ChatGPTのような体験）
- `EventSource` APIの使い方
- Reactのstateへのリアルタイム反映
- 接続切断・再接続ハンドリング

### WebSocket
- 双方向リアルタイム通信
- System 06（サポート）・System 14（顧客分析）で必要

---

## 12. エラーハンドリング（必須）

- **Error Boundary**：コンポーネントのエラーをキャッチしてフォールバックUIを表示
- APIエラーのUI表示パターン（トースト通知・エラーページ・インラインエラー）
- ローディング・エラー・空状態の3状態管理（全コンポーネントで意識する）

---

## 13. 認証（System 03・05・13で必要）

- JWTトークンの保持（`localStorage` / `httpOnly Cookie`）
- ログイン・ログアウト処理
- ルートガード（未ログイン時にリダイレクト）
- トークンの自動リフレッシュ

---

## 14. コンポーネント設計（中規模以上で必要）

### Atomic Design
```
atoms      → Button・Input・Label等の最小単位
molecules  → SearchInput（Input + Button）等の組み合わせ
organisms  → ChatWindow・FileUploadForm等の機能単位
templates  → ページのレイアウト構造
pages      → 実際のページコンポーネント
```

### 設計原則
- **Props drillingの解消**（Context / Zustandで解決）
- **表示とロジックの分離**（カスタムフックにロジックを切り出す）
- **再利用可能なコンポーネント設計**

---

## 15. テスト（できれば）

- **Vitest**：ユニットテスト（カスタムフック・ユーティリティ関数）
- **React Testing Library**：コンポーネントテスト（ユーザー操作のシミュレーション）

---

## システム別 フロントエンドの必要度

| 優先度 | System | 主なUI | 理由 |
|--------|--------|--------|------|
| 高（まず作る） | System 05（カルテ） | フォーム・カレンダー・SOAP表示 | フロントエンド込みで要件定義済み |
| 高 | System 03（Q&A） | チャットUI | チャットUIが必要 |
| 高 | System 06（サポート） | チャット＋ダッシュボード | チャット＋ダッシュボード |
| 中 | System 01・02・07・15 | ファイルアップロード＋結果表示 | シンプルなUI |
| 中 | System 14（顧客分析） | ダッシュボード・グラフ | グラフ・KPI表示 |
| 低 | System 08・09・10・16 | 入力フォーム＋結果表示 | シンプルなUI |

---

## 学習順序

```
Step 1:  HTML / CSS / JavaScript基礎（1〜2週間）
Step 2:  React基礎（useState・useEffect・コンポーネント設計）（2〜3週間）
Step 3:  React応用フック（useRef・useMemo・useCallback・useReducer・カスタムフック）
Step 4:  TypeScript基礎
Step 5:  Vite・ESLint・Prettier・環境変数管理
Step 6:  React Router v6（ルーティング）
Step 7:  FastAPI連携・fetch / axios実装（1週間）
Step 8:  TanStack Query（サーバー状態管理）
Step 9:  React Hook Form + Zodバリデーション
Step 10: SSE / WebSocketストリーミング表示
Step 11: Tailwind CSS + shadcn/ui
Step 12: Zustand（UI状態管理）
Step 13: Error Boundary・エラーハンドリング
Step 14: 認証（JWT・ログイン・ログアウト・ルートガード・トークン自動リフレッシュ）
Step 15: コンポーネント設計（Atomic Design）
Step 16: テスト（Vitest・React Testing Library）
```
