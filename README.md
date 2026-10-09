# CCFOLIA ROOM FINDER v14

## v14の修正
- サイトを開いた直後に `loadRooms()` を実行し、検索欄が空の状態で公開・承認済みルームを全件表示します。
- Supabaseの取得上限を超える場合も、500件ずつページングして全件取得します。各ページで新しいクエリを作る方式に変更しました。
- 現在の `index.html` に存在しない要素を参照していた旧公開一覧処理と、その起動呼び出しを削除しました。

## 公開手順
1. ZIPを展開します。
2. `index.html`、`style.css`、`app.js`、`supabase.sql` をGitHub Pagesリポジトリの対応ファイルに反映します。
3. 公開後、ブラウザで強制再読み込み（Windows: `Ctrl + F5`）して確認します。

## 全件表示の条件
表示対象はSupabaseの `rooms` テーブルで `is_public = true` かつ `is_approved = true` のレコードです。非公開・未承認のレコード、およびRLSでSELECTが許可されていないレコードは表示されません。
