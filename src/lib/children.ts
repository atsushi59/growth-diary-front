import { apiRequest } from './api'

// 子供（バックの Child モデルに対応）。image は S3 オブジェクトキー（未設定可）。
export type Child = {
  id: string
  userId: string
  name: string
  birthday: string
  gender: string
  image?: string | null
  createdAt: string
  updatedAt: string
}

// 子供の登録・更新でクライアントから送る入力。image は任意。
export type ChildInput = {
  name: string
  birthday: string
  gender: string
  image?: string
}

/**
 * 本人の子供を全件取得する。
 * @returns 子供の配列
 */
export function listChildren(): Promise<Child[]> {
  return apiRequest<Child[]>('/children')
}

/**
 * 子供を作成する。
 * @param input 作成する子供の入力
 * @returns 作成した子供
 */
export function createChild(input: ChildInput): Promise<Child> {
  return apiRequest<Child>('/children', { method: 'POST', body: JSON.stringify(input) })
}

/**
 * 子供を部分更新する。渡したフィールドだけ更新される。
 * @param id 子供の id
 * @param input 更新したいフィールドのみ
 * @returns 更新後の子供
 */
export function updateChild(id: string, input: Partial<ChildInput>): Promise<Child> {
  return apiRequest<Child>(`/children/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

/**
 * 子供を削除する（バック側で画像・成長記録もカスケード削除される）。
 * @param id 子供の id
 */
export function deleteChild(id: string): Promise<unknown> {
  return apiRequest(`/children/${id}`, { method: 'DELETE' })
}
