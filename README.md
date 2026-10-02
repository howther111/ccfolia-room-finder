# CCFOLIA ROOM FINDER v1

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

# 5. 動作確認

公開ページを開き、

1. 「ルームを登録」でテストデータを登録
2. 「公開ルーム」に表示されることを確認
3. キーワード検索を確認
4. TRPGシステム絞り込みを確認
5. 同じURLを再登録して重複エラーになることを確認
6. `example.com` などを入力してURL検証が拒否することを確認

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

v1は「誰でも登録できる」仕様です。

そのため一般公開すると、スパム登録される可能性があります。

正式公開前には、例えば以下を追加することを推奨します。

- Cloudflare Turnstile
- 管理者承認
- 通報機能
- 削除申請
- URLの定期チェック
- レート制限
- 登録者ごとの管理機能

# ライセンス

必要に応じて設定してください。
