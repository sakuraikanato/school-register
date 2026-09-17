# school-register のバックアップ・復旧運用

この文書は、発表時に「どこへ、いつ、どのようにバックアップし、障害時にどう戻すか」を説明するための運用案です。現在の要件定義にある「アクセスの少ない0〜2時に1日1回バックアップ」を前提にしています。

## 1. 保存先の考え方

本番では、アプリとMySQLを動かすサーバーとは別に、学内サーバー上のバックアップ領域を用意します。例として、DBサーバーから次の領域をマウントします。

```text
/mnt/school-register-backup/mysql/
```

学内サーバー側の実体は、情報システム担当者が管理する `/srv/school-register/backups/mysql/` などにします。NFSなどでマウントする方法でも、SSH経由のrsyncでも構いません。スクリプトは次の2方式に対応しています。

- `BACKUP_DIR=/mnt/school-register-backup/mysql`：マウント済みの学内サーバーへ直接保存
- `BACKUP_REMOTE=backup@backup-server:/srv/school-register/backups/mysql`：作成後にrsyncで転送

Dockerの `apps/docker/mysql-data` は稼働中MySQLのデータ領域です。これはバックアップではないため、同じディスクにコピーするだけでは障害対策になりません。

## 2. バックアップ内容

`scripts/backup-mysql.sh` は次の処理を行います。

1. `mysqldump --single-transaction` で、稼働中でも整合性を保った論理バックアップを作る
2. gzip圧縮し、`school-register-YYYYMMDD-HHMMSS.sql.gz` として保存する
3. SHA-256チェックサムと作成情報（DB名、作成日時）を同時に保存する
4. ファイル権限を所有者だけが読める状態にする
5. 設定した世代を超えた古いファイルを削除する（既定90日）
6. `BACKUP_REMOTE` が設定されていれば、学内サーバーへrsyncする

パスワードはコマンドライン引数に出さず、一時的な権限600のMySQLクライアント設定ファイルで渡します。

## 3. 初回設定

学内サーバーのマウント設定と、DB接続情報の設定は情報システム担当者が行います。接続パスワードやSSH鍵はGitへ登録しません。

```sh
sudo install -d -m 700 /mnt/school-register-backup/mysql
chmod 700 scripts/backup-mysql.sh scripts/restore-mysql.sh

ENV_FILE="$PWD/apps/api/.env" \
BACKUP_DIR=/mnt/school-register-backup/mysql \
scripts/backup-mysql.sh
```

実行前に、`apps/api/.env` の `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` が本番DBを指していることを確認します。最初の手動バックアップ後、`.sql.gz`、`.sha256`、`.txt` の3ファイルが学内サーバーにできることを確認します。

## 4. 定期実行

要件どおり、0〜2時の中で毎日1回実行します。cronの例は次のとおりです（パスは実際の配置に合わせて変更します）。

```cron
0 1 * * * ENV_FILE=/opt/school-register/apps/api/.env BACKUP_DIR=/mnt/school-register-backup/mysql /opt/school-register/scripts/backup-mysql.sh >> /var/log/school-register-backup.log 2>&1
```

運用では、cronの終了コードまたはログを監視し、バックアップが1日以上更新されなければ担当者へ通知します。少なくとも月1回、テスト用DBへ復元して、バックアップが実際に戻せることを確認します。

## 5. 障害発生時の復旧手順

### A. APIだけが停止している場合

1. 利用者へ一時停止を連絡し、書き込み操作を止める
2. APIプロセス、MySQLプロセス、ディスク容量、ネットワークを確認する
3. DBが正常であることを確認してから、APIだけを再起動する
4. ログイン、学生一覧、成績入力、保存の疎通を確認する

この場合はDBを復元しません。不要な復元は、直近の入力を失う原因になります。

### B. DB破損・誤更新・サーバー故障の場合

1. APIを停止またはメンテナンス状態にし、追加の書き込みを止める
2. 障害時刻、影響範囲、最後に成功したバックアップを記録する
3. 学内サーバー上の `.sql.gz` と `.sha256` を確認し、復元するバックアップを決める
4. 復元先DBへ接続できることを確認する
5. `restore-mysql.sh` で、復元前の安全バックアップを作ってから復元する
6. テーブル数、ログイン、学生・科目・成績の参照、成績保存を確認する
7. 問題がなければAPIを再起動し、利用者へ復旧を連絡する
8. 障害原因、復元時刻、失われた可能性のある期間を記録する

### C. DBサーバー自体が使えない場合

学内サーバーに用意した予備のMySQLへ、同じ環境変数を向けて復元します。DNSまたは `DB_HOST` を切り替え、上記Bの検証が終わるまで本番トラフィックを戻しません。学内サーバーも同時に失う災害を考えるなら、将来は暗号化した学外または別拠点コピーを追加します。

## 6. バックアップからの戻し方

`restore-mysql.sh` は現在のDBを置き換える破壊的な操作です。通常は対話確認を行い、cronなど非対話実行では必ず `--yes` を明示します。

```sh
ENV_FILE="$PWD/apps/api/.env" \
BACKUP_DIR=/mnt/school-register-backup/mysql \
scripts/restore-mysql.sh \
  /mnt/school-register-backup/mysql/school-register-20260918-010000.sql.gz \
  --yes
```

復元前バックアップを作れないほどDBが壊れている場合に限り、担当者が内容を確認したうえで `--skip-safety-backup` を使います。復元後にスキーマを最新化する必要がある場合は、次のようにDrizzleマイグレーションを実行します。

```sh
RUN_MIGRATIONS=1 ENV_FILE="$PWD/apps/api/.env" \
scripts/restore-mysql.sh /path/to/backup.sql.gz --yes
```

## 7. 発表での説明例

> 成績や生徒情報はMySQLに保存し、アクセスの少ない深夜1時に毎日一度、`mysqldump`で整合性を保ったバックアップを作成します。バックアップは稼働DBとは別の学内サーバーへ保存し、gzip圧縮とSHA-256チェックサムで容量と改ざん・破損を確認します。障害時はまず書き込みを止め、DBが生きていればAPIだけを復旧します。DBが壊れた場合は、最後に成功したバックアップをチェックサム検証し、復元前の安全退避を作ってからMySQLへ戻します。復元後にログイン、学生一覧、成績入力・保存を確認してからサービスを再開します。

この運用の目安は、日次バックアップなので **RPO（許容するデータ損失）最大24時間** です。復旧時間（RTO）は、学内サーバーと予備DBが準備済みであることを前提に、発表では「2時間以内を運用目標」として提示できます。これはスクリプトだけで自動保証される値ではなく、月1回の復元訓練で実測・見直しする値です。
