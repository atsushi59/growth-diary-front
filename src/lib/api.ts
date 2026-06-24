import { fetchAuthSession } from 'aws-amplify/auth'

// API のベース URL。Vite は VITE_ 接頭辞の環境変数のみフロントから参照できる。
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  // 未設定だと fetch('undefined/...') になり全リクエストが静かに失敗するため、起動時に落とす。
  throw new Error('VITE_API_BASE_URL が設定されていません。.env に設定してください。')
}

/**
 * リクエスト用のヘッダを組み立てる。Cognito のアクセストークンがあれば付与する。
 * @param init fetch のオプション
 * @param forceRefresh トークンを強制リフレッシュするか（401 リトライ時に true）
 * @returns 組み立てた Headers
 */
async function buildHeaders(init: RequestInit, forceRefresh: boolean): Promise<Headers> {
  const headers = new Headers(init.headers)
  // ボディがあるときだけ JSON ヘッダを付ける（ボディ無し GET の不要な CORS プリフライト回避）。
  if (init.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  // 未ログイン時はトークン無し（例外にせず素通り）。期限切れは fetchAuthSession が自動リフレッシュする。
  const session = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined)
  const token = session.tokens?.accessToken?.toString()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

/**
 * API を呼び出して JSON を返す。ベースURL付与・トークン付与を一元化する。
 * 401 のときはトークンを強制リフレッシュして 1 度だけ再試行する。非2xx応答は例外にする。
 * @param path API のパス（先頭スラッシュ込み。例: /children）
 * @param init fetch のオプション
 * @returns レスポンスボディ（JSON）。ボディが無い場合は null
 */
export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  let response = await fetch(url, { ...init, headers: await buildHeaders(init, false) })

  // アクセストークン失効の可能性 → 強制リフレッシュして 1 度だけ再試行。
  if (response.status === 401) {
    response = await fetch(url, { ...init, headers: await buildHeaders(init, true) })
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}
