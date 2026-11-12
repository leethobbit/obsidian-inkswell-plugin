/** Japanese UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Inkswell 執筆エディター",
  "app.ribbon": "Inkswell プロジェクト",
  "app.recovered":
    "Inkswell はデータファイルを読み込めなかったため、{date}のバックアップから設定と執筆履歴を読み込みました。その日以降の変更は失われている可能性があります。",
  "app.recoveredKept":
    "Inkswell はデータファイルを読み込めなかったため、{date}のバックアップから設定と執筆履歴を読み込みました。その日以降の変更は失われている可能性があります。読み込めなかったファイルは {file} として残してあります。",
  "app.categoryNotice":
    "Inkswell の目標は、プロジェクトの語数だけを数えるようになりました。数える対象（シーン、構想、設定集）は 設定 → Inkswell で選べます。",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "プロジェクトを開く",
  "app.command.newProject": "新規プロジェクト",
  "app.command.renameProject": "プロジェクト名を変更",
  "app.command.archiveProject": "現在のプロジェクトをアーカイブ",
  "app.command.unarchiveProject": "現在のプロジェクトのアーカイブを解除",
  "app.command.setUpChallenge": "執筆チャレンジを設定",
  "app.command.exportStoryBible": "設定資料集を書き出す",
  "app.command.newScene": "新規シーン",
  "app.command.sortByChapter": "シーンを章番号順に並べ替え",
  "app.command.openBeats": "ビートシートを開く（構想）",
  "app.command.openBoard": "ボードを開く（構想）",
  "app.command.openPlotGrid": "プロットグリッドを開く（構想）",
  "app.command.openCodex": "設定集を開く",
  "app.command.openWrite": "執筆を開く",
  "app.command.openStats": "執筆統計を開く（記録）",
  "app.command.openCompile": "コンパイルを開く（出版）",
  "app.command.compileActive": "アクティブなプロジェクトをコンパイル",
  "app.command.searchScenes": "シーンを検索",
  "app.command.insertTodo": "ToDo マーカーを挿入…",
  "app.command.toggleBold": "太字の切り替え（執筆エディター）",
  "app.command.toggleItalic": "斜体の切り替え（執筆エディター）",
  "app.command.toggleStrikethrough": "取り消し線の切り替え（執筆エディター）",
  "app.command.splitScene": "カーソル位置でシーンを分割（執筆エディター）",
  "app.command.toggleStream": "シーンストリームの切り替え（執筆）",
  "app.command.jumpToChapter": "章へ移動…（シーンストリーム）",
  "app.command.nextChapter": "次の章（シーンストリーム）",
  "app.command.previousChapter": "前の章（シーンストリーム）",
  "app.command.moveSelection": "選択範囲を新規シーンへ移動（執筆エディター）",
  "app.command.quickCodex": "選択範囲から設定集の項目を作成（執筆エディター）",
  "app.command.openLink": "カーソル位置のリンクを開く（執筆エディター）",
  "app.command.toggleTypewriter": "タイプライターモードの切り替え（執筆エディター）",
  "app.typewriterOn": "タイプライターモード：オン",
  "app.typewriterOff": "タイプライターモード：オフ",
  "app.command.startSprint": "執筆スプリントを開始",
  "app.command.endSprint": "現在のスプリントを今すぐ終了",
  "app.command.cancelSprint": "現在のスプリントをキャンセル",
  "app.command.setWordTarget": "アクティブなプロジェクトの目標語数を設定",
  "app.command.logRevision": "推敲の決定を記録",
  "app.notInProject": "アクティブなファイルは Inkswell のプロジェクトに含まれていません。",
  "app.command.openRevisions": "推敲ログを開く",
  "app.command.openAnalysis": "分析を開く（推敲）",
  "app.command.openHelp": "ヘルプを開く",
  "app.command.openCustomize": "カスタマイズを開く",
  "app.command.restoreSettings": "バックアップから設定を復元",
  "app.command.manageFeatures": "機能を管理",
  "app.command.quickCapture": "アイデアをすばやくメモ",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell のバックアップはまだありません。Obsidian を開いた日ごとに 1 つ作成されます。",
  "app.settingsRestored":
    "{date}のバックアップから設定を復元しました。執筆履歴とアイデアは変更されていません。",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "クイックメモ",
  "app.capture.cta": "メモする",
  "app.capture.done": "アイデアをメモしました。",
  "app.idea.saveFailed": "アイデアをノートとして保存できませんでした。",
  "app.idea.saved": "{path} に保存しました",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "コンパイルするアクティブなプロジェクトがありません。先に Inkswell でプロジェクトを開いてください。",
  "app.archive.archived": "「{title}」をアーカイブしました。ホームの「アーカイブ済み」にあります。",
  "app.archive.restored": "「{title}」をホームに戻しました。",
  "app.archive.seriesArchived": "シリーズ「{name}」をアーカイブしました。ホームの「アーカイブ済み」にあります。",
  "app.archive.seriesRestored": "シリーズ「{name}」をホームに戻しました。",
  "app.noProject": "Inkswell のプロジェクトが見つかりません。「新規プロジェクト」コマンドで作成してください。",
};
