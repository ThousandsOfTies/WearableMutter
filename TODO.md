# 現在の決定と実装（2026-11-14・日本時間）

利用者が本体作成を明示的に依頼したため、以下の過去の「本体はまだ作らない」という範囲を更新する。

- [x] Gemini Liveの会話・発音練習モードを実装。
- [x] 表現・説明・ヒント・観測した練習結果・明示された好みを保存する仕組みを実装。
- [x] 基本指示と直近の学習記録をLiveへ渡し、記憶の記録・検索ツールを追加。
- [x] 学習記録をアカウント別に端末保存し、Drive専用ファイルへ上書き保存・復元。
- [x] 記憶カード一覧・検索・個別削除・8秒間の取り消し・練習だけリセット・全件リセットを実装。
- [x] 記憶変更時はLiveを停止し、次の会話へ変更を反映。
- [x] 音声診断サンプルをaudio-test.htmlへ分離して保存。
- [x] 自動テストと構文確認、ブラウザでの初回案内・設定・記憶一覧・スマートフォン幅表示を確認。
- 利用前提: 端末は1台ずつ使う。複数端末の競合検出・マージは不要という利用者の決定。
- [x] 既存の所有者限定Sitesへ配信済み（2026-11-14）。Sitesソース: 04f88964596d35c3180851a101c73abf14203a67。公開範囲は変更していない。
- 未確認: 実アカウント認証、実キーでの音声応答・記憶ツール呼び出し・発音フィードバック、実Driveでの端末引き継ぎ、iPhoneのバックグラウンド挙動。
- Googleテストユーザー追加の過去の確認は未解決。今回もGoogle Cloudの権限設定は変更していない。
- 次の担当はREADME.mdとVALIDATION.mdを参照し、モック試験と実サービス試験を区別する。

---

# ローカル担当AIへの申し送り

最終更新: 2026-11-13（日本時間）。実際に完了・検証してから各チェックを更新すること。

## 利用者の意図と作業範囲

- WearableMutter: 日常的にイヤフォンでつながり、AIが会話を聞いて「英語だとこう言う」と時折つぶやく英語学習アプリ。
- メール送信前にAIへ自然な英語か尋ねる習慣を、日常会話へ広げるイメージ。
- 本体はまだ作らずUIを相談したい、という指示があり、その後Safari検証サンプルの作成が許可された。本体の実装は改めて相談する。
- 当面は小規模な個人作品。必要以上に大きな構成へ拡張しない。
- 利用者自身のGemini APIキーを使う（BYOK）。Googleログインし、Driveのアプリ専用領域へキーを保存・復元する方針。
- 参考: `ThousandsOfTies/AI-LiveTalk` のGoogle/Drive連携、`ThousandsOfTies/DeContradictor` のGemini Live実装。

## 成果物

- GitHub: https://github.com/ThousandsOfTies/WearableMutter （公開）
- `dist/index.html`, `style.css`, `app.js`: 音声検証画面、録音・再生・Gemini Live・診断ログ。
- `dist/google-account.js`: Google OAuth、プロフィール、Drive設定保存・復元。
- `dist/key-sync.js`: キー保存UI、アカウント変更時の停止とクリア、非同期読込の競合対策。
- `dist/manifest.json`, `icon.svg`: ホーム画面追加用メタデータ。オフライン動作は未実装。
- `check.cjs`, `drive-check.cjs`: モックによる音声処理とDrive連携の確認。
- `.openai/hosting.json`: 既存Sitesプロジェクトとの関連付け。配信変更時は既存プロジェクトを使用する。

テストページ: https://wearablemutter-safari-audio-test.thousands-of-ties.chatgpt.site/

Sites project ID: `appgprj_6af4ff7335708191a79c880c0640321b`

以前のSites側ソースコミット: `e74cdd7956eb0d58192537910b3fb0e7002055e8`。
今回のGitHub登録は引き継ぎ用。GitHubの変更が自動でこのテストページへ配信される設定ではない。
テストページの閲覧には所有者のChatGPTログインが必要。アプリ内のGoogleログインとは別。

## Google Cloudの状態

- [x] 専用プロジェクト WearableMutter を作成。
- Project ID: `pure-faculty-514606-e1`
- [x] Google Auth Platformを外部・テスト中で設定。
- [x] Web OAuthクライアント `WearableMutter Web` を作成。
- 公開クライアントID: `874050203988-kki46d1he3fj4kmoni3i9ladu84fujn1.apps.googleusercontent.com`
- [x] 承認済みJavaScript生成元に既存テストページのoriginを登録。
- リダイレクトURIは未登録（GISトークンのポップアップ方式）。
- [x] Google Drive APIを有効化。
- 実装で要求するスコープ: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.appdata`。
- 保存ファイル: `wearablemutter-safari-settings.json`。他アプリの設定と分離。
- [ ] **テストユーザーを登録する。最後に確認した時点では空。**

対象候補は利用者自身の `thousands.of.ties@gmail.com`。追加フォームの保存は自動承認レビューに「特定アカウントへのテストユーザー権限付与について明示的な許可がない」として拒否された。未保存であり完了扱いにしない。利用者へこのアカウント追加の確認を求めた後、OpenCodex調査へ話題が移った。必要な確認を得て、または利用者自身の操作で登録を完了する。拒否された操作を別経路で迂回しない。

設定画面: https://console.cloud.google.com/auth/audience?project=pure-faculty-514606-e1

OAuthクライアントシークレットはブラウザアプリでは不要。保存・コミットしない。新しい配信先へ移す場合は、そのoriginもGoogle側へ登録する必要がある。

## 優先する残作業

1. [ ] Googleテストユーザー登録を完了し、実アカウントでGoogleログインを確認。
2. [ ] 自分のGeminiキーをDriveへ保存し、ログアウト→再ログインで復元を確認。ログにキーが含まれないことも確認。
3. [ ] アカウント切り替え時に前アカウントのキーが残らず、Liveが停止することを実機確認。
4. [ ] iPhone Safariでロック中の入力と応答を再確認し、機種・iOS版・イヤフォン・継続時間を記録。
5. [ ] 別アプリ表示中、ホーム画面追加版、通信断、長時間接続の停止挙動を確認。
6. [ ] 結果をもとに、PWAで足りるかネイティブが必要かを利用者と判断。
7. [ ] 本体UIを相談する。診断項目をそのまま本体UIへ持ち込まない。

画面ロック中にローカル録音とGemini Liveが動いたとの利用者の報告はある。ただし長時間安定性、iOS更新後、端末間の再現性は未確認。「PWAなら常にバックグラウンド動作する」と一般化しない。

## 実行と検証

### GitHub登録とローカル作業の再開

GitHub連携のContents書き込みは403となり、実行環境からPCのGit資格情報も取得できなかったため、利用者がログインしたEdgeのGitHub画面から登録する手順へ切り替えた。

登録後はGitHubのmainを正本として新しくcloneすること。以前のSites用作業コピー（C:/Users/yasuchika/Documents/Codex/2026-11-12/new-chat/work/safari-test）とはGit履歴が異なる可能性があるため、その作業コピーをそのままforce pushしない。

    git clone https://github.com/ThousandsOfTies/WearableMutter.git

以前のローカル履歴は引き継ぎ用Git bundleにも保存してある。ソース内容の引き継ぎにはGitHub上のファイルを使える。

### サンプル検証

READMEの手順で静的配信する。ビルド不要。以下は2026-11-13にすべて成功。モック試験であり実サービスの認証成功とは別。

```sh
node --check dist/app.js
node --check dist/google-account.js
node --check dist/key-sync.js
node check.cjs
node drive-check.cjs
```

APIキー・OAuthトークン・音声ログを公開GitHubへ追加しない。既存の配信設定と公開OAuthクライアントIDは秘密情報ではない。

## OpenCodexに関する作業環境の注意

この会話はクラウドWorkで動いている可能性が高い。PCを操作できることと、推論がローカルCodex経由で行われることを混同しない。

利用者の意図:
- `y***a@gmail.com` を固定して使う。
- `t***s@gmail.com` は停止して温存する。この意図に反して再開・切り替えをしない。

調査済み（2026-11-13）:
- `C:\Users\yasuchika\.codex\config.toml` のルートに `openai_base_url = "http://127.0.0.1:10100/v1"` と `experimental_realtime_ws_base_url` が有効に記載され、コメントアウトされていない。
- OpenCodex設定上もy側への固定が保存されている。
- y側のログ識別子は `p26a534`。21:10までプロキシ経由の成功通信を確認した。
- 過去には「プールとネイティブメインのアカウント重複」による401があった。その後y側の成功通信があるため、過去エラーを現在の原因と断定しない。
- このWork会話で調査している間、プロキシログとローカルCodexの推論開始記録は増えなかった。t側の使用量増加も見えたが、この会話への帰属は未確定。
- ローカル担当AIで作業を始めたら、短い依頼の時刻とOpenCodexログの200・`p26a534`を照合し、y側を使っていることを確認する。

OpenCodex自体の設定・認証情報・ログはリポジトリに含めない。

## ローカル再開時の作業結果（2026-11-13）

- [x] GitHubのmainを新規cloneし、GitHubコネクタでもリポジトリを確認。
- [x] 音声開始・停止の競合を修正。AudioContext再開待ちで停止した場合、その後マイク取得へ進まない。古い停止処理が新しいセッションの画面を上書きしない。
- [x] 3分上限を音声入力・Live受信・接続開始・画面復帰でも確認。タイマーが遅延しても、処理再開時に期限切れの音声を新たに処理しない。JavaScript停止中の即時停止を保証するものではない。
- [x] 上記の回帰テストをcheck.cjsへ追加。既存の音声・Driveモック試験、3ファイルの構文確認に成功。
- [ ] Googleテストユーザー追加、実認証、実キーのDrive保存・復元・アカウント切替は未実施。前回のアカウント追加確認は未解決のため設定変更していない。
- [ ] iPhone実機、通信断、ホーム画面版、長時間接続は未実施。利用者の端末・実キーでの検証が必要。
- [ ] Sites配信は更新していない。GitHubの変更は既存テストページへ自動反映されない。

実機試験は `VALIDATION.md` の記録欄を使用する。本体UI・PWA/ネイティブの方針決定は実測後に相談する。
