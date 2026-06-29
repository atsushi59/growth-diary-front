# デプロイ手順（AWS Amplify Hosting）

フロントを AWS Amplify Hosting で公開し、`main` への push で自動デプロイする。ビルド仕様はリポジトリ直下の [`amplify.yml`](../amplify.yml)（`npm run build` → `dist/`）。

> 関連: Redmine #25。バック（API）は別リポジトリ [growth-diary-back](https://github.com/atsushi59/growth-diary-back) を SAM でデプロイ済み。本書はフロント側の接続手順と、接続後にバックへ反映する設定をまとめる。

## 前提

- AWS コンソールにアクセスできること（操作リージョンは **ap-northeast-1 / 東京**）。
- フロントの本番ビルドが通ること（`npm run build`）。

## Step 1: Amplify にフロントを接続（AWS コンソール）

1. マネジメントコンソール → **Amplify**（右上のリージョンを **ap-northeast-1** にする）。
2. 「**アプリを新規作成 / Host web app**」→ **GitHub** を選択し、`growth-diary-front` リポジトリを接続。
3. ブランチは本番用に **`main`** を選択。
4. ビルド設定はリポジトリの `amplify.yml` が自動で使われる（Vite / 出力 `dist`）。
5. **環境変数**を設定（ビルド時にバンドルへ焼き込まれる。値変更時は再デプロイが必要）:

   | キー | 値 |
   |---|---|
   | `VITE_API_BASE_URL` | `https://h9nyg3tm0j.execute-api.ap-northeast-1.amazonaws.com/Prod` |
   | `VITE_COGNITO_USER_POOL_ID` | `ap-northeast-1_GdsE1Ir4y` |
   | `VITE_COGNITO_USER_POOL_CLIENT_ID` | `7b8tugcp6pnfq7erk0afsdi6l2` |

   > これらは秘匿情報ではない（フロントの JS に公開される値）。バック側の JWT 検証が使う User Pool / Client と**同じ ID**であることを必ず確認する（ズレるとログインは通っても API が 401 になる）。

6. **SPA リライトを追加**（react-router の `BrowserRouter` 用。これが無いと `/login` 直アクセスや再読み込みで 404）:
   - アプリ → 「**書き換えとリダイレクト（Rewrites and redirects）**」で以下を追加。

   | 送信元 | ターゲット | 種類 |
   |---|---|---|
   | `/<*>` | `/index.html` | `200 (Rewrite)` |

7. デプロイ → `https://main.xxxxxxxx.amplifyapp.com` の URL が発行される。以降 `main` への push で自動デプロイ。

## Step 2: バック側を本番ドメインに合わせる（growth-diary-back）

Amplify の URL（オリジン）が発行されたら、バックで以下を反映して再デプロイする。

- **API の CORS** に Amplify オリジンを追加（現状 `app.ts` は `http://localhost:5173` のみ）。
- **S3 画像バケットの CORS**（`template.yaml` の `AllowedOrigin`）に同オリジンを設定。
- **`AuthMode=cognito`** に切替えて再デプロイ（これをしないと本番が全員ダミーユーザー扱いのまま）。

## Step 3: 本番 E2E 確認

発行された Amplify URL で次を確認する:

- サインアップ → メール確認コード → ログイン
- ログイン後、こどもページ（`GET /children`）が CORS で弾かれず取得できる
- 子供の登録・画像アップロード（S3 への直接 PUT）

## 補足・注意

- `amplify.yml` は**ビルド仕様**であり、アプリ自体は作らない。Amplify にリポジトリを接続した時に読みに行く。
- 環境変数・SPA リライトは**コンソール側の設定**（リポジトリには入らない）。アプリ作成後に設定する。
- 本番ビルドの Node は 22（`amplify.yml` の preBuild で `nvm use 22`）。
