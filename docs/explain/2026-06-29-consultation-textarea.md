# 変更解説: 相談ページの実装と Textarea コンポーネント追加

## 全体像

相談ページ（AIボット）に「メッセージを入力して送信 → 回答を表示」する機能を実装し、その入力欄として再利用可能な `Textarea` コンポーネントを新規追加した変更。あわせて他ページ（成長・こども）と同じレイアウト・カラー規約に揃えた。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| src/components/ui/Textarea.tsx | 複数行入力の共通コンポーネントを新規追加 |
| src/pages/Consultation.tsx | プレースホルダーだった相談ページに送信・回答表示を実装 |

---

## 詳細解説

### 1. src/components/ui/Textarea.tsx（新規）

rabeeui の Textarea（Svelte 製）を React+TS に移植した、複数行テキスト入力の共通部品。既存の `Input.tsx` と同じ設計に揃えてある。

#### cva によるスタイル定義（L4-17）

```ts
const textareaVariants = cva(
  'min-h-20 w-full cursor-text rounded-md border bg-surface ... read-only:opacity-50',
  {
    variants: {
      isError: {
        true: 'border-destructive',
        false: 'border-input',
      },
    },
    defaultVariants: { isError: false },
  },
)
```

`cva`（class-variance-authority）は「状態に応じて Tailwind クラスを切り替える」ためのライブラリ。第1引数が常に付く基本クラス、第2引数の `variants` が条件付きクラス。ここでは `isError` が `true` のときだけボーダー色を `border-destructive`（赤）に変える。disabled / readonly の見た目は `disabled:opacity-50` のような Tailwind の状態バリアントで基本クラス側にまとめており、props として露出させていない。

色はすべて役割名クラス（`bg-surface` / `border-input` / `border-destructive`）で、CLAUDE.md のカラー規約（生の色コード・標準色を使わない）に従っている。

#### Props 型の定義（L19-26）

```ts
type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
> &
  VariantProps<typeof textareaVariants> & {
    value: string
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  }
```

ネイティブ `<textarea>` の全属性（`placeholder` や `aria-label` など）を受け取れるようにしつつ、`value` / `onChange` だけは `Omit` で除外して自前の型に置き換えている。これは **制御コンポーネント**（値を React の state で管理し、`value` と `onChange` を必ずペアで渡す形）にするため。Svelte の `bind:value`（双方向バインド）を React 流に書き換えた部分にあたる。`VariantProps<typeof ...>` で cva の `isError` も props として受け取れる。

#### 本体（L32-44）

```tsx
<textarea
  className={textareaVariants({ isError, class: className })}
  aria-invalid={isError || undefined}
  ...
/>
```

`textareaVariants({ isError, class: className })` で「状態に応じたクラス + 呼び出し側が渡した追加クラス」を合成。`aria-invalid={isError || undefined}` は、エラー時だけ `aria-invalid="true"` を出し、通常時は属性自体を消す書き方（`false` を出さないことで支援技術に余計な情報を渡さない a11y 配慮）。

---

### 2. src/pages/Consultation.tsx

`return <h1>相談ページ（AIボット）</h1>` だけのプレースホルダーから、実際に動く相談フォームへ実装した。

#### state の定義（L13-16）

```ts
const [input, setInput] = useState('')        // 入力中のメッセージ
const [response, setResponse] = useState('')  // AI の回答
const [isLoading, setIsLoading] = useState(false)  // 送信中か
const [hasError, setHasError] = useState(false)    // エラー発生中か
```

入力値・回答・通信中フラグ・エラーフラグの4つを `useState` で管理。boolean は CLAUDE.md の命名規約に従い `is` / `has` 始まり。

#### 送信処理 handleSubmit（L19-40）

```ts
const handleSubmit = async (event: FormEvent) => {
  event.preventDefault()
  const message = input.trim()
  if (!message) return

  setIsLoading(true)
  setHasError(false)
  try {
    const data = await apiRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    setResponse(data.reply)
  } catch (error) {
    console.error('通信エラー:', error)
    setResponse('')
    setHasError(true)
  } finally {
    setIsLoading(false)
  }
}
```

フォーム送信の流れ:

1. `event.preventDefault()` でブラウザのデフォルト送信（ページリロード）を止める。
2. `input.trim()` で空白だけの入力を弾く（**ガード節**＝冒頭で早期 return、CLAUDE.md 準拠）。
3. 送信前に `isLoading` を立て、前回のエラーを消す。
4. `apiRequest` で Node の `/chat` に POST。この共通関数が API ベース URL・認証トークン付与・非2xx の例外化を担うので、ここでは中身を気にせず `await` するだけでよい。`<ChatResponse>` はレスポンスの型（`{ reply: string }`）を指定するジェネリクス。
5. 成功なら回答を state へ、失敗なら回答を空にしてエラーフラグを立てる。
6. `finally` で成否に関わらず `isLoading` を下ろす。

#### JSX: レイアウト（L42-44）

```tsx
<div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
  <h1 className="text-2xl font-bold text-foreground">相談ページ（AIボット）</h1>
```

コンテナのクラス `mx-auto flex max-w-2xl flex-col gap-4 p-6` は Growth / ChildrenHub ページと共通。中央寄せ・最大幅・縦並びの統一レイアウト。

#### JSX: 入力フォーム（L46-58）

```tsx
<form className="flex flex-col gap-3" onSubmit={handleSubmit}>
  <Textarea
    value={input}
    placeholder="メッセージを入力..."
    aria-label="相談メッセージ"
    onChange={(event) => setInput(event.target.value)}
  />
  <div className="flex justify-end">
    <Button type="submit" disabled={isLoading || !input.trim()}>
      {isLoading ? '送信中...' : '送信'}
    </Button>
  </div>
</form>
```

- 上で作った `Textarea` を制御コンポーネントとして利用（`value` + `onChange`）。
- `aria-label="相談メッセージ"` は支援技術向けの入力欄の名前。placeholder はアクセシブルネームにならないため別途付けている。
- 送信ボタンは共通の `Button`。`type="submit"` で form の `onSubmit` を発火させる。`disabled={isLoading || !input.trim()}` で「送信中」または「空入力」のときは押せない＝二重送信・空送信の防止。
- ボタンのラベルは `isLoading` で「送信中...」「送信」を出し分け。

#### JSX: エラー・回答の表示（L60-71）

```tsx
{hasError && (
  <p className="text-sm text-destructive" role="alert">エラーが発生しました。...</p>
)}

{response && (
  <div className="... border border-border bg-subtle p-4">
    <h2 ...>回答</h2>
    <p className="whitespace-pre-wrap text-foreground">{response}</p>
  </div>
)}
```

`{条件 && <JSX>}` は React で「条件が真のときだけ要素を描画する」定番の書き方。エラー時のみエラー文（`role="alert"` で支援技術が即読み上げ）、回答があるときのみ回答欄を表示する。`whitespace-pre-wrap` は AI 回答内の改行をそのまま画面に反映するための指定。

---

解説は以上です。わからない箇所や深掘りしたい部分はありますか？
