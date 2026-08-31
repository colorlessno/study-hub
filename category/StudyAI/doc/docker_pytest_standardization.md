# StudyAI Docker pytest 標準化

## 目的

StudyAI backend のテストは、ローカルPCに入っている Python や pytest plugin の影響を受けないように、専用の Docker test image で実行する。

本番用 `backend` image には実行時依存だけを入れる。`pytest`、`pytest-asyncio` などのテスト依存は、`backend/Dockerfile.test` で `backend/pyproject.toml` の `dev` 依存として入れる。

## 対象ファイル

| ファイル | 役割 |
|---|---|
| `backend/Dockerfile.test` | backend のソース、テスト、開発用依存を含む test image を作る |
| `docker-compose.yml` の `backend-test` service | Docker Compose から pytest を実行する標準入口 |
| `scripts/docker_pytest.cmd` | DOS窓で使う標準実行入口 |
| `scripts/docker_pytest.ps1` | 既存互換の補助入口。標準手順では使わない |

## 標準コマンド

既定の AI 学習系・enterprise AI 系テストを実行する。

```cmd
scripts\docker_pytest.cmd
```

特定のテストファイルやテストノードを指定する。

```cmd
scripts\docker_pytest.cmd tests/systems/system14/test_pii_masker.py
```

Docker Compose を直接実行する場合。

```cmd
docker compose -f docker-compose.yml run --rm backend-test
```

## 設計メモ

- `backend-test` は port を公開しない。継続起動する service ではない。
- `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` により、ホストや image 内の無関係な pytest plugin の影響を避ける。
- `PYTHONPATH=/app/backend/src` は backend の配置と pytest 設定に合わせる。
- `backend/.env.docker` を読み込み、AI provider やDB接続設定をテストから参照できるようにする。
- 共有部品を変えた場合は、対象ファイルだけでなく影響範囲のテストも広げる。

## 検証方針

backend のふるまいを変えた場合、まず関係する最小範囲の Docker pytest を実行する。共通 client、設定、API contract、複数 system に関わる変更では、対象 package または `tests` 全体へ検証範囲を広げる。
