/** Japanese UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Inkswell をカスタマイズ",
  "settings.customize.desc":
    "設定集の種類と項目、テンプレート、ビート構成、シーンのステータス、執筆プロンプト、チェックリスト、表示する機能。すべて Inkswell の中で編集できます。",
  "settings.customize.button": "カスタマイズを開く",
  "settings.defaultCompileFormat.name": "既定のコンパイル形式",
  "settings.defaultCompileFormat.desc": "コンパイルダイアログを開いたときに最初から選ばれている形式です。",
  "settings.showWordCounts.name": "語数を表示",
  "settings.showWordCounts.desc": "エクスプローラーにシーンごと・プロジェクトごとの語数を表示します。",
  "settings.hideArchived.name": "アーカイブした本をシリーズから隠す",
  "settings.hideArchived.desc":
    "アーカイブした本はシリーズの棚とホームのシリーズ表紙から外れ、「アーカイブ済み」セクションのシリーズ名の下に移ります。発表を終えてアーカイブする短編などに便利です。オフにすると、アーカイブした本は薄く表示されたままシリーズの棚に残ります。",
  "settings.syncHistory.name": "執筆履歴をデバイス間で同期",
  "settings.syncHistory.desc":
    "語数は入力したデバイスで数えられます。オンにすると、ベースフォルダーの「Writing log」フォルダーにデバイスごとの小さな記録ノートを置き、記録画面でそれらを統合します。連続記録や合計にすべてのデバイスの分が含まれるようになります。ノートは保管庫の同期（Obsidian Sync、iCloud など）で運ばれます。",
  "settings.sceneHeadingLevel.name": "シーン見出しのレベル",
  "settings.sceneHeadingLevel.desc": "コンパイル時の任意ステップ「タイトルを先頭に追加」で使う見出しレベル（1〜6）です。",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "原稿",
  "settings.authorName.name": "氏名",
  "settings.authorName.desc":
    "Word 原稿の扉ページに載せる本名です。本ごとの著者名（ペンネーム）は別にでき、出版 → コンパイル で設定します。",
  "settings.authorContact.name": "連絡先",
  "settings.authorContact.desc":
    "住所、メールアドレス、電話番号など。1 行に 1 項目ずつ書くと、扉ページの氏名の下に入ります。",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word（.docx）",
  "settings.compileFormat.pandoc": "Pandoc（docx/pdf/epub）",
  "settings.interfaceLanguage.name": "表示言語",
  "lib.rowMenu.openInTabHint": "Ctrl/Cmd を押しながらクリックすると新しいタブで開きます",
  "settings.interfaceLanguage.desc":
    "レビュー済みの翻訳がある場合、Inkswell は Obsidian の言語に従います。ここで選ぶと、下書き段階の翻訳も含めて言語を指定できます。ノートに書き込まれる文字列は変わりません。",
  "settings.interfaceLanguage.auto": "Obsidian と同じ",
  "settings.interfaceLanguage.draft": "{name}（下書き — レビューにご協力ください）",
  "settings.interfaceLanguage.applied": "言語を変更しました。コマンド名、この設定タブ、スマートフォンのタブバーは Obsidian を再起動すると切り替わります。",
  "settings.companionSceneTarget.name": "サイドバーからシーンを開く場所",
  "settings.companionSceneTarget.desc":
    "サイドバーのコンパニオンでシーンをクリックしたときに開く場所です。Ctrl/Cmd を押しながらクリックすると、常に新しいタブで開きます。",
  "settings.companionSceneTarget.write": "Inkswell の執筆画面",
  "settings.companionSceneTarget.tab": "通常のタブ",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "執筆エディター",
  "settings.typewriterMode.name": "タイプライターモード",
  "settings.typewriterMode.desc":
    "執筆エディターで入力中の行を常に縦方向の中央に保ち、視線を一か所にとどめます。マウスでクリックしたときは中央に戻しません。コマンド「タイプライターモードの切り替え（執筆エディター）」からも使えます。",
  "settings.manuscriptTypography.name": "原稿風の組版",
  "settings.manuscriptTypography.desc":
    "執筆エディターを本のようなレイアウトにします。段落の 1 行目を字下げし（見出しやシーン区切りの直後の段落を除く）、見出しを中央に揃えます。見た目だけの変更で、本文は変わりません。フォントは Obsidian の 外観 → テキストフォント に従います。",
  "settings.smartDashes.name": "スマートダッシュ",
  "settings.smartDashes.desc":
    "執筆エディターで -- と入力すると en ダッシュ（–）に、さらに - を入力すると em ダッシュ（—）になります。ダッシュだけの行（---）はそのままです。Inkswell の執筆エディターだけに適用され、Obsidian のノートには影響しません。",
  "settings.smartQuotes.name": "スマート引用符",
  "settings.smartQuotes.desc":
    "執筆エディターで入力したストレート引用符を、カーリー引用符（“ ” と ‘ ’）に変換します。アポストロフィは ’ になります。コードとリンクの中では変換しません。",
  "settings.smartEllipsis.name": "スマート三点リーダー",
  "settings.smartEllipsis.desc": "執筆エディターでピリオドを 3 つ入力すると三点リーダー（…）になります。",
  "settings.milestoneWords.name": "マイルストーンタグの間隔",
  "settings.milestoneWords.desc":
    "シーンの累計語数がこの数の倍数を超えた行に、執筆エディターの余白で小さなタグを付けます（例：500 → 500、1k、1.5k…にタグ）。0 でオフ、最小値は 100 です。",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "目標とスプリント",
  "settings.weekStart.name": "週の始まり",
  "settings.weekStart.desc": "週間目標、習慣の記録、ヒートマップで使う週の最初の曜日です。",
  "settings.weekStart.monday": "月曜日",
  "settings.weekStart.sunday": "日曜日",
  "settings.dailyWordGoal.name": "1 日の目標語数",
  "settings.dailyWordGoal.desc": "1 日あたりの目標語数です。ステータスバーと統計に表示されます。",
  "settings.weeklyWordGoal.name": "週間目標語数",
  "settings.weeklyWordGoal.desc": "1 週間あたりの目標語数です（週の始まりから今日まで）。",
  "settings.monthlyWordGoal.name": "月間目標語数",
  "settings.monthlyWordGoal.desc": "1 か月あたりの目標語数です（1 日から今日まで）。",
  "settings.habitDaysPerWeek.name": "習慣：週あたりの日数",
  "settings.habitDaysPerWeek.desc": "1 週間に何日書くことを目指すかです。",
  "settings.habitMinWords.name": "習慣：1 日の最低語数",
  "settings.habitMinWords.desc": "その日を習慣の達成日として数えるのに必要な最低語数です。",
  "settings.defaultSprintMinutes.name": "既定のスプリントの長さ",
  "settings.defaultSprintMinutes.desc": "スプリントの既定の長さ（分）です。",
  "settings.defaultSprintWordGoal.name": "既定のスプリント目標語数",
  "settings.defaultSprintWordGoal.desc": "スプリントダイアログにあらかじめ入る目標語数です。0 で目標なし。",
  "settings.streakThreshold.name": "連続記録の基準",
  "settings.streakThreshold.desc": "執筆の連続記録を伸ばすのに必要な 1 日の最低語数です。",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "目標に数える対象",
  "settings.counts.intro":
    "目標、連続記録、スプリントで数えるのはプロジェクトのノートに書いた分だけで、保管庫のほかの場所にあるノートは数えません。どの種類を数えるかを選んでください。切り替えると、このオプションの導入以降に書いた語数も数え直します。それより前の履歴は常に数えられます。",
  "settings.counts.scene.name": "原稿のシーン",
  "settings.counts.scene.desc": "シーンファイルと単一ノートのプロジェクト、つまり原稿そのものです。",
  "settings.counts.planning.name": "構想ノート",
  "settings.counts.planning.desc": "各プロジェクトの構想ノート（あらすじ、プロットの下準備、幕の構成メモ）です。",
  "settings.counts.codex.name": "設定集のノート",
  "settings.counts.codex.desc": "codex キーを持つノート（人物、場所、世界観など）です。置き場所は問いません。",
  "settings.counts.other.name": "その他のプロジェクトノート",
  "settings.counts.other.desc": "プロジェクトのインデックスノートと、プロジェクトフォルダー内のその他のノートです。",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "フォルダー",
  "settings.baseFolder.name": "ベースフォルダー",
  "settings.baseFolder.desc":
    "新しいプロジェクトと共有の設定集の雛形を作成するフォルダーです。空欄なら保管庫のルートになります。新しく作成する場所を決めるだけなので、保管庫内のほかの場所にある既存のプロジェクトや設定集もそのまま使えます。",
  "settings.baseFolder.placeholder": "（保管庫のルート）",
  "settings.codexFolder.name": "設定集フォルダーの名前",
  "settings.codexFolder.desc": "設定集のノートに使うサブフォルダー名です（共有用とプロジェクトごとの両方）。",
  "settings.coLocateCodex.name": "設定集をプロジェクトと同じ場所に置く",
  "settings.coLocateCodex.desc":
    "本単位の項目はそのプロジェクトの設定集フォルダーに作成し、シリーズ単位と全体共通の項目はベースフォルダーの共有設定集に作成します。整理のためだけの設定で、表示範囲はノートの置き場所ではなく、各項目の「範囲」フィールドで決まります。",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "レイアウト",
  "settings.forceTablet.name": "このデバイスでフルレイアウトを使う",
  "settings.forceTablet.desc":
    "Obsidian はこの画面をスマートフォンサイズと判定しているため、Inkswell はスマートフォン用のレイアウトで表示し、構想と出版は「より大きな画面が必要です」という案内の奥に置いています。タブレットをお使いならオンにしてください。",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "ヘルプ",
  "settings.showHints.name": "状況に応じたヒントを表示",
  "settings.showHints.desc":
    "パネル上部に、閉じられる「使い方」の案内を表示します。閉じたヒントは、下のボタンでリセットするまで表示されません。",
  "settings.resetTips.name": "ヒントをリセットしてウェルカム画面を再表示",
  "settings.resetTips.desc": "閉じたヒントをすべて再表示し、ウェルカム画面ももう一度表示します。",
  "settings.resetTips.done": "ヒントをリセットしました。",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "設定を復元するバックアップの日付…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "構想",
  "feature.group.revision": "推敲",
  "feature.group.publishing": "出版",
  "feature.group.writing": "執筆",
  "feature.beats.label": "ビート",
  "feature.beats.desc": "ビートシートによる構想機能（構想 → ビート）と、そこからのシーンの下書き作成です。",
  "feature.board.label": "ボード",
  "feature.board.desc": "シーンをカンバン形式で並べるボード表示です（構想 → 構成 → ボード）。",
  "feature.plotGrid.label": "プロットグリッド",
  "feature.plotGrid.desc":
    "プロットライン × 章のマトリクス（構想 → 構成 → グリッド）と、シーンの「プロットライン」フィールドです。",
  "feature.audit.label": "推敲チェック",
  "feature.audit.desc": "推敲用のチェックリストと人物アークの追跡です（推敲 → チェック）。",
  "feature.analysis.label": "分析",
  "feature.analysis.desc": "読みやすさ、単語の頻度、繰り返しの分析です（推敲 → 分析）。",
  "feature.checklist.label": "出版チェックリスト",
  "feature.checklist.desc": "自費出版の作業チェックリストです（出版 → チェックリスト）。",
  "feature.launch.label": "発売プランナー",
  "feature.launch.desc": "予約販売のタイムラインと発売準備の管理です（出版 → 発売）。",
  "feature.prompts.label": "執筆プロンプト",
  "feature.prompts.desc": "執筆ツールバーにある、執筆プロンプト／アイデア出し用のボタンです。",
  "feature.stream.label": "シーンストリーム",
  "feature.stream.desc":
    "執筆画面のストリーム表示です。本のシーンを 1 枚の続いたページとして読み書きできます。スマートフォンでは表示されません。",
  "feature.tracking.label": "記録",
  "feature.tracking.desc":
    "目標語数、執筆スプリント、ステータスバーのカウンター、記録ダッシュボードです。非表示の間も語数は記録されるので、オンに戻すと全履歴が表示されます。",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "{label}を非表示",
  "lib.hideMenu.hidden": "{label}を非表示にしました。",
  "lib.hideMenu.notice": "{hidden} {undo} — または カスタマイズ → 機能 でオンに戻せます。",
  "lib.hideMenu.undo": "元に戻す",
  "lib.listEditor.moveUp": "上へ移動",
  "lib.listEditor.moveDown": "下へ移動",
  "lib.phoneRedirect.title": "{surface}にはより大きな画面が必要です",
  "lib.phoneRedirect.body":
    "この表示を使うには、タブレットかパソコンでこのプロジェクトを開いてください。下書きとシーン一覧はスマートフォンでも使えます。",
  "lib.phoneRedirect.useFullLayout": "スマートフォンではない場合：フルレイアウトを使う",
  "lib.rowMenu.more": "その他の操作",
  "lib.images.pickPlaceholder": "保管庫から画像を選択…",
  "lib.relativeTime.justNow": "たった今",
  "lib.relativeTime.minutes.one": "{count}分前",
  "lib.relativeTime.minutes.other": "{count}分前",
  "lib.relativeTime.hours.one": "{count}時間前",
  "lib.relativeTime.hours.other": "{count}時間前",
  "lib.relativeTime.days.one": "{count}日前",
  "lib.relativeTime.days.other": "{count}日前",
  "lib.relativeTime.weeks.one": "{count}週間前",
  "lib.relativeTime.weeks.other": "{count}週間前",
  "lib.relativeTime.months.one": "{count}か月前",
  "lib.relativeTime.months.other": "{count}か月前",
  "lib.relativeTime.years.one": "{count}年前",
  "lib.relativeTime.years.other": "{count}年前",
  "lib.settingsSummary.none": "設定なし",
  "lib.settingsSummary.customTypes.one": "独自の設定集の種類 {count} 件",
  "lib.settingsSummary.customTypes.other": "独自の設定集の種類 {count} 件",
  "lib.settingsSummary.renamedTypes.one": "名前を変更した種類 {count} 件",
  "lib.settingsSummary.renamedTypes.other": "名前を変更した種類 {count} 件",
  "lib.settingsSummary.beatTemplates.one": "ビートテンプレート {count} 件",
  "lib.settingsSummary.beatTemplates.other": "ビートテンプレート {count} 件",
  "lib.settingsSummary.lists.one": "カスタマイズしたリスト {count} 件",
  "lib.settingsSummary.lists.other": "カスタマイズしたリスト {count} 件",
  "lib.settingsSummary.rail": "レールの並び",
  "lib.settingsSummary.challenge": "執筆チャレンジ",
  "lib.settingsSummary.defaults": "既定の設定",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "設定集",
  "customize.group.plan": "構想",
  "customize.group.write": "執筆",
  "customize.group.revise": "推敲",
  "customize.group.publish": "出版",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "設定集の種類と項目",
  "customize.entry.beatTemplates": "ビートテンプレート",
  "customize.entry.sceneTemplate": "シーンテンプレート",
  "customize.entry.sceneStatuses": "シーンのステータス",
  "customize.entry.sceneFields": "シーンインスペクターの項目",
  "customize.entry.writingPrompts": "執筆プロンプト",
  "customize.entry.todoMarkers": "ToDo マーカー",
  "customize.entry.revisionChecklists": "推敲チェックリスト",
  "customize.entry.publishingChecklist": "出版チェックリスト",
  "customize.entry.features": "機能",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "非表示",
  "customize.badge.yours": "自作",
  "customize.hiddenFeature": "この機能は現在非表示です。{link}。",
  "customize.hiddenFeature.link": "「機能」でオンにする",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "組み込み {count}",
  "customize.summary.builtIn.other": "組み込み {count}",
  "customize.summary.yours.one": "自作 {count}",
  "customize.summary.yours.other": "自作 {count}",
  "customize.summary.hidden.one": "非表示 {count}",
  "customize.summary.hidden.other": "非表示 {count}",
  "customize.summary.renamed.one": "名前変更 {count}",
  "customize.summary.renamed.other": "名前変更 {count}",
  "customize.summary.custom.one": "独自 {count}",
  "customize.summary.custom.other": "独自 {count}",
  "customize.summary.reordered": "並べ替え済み",
  "customize.summary.customized": "カスタマイズ済み",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "グループを追加…",
  "list.newGroup": "新しいグループ",
  "list.groupName": "グループ名",
  "list.showGroup": "グループを表示",
  "list.hideGroup": "グループを非表示",
  "list.removeGroup": "グループを削除",
  "list.wasLabel": "旧名「{label}」",
  "list.show": "表示",
  "list.hide": "非表示",
  "list.restoreName": "元の名前に戻す",
  "list.removed": "「{label}」を削除しました。この項目でチェック済みの内容はノートに残ります。",
  "list.resetDefaults": "Inkswell の既定に戻す",
  "list.meta.auditScene": "シーンのチェック項目",
  "list.meta.auditStory": "物語のチェック項目",
  "list.meta.auditChapter": "章のチェック項目",
  "list.meta.auditPage": "文章のチェック項目",
  "list.task.empty": "タスクはまだありません。",
  "list.task.add": "タスクを追加…",
  "list.task.new": "新しいタスク",
  "list.task.aria": "タスク名",
  "list.checkpoint.empty": "チェック項目はまだありません。",
  "list.checkpoint.add": "チェック項目を追加…",
  "list.checkpoint.new": "新しいチェック項目",
  "list.checkpoint.aria": "チェック項目名",
  "list.field.empty": "項目はまだありません。",
  "list.field.add": "項目を追加…",
  "list.field.new": "新しい項目",
  "list.field.aria": "項目名",
  "list.status.empty": "ステータスはまだありません。",
  "list.status.add": "ステータスを追加…",
  "list.status.new": "新しいステータス",
  "list.status.aria": "ステータス名",
  "list.marker.empty": "マーカーはまだありません。",
  "list.marker.add": "マーカーを追加…",
  "list.marker.new": "新しいマーカー",
  "list.marker.aria": "マーカー名",
  "list.prompt.empty": "プロンプトはまだありません。",
  "list.prompt.add": "プロンプトを追加…",
  "list.prompt.new": "新しいプロンプト",
  "list.prompt.aria": "プロンプト名",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "テキスト",
  "customize.fieldKind.textarea": "長文テキスト",
  "customize.fieldKind.number": "数値",
  "customize.fieldKind.date": "日付",
  "customize.fieldKind.list": "リスト",
  "customize.fieldKind.image": "画像",
  "customize.fieldKind.links": "リンク（複数）",
  "customize.fieldKind.link": "リンク（1 件）",
  "customize.fields.startWithLetter": "ラベルは数字や記号ではなく、文字で始めてください。",
  "customize.fields.enterLabel": "ラベルを入力してください。",
  "customize.fields.reserved": "「{key}」は Inkswell が管理しています。",
  "customize.fields.duplicate": "「{key}」はすでに項目として存在します。",
  "customize.fields.badKey": "文字と数字だけを使ってください（スペースや記号は不可）。",
  "customize.fields.createTemplateFailed": "テンプレートノートを作成できませんでした。",
  "customize.fields.saveFailed": "項目を保存できませんでした。",
  "customize.fields.resetFailed": "項目をリセットできませんでした。",
  "customize.fields.labelPlaceholder": "ラベル",
  "customize.fields.labelAria": "{key}のラベル",
  "customize.fields.kindAria": "{key}の種類",
  "customize.fields.anyType": "すべての種類",
  "customize.fields.typeEither": "{first}または{second}",
  "customize.fields.restrictAria": "{key}を特定の種類に限定",
  "customize.fields.perLinkLabels": "リンクごとのラベル",
  "customize.fields.add": "項目を追加…",
  "customize.addField.title": "項目を追加",
  "customize.addField.label": "ラベル",
  "customize.addField.labelPlaceholder": "例：生年月日",
  "customize.addField.kind": "種類",
  "customize.addField.builtin.name": "または Inkswell の組み込み項目を追加",
  "customize.addField.builtin.desc":
    "ラベルと選択機能はそのまま使えます。たとえば、モンスター図鑑で「関係」を借りることもできます。",
  "customize.addField.storedAs": "{key} として保存",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "テンプレートノートを作成",
  "customize.templateBody.loading": "読み込み中…",
  "customize.templateBody.saveFailed": "テンプレートを保存できませんでした。",
  "customize.templateBody.open": "テンプレートノートを開く",
  "customize.templateBody.openAria": "{path} をタブで開く（フロントマターの編集用）",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "設定集の種類ごとに、表示（名前、複数形、アイコン）、設定集パネルで項目が表示するフィールド、新しい項目の初期内容があります。フィールドと初期内容は通常のテンプレートノートに保存されていて、ここで編集するとそのノートが編集されます。",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · {shipped} から名前を変更",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · 独自",
  "customize.codex.entries.one": "{count} 項目",
  "customize.codex.entries.other": "{count} 項目",
  "customize.codex.fieldsFrom": "フィールド：{name}",
  "customize.codex.fieldsShipped": "フィールド：組み込み",
  "customize.codex.editDisplay": "表示を編集…",
  "customize.codex.deleteType": "種類を削除…",
  "customize.codex.newType": "新しい種類…",
  "customize.codex.generate": "初期テンプレートをすべて生成",
  "customize.codex.generateAria":
    "テンプレートノートがないすべての種類に、テンプレートノートを作成します（Scene.md と README も作成）",
  "customize.codex.vaultRoot": "（保管庫のルート）",
  "customize.codex.generateFailed": "初期テンプレートを生成できませんでした。",
  "customize.codex.generated.one": "「{folder}」にテンプレートを {count} 件作成しました。",
  "customize.codex.generated.other": "「{folder}」にテンプレートを {count} 件作成しました。",
  "customize.codex.generatedNone": "テンプレートはすでに存在します。作成するものはありません。",
  "customize.codex.back": "‹ 設定集の種類",
  "customize.codex.gone": "その種類はもう存在しません。",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "表示",
  "customize.codex.card.fields": "フィールド",
  "customize.codex.card.starter": "初期内容",
  "customize.codex.starterHint":
    "新しい項目はこの内容から始まります。{{title}} は項目名に置き換わります。codex: とプロジェクト／シリーズの範囲は Inkswell が自動で追加するので、codex: キーは書かないでください。",
  "customize.codex.starterNone": "テンプレートノートはまだありません。新しい{plural}は見出しだけで始まります。",
  "customize.codex.display.name": "名前",
  "customize.codex.display.plural": "複数形",
  "customize.codex.display.icon": "アイコン",
  "customize.codex.display.shipped": "組み込みの値：{label} / {plural} / {icon}。項目の codex: {id} は変わりません。",
  "customize.codex.display.edit": "編集…",
  "customize.codex.display.reset": "既定に戻す",
  "customize.codex.fieldsSource": "フィールドの出典：{link}。「別名」は常に先頭に来ます。",
  "customize.codex.fieldsSourceShipped":
    "Inkswell の組み込みフィールドを使っています。最初に変更すると、この種類のテンプレートノートが作成され、フィールドはそこに記録されます。「別名」は常に先頭に来ます。",
  "customize.codex.fieldsEmpty": "フィールドはまだありません。下から追加してください。",
  "customize.codex.fieldsReset": "組み込みフィールドに戻す",
  "customize.codex.fieldsResetConfirm":
    "{type}に Inkswell の組み込みフィールドを使いますか？ {template} から codex-fields プロパティを削除します。既存の項目のフロントマターはそのまま残ります。",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "{type}に Inkswell の組み込みフィールドを使いますか？ テンプレートから codex-fields プロパティを削除します。既存の項目のフロントマターはそのまま残ります。",
  "customize.codex.fieldsLabelDesc": "設定集パネルに表示される名前です。保存用のキーはここから作られます。",
  "customize.codex.builtinField.generic": "{label}（独自の種類）",
  "customize.codex.builtinField.type": "{label}（{type}）",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "構想 → ビート で使うビート構成です。組み込みのものは変更できませんが、複製すれば編集できるコピーが手に入ります。自作のテンプレートは、下の順番で選択リストに表示されます。",
  "customize.beats.builtIn": "組み込み",
  "customize.beats.rowDesc.one": "{count} ビート · テンプレート：{id}",
  "customize.beats.rowDesc.other": "{count} ビート · テンプレート：{id}",
  "customize.beats.duplicateAsCustom": "独自テンプレートとして複製",
  "customize.beats.yours": "自作",
  "customize.beats.empty": "自作のテンプレートはまだありません。組み込みのものを複製するか、新しく作成してください。",
  "customize.beats.editBeats": "ビートを編集",
  "customize.beats.duplicate": "複製",
  "customize.beats.newTemplate": "新しいテンプレート…",
  "customize.beats.created": "「{name}」を作成しました。",
  "customize.beats.back": "‹ ビートテンプレート",
  "customize.beats.gone": "そのテンプレートはもう存在しません。",
  "customize.beats.idLine": "テンプレート：{id}",
  "customize.beats.rename": "名前を変更…",
  "customize.beats.pageIntro":
    "ビートは本の中の順番で並んでいます。「位置 %」は、そのビートが原稿のどのあたりに来るかを示します。ビートの名前はキーを兼ねているため、名前を変えると保存済みのメモは新しく始まります（元の名前に戻せば復元できます）。並べ替えや目的の書き換えはいつでも安全に行えます。",
  "customize.beats.noBeats": "ビートはまだありません。",
  "customize.beats.namePlaceholder": "ビート名",
  "customize.beats.nameAria": "ビート名",
  "customize.beats.atAria": "本の中での位置（パーセント）",
  "customize.beats.purposePlaceholder": "目的（任意）",
  "customize.beats.purposeAria": "ビートの目的",
  "customize.beats.needOne": "テンプレートには少なくとも 1 つのビートが必要です。",
  "customize.beats.addBeat": "ビートを追加…",
  "customize.beats.editAsText": "テキストとして編集…",
  "customize.beats.textHelp":
    "1 行に 1 ビートずつ、「名前」「名前 | 目的」「25% | 名前 | 目的」の形式で書きます。「適用」を押すと上のリストが置き換わります。",
  "customize.beats.apply": "適用",
  "customize.beats.addModal.title": "ビートを追加",
  "customize.beats.addModal.name": "名前",
  "customize.beats.addModal.nameDesc": "ビートのキーにもなります（スラッグ化されます）。",
  "customize.beats.addModal.namePlaceholder": "例：ミッドポイント",
  "customize.beats.addModal.purpose": "目的",
  "customize.beats.addModal.purposePlaceholder": "任意の一行説明",
  "customize.beats.nameRequired": "名前は必須です。",
  "customize.beats.nameNeedsChars": "名前には文字か数字を含めてください。",
  "customize.beats.renameModal.title": "テンプレート名を変更",
  "customize.beats.renameModal.name": "名前",
  "customize.beats.renameModal.nameDesc":
    "表示名だけが変わります。テンプレート ID（およびそれを使うすべてのプロジェクト）は変わりません。",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Templates/Scene.md を使用中",
  "customize.sceneTemplate.default": "既定（空のシーン）",
  "customize.sceneTemplate.intro":
    "Inkswell が作成するシーンは、すべてこのノートから始まります。フロントマターと本文がコピーされ、{{title}} はシーン名に置き換わります。このノートがなければ、新しいシーンは空で始まります。",
  "customize.sceneTemplate.projectOwn":
    "アクティブなプロジェクトは独自のテンプレートを使っています：{template}（インデックスノートの sceneTemplate キー）。",
  "customize.sceneTemplate.card": "初期内容",
  "customize.sceneTemplate.hint":
    "{{title}} はシーン名に置き換わります。ここに status: キーを書くと既定のステータスになります（書かなければ新しいシーンは status: idea になります）。Inkswell が自動で入れるあらすじは常に優先されます。",
  "customize.sceneTemplate.none": "テンプレートノートはまだありません（{path}）。新しいシーンは空で始まります。",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "アイデア → 完成（既定）",
  "customize.statuses.intro":
    "ステータスの名前を自分の進め方に合わせて変えたり（「初稿」「仕上げ」「確定」など）、使わないものを非表示にしたり、ボードや選択リストでの並び順を決めたりできます。どの場合もシーンに保存された値は変わらないので、執筆の途中で変更しても安全です。非表示のステータスのシーンは、非表示と明示したうえでそのステータスを表示します。このバージョンでは新しいステータスは追加できません。",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "自作 {count} 件",
  "customize.sceneFields.own.other": "自作 {count} 件",
  "customize.sceneFields.defaults": "すべての項目（既定）",
  "customize.sceneFields.card.layout": "レイアウト",
  "customize.sceneFields.layoutIntro":
    "シーンインスペクターに表示する項目と、その順番を選びます。使わない項目は非表示にでき、アウトラインに沿って下書きするなら「メモ」を上に移すこともできます。「自作の項目」は、下で追加する項目のまとまりです。項目を非表示にしてもここで隠れるだけで、シーンに保存済みの内容は残り、再表示すればすぐに戻ります。",
  "customize.sceneFields.card.own": "自作の項目",
  "customize.sceneFields.ownIntro":
    "自分の執筆スタイルに合わせた項目（Story Grid の「5 つの戒律」、シーンの目標と災難など）を追加すると、すべてのシーンのインスペクターに表示されます。各項目はシーンの通常のプロパティとして保存され、ここで項目を削除しても書いた内容は消えません。",
  "customize.sceneFields.storedIn": "{link} に保存されています（すべてのプロジェクトで共通）。",
  "customize.sceneFields.firstCreates":
    "最初の項目を追加すると、シーンテンプレートノートが作成され、項目はそこに記録されます。",
  "customize.sceneFields.empty": "自作の項目はまだありません。",
  "customize.sceneFields.reset": "自作の項目をすべて削除",
  "customize.sceneFields.resetConfirm":
    "自作の項目をすべて削除しますか？ {template} から {key} プロパティを削除します。シーンに保存済みの値はそのまま残ります。",
  "customize.sceneFields.resetConfirmNoTemplate":
    "自作の項目をすべて削除しますか？ シーンテンプレートから {key} プロパティを削除します。シーンに保存済みの値はそのまま残ります。",
  "customize.sceneFields.labelDesc":
    "シーンインスペクターに表示される名前です。保存用のプロパティ名はここから作られます。",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "執筆ツールバーの「プロンプト」ボタンで出てくるプロンプトです。二度と見たくないものは非表示に、どれでも書き換えたり、自作のものを追加したりできます。シーンの視点人物の名前を入れたい箇所には {pov} と書いてください。各プロンプトには段階（下書き／推敲）と、ボタンで絞り込むためのカテゴリーがあり、組み込みのものも含めてどちらも変更できます。",
  "customize.prompts.phase.draft": "下書き",
  "customize.prompts.phase.revise": "推敲",
  "customize.prompts.phaseAria": "段階",
  "customize.prompts.categoryAria": "カテゴリー",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "あとで戻ってくるために本文に置いておく目印です（[TODO: …]、[RESEARCH: …] など）。推敲 → 推敲ログ で一覧できます。コンパイルするとすべて取り除かれます。別の単語を使いたい場合は、自作のマーカーを追加してください（必要なら組み込みのものは非表示に）。マーカーを非表示にしても「挿入」メニューから消えるだけで、シーンにすでにあるマーカーは引き続き検出され、コンパイル時に取り除かれます。",
  "customize.markers.wordPrompt": "シーンに入力する単語（例：CHECK）",
  "customize.markers.invalidWord":
    "マーカーの単語は英字で始まり、2〜20 文字の英字・数字・ハイフンで構成してください。",
  "customize.markers.taken": "[{keyword}] はすでにマーカーとして存在します。",
  "customize.markers.inactive": "使用済みの単語 — 無効",
  "customize.markers.removeConfirm":
    "「{label}」を削除しますか？ シーンにすでに [{keyword}: …] と書かれたマーカーは、推敲ログで検出されなくなり、コンパイル時にも取り除かれません。使い続けたい場合は、削除ではなく非表示にしてください。",
  "customize.markers.removed":
    "「{label}」を削除しました。[{keyword}: …] マーカーは通常のテキストとしてシーンに残ります。",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks}（既定）",
  "customize.publishing.phases.one": "{count} 段階",
  "customize.publishing.phases.other": "{count} 段階",
  "customize.publishing.tasks.one": "{count} タスク",
  "customize.publishing.tasks.other": "{count} タスク",
  "customize.publishing.intro":
    "出版 → チェックリスト を段階ごとに編集します。自分の出版ルートに関係のない段階やタスクは非表示にでき、名前の変更、並べ替え、自作の追加もできます。チェックはプロジェクトごとにタスクの ID で保存されるので、非表示にしたり名前を変えたりしても、チェック済みの内容は失われません。",
  "customize.publishing.optional": "任意",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "すべて表示中",
  "customize.features.hidden": "{total} 件中 {count} 件を非表示",
  "customize.features.intro":
    "使わない画面を非表示にして、Inkswell をすっきりさせましょう。非表示にしても隠れるだけで、ノートやデータは残り、機能をオンに戻せばすべて元どおりになります。アプリ内のどこでも、任意のタブを右クリックして非表示にすることもできます。",
};
