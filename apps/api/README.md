# 成績管理 API

Hono の画面集約APIです。Drizzle/MySQLで成績データを取得し、Better Auth が
`/api/auth/*` のメール・パスワード認証を担当します。

## 起動

```sh
bun install
cp .env.example .env
cd ../docker && docker compose up -d
cd ../api
node_modules/.bin/drizzle-kit migrate --config drizzle.config.ts
bun run dev
```

APIは `http://localhost:8000`、Webアプリは `http://localhost:3000` を想定します。
API側の `.env` に `DB_*`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、必要なら
`APP_URL` を設定してください。Webから参照するURLは
`NEXT_PUBLIC_API_URL=http://localhost:8000` です。
マイグレーションはテーブルと制約だけを作成し、初期データは投入しません。

## 画面エンドポイント

すべて `/api/screens` 配下です。保護された画面は Better Auth のセッションCookieを
使い、教科担当者には担当科目のみ、専任職員には全操作を許可します。

- `GET /session` — ログイン状態・初回パスワード変更の要否
- `GET /dashboard?yearId=&term=first|second` — ロール別トップ画面
- `GET /teacher/grade-entry/:subjectId` — 重み、履修生徒、既存成績を一度に返す入力画面
- `PUT /teacher/grade-entry/:subjectId/weight` — 合計10の重みを保存
- `PUT /teacher/grade-entry/:subjectId/grades` — 値域検証・点数計算後に一括保存
- `GET /teacher/weight/:subjectId` — 評価基準の可視化画面
- `GET /staff/students`、`GET /staff/history`、`GET /staff/grade-sheet/:studentId` — 専任職員の閲覧画面
- `GET /staff/finalization`、`POST /staff/finalization/:subjectId` — 未入力を確認してから成績確定
- `GET /staff/csv-import`、`POST /staff/csv-import/preview` — CSV取込画面とプレビュー

## Drizzle CRUD

`/api/users`、`/api/years`、`/api/courses`、`/api/subjects`、`/api/students`、
`/api/weights`、`/api/grades` は、認証済みユーザーが `GET` で取得できます。専任職員は
`POST`・`PATCH/:id`・`DELETE/:id` でマスターデータを管理でき、担当講師は自分の
科目に対する評価基準・成績を追加・編集・削除できます。成績の点数は保存時に
評価基準から再計算され、確定済み成績は講師から変更できません。
`/api/users` の追加時は初期パスワードも同時にBetter Authのcredential accountへ
ハッシュ保存されます。

`apps/web/utils/client.ts` は `hc<AppType>` を使うため、パス・クエリ・JSON本文・応答型が
クライアント側でも推論されます。
