import { apiRequest } from './api'

// 許可する画像 MIME タイプ（バックの署名付き URL 契約に合わせる）
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
// ファイルサイズ上限（5MB）。バックは未強制のためフロントで弾く。
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

// 画像の用途。現状はバックが 'child' のみ対応。
type ImagePurpose = 'child'

type PresignResponse = {
  uploadUrl: string
  key: string
  expiresIn: number
}

/**
 * 画像ファイルを事前バリデーションする。
 * @param file 検証するファイル
 * @returns 問題があればエラーメッセージ、無ければ null
 */
export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'JPEG / PNG / WebP の画像を選択してください。'
  }
  if (file.size === 0) {
    return 'ファイルが空です。別の画像を選択してください。'
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return 'ファイルサイズは5MB以下にしてください。'
  }
  return null
}

/**
 * 画像を S3 にアップロードし、保存用のキーを返す。
 * バックから署名付き URL を取得し、S3 へ直接 PUT する（PUT の Content-Type は署名と一致させる）。
 * @param purpose 用途（現状 'child' のみ）
 * @param targetId 対象リソースの ID（purpose='child' なら子供の id。本人の所有物でないと 404）
 * @param file アップロードする画像ファイル
 * @returns S3 オブジェクトキー（DB 保存用）
 */
export async function uploadImage(
  purpose: ImagePurpose,
  targetId: string,
  file: File,
): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  // ① 署名付き URL を発行（apiRequest が Authorization と Content-Type: application/json を付与）
  const { uploadUrl, key } = await apiRequest<PresignResponse>('/uploads/image-url', {
    method: 'POST',
    body: JSON.stringify({ purpose, targetId, contentType: file.type }),
  })

  // ② S3 へ直接 PUT（バックを経由しない。Content-Type は①の contentType と一致させる）
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`画像のアップロードに失敗しました: ${response.status}`)
  }

  // ③ 呼び出し側で key を対象リソースに保存する
  return key
}
