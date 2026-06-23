# 変更解説: 画面遷移の骨組み（ルーティング）

## 全体像

Redmine #21 の設計に従い、Vite デフォルトの 1 画面構成を React Router v8 によるマルチ画面構成に置き換えた変更。URL を変えると画面が切り替わる「画面の地図」を作る段階で、各ページの中身は空。メニューボタンの有無は path 分岐ではなく「レイアウトを分ける」ことで表現している。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| src/App.tsx / App.css / assets | 削除（Vite デフォルト画面が不要に） |
| src/layouts/AuthLayout.tsx | 新規。メニューなしレイアウト |
| src/layouts/AppLayout.tsx | 新規。右下メニューボタン付きレイアウト |
| src/pages/*.tsx（13件） | 新規。各画面の空コンポーネント |
| src/pages/PageList.tsx | 新規。検証用リンク一覧ページ |
| src/pages/DebugPage.tsx | 新規。検証用デバッグページ |
| src/main.tsx | ルーティング定義に全面書き換え |

## 詳細解説

### 1. src/App.tsx・App.css・assets の削除

Vite テンプレートの初期画面（ロゴ・カウンター）を表示していた `App.tsx` と、それ専用の `App.css`・画像 3 点を削除した。`main.tsx` が `App` を読み込まなくなり、どこからも参照されない不要コードになったため。今後の画面は `pages/` 配下のコンポーネントで作る。

### 2. src/layouts/AuthLayout.tsx（新規）

ログイン・サインインで使う、メニューボタンを持たないレイアウト。

```tsx
import { Outlet } from 'react-router'

export default function AuthLayout() {
  return (
    <div>
      <Outlet />
    </div>
  )
}
```

`<Outlet />` は React Router の「子ルートをはめ込む穴」。後述の `main.tsx` で `AuthLayout` の中に `/login` などをネストすると、この `<Outlet />` の位置に各ページが描画される。共通の枠（ここでは枠だけ）を 1 か所に書き、中身だけ差し替える仕組み。

### 3. src/layouts/AppLayout.tsx（新規）

ログイン後の全ページで使う、右下にフローティングメニューボタンを持つレイアウト。

```tsx
<button
  className="fixed right-6 bottom-6 flex size-14 ... rounded-full bg-blue-600 ..."
  type="button"
  aria-label="メニューを開く"
>
  ☰
</button>
```

ポイントは「メニューの有無をレイアウト単位で分けている」こと。`if (path === ...)` のような条件分岐をせず、メニュー付き＝`AppLayout`／なし＝`AuthLayout` と枠ごと分けることで、どのページがどちらに属すかが `main.tsx` のネスト構造だけで読み取れる。スタイルは Tailwind ユーティリティ（`fixed` で画面固定、`size-14` で 56px 四方、`rounded-full` で円形）。ボタンを押したときのモーダルや遷移リンクは #22 以降の実装で、ここでは見た目の配置のみ（`TODO` コメントあり）。

### 4. src/pages/*.tsx — 各画面の空コンポーネント

`ChildrenHub` `Albums` など、設計の URL 対応表に沿った画面を 1 ファイル 1 コンポーネントで用意。中身は見出しだけ。

```tsx
export default function ChildrenHub() {
  return <h1>こどもページ（ハブ）</h1>
}
```

骨組み段階なので「URL を変えると別の見出しが出る」ことが確認できれば十分、という方針。

#### FoodPostDetail.tsx だけは URL パラメータを使う

```tsx
import { useParams } from 'react-router'

export default function FoodPostDetail() {
  const { id } = useParams()
  return <h1>離乳食詳細ページ（id: {id}）</h1>
}
```

`/foods/:id` の `:id` 部分（例: `/foods/42` なら `42`）を `useParams()` で受け取る。一覧→詳細のような「同じ形で中身だけ違う」画面を 1 つのルートで扱うための仕組みで、ここでは受け取った id を画面に出して動作確認できるようにしている。

### 5. src/pages/PageList.tsx（新規・検証用）

各ページへ素早く飛ぶためのリンク一覧。リンクは JSX を並べず、配列から生成している。

```tsx
const PAGE_LINKS = [
  { path: '/login', label: 'ログイン' },
  // ...
]

{PAGE_LINKS.map((link) => (
  <Link key={link.path} to={link.path} className="...">
    {link.label}
  </Link>
))}
```

`<Link>` はページ全体を再読み込みせず URL だけ切り替える React Router のリンク（通常の `<a>` だと全リロードされる）。リンクの追加・削除が `PAGE_LINKS` 配列の編集だけで済む（データとレイアウトの分離）。

### 6. src/pages/DebugPage.tsx（新規・検証用）

実行環境の情報を表示するページ。こちらも表示項目を配列化している。

```tsx
const DEBUG_INFO = [
  { label: 'パス', value: window.location.pathname },
  { label: 'モード', value: import.meta.env.MODE },
  { label: 'User Agent', value: navigator.userAgent },
]
```

`import.meta.env.MODE` は Vite が注入する環境変数で、開発時は `development`、本番ビルドでは `production` になる。ビルド環境を画面から確認するために表示している。

### 7. src/main.tsx — ルーティング定義（全面書き換え）

アプリのエントリポイントを「`App` を 1 つ描画」から「URL と画面の対応表」に変えた中心ファイル。

```tsx
<BrowserRouter>
  <Routes>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Route>

    <Route element={<AppLayout />}>
      <Route path="/children" element={<ChildrenHub />} />
      {/* ... */}
      <Route path="/foods/:id" element={<FoodPostDetail />} />
    </Route>

    <Route path="/list" element={<PageList />} />
    <Route path="/debug" element={<DebugPage />} />

    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
```

使われているパターン:

- **React Router v8 / Declarative モード** — `<BrowserRouter>` でアプリを包み、`<Routes>`/`<Route>` で「この URL ならこの画面」を宣言的に並べる、最もシンプルな構成。
- **ネストルートでレイアウトを分ける** — `path` を持たない `<Route element={<AuthLayout />}>` の内側に子ルートを置くと、親レイアウトの `<Outlet />` に子ページがはまる。`AuthLayout` グループ＝メニューなし、`AppLayout` グループ＝メニューあり、という分け方がそのまま構造で表れる。
- **レイアウト非所属のルート** — `/list`・`/debug` はどちらの `<Route element=...>` にも入れていないので、レイアウト（＝メニューボタン）が付かない。検証用ページをメニューなしにしたい要件をこの配置で満たしている。
- **`path="*"`** — どのルートにも一致しなかった URL を受け止める受け皿で、`NotFound` を表示する。

## 補足

- 認証制御（未ログイン時のリダイレクト等）は本チケットのスコープ外（#22 以降）。ここでは「どの画面が要ログインか」を AppLayout グループという形で地図に描いただけ。
