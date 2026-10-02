# CCFOLIA ROOM FINDER v4

ココフォリアの公開ルームを検索・共有するTRPG向けWebサイトです。

## 構成

- GitHub Pages
- HTML / CSS / JavaScript
- Supabase Database
- Supabase RLS
- Supabase JavaScript SDK

自前サーバーは必要ありません。

## v1の機能

- ココフォリア公開ルームの登録
- ルーム名
- ココフォリアURL
- TRPGシステム
- タグ
- 説明
- キーワード検索
- TRPGシステムによる絞り込み
- 登録済みURLの重複防止
- `https://ccfolia.com/rooms/...` 形式のURL検証
- スマートフォン対応
- 登録時に削除キーを発行
- 削除キーによる本人登録ルームの削除
- 公開済みルームの一覧表示
- 公開済みルーム一覧の手動更新

「推奨人数」「人数による絞り込み」はv1にはありません。

---

# 1. Supabaseプロジェクトを作成

Supabaseで新しいプロジェクトを作成します。

その後、SQL Editorを開き、`supabase.sql` の内容をすべて実行してください。

これにより `rooms` テーブルとRLSポリシーが作成されます。

# 2. Supabaseの接続情報を設定

Supabaseのプロジェクト設定から、Project URLとPublishable Keyを確認します。

`app.js` の先頭を変更してください。

```javascript
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

## 重要

ブラウザに置いてよいのはPublishable Keyです。

以下のような秘密鍵は絶対に `app.js` に書かないでください。

- service_role key
- secret key
- その他のサーバー専用秘密情報

# 3. GitHubへアップロード

このフォルダの以下のファイルをGitHubリポジトリのルートに置きます。

```text
index.html
style.css
app.js
supabase.sql
README.md
```

# 4. GitHub Pagesを有効化

GitHubリポジトリで、

Settings
→ Pages

を開きます。

Build and deployment の Source を GitHub Actions または Deploy from a branch に設定してください。

単純な静的サイトなので、最初は `main` ブランチのルートを公開する方法でも構いません。

公開されると、

```text
https://ユーザー名.github.io/リポジトリ名/
```

のようなURLになります。

# 5. 公開済みルーム一覧

v4では、検索とは別に「公開済みルーム一覧」セクションを追加しています。

- `is_public = true` かつ `is_approved = true` のルームだけを表示
- 登録日時の新しい順に最大100件を表示
- 「一覧を更新」ボタンで最新状態を再取得
- ルーム名、システム、タグ、説明、登録日、ココフォリアへのリンクを確認可能

この機能は既存のSupabase RLSによる公開条件をそのまま利用しており、管理者機能や承認機能は追加していません。

# 6. 動作確認

公開ページを開き、

1. 「ルームを登録」でテストデータを登録
2. 「公開ルーム」に表示されることを確認
3. キーワード検索を確認
4. TRPGシステム絞り込みを確認
5. 同じURLを再登録して重複エラーになることを確認
6. `example.com` などを入力してURL検証が拒否することを確認

# ルーム削除について

v2では、ルーム登録時にランダムな削除キーを発行します。

- 削除キーは登録成功時に一度だけ画面に表示されます。
- 削除キーの平文はSupabaseには保存しません。
- SupabaseにはSHA-256ハッシュのみ保存します。
- 削除時は「ココフォリアURL＋削除キー」を入力します。
- URLと削除キーが一致した場合だけ対象ルームを削除します。
- ブラウザから匿名ユーザーに直接DELETE権限は与えず、Supabase RPC関数で検証して削除します。

**削除キーを紛失すると、通常の削除フォームからは削除できません。**
また、v1から既に登録されていたルームには削除キーがないため、v2の削除フォームでは削除できません。必要に応じて管理者用の削除機能を追加してください。

## v4でのSupabase設定

新規プロジェクトの場合は `supabase.sql` を最初から実行してください。

v1のプロジェクトを更新する場合も、`supabase.sql` をSQL Editorで実行できます。`deletion_token_hash` 列、RLS登録ポリシー、削除用RPC関数が追加されます。

# CCFOLIA URL検証について

v1ではブラウザ側とデータベース側の2箇所でURL形式を検証します。

許可：

```text
https://ccfolia.com/rooms/xxxxxxxx
```

拒否：

```text
http://ccfolia.com/rooms/xxxxxxxx
https://example.com/rooms/xxxxxxxx
https://ccfolia.com/
https://ccfolia.com/other/xxxxxxxx
```

ただし、v1のURL検証は「URLの形式とドメインが正しいか」の確認です。

「そのルームが実際に存在するか」
「現在も公開されているか」
までは確認しません。

この確認は次のバージョンでSupabase Edge Functions等を使って追加できます。

# セキュリティについて

v2でも「誰でも登録できる」仕様です。

そのため一般公開すると、スパム登録される可能性があります。

正式公開前には、例えば以下を追加することを推奨します。

- Cloudflare Turnstile
- 管理者承認
- 通報機能
- 削除申請
- URLの定期チェック
- レート制限
- 登録者ごとの管理機能
- 削除キーの再発行・管理者削除機能

# ライセンス

必要に応じて設定してください。
