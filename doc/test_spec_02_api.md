# 営業日報システム テスト仕様書（2/4）― APIテスト編

---

## 目次

1. [テスト方針](#1-テスト方針)
2. [共通テスト（認証・権限）](#2-共通テスト認証権限)
3. [認証 API テスト](#3-認証-api-テスト)
4. [日報 API テスト](#4-日報-api-テスト)
5. [訪問記録 API テスト](#5-訪問記録-api-テスト)
6. [コメント API テスト](#6-コメント-api-テスト)
7. [顧客マスタ API テスト](#7-顧客マスタ-api-テスト)
8. [営業マスタ API テスト](#8-営業マスタ-api-テスト)

---

## 1. テスト方針

### 1-1. テスト対象

API仕様書（`api_specification.md`）に定義された全エンドポイントを対象とする。

### 1-2. テスト観点

各エンドポイントについて以下の観点でテストする。

| 観点 | 説明 |
|------|------|
| 正常系 | 正しいリクエストで期待通りのレスポンスが返る |
| バリデーションエラー | 不正な入力値に対して 400 と適切なエラーコードが返る |
| 認証エラー | トークンなし・無効トークンで 401 が返る |
| 権限エラー | 権限のないロールのアクセスで 403 が返る |
| 存在しないリソース | 存在しないIDへのアクセスで 404 が返る |
| 業務エラー | 業務ルール違反で 409 と適切なエラーコードが返る |

### 1-3. テストケース記述凡例

| 列名 | 説明 |
|------|------|
| テストID | `API-グループ-連番`（例：API-AUTH-001） |
| メソッド＋パス | `POST /auth/login` など |
| リクエスト | ヘッダー・ボディの主要パラメーター |
| 期待ステータス | 期待するHTTPステータスコード |
| 期待レスポンス | `data` / `error.code` などの主要フィールド |
| 優先度 | 高／中／低 |

---

## 2. 共通テスト（認証・権限）

すべての認証必須エンドポイントで以下を確認する。代表として `GET /daily-reports` を使用。

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CMN-001 | `Authorization` ヘッダーなし | 401 | `error.code: "SYS-003"` | 高 |
| API-CMN-002 | `Authorization: Bearer invalid_token` | 401 | `error.code: "SYS-003"` | 高 |
| API-CMN-003 | 有効期限切れトークン | 401 | `error.code: "SYS-003"` | 高 |

---

## 3. 認証 API テスト

### 3-1. `POST /auth/login`

| テストID | リクエストボディ | 期待ステータス | 期待レスポンス | 優先度 |
|----------|----------------|--------------|----------------|--------|
| API-AUTH-001 | `{"email":"tanaka@example.com","password":"Password01"}` | 200 | `data.token` が存在、`data.user.role: "salesperson"` | 高 |
| API-AUTH-002 | `{"email":"yamada@example.com","password":"Password03"}` | 200 | `data.user.role: "manager"` | 高 |
| API-AUTH-003 | `{"email":"","password":"Password01"}` | 400 | `error.details[0].code: "L-01"` | 高 |
| API-AUTH-004 | `{"email":"not-an-email","password":"Password01"}` | 400 | `error.details[0].code: "L-02"` | 高 |
| API-AUTH-005 | `{"email":"tanaka@example.com","password":""}` | 400 | `error.details[0].code: "L-03"` | 高 |
| API-AUTH-006 | `{"email":"tanaka@example.com","password":"Pass123"}` （7文字）| 400 | `error.details[0].code: "L-04"` | 高 |
| API-AUTH-007 | `{"email":"tanaka@example.com","password":"WrongPass"}` | 401 | `error.code: "BIZ-001"` | 高 |
| API-AUTH-008 | `{"email":"nobody@example.com","password":"Password01"}` | 401 | `error.code: "BIZ-001"` | 高 |

### 3-2. `POST /auth/logout`

| テストID | リクエスト | 期待ステータス | 優先度 |
|----------|-----------|--------------|--------|
| API-AUTH-020 | 有効なトークンでリクエスト | 204 | 高 |
| API-AUTH-021 | ログアウト後に同トークンで `GET /daily-reports` を実行 | 401 | 高 |

### 3-3. `POST /auth/refresh`

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-AUTH-030 | 有効なトークンでリクエスト | 200 | `data.token` が新しいトークン値 | 中 |

---

## 4. 日報 API テスト

### 4-1. `GET /daily-reports`（日報一覧・自分）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-RPT-001 | USER-01のトークンでリクエスト | 200 | `data` にUSER-01の日報のみ含まれる。USER-02の日報は含まれない | 高 |
| API-RPT-002 | `?status=submitted` を付与 | 200 | `data` の全要素で `status: "submitted"` | 中 |
| API-RPT-003 | `?year_month=2024-11` を付与 | 200 | `data` の全要素で `report_date` が2024-11-xxの形式 | 中 |
| API-RPT-004 | `?page=1&per_page=2` を付与（3件存在） | 200 | `data` が2件、`meta.total: 3`、`meta.page: 1` | 中 |

### 4-2. `GET /daily-reports/team`（日報一覧・部下全員）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-RPT-010 | USER-03（上長）のトークンでリクエスト | 200 | USER-01・USER-02の日報が含まれる | 高 |
| API-RPT-011 | `?salesperson_id=<USER-01のID>` を付与 | 200 | USER-01の日報のみ含まれる | 中 |
| API-RPT-012 | USER-01（営業）のトークンでリクエスト | 403 | `error.code: "SYS-004"` | 高 |

### 4-3. `GET /daily-reports/{id}`（日報詳細）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-RPT-020 | USER-01のトークンで自分のRPT-01を取得 | 200 | `data.id` がRPT-01のID、`data.visit_records` が配列で返る | 高 |
| API-RPT-021 | USER-03（上長）のトークンで部下のRPT-01を取得 | 200 | 200 が返る | 高 |
| API-RPT-022 | USER-01のトークンでUSER-02の日報（RPT-04）を取得 | 403 | `error.code: "SYS-004"` | 高 |
| API-RPT-023 | 存在しないIDを指定 | 404 | `error.code: "SYS-005"` | 高 |

### 4-4. `POST /daily-reports`（日報作成）

| テストID | リクエストボディ | 期待ステータス | 期待レスポンス | 優先度 |
|----------|----------------|--------------|----------------|--------|
| API-RPT-030 | 有効なデータ（`status: "draft"`）| 201 | `data.status: "draft"`、`data.id` が存在 | 高 |
| API-RPT-031 | 有効なデータ（`status: "submitted"`、`visit_records` 1件）| 201 | `data.status: "submitted"` | 高 |
| API-RPT-032 | `visit_records[0].customer_id` が空文字 | 400 | `error.details[0].code: "RE-01"`、`error.details[0].field: "visit_records[0].customer_id"` | 高 |
| API-RPT-033 | `visit_records[0].visit_content` が1001文字 | 400 | `error.details[0].code: "RE-03"` | 高 |
| API-RPT-034 | `problem` が2001文字 | 400 | `error.details[0].code: "RE-07"` | 高 |
| API-RPT-035 | `plan` が2001文字 | 400 | `error.details[0].code: "RE-08"` | 高 |
| API-RPT-036 | 同一日付で2回 `POST` | 409 | `error.code: "BIZ-002"` | 高 |

### 4-5. `PUT /daily-reports/{id}`（日報更新）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-RPT-040 | 下書きの日報を正常に更新 | 200 | `data` に更新後の内容が含まれる | 高 |
| API-RPT-041 | `visit_records` を差し替え（1件→2件） | 200 | `data.visit_records` の件数が2件 | 高 |
| API-RPT-042 | 提出済みの日報を更新しようとする | 403 | `error.code: "BIZ-003"` | 高 |
| API-RPT-043 | 他者の日報を更新しようとする | 403 | `error.code: "BIZ-004"` | 高 |

### 4-6. `PATCH /daily-reports/{id}/review`（確認済みに更新）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-RPT-050 | USER-03（上長）のトークンで提出済み日報を確認済みに | 200 | `data.status: "reviewed"` | 高 |
| API-RPT-051 | USER-01（営業）のトークンでリクエスト | 403 | `error.code: "SYS-004"` | 高 |
| API-RPT-052 | すでに確認済みの日報に対して実行 | 409 | `error.code: "BIZ-005"` | 高 |

---

## 5. 訪問記録 API テスト

### 5-1. `POST /daily-reports/{report_id}/visit-records`（訪問記録追加）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-VIS-001 | 下書き日報に有効なデータで訪問記録追加 | 201 | `data.id` が存在、`data.customer.name` が正しい | 高 |
| API-VIS-002 | `customer_id` が空文字 | 400 | `error.details[0].code: "RE-01"` | 高 |
| API-VIS-003 | `visit_content` が空文字 | 400 | `error.details[0].code: "RE-02"` | 高 |
| API-VIS-004 | `visited_at` が `"25:00"` | 400 | `error.details[0].code: "RE-05"` | 中 |
| API-VIS-005 | 提出済み日報に追加しようとする | 403 | `error.code: "BIZ-003"` | 高 |
| API-VIS-006 | 存在しない `report_id` を指定 | 404 | `error.code: "SYS-005"` | 中 |

### 5-2. `DELETE /daily-reports/{report_id}/visit-records/{id}`（訪問記録削除）

| テストID | リクエスト | 期待ステータス | 優先度 |
|----------|-----------|--------------|--------|
| API-VIS-010 | 下書き日報の訪問記録を削除 | 204 | 高 |
| API-VIS-011 | 提出済み日報の訪問記録を削除しようとする | 403 | 高 |
| API-VIS-012 | 存在しないIDを指定 | 404 | 中 |

### 5-3. `PATCH /daily-reports/{report_id}/visit-records/reorder`（並び替え）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-VIS-020 | 2件の訪問記録の順序を入れ替える | 200 | `data.updated: true` | 中 |
| API-VIS-021 | 存在しない訪問記録IDを含む | 404 | `error.code: "SYS-005"` | 中 |

---

## 6. コメント API テスト

### 6-1. `POST /daily-reports/{report_id}/comments`（コメント投稿）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CMT-001 | USER-03（上長）のトークンで有効なコメントを投稿 | 201 | `data.content` が投稿内容、`data.commenter.name` がUSER-03の氏名 | 高 |
| API-CMT-002 | `content` が空文字 | 400 | `error.details[0].code: "RD-01"` | 高 |
| API-CMT-003 | `content` が1001文字 | 400 | `error.details[0].code: "RD-02"` | 高 |
| API-CMT-004 | USER-01（営業）のトークンで投稿 | 403 | `error.details[0].code: "RD-03"` または `error.code: "SYS-004"` | 高 |
| API-CMT-005 | 存在しない `report_id` を指定 | 404 | `error.code: "SYS-005"` | 中 |

### 6-2. `PUT /daily-reports/{report_id}/comments/{id}`（コメント更新）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CMT-010 | 投稿者本人が内容を更新 | 200 | `data.content` が更新後の内容 | 中 |
| API-CMT-011 | 投稿者以外のユーザーが更新 | 403 | `error.code: "SYS-004"` | 中 |

### 6-3. `DELETE /daily-reports/{report_id}/comments/{id}`（コメント削除）

| テストID | リクエスト | 期待ステータス | 優先度 |
|----------|-----------|--------------|--------|
| API-CMT-020 | 投稿者本人が削除 | 204 | 中 |
| API-CMT-021 | 管理者が削除 | 204 | 中 |
| API-CMT-022 | 投稿者以外（一般上長）が削除 | 403 | 中 |

---

## 7. 顧客マスタ API テスト

### 7-1. `GET /customers`（顧客一覧）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CUST-001 | 管理者トークンでリクエスト | 200 | `data` に顧客一覧が含まれる、`meta.total` が存在 | 高 |
| API-CUST-002 | `?keyword=アルファ` を付与 | 200 | `data` に「株式会社アルファ」のみ含まれる | 中 |
| API-CUST-003 | `?industry=IT` を付与 | 200 | `data` の全要素で `industry: "IT"` | 中 |
| API-CUST-004 | USER-01（営業）のトークンでリクエスト | 403 | `error.code: "SYS-004"` | 高 |

### 7-2. `GET /customers/select-options`（選択肢用）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CUST-010 | 営業トークンでリクエスト | 200 | `data` に `{id, name}` のみのオブジェクト配列 | 高 |

### 7-3. `POST /customers`（顧客登録）

| テストID | リクエストボディ | 期待ステータス | 期待レスポンス | 優先度 |
|----------|----------------|--------------|----------------|--------|
| API-CUST-020 | `{"name":"株式会社デルタ","industry":"IT"}` | 201 | `data.name: "株式会社デルタ"` | 高 |
| API-CUST-021 | `{"name":""}` | 400 | `error.details[0].code: "CE-01"` | 高 |
| API-CUST-022 | `{"name":"a".repeat(101)}` | 400 | `error.details[0].code: "CE-02"` | 高 |
| API-CUST-023 | `{"name":"テスト","phone":"invalid"}` | 400 | `error.details[0].code: "CE-04"` | 中 |
| API-CUST-024 | 管理者以外（上長）のトークンでリクエスト | 403 | `error.code: "SYS-004"` | 高 |

### 7-4. `DELETE /customers/{id}`（顧客削除）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-CUST-030 | 訪問記録に紐づいていない顧客を削除 | 204 | − | 高 |
| API-CUST-031 | 訪問記録に紐づく顧客を削除 | 409 | `error.code: "BIZ-008"` | 高 |

---

## 8. 営業マスタ API テスト

### 8-1. `GET /salespeople`（営業担当者一覧）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-SALES-001 | 管理者トークンでリクエスト | 200 | `data` に担当者一覧、各要素に `manager` ネストが含まれる | 高 |
| API-SALES-002 | 上長トークンでリクエスト | 403 | `error.code: "SYS-004"` | 高 |

### 8-2. `POST /salespeople`（担当者登録）

| テストID | リクエストボディ | 期待ステータス | 期待レスポンス | 優先度 |
|----------|----------------|--------------|----------------|--------|
| API-SALES-010 | 有効なデータ（role: salesperson）| 201 | `data` にパスワードフィールドが含まれない | 高 |
| API-SALES-011 | `name` が空文字 | 400 | `error.details[0].code: "SE-01"` | 高 |
| API-SALES-012 | `email` が既存のメールアドレス | 409 | `error.code: "BIZ-006"` | 高 |
| API-SALES-013 | `password` が7文字 | 400 | `error.details[0].code: "SE-07"` | 高 |
| API-SALES-014 | `password` が英字のみ8文字 | 400 | `error.details[0].code: "SE-08"` | 高 |
| API-SALES-015 | `role` が空文字 | 400 | `error.details[0].code: "SE-09"` | 高 |

### 8-3. `PUT /salespeople/{id}`（担当者更新）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-SALES-020 | `password` フィールドを省略して更新 | 200 | `data` が更新される（パスワード変更なし） | 高 |
| API-SALES-021 | `manager_id` に自分自身のIDを指定 | 409 | `error.code: "BIZ-007"` | 中 |

### 8-4. `DELETE /salespeople/{id}`（担当者削除）

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-SALES-030 | 日報・コメントが存在しない担当者を削除 | 204 | − | 高 |
| API-SALES-031 | 日報が存在する担当者を削除 | 409 | `error.code: "BIZ-009"` | 高 |

### 8-5. `GET /salespeople/subordinates` / `GET /salespeople/manager-options`

| テストID | リクエスト | 期待ステータス | 期待レスポンス | 優先度 |
|----------|-----------|--------------|----------------|--------|
| API-SALES-040 | USER-03（上長）で `/subordinates` を取得 | 200 | USER-01・USER-02のみ含まれる | 中 |
| API-SALES-041 | 管理者で `/manager-options` を取得 | 200 | `manager` / `admin` ロールのユーザーのみ含まれる | 中 |

---

*以上（2/4）*
