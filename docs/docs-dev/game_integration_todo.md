# ゲーム連携開発 TODO

## 妥当性の再確認

- `game_integration_spec.md` で掲げている「疎結合な External Game API + Game Adapter 構成」は、既存 UI 側の実装（ゲームタブ、GamePanel）と整合している。
- 仕様上の主要ユースケース（任意ゲームの実況、AI 対戦、ゲーム切替配信）は、WebSocket/REST 双方のサポートを前提にすれば実現可能。
- したがって、当面は Adapter/Schema/UI/Docs を小さく切り出して段階的に実装するロードマップで問題なし。

## マイルストーン 1: Adapter 基盤

- [ ] Game Adapter の責務分解（接続管理、state store、LLM 連携）を確定し、モジュール雛形を `src/features/game` に作成。
- [ ] WebSocket クライアントのラッパーを実装し、`GameState`・`ActionRequest` の型を `zod` で定義。
- [ ] リトライ、ハートビート、バックオフなどの接続制御ユーティリティを実装。
- [ ] Zustand ストア（例: `gameRuntimeStore`）を追加し、UI/LLM へブロードキャストするための selector を用意。
- [ ] Adapter の DI 方式を決め、テスト時にモックトランスポートへ差し替えられるようにする。

## マイルストーン 2: スキーマとモック

- [ ] `docs/schema/game-integration/` 配下に JSON Schema を配置し、`GameRegistration`, `GameStateMessage`, `ActionRequestMessage` を定義。
- [ ] CI で Schema のバリデーションを走らせる npm script を追加（`npm run validate:game-schema` など）。
- [ ] Game Adapter モックサーバー（Node.js + ws or Fastify SSE）を `packages/game-adapter-mock` として作成し、簡単なリバーシ進行を返すようにする。
- [ ] モックサーバーと実 Adapter を使った契約テスト（Jest or Vitest）を追加し、互換性を自動チェック。

## マイルストーン 3: UI/UX 拡張

- [ ] ゲームタブに接続テスト/状態表示を追加（`接続待ち`/`再接続中`などのバッジ）。
- [ ] GamePanel に `GameState` の一部（スコア、ターン表示）を表示するウィジェットを追加。
- [ ] プレイヤー操作用アクションパネル（AI が選択した手、ユーザーが手動送信するボタン）を実装。
- [ ] エラー/警告トーストを追加し、通信断や Schema 不整合時にユーザーへ通知。
- [ ] UI から `GameState` をログ保存できるよう、`game-logs/` へのエクスポート機能を検討。

## マイルストーン 4: LLM/実況連携

- [ ] `GameState` から実況プロンプトを生成するテンプレートを `src/features/prompts/game.ts` に追加。
- [ ] LLM からのレスポンスを ActionRequest に変換するルール（例: JSON 指定 or function calling）を設計。
- [ ] プレイヤーコメントとゲームイベントを統合したコンテキストを組み立てるユーティリティを実装。
- [ ] 低遅延モード（Realtime API/Aduio Mode との併用）時の挙動を確認し、必要に応じてフェイルセーフを実装。

## マイルストーン 5: ドキュメント & 導入支援

- [ ] `docs/docs-dev/game_integration_guide.md` を公開用 docs に反映し、ユーザー向け手順を整備。
- [ ] Adapter/API の使用方法を README（英/日）にサマリ追加。
- [ ] 代表的なゲーム（Egaroucid など）との接続手順を screencast かブログで共有し、導入障壁を下げる。
- [ ] リリースノートにゲーム連携機能の beta 状態、既知の制約を明記。

## cross-cutting

- [ ] すべての新規パッケージ/モジュールで TypeScript strict mode を維持。
- [ ] VRT/Storybook がある場合は GamePanel/アクションパネルの stories を追加。
- [ ] セキュリティレビュー: WebSocket エンドポイントでの認証・API key の扱い方針をまとめる。

