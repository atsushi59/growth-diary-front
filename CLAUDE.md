# growth-diary-front

子どもの成長記録（離乳食・アレルギー・予防接種・成長・アルバム等）を管理するアプリのフロントエンド。
設計は Redmine #21（画面設計・ルーティング）に基づく。現在は画面遷移の骨組み段階で、各ページの中身・API 接続・認証制御は今後（#22 以降）実装する。

## 技術スタック

| 種類 | 採用技術 | バージョン |
|---|---|---|
| ビルドツール | Vite | ^8 |
| 言語 | TypeScript | ~6 |
| UI ライブラリ | React | ^19 |
| ルーティング | React Router（Declarative モード） | ^8 |
| スタイリング | Tailwind CSS v4（`@tailwindcss/vite` プラグイン） | ^4 |
| Lint | ESLint（typescript-eslint / react-hooks / react-refresh） | ^10 |
| ランタイム | Node.js | >=22 |

- `tailwind.config.js` / `postcss.config.js` は**使わない**。Tailwind の設定（色など）は `src/index.css` に集約する（v4 構成）。
- create-react-app は使わない。Vite + React + TypeScript 構成。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動（http://localhost:5173/） |
| `npm run build` | 型チェック（`tsc -b`）+ 本番ビルド（`vite build`） |
| `npm run lint` | ESLint |
| `npm run preview` | 本番ビルドのプレビュー |

## ディレクトリ構成

```
src/
├── main.tsx          ← エントリポイント。ルーティング定義（BrowserRouter / Routes / Route）
├── index.css         ← Tailwind 読み込み + @theme でカラー定義
├── layouts/
│   ├── AuthLayout.tsx ← メニューボタンなし（ログイン・サインイン）
│   └── AppLayout.tsx  ← 右下フローティングメニューボタンあり（ログイン後の全ページ）
└── pages/            ← 各画面（1 ファイル 1 コンポーネント）
```

## ルーティング方針

- React Router v8 の **Declarative モード**（`<BrowserRouter>` + `<Routes>`/`<Route>`）を使う。
- **メニューボタンの有無は path 分岐ではなくレイアウトで分ける**。`AuthLayout`（メニューなし）/ `AppLayout`（メニューあり）に各ページをネストし、`<Outlet />` で子ページを描画する。
- 検証用ページ（`/list`：各ページへのリンク一覧、`/debug`：実行環境情報）は、メニューボタン不要なのでどのレイアウトにも属さないトップレベルルートにする。
- 未マッチ（`path="*"`）は `NotFound`。

---

## カラーシステム（重要・厳守）

色は**役割ベース（セマンティック）のクラスだけ**で指定する。メインカラーは **#0A6E9E（青寄りティール）**。

### ルール

1. **色定義は `src/index.css` の `@theme` ブロックに集約する。** ここ以外で色を定義しない。
2. **役割名クラスだけを使う**（`bg-primary` / `text-foreground` / `border-border` など）。
3. **禁止事項：**
   - 生の色コード指定（`bg-[#0A6E9E]`、`text-[#171d21]` などの任意値）
   - Tailwind 標準色（`bg-blue-500`、`text-red-600` など）— `--color-*: initial` で無効化済みだが、意図としても使わない
   - インライン `style` 属性での色指定（`style={{ color: '#...' }}`）
4. `white` / `black` / `transparent` / `current` は標準色無効化で消えるため `@theme` で再定義してある。**消さないこと。**
5. 新しい色が必要になったら、まず役割名で `@theme` に追加してからクラスとして使う。

### 利用できる役割色クラス一覧

| 役割名 | 主な用途 | 例 |
|---|---|---|
| `primary` | 主要アクション | `bg-primary`, `text-primary` |
| `primary-foreground` | primary 背景の上の文字 | `text-primary-foreground` |
| `primary-50` | 薄い背景用（タグ・選択中の背景） | `bg-primary-50` |
| `primary-700` | 濃い文字・枠線用 | `text-primary-700`, `border-primary-700` |
| `surface` | 基準の背景 | `bg-surface` |
| `subtle` | 控えめな背景 | `bg-subtle` |
| `muted` | 抑えた背景（disabled 等） | `bg-muted` |
| `accent` | hover 等の背景 | `bg-accent` |
| `foreground` | 基準の文字色 | `text-foreground` |
| `muted-foreground` | 抑えた文字（placeholder 等） | `text-muted-foreground` |
| `subtle-foreground` | 最も弱い補足文字 | `text-subtle-foreground` |
| `border` | 基準のボーダー | `border-border` |
| `input` | フォーム要素のボーダー | `border-input` |
| `ring` | フォーカスリング | `ring-ring` |
| `destructive` | 削除・破壊的操作 | `bg-destructive`, `text-destructive` |
| `success` | 成功・完了 | `bg-success`, `text-success` |
| `warning` | 警告・注意 | `bg-warning`, `text-warning` |
