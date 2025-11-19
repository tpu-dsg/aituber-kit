# ゲーム連携機能 仕様案

## 背景と目的

AITuber-kit が実況対象のゲームを直接バンドルするとライセンス上の制約や変更に弱くなる。そこで、ゲーム側を独立したモジュールとして扱い、API 経由で実況・対戦を行えるようにする。本仕様案は以下を目的とする。

- ライセンス影響を最小化し、ユーザーが任意のゲームを接続できるようにする。
- ゲームモジュールと AITuber-kit を疎結合に保ち、複数チームによる並行開発を容易にする。
- UI に「ゲーム」タブを追加し、登録済みゲームを差し替えながら AITuber が実況・対戦できるワークフローを整備する。

## 期待する利用シナリオ

1. ユーザーが独自に立てたゲームサーバーを登録し、AITuber が実況/観戦コメントを生成する。
2. ゲーム AI クライアントを AITuber-kit 内で動かし、外部プレイヤーと対戦させる。
3. 配信者が複数のゲームを切り替えながら配信し、AITuber がリアルタイムで状況を説明する。

## 基本方針

- **疎結合インターフェース**: ゲーム側は「AITuber External Game API」を実装した独立アプリケーション。AITuber-kit は共通スキーマのみを理解し、ゲームの実装詳細には依存しない。
- **アダプター層**: AITuber-kit 側ではゲームとの通信・同期を担う Game Adapter を新設。UI/実況ロジックからは抽象化されたゲーム状態ストアを読むだけにする。
- **設定駆動**: ゲーム登録情報（エンドポイント、ストリーム URL、入力マッピングなど）は JSON 設定として保存し、UI から編集可能にする。
- **セーフティ**: ライセンス対象となる画像・音声はゲーム側でホスティングし、AITuber-kit はストリーム/サムネイル URL の参照のみに留める。
- **複数人開発**: インターフェース定義とモックを docs と専用パッケージにまとめ、双方のチームが独立にリリースできるようバージョニングする。

## 機能要件

- UI に「ゲーム」タブを追加し、ゲーム一覧/登録/削除/接続状態を表示する。
- ゲーム登録情報として以下を保持する。
  - 表示名、サムネイル
  - 接続 URI（WebSocket / REST）
  - 認証方式（API key、Bearer、署名ヘッダーなど）
  - ストリーム種別（映像 URL、静止画、テキストログ）
  - 入力マッピング（ゲーム側が受け取るアクションの定義）
- AITuber が選択したゲームに対し、実況/対戦 AI からのアクションをアダプター経由で送信する。
- ゲーム側状態（進行状況、スコア、イベント）をタイムラインとして取得し、AITuber のプロンプト・UI に反映させる。
- プレイヤー vs AITuber の対戦では、ターン開始/終了、勝敗結果、同期ロックなどのイベントを API で受け取り、UI に表示する。
- 通信異常時は自動でリトライし、UI に警告と再接続ボタンを表示する。

## 非機能要件

- サーバー/API 側での応答遅延が 500ms 以内であれば実況遅延 1 秒以内を目標。
- WebSocket と REST をどちらもサポートし、ゲーム実装者が選択できる。
- スキーマ互換性を守るため JSON Schema を docs で公開し、CI でバリデーションする。
- 外部ゲームに依存するバイナリはリポジトリに含めない。

## システム構成案

```
┌──────────┐    ┌────────────────┐
│ AITuber UI │───│ Game Adapter   │──┐
└──────────┘    │ (WebSocket/REST)│  │
                 └────────────────┘  │
                         ▲            ▼
                ┌────────────────┐ ┌──────────────┐
                │ Commentary/AI  │ │ External Game│
                │ Controller     │ │ Service      │
                └────────────────┘ └──────────────┘
```

- **Game Adapter**: 通信管理、状態ストア、再接続制御、ログ生成を担当。UI と LLM へは抽象化された `GameState` を流す。
- **Commentary/AI Controller**: 受信した `GameState` から実況プロンプト/アクションを生成し、Adapter 経由でゲームへ送信。
- **External Game Service**: 各ゲーム開発チームが実装。AITuber External Game API を満たせば任意技術スタックで構築可能。

## インターフェース定義（ドラフト）

### Game Registration JSON

```json
{
  "id": "puzzle-arena-v1",
  "name": "Puzzle Arena",
  "thumbnailUrl": "https://example.com/thumb.png",
  "transport": "websocket",
  "endpoint": "wss://game.example.com/stream",
  "auth": {
    "type": "bearer",
    "tokenRef": "env:PUZZLE_GAME_TOKEN"
  },
  "stream": {
    "type": "video",
    "url": "https://stream.example.com/channel/123"
  },
  "actions": [
    {"id": "MOVE_LEFT", "displayName": "左移動"},
    {"id": "MOVE_RIGHT", "displayName": "右移動"},
    {"id": "ATTACK", "displayName": "攻撃"}
  ]
}
```

### WebSocket Message Schema

- `game_state`: ゲーム側 → AITuber。進行中の状態、プレイヤー情報、実況向けテキスト、AI へのヒントを含む。
- `action_request`: AITuber → ゲーム。1 アクション単位の指示。
- `system_event`: 双方向。接続/切断/エラー/マッチメイク情報。

```json
{
  "type": "game_state",
  "matchId": "abc-123",
  "timestamp": 1710000000000,
  "phase": "battle",
  "players": [
    {"id": "player", "name": "Viewer1", "hp": 80},
    {"id": "aituber", "name": "Miya", "hp": 75}
  ],
  "highlights": [
    "Viewer1 がコンボを決めた！",
    "Miya のチャージ完了"
  ],
  "renderHints": {
    "scoreBoard": {"player": 2, "aituber": 1}
  }
}
```

### REST フォールバック

- `POST /actions` でバッチアクション送信。
- `GET /state` でポーリング。SSE を提供できる場合は推奨。

## UI/UX 仕様（初版）

- 「ゲーム」タブ構成
  - **ゲーム一覧**: サムネイル・名前・接続状態バッジ・「実況開始」ボタン。
  - **登録モーダル**: 上述 JSON の各フィールドをフォーム化。接続テストボタンで API に `ping`。
  - **アクションパネル**: AI が生成した行動やプレイヤーからの入力を表示し、必要に応じて手動トリガーできる。
  - **対戦ログ**: 重要イベントをタイムラインで表示。実況プロンプトへの引用スニペットも保管。
- ゲーム切替フロー
  1. ゲームを選択
  2. 接続確認（成功時のみ実況開始可能）
  3. AITuber 配信画面にゲーム映像/ログを表示
  4. 対戦開始/停止のアクションは UI 右上に配置

## AITuber 側挙動

- 状態更新毎に `GameState` を LLM プロンプトへ埋め込み、実況テキストと行動を生成。
- 対戦モード中は一定間隔で Game Adapter が `action_request` キューを処理し、優先度制御（例: 防御 > 攻撃）を行う。
- 外部プレイヤーがいる場合はコメント欄からのメッセージとゲームイベントを統合して解説する。

## 複数人開発体制

- **リポジトリ分割**: AITuber-kit（UI/Adapter）と Game Module（ゲーム本体）を別レポジトリ管理。
- **スキーマ管理**: `docs/schema/game-integration/*.json` に JSON Schema を配置し、両チームが npm package として参照。
- **契約テスト**: Game Module が提供するモックサーバーを `packages/game-adapter-mock` として公開し、CI で相互互換性を検証。
- **バージョニング**: API 変更時は `version` フィールドで互換性ポリシー（SemVer）を明示。互換性が崩れる場合はアップグレードガイドを docs で提供。

## ライセンスとセキュリティ配慮

- ゲームアセット（画像・音声・テキスト）は外部ホストのみ参照。AITuber-kit にはダミーデータのみ同梱。
- ゲーム側 API はユーザー自身の責任で運用し、AITuber-kit は連携のサンプルコードだけ提供する。
- 認証情報は `.env` や OS キーチェーンで管理し、UI から直接表示しない。
- ログには個人情報を残さず、デバッグ用にはハッシュ化またはマスキングを適用。

## 今後のタスク

1. Game Adapter の技術選定とモジュラ構成の詳細設計
2. UI モックアップ（Figma など）とフォーム定義
3. JSON Schema 定義と自動バリデーションパイプライン構築
4. モックゲームサーバー（WebSocket/SSE）のプロトタイプ実装
5. LLM プロンプトテンプレートのドラフト作成とテスト

