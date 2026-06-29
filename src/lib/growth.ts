import { apiRequest } from './api'

// 1年あたりの月数。月齢⇄年齢の換算で使う。
export const MONTHS_PER_YEAR = 12

// 成長記録（バックの Growth モデル）。height/weight はどちらか必須・もう一方は null 可。
export type Growth = {
  id: string
  childId: string
  height: number | null
  weight: number | null
  recordedAt: string
}

// 登録・更新で送る入力。recordedAt は測定月の1日（YYYY-MM-01）。
export type GrowthInput = {
  height?: number | null
  weight?: number | null
  recordedAt: string
}

// 発育曲線マスタの1点（月齢ごとの下限・上限）。
export type GrowthBand = {
  ageMonths: number
  min: number
  max: number
}

// 子の性別に合わせた発育曲線マスタ（身長・体重の帯）。
export type GrowthStandards = {
  source: string
  gender: string
  height: GrowthBand[]
  weight: GrowthBand[]
}

/**
 * その子の成長記録一覧（古い順）を取得する。
 * @param childId 子供の id
 * @returns 成長記録の配列
 */
export function listGrowths(childId: string): Promise<Growth[]> {
  return apiRequest<Growth[]>(`/children/${childId}/growth`)
}

/**
 * その子の性別に合った発育曲線マスタ（帯）を取得する。
 * @param childId 子供の id
 * @returns 身長・体重の帯データ
 */
export function listGrowthStandards(childId: string): Promise<GrowthStandards> {
  return apiRequest<GrowthStandards>(`/children/${childId}/growth-standards`)
}

/**
 * 成長記録を作成する。
 * @param childId 子供の id
 * @param input 登録する入力
 * @returns 作成した成長記録
 */
export function createGrowth(childId: string, input: GrowthInput): Promise<Growth> {
  return apiRequest<Growth>(`/children/${childId}/growth`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * 成長記録を全置換（PUT）で更新する。
 * @param childId 子供の id
 * @param id 成長記録の id
 * @param input 置き換える入力
 * @returns 更新後の成長記録
 */
export function updateGrowth(childId: string, id: string, input: GrowthInput): Promise<Growth> {
  return apiRequest<Growth>(`/children/${childId}/growth/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/**
 * 成長記録を削除する。
 * @param childId 子供の id
 * @param id 成長記録の id
 */
export function deleteGrowth(childId: string, id: string): Promise<unknown> {
  return apiRequest(`/children/${childId}/growth/${id}`, { method: 'DELETE' })
}

/**
 * 誕生日と測定日（どちらも月初）から月齢を計算する。
 * Date でパースするとタイムゾーンで月がずれるため、文字列から年月を直接取る。
 * @param birthday 誕生日（YYYY-MM-DD）
 * @param recordedAt 測定日（YYYY-MM-01）
 * @returns 月齢（整数）
 */
export function toAgeMonths(birthday: string, recordedAt: string): number {
  const [birthYear, birthMonth] = birthday.split('-').map(Number)
  const [recordedYear, recordedMonth] = recordedAt.split('-').map(Number)
  return (recordedYear - birthYear) * 12 + (recordedMonth - birthMonth)
}
