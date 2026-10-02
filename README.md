# CCFOLIA ROOM FINDER v5

ココフォリアの公開ルームを検索・共有し、実際のブラウザでルームの存在を定期確認するTRPG向けWebサイトです。

## v5で追加したもの

- 公開済みルーム一覧
- 登録時の削除キー発行
- 削除キーによる本人登録ルームの削除
- **GitHub Actions + Playwright + ChromiumによるCCFOLIA実ブラウザチェック**
- **CCFOLIA画面の`h5`要素に「お探しのルームは見つかりませんでした」が表示された場合の削除候補化**
- **2回連続で同じ「見つからない」状態を確認した場合の自動削除**
- 通信エラー・タイムアウト・その他のチェック失敗では自動削除しない

管理者承認・通報・Turnstile・管理画面は実装していません。

## 構成

- GitHub Pages: 公開Webサイト
- Supabase Database: ルーム情報
- GitHub Actions: 定期チェック
- Playwright + Chromium: CCFOLIAの実ブラウザ表示確認

GitHub Actionsの` schedule`で定期実行でき、PlaywrightはGitHub Actions上でChromiumをインストールして実行できます。\n
## 1. Supabase

既存のv4プロジェクトを使う場合、`supabase.sql`をSQL Editorで実行してください。

追加される主なカラム:

- `last_checked_at`
- `last_check_status`
- `consecutive_not_found`

`consecutive_not_found`は、CCFOLIA上で「見つからない」状態が連続して確認された回数です。

### 自動削除の判定

標準設定では2回連続です。

```text
1回目: 「お探しのルームは見つかりませんでした」
        ↓
        削除候補として記録

2回目: 同じ文言を再確認
        ↓
        DBから削除
```

正常に表示された場合はカウントを0に戻します。

通信エラーやタイムアウトではカウントを増やしません。

## 2. Supabase接続情報

`app.js`にはPublishable Keyだけを入れてください。

```javascript
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

**Supabase Service Role Keyは絶対に`app.js`へ入れないでください。**

## 3. GitHubへアップロード

リポジトリのルートに以下を置きます。

```text
index.html
style.css
app.js
supabase.sql
README.md
package.json
package-lock.json
scripts/check-rooms.mjs
.github/workflows/check-ccfolia-rooms.yml
```

`package-lock.json`は、ローカルで次を実行して生成してください。

```bash
npm install
```

その後、生成された`package-lock.json`もGitHubへコミットします。

## 4. GitHub Actions Secrets

GitHubリポジトリで、

Settings → Secrets and variables → Actions

から以下をRepository secretとして登録します。

### SUPABASE_URL

SupabaseのProject URL。

### SUPABASE_SERVICE_ROLE_KEY

SupabaseのService Role Key。

**このキーは絶対に公開リポジトリのファイルへ書かないでください。**

GitHub ActionsのSecretとしてのみ設定します。

## 5. GitHub Pages

従来どおりGitHub Pagesを有効化してください。

```text
Settings
→ Pages
→ Deploy from a branch
→ main
→ /(root)
```

`.github/workflows/`のファイルはWeb公開対象にはならず、GitHub Actionsが実行します。

## 6. 自動チェック

標準では毎日、日本時間03:17に実行します。

さらにGitHubのActions画面から`workflow_dispatch`で手動実行できます。

GitHub Actionsのスケジュールはデフォルトブランチ上のワークフローを対象に実行されます。公開リポジトリでは、60日間活動がない場合にスケジュールが自動無効化される点にも注意してください。

## 7. CCFOLIAの判定方法

HTTPレスポンスだけでは判断せず、PlaywrightでChromiumを起動して実際のCCFOLIAページを開きます。

ページのJavaScriptによる描画が完了するのを待ち、`h5`要素のテキストを取得します。

以下の文言を含む`h5`が存在した場合を「ルームが見つからない」と判定します。

```text
お探しのルームは見つかりませんでした
```

その状態を2回連続で確認すると、対象レコードを`rooms`テーブルから削除します。

## 8. 自動削除しないケース

以下では削除しません。

- CCFOLIAへの接続タイムアウト
- DNS/ネットワークエラー
- 500系などのサーバーエラー
- Playwrightのエラー
- `h5`の判定ができない場合
- 正常にルームが表示される場合

CCFOLIA側の一時障害で登録情報が消えることを避けるためです。

## 9. 注意事項

CCFOLIAの画面構造や文言が将来変更された場合、このチェック方法が動作しなくなる可能性があります。

特に以下が変更された場合は、`scripts/check-rooms.mjs`の修正が必要です。

- 「お探しのルームは見つかりませんでした」の文言
- `h5`要素の構造
- ルームページのURL構造
- JavaScriptによるページ描画方式

また、1回のGitHub Actions実行では標準で最大100ルームを確認します。ルーム数が100件を超えた場合は、後続実行で残りを確認する設計に変更する必要があります。

## 10. 削除キー

ルーム登録時に削除キーを発行します。

- 削除キーの平文はDBに保存しません
- SHA-256ハッシュのみ保存します
- URL＋削除キーが一致した場合のみ手動削除できます

## ライセンス

必要に応じて設定してください。
