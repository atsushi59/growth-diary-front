import { useParams } from 'react-router'

/**
 * @component
 * 離乳食詳細ページ。/foods/:id の id を URL パラメータから受け取る。
 */
export default function FoodPostDetail() {
  const { id } = useParams()
  return <h1>離乳食詳細ページ（id: {id}）</h1>
}
