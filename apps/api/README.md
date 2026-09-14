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

### ユーザーの初期投入

開発用ユーザーと年度を投入する場合は、マイグレーション後に次を実行します。

```sh
bun run seed:users
```

スタッフだけを投入する場合は、サーバー専用シークレットを指定して実行します。

```sh
STAFF_SEED_SECRET='十分に長いランダムな値' bun run seed:staff
```

`STAFF_SEED_SECRET` を設定した場合、`teacher@example.com` / `Teacher123!`（講師）と、
`staff@example.com` / `Staff123!`（専任職員）を Better Auth クライアントで作成します。
未設定の場合は講師のみを作成し、スタッフはスキップします。スタッフ作成時のシークレットは
サーバー側だけに設定し、公開環境やWebクライアントへ露出させないでください。年度、メールアドレス、パスワードは
`SEED_YEAR`、`SEED_TEACHER_EMAIL`、`SEED_TEACHER_PASSWORD`、`SEED_STAFF_EMAIL`、
`SEED_STAFF_PASSWORD` で変更できます。既存メールアドレスはエラーを表示してスキップします。
公開サインアップからスタッフロールを指定しても講師として作成されます。

## 画面エンドポイント

画面エンドポイントは `/api/screens` 配下です。保護された画面は Better Auth のセッションCookieを
使い、教科担当者には担当科目のみ、専任職員には全操作を許可します。

- `GET /session` — ログイン状態・初回パスワード変更の要否
- `POST /api/auth/complete-password-change` — 初回ログイン時のパスワード設定（未変更アカウントのみ）
- `GET /dashboard?yearId=&term=first|second` — ロール別トップ画面
- `GET /teacher/grade-entry/:subjectId` — 重み、履修生徒、既存成績を一度に返す入力画面
- `PUT /teacher/grade-entry/:subjectId/weight` — 合計10の重みを保存
- `PUT /teacher/grade-entry/:subjectId/grades` — 値域検証・点数計算後に一括保存
- `GET /teacher/weight/:subjectId` — 評価基準の可視化画面
- `GET /staff/students`、`GET /staff/history`、`GET /staff/grade-sheet/:studentId` — 専任職員の閲覧画面
- `GET /staff/finalization`、`POST /staff/finalization/:subjectId`、`POST /staff/finalization/:subjectId/unlock` — 未入力を確認して成績確定、専任職員による確定解除
- `GET /staff/csv-import`、`POST /staff/csv-import/preview`、`POST /staff/csv-import/import` — CSV取込画面、プレビュー、Drizzle/MySQLへの確定保存

CSVの種類選択では、コースと科目を同じCSVで扱う「科目/コース」に統一しています。

## Drizzle CRUD

`/api/users`、`/api/years`、`/api/courses`、`/api/subjects`、`/api/students`、
`/api/weights`、`/api/grades` は、認証済みユーザーが `GET` で取得できます。専任職員は
`POST`・`PATCH/:id`・`DELETE/:id` でマスターデータを管理でき、担当講師は自分の
科目に対する評価基準・成績を追加・編集・削除できます。成績の点数は保存時に
評価基準から再計算され、確定済み成績は講師・専任職員を問わず変更・削除できません。
`/api/users` の追加時は初期パスワードも同時にBetter Authのcredential accountへ
ハッシュ保存されます。

`apps/web/utils/client.ts` は `hc<AppType>` を使うため、パス・クエリ・JSON本文・応答型が
クライアント側でも推論されます。

年度・学期を指定しない画面APIは、日本時間を基準に4月1日〜9月30日を前期、10月1日〜3月31日を後期として自動判定します。年度は4月始まりです。
成績確定後は対象年度・学期の成績入力、評価基準変更、削除、再確定を拒否します。次の学期・年度は別の年度・学期レコードとして入力できます。

### 日本語CSVの初期取り込み

指定された日本語列の名簿CSVは、次のコマンドでDrizzle/MySQLへ取り込めます。

```sh
bun run import:csv
```

既定では `/Users/sakurai/Downloads/` の次の4ファイルを読み込みます。
`CSV_STAFF_PATH`、`CSV_TEACHERS_PATH`、`CSV_STUDENTS_PATH`、`CSV_SUBJECTS_PATH` で
ファイルパスを変更できます。年度は `IMPORT_YEAR`（未指定時は `SEED_YEAR`、それも
未指定時は2026）です。CSVに初期パスワード列がないため、新規職員には `Staff123!`、新規講師には
`Teacher123!` を設定します。初回ログイン時はパスワード変更画面へ移動します。

取り込みは指定年度を必ずデータに反映します。専任職員・講師はBetter Authのログイン
アイデンティティを維持したまま年度所属を別管理し、科目は同じ年度の講師所属へ紐づけます。
生徒は「学籍番号＋年度」をキーに同年度の再取り込みだけ更新し、別年度なら別レコードを追加します。
その際、同じ学籍番号の既存レコード群で最も高い学年の次の学年を設定します。
既存アカウントは、パスワード変更済みなら再取り込みで上書きせず、未変更の場合のみ初期パスワードへ戻します。

生徒の成績表は学籍番号と年度を使って対象年度の生徒レコードを解決するため、年度ごとの成績を
切り替えて閲覧できます。

学生CSVの「年齢」は、現在のER図で学生に年齢列がないため `school_grade` に文字列として
保存しています。
