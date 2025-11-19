# ゲーム連携ガイド

本ドキュメントでは、AITuber-kit に追加した「ゲーム」タブを利用して外部ゲームを接続する手順と、オセロ AI「[Egaroucid](https://github.com/Nyanyan/Egaroucid)」を例にしたセットアップ方法を説明します。仕様の全体像は `docs/game_integration_spec.md` を参照してください。

## 1. 画面構成とワークフロー

- **左右 2 カラム構成**: 画面左にキャラクター/チャット UI、右にゲームパネルを常設しました。キャラクター側は従来どおり VRM / Live2D / メッセージ入力コンポーネントを利用します。
- **ゲームパネル**: 右カラムでは、新しく追加した `GamePanel` が選択中ゲームの情報を表示します。設定で登録した `displayUrl` を iframe として表示し、外部アプリの画面や観戦ビューアを埋め込めます（`X-Frame-Options` により埋め込み不可なサイトもある点に注意）。
- **ゲーム設定タブ**: 設定メニューに「ゲーム」が増え、複数ゲームの登録・編集・削除・選択が可能です。ここで選んだタイトルがゲームパネルに表示されます。

## 2. ゲームを登録する手順

1. 画面左上の設定アイコンから設定メニューを開き、タブ一覧で「ゲーム」をクリックします。
2. 「ゲームを追加」フォームに以下の項目を入力します。
   - **ゲーム名**: UI に表示する名称。
   - **ゲームエンドポイント / WebSocket URL**: 将来的にゲームアダプターで使用する通信先。現時点ではメモ用途でも構いません（例: `ws://localhost:8765/game`）。
   - **表示用 URL**: ゲーム画面やライブ配信を埋め込む URL。ローカルでホストしている場合は `http://localhost:4173` のように指定します。
   - **説明・メモ**: 対戦ルールや接続手順の覚え書き。
3. 「ゲームを追加」ボタンを押下すると一覧に登録されます。登録直後は自動で選択状態になり、右カラムに反映されます。
4. 既存ゲームをクリックすると「選択する」「編集」「削除」の操作が可能です。

## 3. 例: Egaroucid を使って対戦実況する

Egaroucid は Nyanyan 氏が開発する GPLv3 ライセンスのオセロ AI です。GUI 版 / コンソール版 / Web 版が提供されています。本節では「Web 版をローカルでホストして表示しつつ、コンソール版を AI として動かす」という構成例を紹介します。

### 3.1 前提

- Node.js 20 系と npm、Docker など AITuber-kit の通常環境が整っていること。
- C++ ビルドツール（`cmake`, `g++`/`clang` など）と `git`。
- `python3` もしくは任意の静的ファイルサーバー（Web リソース配信用）。

### 3.2 Egaroucid リポジトリの取得

```bash
git clone https://github.com/Nyanyan/Egaroucid.git
cd Egaroucid
```

リポジトリ直下には GUI 用ソース、`web_resources/`（Web 版のビルド成果物）、`src/`（C++ コア）、`Egaroucid_for_Console.*` などが含まれています。

### 3.3 Web 版ビューアのホスト

Web 版はビルド済み静的ファイルが `web_resources/` に配置されています。任意の HTTP サーバーで公開すれば、AITuber-kit のゲームパネルに表示できます。

```bash
cd web_resources
python3 -m http.server 4173
```

上記で `http://localhost:4173` に Egaroucid の Web UI が立ち上がります。別ターミナルで `aituber-kit` を起動し、ゲーム設定タブの「表示用 URL」に `http://localhost:4173` を入力してください。

### 3.4 コンソール版（GTP）の利用

実況 AI と外部プレイヤーを対戦させる場合、コンソール版を GTP モードで動かすのが簡単です。公式サイトの [Linux/Mac ビルド手順](https://www.egaroucid.nyanyan.dev/en/console/#Linux%20/%20MacOS) を参考に以下のようにビルドできます。

```bash
cd Egaroucid
mkdir build && cd build
cmake .. -DEGAROUCID_BUILD_CONSOLE=ON
cmake --build . --target EgaroucidConsole --config Release
./bin/EgaroucidConsole --gtp
```

実行後は標準入力/出力で GTP コマンドをやり取りできるため、AITuber-kit 側のゲームアダプターを自作して `endpoint` に WebSocket/REST を公開し、内部でコンソールプロセスと通信する構成が取れます。サンプルアダプター（擬似コード）は以下の通りです。

```ts
import WebSocket, { WebSocketServer } from 'ws'
import { spawn } from 'child_process'

const child = spawn('./bin/EgaroucidConsole', ['--gtp'])
const wss = new WebSocketServer({ port: 8765 })

wss.on('connection', (ws) => {
  ws.on('message', (message) => child.stdin.write(message + '\n'))
})

child.stdout.on('data', (data) => {
  const payload = data.toString()
  wss.clients.forEach((client) => client.send(payload))
})
```

この WebSocket URL（例: `ws://localhost:8765`）をゲーム設定の「エンドポイント」に記録しておくと、将来的にゲームアダプター層を実装した際に再利用できます。

### 3.5 AITuber-kit での登録例

| フィールド | 設定例 |
| --- | --- |
| ゲーム名 | Egaroucid (Othello) |
| ゲームエンドポイント | `ws://localhost:8765` |
| 表示用 URL | `http://localhost:4173` |
| 説明・メモ | 「Web 版を python サーバーで配信。コンソール版は `--gtp` で起動、ユーザーはコマンド入力、AITuber は WebSocket で手番を取得」 |

登録後、右カラムのゲームパネルに Web 版 UI が表示され、オセロ盤面を見ながら左カラムの AITuber が実況できます。プレイヤーからの指し手（例: `E3`）はチャットフォームから送信し、WebSocket 経由でコンソール版に渡す実装を追加すれば、実戦対戦が可能になります。

## 4. 利用上のヒント

- **埋め込み制限**: 外部サイトを iframe で表示できない場合は、`web_resources` のように自前でホストするか OBS/capture モードで代替してください。
- **ライセンス**: Egaroucid は GPLv3 なので、独自に改変したバイナリを再配布する際はライセンス要件を確認してください。AITuber-kit はゲーム本体を同梱せず、接続方法のみ提供することでライセンス影響を最小化します。
- **複数ゲームの管理**: 異なるルールのゲームを複数登録しておけば、設定タブから即座に切り替えられます。登録情報はブラウザローカルに保存されるため、プロジェクトを共有する場合は JSON として書き出すツールの作成を推奨します。

以上で、ゲーム設定タブを使った基本的なワークフローと Egaroucid を題材にしたセットアップ例の説明を終わります。ゲームアダプターの詳細実装が整い次第、本ドキュメントを随時更新してください。
