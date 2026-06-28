# 変更解説: 子供情報のCRUD画面（#23）

Redmine #23 のフロント実装。子供ページで子供をカード一覧表示し、モーダルで新規登録・編集・削除する。あわせて「選択中の子供」（他ページの表示対象）の仕組みも入れた。

## 全体像

`GET /children` で取得した子供をカードでループ表示し、追加/編集ボタンでモーダルを開いて CRUD する。写真は #70 の署名付きURLでアップロードして `image`（key）を保存。選択中の子供は Context + localStorage で全体共有する。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `lib/children.ts` | 新規。子供 API ラッパ（list/create/update/delete）+ 型 |
| `contexts/selectedChild.ts` | 新規。選択中 Context + フック + localStorage キー |
| `contexts/SelectedChildProvider.tsx` | 新規。選択中の状態を持つ Provider |
| `components/ui/Modal.tsx` | 新規。Rabee Modal 移植 |
| `components/ui/Select.tsx` | 新規。Rabee Select 移植 |
| `components/ui/ImageUploader.tsx` | 新規。Rabee Image Uploader 移植 |
| `components/ChildCard.tsx` | 新規。子供カード（表示 + 選択 + 編集） |
| `components/ChildFormModal.tsx` | 新規。新規/編集/削除モーダル |
| `pages/ChildrenHub.tsx` | スタブから一覧 + モーダル制御に実装 |
| `main.tsx` | SelectedChildProvider を配置 |

## 詳細解説

### 1. lib/children.ts — 子供 API と型

`apiRequest` をラップして子供 CRUD を関数化。`Child` 型は `image?: string`（S3キー）を含む。`updateChild` は `Partial<ChildInput>` を PATCH するので、`{ image: key }` だけ送って写真を後付けできる。

### 2. 選択中の子供（selectedChild.ts / SelectedChildProvider.tsx）

「現在見ている子供」をアプリ全体で共有する仕組み。アルバム・成長記録ページが表示対象を決めるのに使う（後続チケット）。

```ts
const [selectedChildId, setSelectedChildId] = useState<string | null>(() =>
  localStorage.getItem(SELECTED_CHILD_STORAGE_KEY),
)
```

**ポイント（ファイル分割の理由）**: Context + フックと Provider コンポーネントを別ファイルにしている。これは lint ルール `react-refresh/only-export-components`（1ファイルからコンポーネントと非コンポーネントを両方 export しない）に従うため。`selectedChild.ts` が Context/フック（非コンポーネント）、`SelectedChildProvider.tsx` が Provider（コンポーネント）。

### 3. ui/Modal.tsx — Rabee Modal 移植

```tsx
return createPortal(<div className="fixed inset-0 ...">...</div>, document.body)
```

**ポイント**:
- `createPortal` で `document.body` 直下に描画し、親の `overflow`/`z-index` の影響を受けないようにする。
- 開いている間だけ effect で「背景スクロールのロック・Escape リスナ・ダイアログへのフォーカス」を行い、cleanup で元に戻す。
- `dismissible` のとき背景クリック・Escape で閉じる。`role="dialog"` / `aria-modal`。

### 4. ui/Select.tsx / ui/ImageUploader.tsx

- Select はネイティブ `<select>` に cva でスタイルを当て、`onChange(value)` で値を返す制御コンポーネント。
- ImageUploader はクリックで隠し `<input type="file">` を開き、選んだ `File` を `onChange(file)` で渡す。プレビュー URL（`URL.createObjectURL`）は親が管理する。

### 5. ChildFormModal.tsx — 新規/編集/削除

#### 写真アップロードを含む保存シーケンス
写真は `targetId=childId` が必要なので、**新規は「子供を作成 → 画像アップロード → image を PATCH」の順**になる。

```ts
if (isEdit) { targetId = child!.id; await updateChild(targetId, input) }
else if (createdChildIdRef.current) { targetId = createdChildIdRef.current; await updateChild(...) }
else { targetId = (await createChild(input)).id; createdChildIdRef.current = targetId }
if (imageFile) {
  const key = await uploadImage('child', targetId, imageFile)
  await updateChild(targetId, { image: key })
}
```

**ポイント（二重作成の防止）**: `createChild` 成功後に画像アップロードや PATCH が失敗するとモーダルは開いたまま。このとき再送で子供を作り直さないよう、作成済み id を `createdChildIdRef` に保持し、再送時は `updateChild` に切り替える。

#### 開くたびの初期化
モーダルは親（ChildrenHub）側で `key` を変えて**再マウント**することで、開くたびに props から初期値を取り直す（reset 用の effect を持たない = lint ルール `set-state-in-effect` 回避にもなる）。

### 6. ChildCard.tsx — カードと選択

性別コードを表示ラベルに変換（`male`→男の子）。`isSelected` のときカードをハイライトし、ボタンを「選択済み」（無効）にする。写真は表示用 GET URL が未提供のため現状プレースホルダ。

### 7. ChildrenHub.tsx — 一覧と制御

- 初回マウントで `listChildren()` を取得。**setState は then/catch（非同期）で行い**、lint ルール `set-state-in-effect` を回避。
- 選択中が未設定 or 一覧に無ければ先頭（0番目）を選択する reconcile effect。
- モーダルの開閉ハンドラは `useCallback` で安定参照にし、Modal の effect が親再レンダーで張り直されないようにする。

## スコープ外（仕様どおり）
- 保存画像の**表示**は GET 署名 URL（#70 手順4）が未提供のため行わない。カードはプレースホルダ、編集中はローカルプレビューのみ。
