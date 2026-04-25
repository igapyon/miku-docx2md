# Miku Software Design v20260425

このメモは、`miku` で始まるソフトウェアシリーズに共通して見られる設計上の特徴を整理するものです。

これらのソフトウェアは、`Mikuku` と Toshiki Iga が初版を作りました。

現時点の内容は、このリポジトリ、および 2026-04-25 に確認した公開 `igapyon` GitHub リポジトリをもとにしています。

## 対象範囲

`miku` で始まるシリーズには、次のような小さなツールが含まれます。

Node 版:

- `miku-abc-player`
- `miku-docx2md`
- `miku-indexgen`
- `miku-unicode-guard`
- `miku-xlsx2md`
- `mikuproject`
- `mikuscore`

Java ストレートコンバージョン版:

- `miku-indexgen-java`
- `miku-xlsx2md-java`

Agent Skills 版:

- `mikuproject-skills`
- `mikuscore-skills`

`-java` サフィックスが付くプロジェクトは、サフィックスなしの元ツールを Java へストレートコンバージョンした版として位置づけます。

`-skills` サフィックスが付くプロジェクトは、サフィックスなしの元プロダクトを AI エージェントから扱いやすくするための Agent Skills 版として位置づけます。

Java 版でも Agent Skills 版でもない miku シリーズ本体のアプリは、原則として Node.js アプリとして実装します。Web UI を持つ場合は、共通 UI 部品として `lht-cmn` の Web Components を利用します。

## 共通する方向性

このシリーズは、小さく実用的な bridge tool 群として捉えるのが自然です。

各ツールは、既存のファイルやドメインデータを変換、抽出、検査、正規化し、人間、スクリプト、AI エージェントが扱いやすい形へ橋渡しします。

共通する方向性は次のとおりです。

- local-first な処理
- 小さく理解しやすい実装形状
- machine-readable な出力
- AI エージェントに渡しやすいデータ交換
- 必要に応じた human-readable な companion output
- コア機能でサーバーを前提にしないこと
- 実用上可能な範囲での再現性

## 本体アプリの位置づけ

ここでいう本体アプリとは、Java ストレートコンバージョン版でも Agent Skills 版でもない、Node.js を基本 runtime とする miku シリーズのアプリを指します。

本体アプリは、各分野の既存ファイルを、ローカル環境で安全に読み取り、構造化し、別の表現へ受け渡すための実用ツールです。

本体アプリは、単なるデモやライブラリではありません。人間が直接使える UI または CLI を持ち、実ファイルを入力し、確認可能な成果物を出力する product として成立することを目指します。

一方で、本体アプリは専門ソフトウェアの完全な代替を目指しません。既存の専門ソフトウェア、ファイルフォーマット、AI エージェント、スクリプトの間に立ち、情報を扱いやすい形へ橋渡しすることを主な役割とします。

## 本体アプリの基本理念

本体アプリでは、次の理念を重視します。

- 入力ファイルをユーザーの手元で処理する
- サーバーへ送らずに処理を完結させる
- Web UI を持つ場合は Single-file Web App として配布できる形を保つ
- 既存ファイルの意味構造をできるだけ取り出す
- 見た目の完全再現より、再利用しやすい構造化出力を優先する
- AI エージェントと人間の両方が確認しやすい表現を用意する
- 変換できない内容や失われる情報を隠さない
- 小さく、理解しやすく、保守しやすい実装に保つ
- コア処理はできるだけ自前でスクラッチ実装する
- 依存を増やす場合は、利用者側の価値と保守上の理由が明確な場合に限る
- 自動化しやすい CLI と、確認しやすい UI の両方を尊重する

本体アプリの価値は、万能さではなく、特定の変換・抽出・検査の workflow を、ローカルで確実に実行できることにあります。

## 本体アプリの共通原則

本体アプリでは、次の原則を基本とします。

- Runtime は Node.js を基本とする
- Web UI を持つ場合は `lht-cmn` の Web Components を利用する
- Web UI を持つ場合は Single-file Web App として配布する
- コア機能はサーバー通信を必要としない
- 入力はローカルファイル、CLI argument、または標準的なテキスト/JSON 表現から受け取る
- 出力は Markdown、JSON、XML、SVG、XLSX、ZIP など、他ツールに渡しやすいファイルとして生成する
- UI は load、preview、diagnostics、export の流れを中心に組み立てる
- CLI は batch processing、test、AI agent workflow で使えるようにする
- 主要な成果物はファイルとして保存できるようにする
- warning、diagnostics、summary をできるだけ構造化して扱う
- 変換の制約や非対応範囲は明示する
- 同じ入力と同じ設定から、できるだけ同じ出力を得られるようにする

本体アプリでは、ユーザーが「読み込む」「確認する」「書き出す」「別のツールや AI に渡す」という流れを短く保ちます。

## スクラッチ実装と依存の原則

本体アプリでは、コア処理をできるだけ自前でスクラッチ実装します。

これは、外部ライブラリを一切使わないという意味ではありません。`mikuscore` のように、対象領域の複雑さや既存資産との接続のために third-party library が必要な場合はあります。

ただし、アプリの中心となる変換方針、データモデル、診断、出力組み立て、AI 向け view の生成は、できるだけ自分たちで制御できる形にします。

この原則は、次のような判断として現れます。

- 変換の意味づけは外部ライブラリに丸投げしない
- ファイルフォーマットの必要部分は、可能な範囲で自前で読み書きする
- ZIP 入出力が必要な場合でも、用途が限定できるなら重い汎用ライブラリに依存しない
- Excel 入出力が必要な場合でも、Apache POI のような大型ライブラリに依存せず、必要な範囲を自前で扱う
- XLSX、XML、SVG、Markdown、JSON などの生成は、目的に必要な範囲を明確にして実装する
- third-party library は、汎用処理を隠すためではなく、実装負荷や互換性リスクを現実的に下げるために採用する
- 採用した library の周辺に、miku シリーズとしてのデータモデルと diagnostics を置く
- 依存により出力や挙動が不透明になる場合は、採用を慎重に判断する

`mikuproject` のように ZIP や XLSX 相当の成果物を扱う場合でも、コアの組み立て方を理解できる状態に保ちます。Excel 入出力でも Apache POI のような包括的なライブラリへ処理全体を預けず、必要な workbook 構造を miku 側で扱います。`mikuscore` のように音楽フォーマットやレンダリング周辺で third-party library が必要な場合でも、miku 側の価値は、形式間の橋渡し、診断、正規化、AI workflow への受け渡しに置きます。

依存を減らす目的は、単に package 数を少なくすることではありません。処理の意味、制約、失敗の仕方を把握し、ユーザーと AI エージェントに説明できる状態を保つことです。

## データ設計の原則

本体アプリでは、内部データと出力データの設計を重視します。

特に、次の考え方を優先します。

- 対象領域ごとに canonical format または semantic base を置く
- 周辺形式は、その canonical format から派生する view として扱う
- 人間向け出力と AI 向け出力を必要に応じて分ける
- JSON は AI とプログラムが扱いやすい構造にする
- Markdown は人間が読め、AI にも渡しやすい context として使う
- SVG、XLSX、ZIP などは成果物や帳票として扱う
- 変換過程で生じる warning や loss は diagnostics として表に出す

データ設計では、見た目の再現よりも、意味のある構造、差分確認、再利用、再取込のしやすさを優先します。

## 正本と派生 view の原則

本体アプリでは、対象領域ごとに「何を正本として扱うか」を宣言し、それを中心に設計します。

正本は、アプリが守るべき意味の中心です。入出力、内部モデル、UI、CLI、AI 向け view、帳票出力は、正本を壊さず、正本の意味を別の用途へ写すために配置します。

例:

- `mikuscore` では MusicXML を semantic anchor として扱う
- `mikuproject` では MS Project XML を意味の基軸として扱い、内部では `ProjectModel` を経由する
- `miku-xlsx2md` では Excel workbook を入力正本とし、Markdown は設計書構造を取り出すための派生表現として扱う

正本の周辺には、用途別の view を置きます。

- 人間が読むための Markdown、SVG、XLSX report
- AI に渡すための projection、draft view、task edit view、phase detail view
- 再取込や比較のための workbook JSON、patch JSON、summary、diagnostics
- 配布や受け渡しのための ZIP bundle

重要なのは、派生 view を正本と混同しないことです。派生 view は便利な作業面ですが、意味の中心を壊さない範囲で生成し、再取込できる場合も影響範囲を明示します。

設計判断で迷った場合は、どの選択が正本の意味を最も保つかを優先します。見た目、便利な編集面、AI への渡しやすさは重要ですが、正本の意味を失わせる場合は優先しません。

## プロダクト境界の原則

本体アプリでは、何をするツールなのかと同じくらい、何をしないツールなのかを明確にします。

例:

- `mikuscore` は score converter / handoff tool であり、強力な notation editor ではない
- `miku-abc-player` は playback-first / preview-first の ABC-centered app であり、広範な score conversion workbench ではない
- `miku-xlsx2md` は Excel の見た目再現ではなく、設計書構造の Markdown 化を目的とする
- `mikuproject` は MS Project XML と WBS / AI / 帳票の橋渡しであり、すべての project-management feature を置き換えない

この境界を README、docs、UI copy、CLI help に反映します。機能が内部に存在しても、プロダクトの中心でないものは、前面に出しすぎません。

## 変換品質の原則

本体アプリでは、変換品質を「見た目が似ているか」だけで評価しません。

重視する軸は次のとおりです。

- semantic center または canonical format から不要に離れない
- 既存情報を先に preserve し、曖昧な情報を過剰に infer しない
- full fidelity が難しい場合は、loss、fallback、unsupported を diagnostics として見えるようにする
- 変換結果に traceability を持たせ、元の file / sheet / range / anchor / node に戻れる手がかりを残す
- round-trip では whitespace identity より、意味的・構造的な安定性を重視する
- round-trip できる種類の変換では、テストに round-trip case を入れ、元の意味構造へ戻るかを確認する
- 変換は bounded and local に行い、関係ない global rewrite を避ける
- 失敗する操作は、途中まで壊れた状態を残さないよう atomic に扱う

品質保証では、unit test、golden test、fixture、regression case を使い、既知の edge pattern を増やしながら品質を固定します。

## 表示値と内部値の原則

本体アプリでは、人間が見ている値と、内部的に保持される値を分けて考えます。

`miku-xlsx2md` のような変換では、標準出力は Excel の表示値寄りにします。これは、人間が既存ファイルを見ながら AI と内容を共有する場面で、画面上の見え方と Markdown 上の値が近いことを重視するためです。

一方で、必要に応じて raw value、解決経路、fallback 理由、unsupported 理由を内部情報や diagnostics として保持します。

この原則により、次の両方を満たします。

- 人間と AI が同じ見え方を共有しやすい
- 実装者や自動化ツールが、値の由来と変換判断を追跡できる

## 影響範囲を小さくする原則

本体アプリでは、import / edit / AI 連携の影響範囲を明確に分けます。

代表的な分類は次のとおりです。

- `replace`: 全体を入れ替える
- `merge`: 既存 state に限定列や限定領域だけを反映する
- `patch`: AI などが返した局所差分だけを検証して反映する

既存データを安全に少し直す場合は、全体交換よりも局所 projection と patch を優先します。AI に渡す入力も、全体 bundle ではなく、必要な overview、task edit、phase detail などへ小さく切り出します。

この設計により、AI が扱う文脈を小さくし、返ってきた変更を validate しやすくし、人間が diff を確認しやすくします。

## 配布とビルドの原則

Web UI を持つ本体アプリでは、開発時の分割ソースと、配布時の single-file artifact を分けます。

配布物は、原則として Single-file Web App になるように設計します。Web ブラウザだけで開け、追加インストールやサーバー起動を必要とせず、オフラインでも主要機能を使える形を目指します。

Web 配布では、`index.html` をランディングページとして置き、そこから実際の本体 HTML を起動する構成を基本とします。本体 HTML は、たとえば `miku-xlsx2md.html`、`miku-docx2md.html`、`mikuproject.html`、`mikuscore.html` のように、プロダクト名を持つ single-file app として生成します。

ランディングページでは、原則としてビルド日付を画面に表示します。また、ランディングページから本体 HTML を開くリンクには、ビルド日付などの URL parameter を付け、古い single-file app がブラウザ cache から開かれにくいようにします。

基本形は次のとおりです。

- TypeScript source を `src/` 配下に置く
- source template HTML を編集する
- `index.html` はランディングページとして扱う
- ランディングページにはビルド日付を表示する
- 本体 HTML はプロダクト名を持つ single-file app として生成する
- ランディングページから本体 HTML を開く URL には cache busting 用 parameter を付ける
- build で CSS / JS / 必要 asset を single HTML にまとめる
- 生成済み single HTML artifact は直接編集しない
- 生成物は offline runtime として動作する
- required JS / CSS は local または vendored にする
- build は local で deterministic に実行できるようにする

この形により、開発時の保守性と、利用時の配布しやすさを両立します。

## workplace ディレクトリの原則

本体アプリのリポジトリルートには、手元作業用の `workplace/` ディレクトリを置きます。

`workplace/` は、生成物、一時ファイル、手元検証用データ、ローカル実行結果などを置く場所です。ディレクトリ自体は `.gitkeep` で保持しますが、原則として中身は git 管理外にします。

`workplace/` は標準の build、test、lint、release check の対象に含めません。ここには sibling repository の clone、実文書、検証用出力などが置かれることがあり、標準コマンドがそれらを拾うと、現在のプロダクトの品質確認と手元検証環境の状態が混ざってしまうためです。

この名前は `workplace` に統一します。過去または typo により `workspace` と書かれている箇所がある場合は、順次 `workplace` へ寄せます。

## README と docs の役割分担

`README.md` は、ふつうの利用者を想定した入口文書にします。

README には、次を中心に置きます。

- このソフトウェアが何をするものか
- 代表的な使い方
- インストールまたは起動方法
- 主要な入出力
- 主要な option
- 追加情報へのリンク

開発者向けの詳細、設計メモ、内部構造、実装仕様、テスト方針、将来メモは `docs/` 配下の Markdown に格納します。

README から `docs/` へのリンクを置くことはありますが、README 本文は利用者が最初に読む説明として保ちます。内部設計や開発者向けの詳細で README を重くしすぎません。

## TODO.md による作業管理

作業中の課題、改善案、未整理の論点、次に行う作業は、多くの場合 `TODO.md` に記録します。

`TODO.md` は、issue tracker の代替というより、リポジトリ内で作業文脈を失わないための軽量な作業メモとして扱います。

必要に応じて、より詳細な設計メモや仕様は `docs/` に分離します。`TODO.md` には、そこへ辿るための短い入口や、未完了項目の一覧を置きます。

## upstream を持つ派生アプリの例外

miku 本体アプリは、原則として別の本体アプリを upstream として持ちません。

`miku-abc-player` は、`mikuscore` から ABC 関連機能をピックアップして作ったサブセットです。`miku-abc-player` が `mikuscore` を upstream とするのは、このサブセット化に伴う特殊事情です。また、`mikuscore` 自体も一部で別 upstream を参照しますが、これも例外中の例外として扱います。

このような upstream 参照や派生関係は、本体アプリ全体の標準形ではありません。

例外的に upstream を持つ派生アプリでは、次を重視します。

- upstream からの将来取り込みを容易に保つ
- thin wrapper、thin adapter、entry-point level customization を優先する
- UI surface、input mode、product messaging により機能範囲を絞る
- upstream 由来コードを、現在の UI で使っていないという理由だけで大きく削らない
- 見た目上の local cleanup より、upstream sync のしやすさを優先する
- downstream 固有の divergence は、実用上の利益が明確な場合に限る

これは、upstream を持つ場合に限り、少し余分なコードを持つことを許容する方針です。通常の本体アプリでは、upstream 同期を前提にせず、アプリ自身の目的に合わせて小さく理解しやすい構成を優先します。

## core と薄い入口の原則

本体アプリでは、UI、CLI、テスト、Agent Skills から呼ばれる処理を、できるだけ同じ core に寄せます。

CLI と Web UI は、別々の実装ではなく、共通 core を呼ぶ薄い入口として設計します。

この原則は、次のような形で現れます。

- 変換、検査、正規化、import / export の本体は UI から分離する
- CLI は core を呼ぶ薄い wrapper として実装する
- Web UI は core の結果を表示し、ファイル選択や保存操作を担当する
- テストは UI だけでなく core API に対しても書く
- Agent Skills や外部自動化から呼びやすい小さな公開入口を用意する
- Web UI と CLI で同じ既定値、同じ diagnostics、同じ出力方針を使う

CLI を公開するために薄皮を挟む場合、その薄皮は option parsing、file I/O、stdout / stderr、exit code の責務に留めます。変換の意味や business logic を CLI 側へ重複実装しません。

## 公開 API 面の原則

本体アプリでは、必要に応じて UI 非依存の公開 API 面を用意します。

公開 API 面は、アプリ内部のすべてを露出するものではありません。Agent Skills、CLI、テスト、MCP、将来の統合から必要になる操作を、小さく安定した入口としてまとめるものです。

公開 API 面では、次を重視します。

- format-aware な import / export 入口を用意する
- validate、summarize、diff、apply などの確認操作を core 側に置く
- AI 向け spec や projection を安定取得できるようにする
- UI の DOM 状態に依存しない
- 入力、出力、diagnostics を構造化する
- 実装内部の細かな module graph を外部 contract にしない

この方針により、Web UI のために作った機能を、CLI や Agent Skills からも同じ意味で使えるようにします。

## runtime 差分を adapter に閉じ込める原則

本体アプリは、Web browser と Node.js CLI の両方で動くことがあります。

その場合、DOM、XML parser、file、Blob、download、encoding、ZIP 保存など、runtime によって違う部分を core logic に直接散らしません。

runtime 差分は、次のように adapter や loader に閉じ込めます。

- Web では browser 標準 API を使う
- Node.js では必要な API を loader や adapter で注入する
- XML DOM や serializer は直接 global に決め打ちしない
- file I/O と download は別責務として扱う
- core は byte、text、document object、structured data を受け渡す

この分離により、Single-file Web App と CLI の両方で同じ core を使いやすくします。

## diagnostics と summary の原則

本体アプリでは、diagnostics と summary を副産物ではなく、正式な出力面として扱います。

diagnostics は、単なるエラーメッセージではありません。変換時の判断、fallback、unsupported、loss、warning、入力の怪しい点、出力上の制約を、ユーザー、開発者、AI エージェントが追跡するための情報です。

summary は、入力全体や変換結果の全体像を短く把握するために使います。

原則は次のとおりです。

- diagnostics は可能な範囲で code / message / severity / source location を持つ
- source location は file / sheet / range / anchor / node / command など、対象領域に合う形で保持する
- CLI では diagnostics を stderr または structured diagnostics として出せるようにする
- Web UI では diagnostics と summary を確認できる場所を用意する
- AI 向け workflow では、diagnostics を patch validate や diff の判断材料にする
- unsupported を黙って捨てず、必要に応じて trace や metadata として残す
- 通常の primary output を読みやすく保つため、詳細な trace は debug / diagnostics mode で出す
- debug trace は、本文の代替ではなく、変換上の判断と失われた情報を追跡するための補助情報として扱う

これにより、変換が成功したかだけでなく、どの程度信頼できるか、どこに制約があるかを判断できるようにします。

## option と mode の原則

本体アプリでは、option や mode を増やしすぎないようにします。

ただし、変換対象の性質上、利用者が選ぶべき重要な trade-off は mode として明示します。

例:

- display / raw / both
- plain / github
- balanced / border / planner-aware
- replace / merge / patch
- diagnostics text / json

mode を追加する場合は、次を満たすようにします。

- 何を切り替える mode なのかが説明できる
- UI と CLI で意味が揃っている
- 既定値が通常利用に向いている
- 出力ファイル名や summary から mode を追跡できる
- テストで mode ごとの代表ケースを固定する

mode は内部都合を露出するためではなく、利用者が変換方針を選ぶために置きます。

## UI 設計の原則

Web UI を持つ本体アプリでは、`lht-cmn` の Web Components を利用し、シリーズとしての一貫性を保ちます。

UI は、説明用の landing page よりも、実際の作業画面を中心にします。

基本的な UI flow は次のとおりです。

- 入力ファイルを読み込む
- 変換または解析を実行する
- 結果、summary、diagnostics を確認する
- 必要な成果物を保存する

UI では、ユーザーがファイルを外部サーバーへ送っていると誤解しないよう、ローカル処理であることを明確に扱います。

## CLI 設計の原則

CLI を持つ本体アプリでは、人間の手作業を置き換える batch workflow と、AI エージェントからの呼び出しを意識します。

CLI では、次を重視します。

- command と option を少なく保つ
- 入力ファイルと出力ファイルを明示できるようにする
- 成果物は stdout または指定ファイルに出力する
- warning や diagnostics は stderr または structured diagnostics として扱う
- 成功と失敗を exit code で判断できるようにする
- テストや CI で同じ操作を再現できるようにする

CLI は UI の補助ではなく、AI agent workflow と自動化のための正式な入口として扱います。

## AI と自動化

AI エージェントやプログラムは、第一級の利用者として扱われます。

`miku-indexgen` では、この点は明示的です。ファイル全文を読む前に、AI エージェントやプログラムが利用可能なファイルの概観を得るためのツールとして説明されています。

シリーズ全体では、次のような形で現れます。

- AI 受け渡し用の JSON view
- モデルが読みやすい context としての Markdown 出力
- downstream tool 向けの diagnostics や summary
- ツールの使い方を AI エージェントに伝える `*-skills` リポジトリ
- ブラウザ UI に依存せず scripted use できる CLI surface

設計上の好みは、単に人間が読める出力を作ることではありません。別のプログラムやエージェントが、壊れやすいパースをせずに使える程度に、構造を単純に保つことです。

## Local-first とプライバシー

多くのツールは、ブラウザ内、またはローカル CLI として動作します。

これは、入力となるファイルが private または業務上 sensitive なデータを含みやすいため重要です。

代表的な入力には次があります。

- Excel workbook
- Word document
- project plan
- score file
- source repository

シリーズ全体として、コア機能は hosted backend やサーバー通信を前提にしません。single-file web app や local CLI により、ローカル環境だけで処理が完結する形を基本とします。

## 完全な編集ではなく変換を重視する

これらのツールは、多くの場合、専門分野の full-featured application を置き換えようとはしていません。

例:

- `mikuscore` は譜面の変換・検査ツールであり、完全な浄書エディタではありません。
- `miku-xlsx2md` は Excel の見た目を完全再現するのではなく、意味のある workbook content を Markdown として抽出します。
- `miku-docx2md` は Word のレイアウトエンジンではなく、文書構造を Markdown として抽出します。
- `mikuproject` は MS Project XML、WBS report、AI JSON、visual output を橋渡しするものであり、すべての project-management feature を置き換えるものではありません。

繰り返し見られるパターンは、完全な round-trip fidelity を約束することではなく、意味のある構造を保つ、または露出させ、変換で失われる情報を見えるようにすることです。

## Canonical format と companion format

いくつかのプロジェクトでは、canonical format または central format を選び、その周辺に companion format を配置しています。

例:

- `miku-indexgen`: フラットな `index.json` が canonical。`index.md` は任意の companion output。
- `mikuscore`: MusicXML が central interchange format。
- `mikuproject`: MS Project XML が semantic base。AI JSON、workbook JSON、XLSX、Markdown、SVG、Mermaid は surrounding view。
- `miku-xlsx2md` と `miku-docx2md`: Markdown が主な extracted text representation。asset や summary は companion。

この設計により、コアモデルを単純に保ちながら、人間による確認やツール間交換に必要な形式を支えられます。

成果物は、役割ごとに分けて考えます。

- primary output: ユーザーが主に欲しい変換結果。例: Markdown、XML、XLSX、SVG。
- companion summary: 入力や変換結果の全体像を短く確認するための summary。
- sidecar asset: primary output から参照される画像、添付、分割出力などの補助ファイル。
- manifest: sidecar asset の path、media type、source trace、位置情報などを機械可読にまとめた索引。
- debug / diagnostic trace: 通常出力には出しすぎない fallback、unsupported、loss の追跡情報。

sidecar asset を出す場合は、可能な範囲で manifest を添えます。ファイルを保存するだけでなく、どの入力要素に由来し、どの primary output からどう参照されるのかを、後続ツールや AI エージェントが再解釈しやすくするためです。

## 小さなツール形状

この文書は、個別リポジトリ固有の開発メモではなく、miku ソフトウェアシリーズをまたがる共通的な設計情報として整理します。

シリーズ全体では、ツールの形を小さく直接的に保つことを重視します。

- プロジェクト全体を理解できる程度に小さく保つ
- 依存を最小限にする
- 人間向けの装飾より machine readability を優先する
- downstream automation を簡単にする構造を優先する
- CLI argument と generated file による素直な入出力を使う

実装形状はプロジェクトごとに異なりますが、プロダクトとしての基本形は、小さく、読みやすく、他のツールから呼び出しやすいものにします。

## Browser と CLI の組み合わせ

複数のプロジェクトでは、ブラウザ UI と CLI path が組み合わされています。

Java 版や Agent Skills 版を除く本体アプリでは、Node.js を基本 runtime とします。Web UI を持つ場合でも、ビルド、CLI、テスト、配布物生成は Node.js toolchain を中心に組み立てます。

Web UI では、シリーズ共通の見た目と操作感を保つため、`lht-cmn` の Web Components を利用します。各アプリ固有の UI は、その上に必要最小限で追加します。

ブラウザ UI は次に向いています。

- ローカルでの対話的な変換
- preview
- 人間による inspection
- generated artifact の download

CLI は次に向いています。

- batch conversion
- test
- agent workflow
- 他ツールとの integration
- 再現可能な command-line use

この組み合わせにより、同じコア機能を、人間の作業にも自動化された workflow にも使えるようにしています。

## 命名パターン

`miku` prefix は、このシリーズの小さなツール群を示します。

名前には、`miku-indexgen` や `miku-xlsx2md` のように `miku-` で始まるものと、`mikuscore` や `mikuproject` のようにハイフンなしで `miku` から始まるものがあります。

`-java` サフィックスは Java ストレートコンバージョン版、`-skills` サフィックスは元プロダクトの Agent Skills 版を示します。

多くのリポジトリには `mikuku` topic も付いており、これはより広い software family を識別するものと見られます。

## ライセンス選択

`miku` 系リポジトリでは、Apache License 2.0 を一貫して採用しています。

これは、小さな reusable tool や companion library の実用的な default として位置づけられます。

## さらに抽出できる本体らしさ

miku 本体アプリには、技術選択とは別に、作り方の癖として共通するものがあります。

### 成果物を中心にする

本体アプリは、画面上の状態や一時的な操作結果よりも、保存できる成果物を中心に設計します。

成果物は、ユーザー、CLI、テスト、AI エージェント、別ツールが後から同じように扱えるものにします。

このため、次を重視します。

- 主要な結果をファイルとして出力できる
- 出力ファイル名と出力形式が予測しやすい
- UI で見た結果と CLI で得る結果の意味がずれない
- UI で確認する summary、diagnostics、manifest と、CLI で保存する同名の成果物は同じ core 由来にする
- 生成物は `workplace/` などの作業場所へ置ける
- 成果物から、入力、mode、diagnostics、summary を追跡できる

UI は成果物を作るための操作面であり、CLI は成果物を自動生成するための入口です。どちらも、同じ処理結果を別の入口から扱うためのものとして揃えます。

### 検査してから渡す

本体アプリは、変換したら終わりではなく、変換結果を人間や AI が確認してから次へ渡す workflow を重視します。

そのため、出力は単一の最終ファイルだけでなく、確認用の summary、diagnostics、preview、companion output を持つことがあります。

この考え方は、次のように現れます。

- 変換結果をすぐ外部ツールへ流し込むだけにしない
- 人間が見て判断できる Markdown、SVG、XLSX report などを用意する
- AI が扱う前に、入力全体の構造や制約を summary として渡せるようにする
- AI から戻る変更は、validate、diff、patch を通して確認する
- round-trip 可能な領域では、戻せるかどうかをテストで確認する

これは、AI や自動化を信用しないという意味ではありません。自動化の前後に、確認可能な構造を置くという設計です。

### 正本への距離を短く保つ

本体アプリでは、便利な view や編集面を増やしても、正本から遠くなりすぎないようにします。

AI 向け JSON、Markdown、帳票、preview、patch は、作業しやすくするための面です。しかし、それらは正本そのものではありません。

このため、次を避けます。

- 派生 view だけを編集して、正本へ戻す経路が曖昧になること
- AI 向けに都合よく整形しすぎて、元データの制約を失うこと
- UI の見た目を優先して、canonical format や internal model を歪めること
- 変換結果の都合で、入力側の意味を過剰に補完すること

必要なのは、AI や人間に扱いやすい面を作りながらも、どの情報が正本由来で、どの情報が派生、推定、補助なのかを分けることです。

### 入出力を素直にする

本体アプリでは、複雑な project state や暗黙の作業環境に依存しすぎず、入力ファイルと出力ファイルの関係を素直にします。

典型的には、次のような形を好みます。

- 入力ファイルまたは入力ディレクトリを明示する
- 出力先ディレクトリを明示できる
- 生成されるファイルの種類が説明できる
- 標準出力、標準エラー、exit code の意味が明確である
- ローカルファイルだけで再実行できる
- CI や手元テストで同じ command を再現できる

この素直さは、CLI だけでなく Web UI にも関係します。Web UI でも、読み込む、確認する、保存する、という流れを短く保ちます。

### 中間表現を小さく保つ

本体アプリでは、内部モデルや AI 向け projection を、対象領域全体を完全再現する巨大モデルにしすぎません。

必要な意味を取り出すための中間表現を置きますが、それは対象領域の full clone ではなく、プロダクトの目的に必要な範囲へ絞ります。

この方針により、次を保ちます。

- 実装者が全体を理解できる
- AI エージェントに渡す JSON が過度に大きくならない
- patch や diff の影響範囲を限定できる
- unsupported な情報を、無理に内部モデルへ押し込まない
- 追加機能が正本や core model を不用意に太らせない

対象領域が複雑な場合でも、miku 側の中間表現は、プロダクトが責任を持つ範囲に合わせて設計します。

### 失敗を仕様に含める

本体アプリでは、成功時の出力だけでなく、失敗や部分対応を仕様の一部として扱います。

ファイル変換では、完全対応できない入力が必ず出ます。その場合に、黙って捨てる、何となく近い形にする、UI 上だけで警告する、という扱いに寄せません。

原則は次のとおりです。

- unsupported は unsupported として出す
- fallback した場合は fallback 理由を残す
- loss がある場合は loss として示す
- 入力上の怪しい点は warning として扱う
- 可能なら source location を付ける
- 通常出力では読者の理解を妨げない粒度に抑え、debug mode では trace を増やす
- テストでは成功例だけでなく、失敗、警告、部分対応も固定する

失敗の情報を構造化することで、人間は判断しやすくなり、AI エージェントは安全に次の操作を選びやすくなります。

## `miku-docx2md` 固有の気づき

`miku-docx2md` は、Word `.docx` を Markdown へ抽出する文書変換ツールです。この種類のツールでは、特に次の境界を明確にします。

- Word の page layout、floating object、shape positioning、text box placement、header / footer の完全再現は primary goal にしない
- Markdown を、文書構造と本文を読むための primary output として扱う
- 埋め込み画像などの binary content は、本文への完全な再配置ではなく、sidecar asset と manifest により追跡可能にする
- unsupported な Word 要素は、通常の Markdown 本文を汚さず、summary や debug HTML comment trace で確認できるようにする
- 画像の alt text、relationship target、document position などは、AI や後続スクリプトが扱える companion metadata として残す

この方針により、`.docx` のレイアウトエンジンを再実装する方向へ広がりすぎることを避け、文書の内容、順序、見出し、リスト、表、リンク、画像参照を、ローカルで再利用しやすい形へ抽出することに集中できます。

### UI をプロダクトの中心にしすぎない

Web UI を持つ場合でも、本体アプリの中心は UI そのものではなく、ローカルファイルを読み、構造化し、成果物として出す処理です。

UI は重要ですが、UI にだけ意味がある状態を避けます。

- UI state にしか存在しない重要情報を作らない
- core logic を DOM event handler の中へ閉じ込めない
- CLI や test から同じ処理を呼べるようにする
- UI copy は product boundary を明確にする
- landing page は入口、本体 HTML は作業面として分ける

このため、miku 本体アプリは、見た目の豪華さよりも、実ファイルに対する確実な操作と確認可能な出力を優先します。

## 設計要約

`miku` ソフトウェアシリーズは、次のように要約できます。

> 既存のドメインファイルを、AI-friendly、script-friendly、human-reviewable な構造化出力へ変換する、小さな local-first の conversion / bridge tool 群。

このシリーズを特徴づけるものは、特定の技術スタックや UI スタイルではありません。繰り返し現れる product constraint です。

- ツールを理解可能な大きさに保つ
- 可能な限りローカルで動かす
- structured data を露出させる
- AI と automation を容易にする
- 専門ソフトウェアの完全な代替を装わない
- visual fidelity より、実用的な変換とレビュー workflow を優先する
