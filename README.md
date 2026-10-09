# CCFOLIA ROOM FINDER v15

## v15 修正内容
- 初期表示が実行されない原因だった、存在しない `refreshPublicRoomsButton` へのイベント登録を削除しました。
- 現行HTMLにない `loadPublicRooms()` の呼び出しを削除しました。
- ページ読み込み時に `loadRooms()` を実行し、検索欄が空なら公開・承認済みのルームを条件なしで全件取得します。
- Supabaseの取得上限を超える場合は500件ずつページングします。

## 適用
`index.html`、`app.js`、`style.css`、`supabase.sql` をGitHub Pagesリポジトリに反映してください。今回はフロントエンドの修正なので、通常はSQLの再実行は不要です。反映後、ブラウザで Ctrl+F5 を押して再読み込みしてください。

## 注意
表示対象は `is_public = true` かつ `is_approved = true` のルームです。SupabaseのRLSポリシーがSELECTを許可していないレコードは取得できません。
