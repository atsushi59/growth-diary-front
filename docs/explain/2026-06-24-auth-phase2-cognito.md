# 変更解説: 認証を本物の Cognito に差し替え（フェーズ2）

Redmine #22 のフェーズ2。フェーズ1で作った「フォーム → API → 画面遷移」の型のうち、**認証部分だけ**をダミー（`GET /children` 疑似ログイン）から本物の Amazon Cognito（Amplify v6）に差し替えた変更。UI・fetch 層・画面遷移の骨組みはそのまま流用している。

## 全体像

`@aws-amplify/auth` を導入し、ログイン/サインアップを Cognito の `signIn` / `signUp` / `confirmSignUp` で行うようにした。サインアップはメール確認コードの入力ステップを挟む。API には Cognito のアクセストークンを自動付与し、401 ならリフレッシュして再試行する。

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `package.json` | `aws-amplify` を追加 |
| `.env.example` / `src/vite-env.d.ts` | Cognito 用の環境変数を追加 |
| `src/lib/amplify.ts` | 新規。Amplify に Cognito 接続情報を設定 |
| `src/main.tsx` | 起動時に Amplify 設定を読み込む |
| `src/lib/api.ts` | トークン取得を localStorage から Cognito セッションへ。401 リトライ追加 |
| `src/components/AuthForm.tsx` | ダミー認証を Cognito 認証＋確認コード画面に置換 |

## 詳細解説

### 1. 環境変数（.env.example / vite-env.d.ts）

```
VITE_COGNITO_USER_POOL_ID=
VITE_COGNITO_USER_POOL_CLIENT_ID=
```

接続先の Cognito ユーザープール（#68 でデプロイ済み）を指す ID。`.env` 本体（実値）はコミットせず、`.env.example` にキーだけ置く。**region は不要**: Amplify v6 は User Pool ID（`ap-northeast-1_xxx`）の接頭辞からリージョンを自動導出する。

### 2. src/lib/amplify.ts（新規）— Amplify の初期化

```ts
Amplify.configure({
  Auth: { Cognito: { userPoolId: USER_POOL_ID, userPoolClientId: USER_POOL_CLIENT_ID } },
})
```

**ポイント**: Amplify は「アプリ起動時に一度 `configure` を呼ぶ」だけで、以降 `signIn` 等の関数がこの設定を参照する。設定モジュールを副作用 import（後述）させることで、認証 API を使う前に必ず設定が走るようにしている。env 未設定なら起動時に `throw` して早期に気づけるようにした。

### 3. src/main.tsx — 設定の読み込み

```ts
import './lib/amplify'
```

**ポイント（副作用 import）**: 値を受け取らず、モジュールを評価させるためだけの import。`amplify.ts` のトップレベルにある `Amplify.configure(...)` を、画面描画より前・最初に実行させるのが目的。

### 4. src/lib/api.ts — トークン取得を Cognito セッションへ

#### before（フェーズ1）
```ts
const token = localStorage.getItem('accessToken') // 自前で保存していた前提
```

#### after（フェーズ2）
```ts
const session = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined)
const token = session.tokens?.accessToken?.toString()
if (token) headers.set('Authorization', `Bearer ${token}`)
```

**ポイント**: トークンの保存・更新は Amplify に任せる。`fetchAuthSession()` は**期限切れのトークンを自動でリフレッシュ**して返すため、呼ぶだけで常に有効なトークンが得られる。未ログイン時はトークン無し（例外にならない）でそのまま素通りする。

#### 401 リトライ
```ts
let response = await fetch(url, { ...init, headers: await buildHeaders(init, false) })
if (response.status === 401) {
  response = await fetch(url, { ...init, headers: await buildHeaders(init, true) })
}
```

サーバーが 401 を返したら、`forceRefresh: true` でトークンを強制更新して**1度だけ**再試行する（#22 の「期限切れ時はリフレッシュ→再試行」に対応）。バック（aws-jwt-verify）はこのトークンを検証する。

### 5. src/components/AuthForm.tsx — Cognito 認証＋確認コード

#### before（フェーズ1のダミー判定）
```ts
await apiRequest('/children') // 200 が返ればログイン成功とみなしていた
navigate('/children')
```

#### after（フェーズ2の本物認証）
ログインは `signIn`、サインアップは `signUp` → 確認コード → `confirmSignUp` → `signIn`。

```ts
// サインアップ
const { nextStep } = await signUp({
  username: email, password, options: { userAttributes: { email } },
})
if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') setStep('confirm')
```

**ポイント（確認コードのステップ管理）**: プールが `AutoVerifiedAttributes: email` のため、サインアップ直後は未確認状態。`signUp` の戻り値 `nextStep.signUpStep` が `CONFIRM_SIGN_UP` なら、`step` state を `'confirm'` に切り替えて確認コード入力画面を表示する。画面遷移（ルート）を増やさず、同じ AuthForm 内の状態機械（`'credentials' | 'confirm'`）で扱っている。

```ts
// 確認
await confirmSignUp({ username: email, confirmationCode })
await signInAndGoHome() // 確認後そのままログインしてこどもページへ
```

確認コードを検証し、成功したら保持しておいた email/password でそのままログインして `/children` へ。ログイン時に未確認ユーザーだった場合（`UserNotConfirmedException`）も同じ確認ステップへ誘導する。

#### エラーメッセージの変換
```ts
const ERROR_MESSAGES: Record<string, string> = {
  NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません。',
  UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません。',
  ...
}
```

**ポイント**: Cognito の例外名（`error.name`）を利用者向け日本語に変換する。`UserNotFoundException` と `NotAuthorizedException` を**同じ文言**にしているのは、「そのメールが登録済みか」を攻撃者に推測させない（ユーザー列挙対策）ため。

## フェーズ1から「変わった部分 / そのまま残った部分」

- **変わった**: `AuthForm` の認証ロジック（ダミー→Cognito）、`api.ts` のトークン取得元、Amplify 設定の追加。
- **そのまま残った**: Button/Input/フォームのレイアウト、画面遷移（`navigate('/children')`）、二重送信ガード、a11y、`api.ts` の「ボディがある時だけ JSON ヘッダ」方針。

→ フェーズ1で「型」を作っておいたことで、フェーズ2は認証の中身だけの差し替えで済んでいる。

## 未検証（環境依存）

ハッピーパス全体（signup → 実メールの確認コード → confirmSignUp → signIn → `GET /children` 遷移）は、バックを `AUTH_MODE=cognito` に切り替え＋実在メールが必要なため未検証。Cognito 連携自体は、誤資格情報のログインが `cognito-idp.ap-northeast-1` に到達して認証エラーを返すことまで確認済み。
