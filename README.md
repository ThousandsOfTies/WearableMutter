# WearableMutter — Safari音声検証

WearableMutterは、日常の会話を聞き、自然な英語表現をイヤフォンへそっと伝える英語学習アプリの検討プロジェクトです。

現在はSafariでの音声利用を調べる検証サンプルです。ローカル録音・Gemini Live・Googleログイン・DriveへのAPIキー保存を含みます。本体の学習UIは未実装です。

**次の担当AIは [TODO.md](TODO.md) を最初に確認してください。** Googleの設定状況、残作業、利用者との合意、ローカル作業環境の注意を記載しています。

テストページ: https://wearablemutter-safari-audio-test.thousands-of-ties.chatgpt.site/

閲覧には所有者のChatGPTログインが必要です。Googleログインとは別です。GitHubへの登録だけではテストページは更新されません。`dist/` が配信用の静的ファイルで、ビルドは不要です。

## 試す

HTTPSでdistを配信し、iPhoneのSafariで開きます。

1. ローカル録音を開始し、画面ロック10秒後・30秒後に別々の言葉を話す。
2. 画面へ戻り停止。録音を再生してロック中の発言を確認する。
3. Gemini Liveに切り替え、自分のAPIキーを入力して同じ操作。ロック中の返答を耳で確認する。
4. 他アプリへの切り替え、ホーム画面に追加した版でも繰り返す。
5. 必要ならplay-and-record指定をOFFにして比較する。

マイクtrackのlive状態やWebSocket OPENだけでは成功を意味しません。実録音・Google側の入力文字起こし・耳で聞いた出力と照合してください。デスクトップの動作はiOSの成功証明にはなりません。

## 方式

DeContradictorのsrc/gemini-live.jsに合わせ、WebSocket、16kHz PCM入力、24kHz PCM応答、ScriptProcessorによる入力処理とWeb Audio再生を採用。ScriptProcessorは非推奨APIですが既存方式との比較のため維持しています。この結果は全Web実装の限界を示すものではありません。

自動再接続・無音音源による常駐・Wake Lockは使いません。再生専用のテスト音は独立したHTML audioです。マイクテスト時はテスト音を停止しておきます。

録音はメモリのみ、状態ログはlocalStorage。APIキーは通常は入力欄と実行中のメモリのみ。「Driveへ保存」を押すとアプリ専用領域のwearablemutter-safari-settings.jsonへ保存します（アプリ側の暗号化なし）。Googleログイン時に復元し、アカウント変更・ログアウトではLiveを停止して入力欄を消去します。DeContradictorのファイルとは分離しています。Googleの短期トークンはタブのsessionStorageへ保存し、期限切れ時は再ログインが必要です。

GoogleログインにはWearableMutter専用の公開OAuthクライアントIDを使用します。プロジェクトIDはpure-faculty-514606-e1、WebクライアントIDは874050203988-kki46d1he3fj4kmoni3i9ladu84fujn1.apps.googleusercontent.comです。テストページのHTTPS生成元は登録済みです。使用スコープはopenid・email・profile・drive.appdataで、Drive全体への権限は要求しません。Googleログイン・Drive復元処理はDeContradictorのLiveGoogleAccountを元にしています。テストモードではGoogle Cloudのテストユーザー登録が別途必要です。

Live時はGoogleへキーと音声が送られ、API料金が発生します。キーはURLのWebSocket認証に使用するため、開発者ツールの通信画面には表示されます。ログ出力では伏せます。

3分で停止を試みますが、バックグラウンドでJavaScriptが停止するとタイマーも遅れます。必ず復帰して停止してください。接続・認識の実機検証には利用者のキーが必要です。

## ローカル表示

python -m http.server 8787 --directory dist --bind 127.0.0.1

localhostは開発用です。iPhoneで検証する場合はHTTPS配信URLを使用してください。

## 確認状況

利用者のiPhoneでは、画面ロック中のローカル録音とGemini Liveの応答を確認済みです。端末・iOS版・継続時間を記録した体系的な試験は未実施です。Googleのテストユーザー登録と、実アカウントでのDrive保存・復元確認が残っています。

```sh
node --check dist/app.js
node --check dist/google-account.js
node --check dist/key-sync.js
node check.cjs
node drive-check.cjs
```

モック試験であり、実際のGoogle認証・Gemini接続・iOSでの継続動作を保証するものではありません。APIキー・OAuthトークン・クライアントシークレットはコミットしないでください。
