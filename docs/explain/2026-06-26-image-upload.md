# 変更解説: S3画像アップロード（署名付きURL）フロント実装（#70）

Redmine #70 のフロント側。バックが発行する**署名付き URL** にフロントから画像を直接 PUT する、共通アップロード機能と検証用画面を実装した。

## 全体像

「画像を選ぶ → バックから署名付き URL をもらう → S3 へ直接 PUT → 返ってきた key を受け取る」という共通処理を `uploadImage` として切り出し、検証用画面 `/upload-test` で動作確認できるようにした。表示（GET署名URL）と DB 保存は別チケット（#70手順4・#23）。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/lib/upload.ts` | 新規。バリデーション＋署名付きURL取得＋S3直PUTの共通関数 |
| `src/pages/UploadTest.tsx` | 新規。検証用画面（テスト子供作成→画像選択→アップロード→key表示） |
| `src/main.tsx` | `/upload-test` ルートを登録 |
| `src/pages/PageList.tsx` | 検証一覧に `/upload-test` リンクを追加 |

## 詳細解説

### 1. src/lib/upload.ts — 共通アップロード関数

#### バリデーション（`validateImageFile`）

```ts
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'JPEG / PNG / WebP ...'
  if (file.size === 0) return 'ファイルが空です。...'
  if (file.size > MAX_IMAGE_SIZE_BYTES) return 'ファイルサイズは5MB以下に...'
  return null
}
```

バックはサイズ上限を強制しないため、**フロントで事前に弾く**（タイプは契約どおり jpeg/png/webp、サイズは 5MB、空ファイルも除外）。問題があればメッセージ文字列、無ければ `null` を返す形にして、呼び出し側で `if (error) throw` できるようにしている。

#### アップロード本体（`uploadImage`）

```ts
// ① 署名付き URL を発行（apiRequest が Authorization と JSON ヘッダを付与）
const { uploadUrl, key } = await apiRequest<PresignResponse>('/uploads/image-url', {
  method: 'POST',
  body: JSON.stringify({ purpose, targetId, contentType: file.type }),
})

// ② S3 へ直接 PUT（バック経由しない。Content-Type は①と一致させる）
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
})
```

**ポイント（使われている技術）**:
- **署名付き URL 直 PUT**: 画像本体はバック（Lambda）を通さず S3 へ直接送る。Lambda のペイロード上限(6MB)・負荷・コストを避けられる。
- **`apiRequest` と素の `fetch` の使い分け**: ①の署名付きURL発行は自前API（要認証）なので `apiRequest`（Cognito トークンを `Authorization` に付与）を使う。②の S3 への PUT は**認証ヘッダを付けてはいけない**（署名URL自体が認可になっている）ので、素の `fetch` を使う。
- **Content-Type の一致**: ①で送った `contentType` が署名に焼き込まれるため、②の PUT の `Content-Type` を一致させないと S3 が `403 SignatureDoesNotMatch` を返す。`file.type` を両方に使って必ず一致させている。
- 最後に `key`（S3オブジェクトキー）を返す。これを #23 等で対象リソースに保存する。

### 2. src/pages/UploadTest.tsx — 検証用画面

`/upload-test` の検証画面。`#23`（子供CRUD）未実装で子供が0件のため、アップロードに必要な `targetId`（所有する子供ID）を**この画面で作る**ところまで含めている。

- `handleCreateChild`: `POST /children` でテスト用の子供を1件作り、その `id` を `targetId` に使う。
- `handleUpload`: 選んだファイルを `uploadImage('child', childId, file)` に渡し、返った `key` を表示。

#### 二重送信ガード（`isBusyRef`）

```ts
const isBusyRef = useRef(false)
...
if (isBusyRef.current) return
isBusyRef.current = true
```

`isBusy`（state）は反映が次レンダーまで遅れるため、ボタン連打で処理が2回走り得る（子供2件作成・S3に重複オブジェクト）。**同期的にその場で更新される `useRef`** で再入を弾く。AuthForm と同じ対策。

### 3. src/main.tsx / PageList.tsx — ルート登録

`/upload-test` を `/list`・`/debug` と同じ**レイアウト非所属の検証用ルート**として登録（メニューボタン無し）。検証一覧（`/list`）にもリンクを追加。

## このチケットの範囲と未対応

- **対応**: 画像選択 → バリデーション → 署名付きURL取得 → S3直PUT → key取得。E2E で PUT 200 まで確認済み。
- **未対応（別チケット）**: 画像の表示（GET署名URL＝#70手順4）、key の DB 保存・リソース紐付け（#23）。

検証画面は本番では使わない確認用。消費側（#23 子供プロフィール画像、アルバム等）から `uploadImage` を呼んで組み込む想定。
