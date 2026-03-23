# 営業日報システム API仕様書

---

## 目次

1. [共通仕様](#1-共通仕様)
2. [認証 API](#2-認証-api)
3. [日報 API](#3-日報-api)
4. [訪問記録 API](#4-訪問記録-api)
5. [コメント API](#5-コメント-api)
6. [顧客マスタ API](#6-顧客マスタ-api)
7. [営業マスタ API](#7-営業マスタ-api)
8. [エラーレスポンス仕様](#8-エラーレスポンス仕様)

---

## 1. 共通仕様

### 1-1. ベースURL

```
https://api.example.com/v1
```

### 1-2. 認証

ログイン成功後に発行される JWT Bearer トークンをすべてのリクエストヘッダーに付与する。  
認証が不要なエンドポイントは各APIに `🔓 認証不要` と明記する。

```
Authorization: Bearer <token>
```

### 1-3. 共通リクエストヘッダー

| ヘッダー名 | 値 | 必須 |
|------------|-----|------|
| `Content-Type` | `application/json` | ○（POST / PUT / PATCH のみ） |
| `Authorization` | `Bearer <token>` | ○（認証不要エンドポイントを除く） |

### 1-4. 共通レスポンスフォーマット

**成功時**

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

`meta` はページネーションを持つ一覧取得APIのみ含む。単一リソースの取得・更新・削除では省略する。

**エラー時**

```json
{
  "error": {
    "code": "BIZ-002",
    "message": "同じ日付の日報がすでに存在します",
    "details": [
      {
        "field": "report_date",
        "code": "RE-09",
        "message": "同じ日付の日報がすでに存在します"
      }
    ]
  }
}
```

`details` はフィールド単位のバリデーションエラーがある場合のみ含む。

### 1-5. ページネーション

一覧取得APIはクエリパラメーターでページネーションを指定する。

| パラメーター | 型 | デフォルト | 説明 |
|------------|-----|-----------|------|
| `page` | integer | 1 | 取得するページ番号 |
| `per_page` | integer | 20 | 1ページあたりの件数（最大100） |

### 1-6. 日付・日時フォーマット

| 型 | フォーマット | 例 |
|----|------------|-----|
| 日付 | `YYYY-MM-DD` | `2024-11-20` |
| 日時 | ISO 8601 UTC | `2024-11-20T09:00:00Z` |
| 時刻 | `HH:MM` | `10:30` |

### 1-7. HTTPステータスコード

| ステータス | 用途 |
|------------|------|
| 200 OK | 取得・更新成功 |
| 201 Created | 新規作成成功 |
| 204 No Content | 削除成功 |
| 400 Bad Request | リクエスト形式エラー・バリデーションエラー |
| 401 Unauthorized | 認証トークン不正・期限切れ |
| 403 Forbidden | 権限不足 |
| 404 Not Found | リソースが存在しない |
| 409 Conflict | 業務ルール違反（重複など） |
| 500 Internal Server Error | サーバー内部エラー |

---

## 2. 認証 API

### 2-1. ログイン

🔓 認証不要

```
POST /auth/login
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `email` | string | ○ | メールアドレス |
| `password` | string | ○ | パスワード |

```json
{
  "email": "tanaka@example.com",
  "password": "Password123"
}
```

**レスポンス** `200 OK`

| フィールド | 型 | 説明 |
|------------|-----|------|
| `token` | string | JWT アクセストークン |
| `expires_at` | string | トークン有効期限（ISO 8601） |
| `user.id` | string | ログインユーザーID |
| `user.name` | string | 氏名 |
| `user.email` | string | メールアドレス |
| `user.role` | string | ロール（`salesperson` / `manager` / `admin`） |

```json
{
  "data": {
    "token": "eyJhbGci...",
    "expires_at": "2024-11-21T09:00:00Z",
    "user": {
      "id": "uuid-xxxx",
      "name": "田中 太郎",
      "email": "tanaka@example.com",
      "role": "salesperson"
    }
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `L-01` / `L-02` / `L-03` / `L-04` | 各フィールドバリデーションエラー |
| 401 | `BIZ-001` | メールアドレスまたはパスワードが正しくありません |

---

### 2-2. ログアウト

```
POST /auth/logout
```

**レスポンス** `204 No Content`

---

### 2-3. トークンリフレッシュ

```
POST /auth/refresh
```

**レスポンス** `200 OK`

```json
{
  "data": {
    "token": "eyJhbGci...",
    "expires_at": "2024-11-22T09:00:00Z"
  }
}
```

---

## 3. 日報 API

### 3-1. 日報一覧取得（自分）

```
GET /daily-reports
```

自分の日報一覧を返す。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `status` | string | − | `draft` / `submitted` / `reviewed` |
| `year_month` | string | − | `YYYY-MM` 形式（例：`2024-11`） |
| `page` | integer | − | ページ番号（デフォルト：1） |
| `per_page` | integer | − | 件数（デフォルト：20） |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-xxxx",
      "report_date": "2024-11-20",
      "status": "reviewed",
      "visit_count": 3,
      "updated_at": "2024-11-20T09:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 45
  }
}
```

---

### 3-2. 日報一覧取得（上長：部下全員）

```
GET /daily-reports/team
```

ログインユーザーの部下全員の日報一覧を返す。上長・管理者ロールのみアクセス可。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `salesperson_id` | string | − | 担当者IDで絞り込み |
| `status` | string | − | `draft` / `submitted` / `reviewed` |
| `year_month` | string | − | `YYYY-MM` 形式 |
| `page` | integer | − | ページ番号 |
| `per_page` | integer | − | 件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-xxxx",
      "report_date": "2024-11-20",
      "status": "submitted",
      "visit_count": 3,
      "salesperson": {
        "id": "uuid-yyyy",
        "name": "田中 太郎"
      },
      "updated_at": "2024-11-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 12
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません |

---

### 3-3. 日報詳細取得

```
GET /daily-reports/{id}
```

**パスパラメーター**

| パラメーター | 型 | 説明 |
|------------|-----|------|
| `id` | string (UUID) | 日報ID |

**レスポンス** `200 OK`

```json
{
  "data": {
    "id": "uuid-xxxx",
    "report_date": "2024-11-20",
    "status": "submitted",
    "problem": "株式会社Aの担当者が異動予定。次回フォロー要。",
    "plan": "株式会社Cへの提案資料を作成する。",
    "salesperson": {
      "id": "uuid-yyyy",
      "name": "田中 太郎"
    },
    "visit_records": [
      {
        "id": "uuid-vvvv",
        "order": 1,
        "customer": {
          "id": "uuid-cccc",
          "name": "株式会社A"
        },
        "visit_content": "○○の提案をした",
        "visited_at": "10:00"
      }
    ],
    "comments": [
      {
        "id": "uuid-mmmm",
        "content": "株式会社Aの件、よく対応できました。",
        "commenter": {
          "id": "uuid-zzzz",
          "name": "山田 部長"
        },
        "created_at": "2024-11-20T11:00:00Z",
        "updated_at": "2024-11-20T11:00:00Z"
      }
    ],
    "created_at": "2024-11-20T08:00:00Z",
    "updated_at": "2024-11-20T10:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません（他者の日報へのアクセス） |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 3-4. 日報作成

```
POST /daily-reports
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `report_date` | string | ○ | 対象日（`YYYY-MM-DD`） |
| `status` | string | ○ | `draft` / `submitted` |
| `problem` | string | − | 課題・相談（2,000文字以内） |
| `plan` | string | − | 明日やること（2,000文字以内） |
| `visit_records` | array | ○（`submitted`時） | 訪問記録の配列 |
| `visit_records[].customer_id` | string | ○ | 顧客ID |
| `visit_records[].visit_content` | string | ○ | 訪問内容（1,000文字以内） |
| `visit_records[].visited_at` | string | − | 訪問時刻（`HH:MM`） |
| `visit_records[].order` | integer | ○ | 表示順 |

```json
{
  "report_date": "2024-11-20",
  "status": "submitted",
  "problem": "株式会社Aの担当者が異動予定。",
  "plan": "提案資料を作成する。",
  "visit_records": [
    {
      "customer_id": "uuid-cccc",
      "visit_content": "○○の提案をした",
      "visited_at": "10:00",
      "order": 1
    }
  ]
}
```

**レスポンス** `201 Created`

作成された日報オブジェクト（3-3 と同じ構造）を返す。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `RE-01`〜`RE-08` | 各フィールドバリデーションエラー |
| 409 | `BIZ-002` | 同じ日付の日報がすでに存在します |

---

### 3-5. 日報更新

```
PUT /daily-reports/{id}
```

リクエストボディ・レスポンスは 3-4 と同じ構造。`visit_records` は差分ではなく全件送信（サーバー側で洗い替え）。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `RE-01`〜`RE-08` | 各フィールドバリデーションエラー |
| 403 | `BIZ-003` | 提出済みまたは確認済みの日報は編集できません |
| 403 | `BIZ-004` | 他の担当者の日報は編集できません |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 3-6. 日報ステータス更新（確認済みにする）

```
PATCH /daily-reports/{id}/review
```

上長・管理者ロールのみ。`status` を `reviewed` に変更する。

**リクエストボディ** なし

**レスポンス** `200 OK`

```json
{
  "data": {
    "id": "uuid-xxxx",
    "status": "reviewed",
    "updated_at": "2024-11-20T12:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません |
| 409 | `BIZ-005` | すでに確認済みの日報です |

---

## 4. 訪問記録 API

日報の訪問記録は 3-4 / 3-5 の日報 API（`visit_records` フィールド）で一括管理する。  
個別の訪問記録を追加・削除する場合は以下の API を使用する。

### 4-1. 訪問記録追加

```
POST /daily-reports/{report_id}/visit-records
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `customer_id` | string | ○ | 顧客ID |
| `visit_content` | string | ○ | 訪問内容（1,000文字以内） |
| `visited_at` | string | − | 訪問時刻（`HH:MM`） |
| `order` | integer | ○ | 表示順 |

**レスポンス** `201 Created`

```json
{
  "data": {
    "id": "uuid-vvvv",
    "order": 2,
    "customer": {
      "id": "uuid-cccc",
      "name": "株式会社B"
    },
    "visit_content": "課題ヒアリング実施",
    "visited_at": "14:00",
    "created_at": "2024-11-20T08:30:00Z"
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `RE-01`〜`RE-05` | 各フィールドバリデーションエラー |
| 403 | `BIZ-003` | 提出済みまたは確認済みの日報は編集できません |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 4-2. 訪問記録削除

```
DELETE /daily-reports/{report_id}/visit-records/{id}
```

**レスポンス** `204 No Content`

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `BIZ-003` | 提出済みまたは確認済みの日報は編集できません |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 4-3. 訪問記録並び替え

```
PATCH /daily-reports/{report_id}/visit-records/reorder
```

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `orders` | array | ○ | 並び替え後の順序を全件送信 |
| `orders[].id` | string | ○ | 訪問記録ID |
| `orders[].order` | integer | ○ | 新しい表示順 |

```json
{
  "orders": [
    { "id": "uuid-vvv1", "order": 1 },
    { "id": "uuid-vvv2", "order": 2 }
  ]
}
```

**レスポンス** `200 OK`

```json
{
  "data": {
    "updated": true
  }
}
```

---

## 5. コメント API

### 5-1. コメント投稿

```
POST /daily-reports/{report_id}/comments
```

上長・管理者ロールのみ。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `content` | string | ○ | コメント本文（1,000文字以内） |

```json
{
  "content": "株式会社Aの件、よく対応できました。引き続き注力を。"
}
```

**レスポンス** `201 Created`

```json
{
  "data": {
    "id": "uuid-mmmm",
    "content": "株式会社Aの件、よく対応できました。引き続き注力を。",
    "commenter": {
      "id": "uuid-zzzz",
      "name": "山田 部長"
    },
    "created_at": "2024-11-20T11:00:00Z",
    "updated_at": "2024-11-20T11:00:00Z"
  }
}
```

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `RD-01` / `RD-02` | コメントのバリデーションエラー |
| 403 | `RD-03` | この操作を行う権限がありません |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 5-2. コメント更新

```
PUT /daily-reports/{report_id}/comments/{id}
```

投稿者本人のみ更新可能。

**リクエストボディ**

```json
{
  "content": "修正後のコメント内容"
}
```

**レスポンス** `200 OK`

コメントオブジェクト（5-1 と同じ構造）を返す。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません |
| 404 | `SYS-005` | 対象データが見つかりません |

---

### 5-3. コメント削除

```
DELETE /daily-reports/{report_id}/comments/{id}
```

投稿者本人または管理者のみ削除可能。

**レスポンス** `204 No Content`

---

## 6. 顧客マスタ API

### 6-1. 顧客一覧取得

```
GET /customers
```

上長・管理者ロールのみ。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `keyword` | string | − | 顧客名の部分一致検索 |
| `industry` | string | − | 業種で絞り込み |
| `page` | integer | − | ページ番号 |
| `per_page` | integer | − | 件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-cccc",
      "name": "株式会社A",
      "address": "東京都千代田区...",
      "phone": "03-0000-0001",
      "industry": "製造業",
      "created_at": "2024-01-10T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 50
  }
}
```

---

### 6-2. 顧客詳細取得

```
GET /customers/{id}
```

**レスポンス** `200 OK`

顧客オブジェクト（6-1 の各要素と同じ構造）を返す。

---

### 6-3. 顧客登録

```
POST /customers
```

管理者ロールのみ。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | string | ○ | 顧客名（100文字以内） |
| `address` | string | − | 住所（200文字以内） |
| `phone` | string | − | 電話番号（20文字以内） |
| `industry` | string | − | 業種 |

```json
{
  "name": "株式会社C",
  "address": "東京都港区...",
  "phone": "03-0000-0003",
  "industry": "IT"
}
```

**レスポンス** `201 Created`

顧客オブジェクトを返す。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `CE-01`〜`CE-05` | 各フィールドバリデーションエラー |
| 403 | `SYS-004` | この操作を行う権限がありません |
| 409 | `BIZ-006相当` | 同名の顧客が存在します（警告のみ、登録は続行可） |

---

### 6-4. 顧客更新

```
PUT /customers/{id}
```

管理者ロールのみ。リクエストボディは 6-3 と同じ構造。

**レスポンス** `200 OK`

更新後の顧客オブジェクトを返す。

---

### 6-5. 顧客削除

```
DELETE /customers/{id}
```

管理者ロールのみ。論理削除。

**レスポンス** `204 No Content`

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません |
| 409 | `BIZ-008` | この顧客は訪問記録に使用されているため削除できません |

---

### 6-6. 顧客一覧取得（セレクトボックス用）

```
GET /customers/select-options
```

日報作成画面の顧客選択セレクトボックス用。全ロールからアクセス可。`id` と `name` のみ返す。

**レスポンス** `200 OK`

```json
{
  "data": [
    { "id": "uuid-cccc", "name": "株式会社A" },
    { "id": "uuid-dddd", "name": "株式会社B" }
  ]
}
```

---

## 7. 営業マスタ API

### 7-1. 営業担当者一覧取得

```
GET /salespeople
```

管理者ロールのみ。

**クエリパラメーター**

| パラメーター | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `page` | integer | − | ページ番号 |
| `per_page` | integer | − | 件数 |

**レスポンス** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid-yyyy",
      "name": "田中 太郎",
      "email": "tanaka@example.com",
      "role": "salesperson",
      "manager": {
        "id": "uuid-zzzz",
        "name": "山田 部長"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 10
  }
}
```

---

### 7-2. 営業担当者詳細取得

```
GET /salespeople/{id}
```

管理者ロールのみ。レスポンスは 7-1 の各要素と同じ構造。

---

### 7-3. 営業担当者登録

```
POST /salespeople
```

管理者ロールのみ。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `name` | string | ○ | 氏名（50文字以内） |
| `email` | string | ○ | メールアドレス（一意） |
| `password` | string | ○ | パスワード（8文字以上、英数字混在） |
| `role` | string | ○ | `salesperson` / `manager` / `admin` |
| `manager_id` | string | − | 上長の営業担当者ID |

```json
{
  "name": "田中 太郎",
  "email": "tanaka@example.com",
  "password": "Password123",
  "role": "salesperson",
  "manager_id": "uuid-zzzz"
}
```

**レスポンス** `201 Created`

登録された営業担当者オブジェクト（パスワードは含まない）を返す。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `SE-01`〜`SE-09` | 各フィールドバリデーションエラー |
| 403 | `SYS-004` | この操作を行う権限がありません |
| 409 | `BIZ-006` | このメールアドレスはすでに登録されています |

---

### 7-4. 営業担当者更新

```
PUT /salespeople/{id}
```

管理者ロールのみ。`password` は省略可（省略時はパスワード変更なし）。

リクエストボディは 7-3 と同じ構造（`password` 任意）。

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 400 | `SE-01`〜`SE-09` | 各フィールドバリデーションエラー |
| 409 | `BIZ-007` | 自分自身を上長に設定することはできません |

---

### 7-5. 営業担当者削除

```
DELETE /salespeople/{id}
```

管理者ロールのみ。論理削除。

**レスポンス** `204 No Content`

**エラー**

| ステータス | コード | メッセージ |
|------------|--------|-----------|
| 403 | `SYS-004` | この操作を行う権限がありません |
| 409 | `BIZ-009` | この担当者は日報またはコメントが存在するため削除できません |

---

### 7-6. 部下一覧取得（セレクトボックス用）

```
GET /salespeople/subordinates
```

上長ロールがアクセス。自分の直属の部下一覧を返す。日報絞り込みの担当者セレクト用。

**レスポンス** `200 OK`

```json
{
  "data": [
    { "id": "uuid-yyyy", "name": "田中 太郎" },
    { "id": "uuid-wwww", "name": "鈴木 花子" }
  ]
}
```

---

### 7-7. 上長候補一覧取得（セレクトボックス用）

```
GET /salespeople/manager-options
```

管理者ロールのみ。営業担当者登録・編集画面の上長セレクト用。`manager` / `admin` ロールの担当者のみ返す。

**レスポンス** `200 OK`

```json
{
  "data": [
    { "id": "uuid-zzzz", "name": "山田 部長" }
  ]
}
```

---

## 8. エラーレスポンス仕様

### 8-1. エラーレスポンス構造

```json
{
  "error": {
    "code": "BIZ-002",
    "message": "同じ日付の日報がすでに存在します",
    "details": [
      {
        "field": "report_date",
        "code": "RE-09",
        "message": "同じ日付の日報がすでに存在します"
      }
    ]
  }
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `error.code` | string | エラーコード（`SYS-XXX` / `BIZ-XXX`） |
| `error.message` | string | エラー概要メッセージ |
| `error.details` | array | フィールド単位のエラー詳細（バリデーションエラー時のみ） |
| `error.details[].field` | string | エラーが発生したフィールド名 |
| `error.details[].code` | string | フィールドエラーコード（`L-XX` / `RE-XX` など） |
| `error.details[].message` | string | フィールドエラーメッセージ |

訪問記録など配列フィールドのバリデーションエラーは `field` を `visit_records[0].customer_id` のようにインデックス付きで返す。

### 8-2. エラーコードと HTTPステータスの対応

| エラーコード | HTTPステータス |
|-------------|--------------|
| `SYS-001` | 500 |
| `SYS-002` | 500 |
| `SYS-003` | 401 |
| `SYS-004` | 403 |
| `SYS-005` | 404 |
| `BIZ-001` | 401 |
| `BIZ-002`〜`BIZ-009` | 409 |
| `L-XX` / `RE-XX` / `RD-XX` / `CE-XX` / `SE-XX` | 400 |

---

## API エンドポイント一覧

| メソッド | パス | 概要 | ロール |
|----------|------|------|--------|
| POST | `/auth/login` | ログイン | 全員（認証不要） |
| POST | `/auth/logout` | ログアウト | 全員 |
| POST | `/auth/refresh` | トークンリフレッシュ | 全員 |
| GET | `/daily-reports` | 日報一覧（自分） | 全員 |
| GET | `/daily-reports/team` | 日報一覧（部下全員） | 上長・管理者 |
| GET | `/daily-reports/{id}` | 日報詳細 | 全員 |
| POST | `/daily-reports` | 日報作成 | 営業・管理者 |
| PUT | `/daily-reports/{id}` | 日報更新 | 営業・管理者 |
| PATCH | `/daily-reports/{id}/review` | 日報確認済みに更新 | 上長・管理者 |
| POST | `/daily-reports/{report_id}/visit-records` | 訪問記録追加 | 営業・管理者 |
| DELETE | `/daily-reports/{report_id}/visit-records/{id}` | 訪問記録削除 | 営業・管理者 |
| PATCH | `/daily-reports/{report_id}/visit-records/reorder` | 訪問記録並び替え | 営業・管理者 |
| POST | `/daily-reports/{report_id}/comments` | コメント投稿 | 上長・管理者 |
| PUT | `/daily-reports/{report_id}/comments/{id}` | コメント更新 | 上長・管理者 |
| DELETE | `/daily-reports/{report_id}/comments/{id}` | コメント削除 | 上長・管理者 |
| GET | `/customers` | 顧客一覧 | 上長・管理者 |
| GET | `/customers/{id}` | 顧客詳細 | 上長・管理者 |
| POST | `/customers` | 顧客登録 | 管理者 |
| PUT | `/customers/{id}` | 顧客更新 | 管理者 |
| DELETE | `/customers/{id}` | 顧客削除 | 管理者 |
| GET | `/customers/select-options` | 顧客一覧（選択用） | 全員 |
| GET | `/salespeople` | 営業担当者一覧 | 管理者 |
| GET | `/salespeople/{id}` | 営業担当者詳細 | 管理者 |
| POST | `/salespeople` | 営業担当者登録 | 管理者 |
| PUT | `/salespeople/{id}` | 営業担当者更新 | 管理者 |
| DELETE | `/salespeople/{id}` | 営業担当者削除 | 管理者 |
| GET | `/salespeople/subordinates` | 部下一覧（選択用） | 上長・管理者 |
| GET | `/salespeople/manager-options` | 上長候補一覧（選択用） | 管理者 |

---

*以上*
