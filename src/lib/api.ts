// API のベース URL。Vite は VITE_ 接頭辞の環境変数のみフロントから参照できる。
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  // 未設定だと fetch('undefined/...') になり全リクエストが静かに失敗するため、起動時に落とす。
  throw new Error('VITE_API_BASE_URL が設定されていません。.env に設定してください。')
}

// localStorage に保存したアクセストークンのキー（フェーズ2でCognitoのトークンを格納する）
const ACCESS_TOKEN_KEY = 'accessToken'

/**
 * 保存済みのアクセストークンを返す。未保存なら null。
 * @returns アクセストークン、または null
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * API を呼び出して JSON を返す。ベースURL付与・JSONヘッダ・トークン付与を一元化する。
 * 非2xx応答は例外にする。
 * @param path API のパス（先頭スラッシュ込み。例: /children）
 * @param init fetch のオプション
 * @returns レスポンスボディ（JSON）。ボディが無い場合は null
 */
export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  const headers = new Headers(init.headers)
  // ボディがあるときだけ JSON ヘッダを付ける。
  // ボディ無しの GET に付けると不要な CORS プリフライトを誘発するため。
  if (init.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}
