# school-register

## バックアップ・障害復旧

学内サーバーを保存先とする日次バックアップ、復元、障害時の復旧手順は
[docs/backup-recovery.md](docs/backup-recovery.md) にまとめています。実行用スクリプトは
`scripts/backup-mysql.sh` と `scripts/restore-mysql.sh` です。

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
