/** German UI strings — the `help` area (mirrors ../en/help.ts). */
import type { Catalog } from "../types";

export const help: Catalog = {
  // --- Topic: write ---
  "help.write.title": "So funktionieren Schreiben & To-do-Markierungen",
  "help.write.columns": "Schreiben ist ein konzentrierter Editor: Wähle links eine Szene, schreib in der Mitte und behalte rechts in der Spalte, was du brauchst. Diese Spalte hat vier Tabs – Szene (Details der aktuellen Szene), Codex (wer und was darin vorkommt), Planen (die Szenen und Beats dieses Kapitels und deine Planungsnotiz) und Überarbeitungsprotokoll (die offenen To-do-Markierungen und festgehaltenen Überarbeitungsentscheidungen dieses Projekts, die aktuelle Szene zuerst – klicke auf eine Markierung, um dorthin zu springen). Änderungen werden gespeichert, wenn ein Feld den Fokus verliert und wenn du die Szene wechselst – nie mitten beim Tippen.",
  "help.write.room": "Schaff Platz für die Seite: Die Schaltflächen an beiden Enden der Werkzeugleiste blenden die Szenenliste und die rechte Spalte aus, und mit der Linie neben der Spalte kannst du ihre Breite ziehen. Fokus (die Schaltfläche mit den Pfeilen) blendet alles außer Editor und Werkzeugleiste aus; ein zweiter Klick holt alles zurück. Die Notiz „Als Nächstes“ klappst du mit dem Pfeil an ihrem Ende ein. Ein Rechtsklick in den Text bietet Formatierung, Nachschlagen im Codex, Szene teilen und Überarbeitungsentscheidung festhalten.",
  "help.write.stream": "Schalte oben in Schreiben von „Szene“ auf „Fluss“ (nicht auf Smartphones), um das ganze Buch als eine Seite in der richtigen Reihenfolge zu sehen. Klicke irgendwo hinein, um die Szene direkt dort zu bearbeiten; mit den Pfeiltasten geht es nahtlos in die nächste Szene. Springe über das Menü oben oder die Kapitelnamen links zwischen den Kapiteln und beschränke die Seite auf ein Kapitel, einen POV, einen Handlungsstrang, eine Figur oder einen Status. Jede Szene wird weiterhin in ihrer eigenen Notiz gespeichert.",
  "help.write.markers": "Unterbrich dich nicht, um zu recherchieren oder eine schwierige Stelle zu perfektionieren. Setz eine Markierung in eckigen Klammern und schreib weiter – sie werden im Editor hervorgehoben und später unter Überarbeiten → Protokoll eingesammelt. Groß- und Kleinschreibung des Schlüsselworts spielen keine Rolle, und der Teil „: Text“ ist optional.",
  "help.write.markerPicker": "Führe „To-do-Markierung einfügen …“ aus, um eine Auswahl zu öffnen, die eine Markierung am Cursor einfügt.",
  "help.write.peek": "Prüfe ein Detail, ohne die Seite zu verlassen: Halte Strg (auf dem Mac Cmd) gedrückt und zeige im Text auf den Namen einer Figur oder eines Ortes, um seine Codex-Karte zu sehen. Fahre über einen Namen in der Szenenspalte oder tippe darauf, um dieselbe Karte zu sehen, oder führe „Im Codex nachschlagen“ aus (auch im Kontextmenü). Esc schließt die Karte, und dein Cursor bleibt, wo er war.",
  "help.write.companions": "Behalte beim Schreiben Dinge neben dir im Blick: Klicke in der linken Leiste mit der rechten Maustaste auf Codex, Planen, Fortschritt oder Start und wähle „In Seitenleiste öffnen“, oder führe „Begleitansicht in der Seitenleiste öffnen …“ aus. Begleitansichten folgen der Szene, an der du schreibst: Codex listet, wer und was darin vorkommt, Planen zeigt die Szenen, Synopsen und Beats dieses Kapitels samt deiner Planungsnotiz, Szenen ist die ganze Gliederung, und das Überarbeitungsprotokoll listet, was in dieser Szene noch offen ist. Zieh sie, wohin du willst; Obsidian merkt es sich. Ein Klick auf eine Szene dort öffnet sie in Schreiben – oder in einem normalen Tab, wenn du das in den Einstellungen wählst.",
  "help.write.customMarkers": "Du willst ein eigenes Wort, etwa [CHECK: ] oder [TK: ]? Füge es unter Anpassen → To-do-Markierungen hinzu; dort kannst du auch die integrierten ausblenden.",

  // --- Topic: track/sync ---
  "help.sync.title": "Du schreibst auf mehr als einem Gerät?",
  "help.sync.body": "Wörter werden auf dem Gerät gezählt, auf dem du sie tippst, daher kennt dieses Dashboard nur dieses Gerät. Damit Serien und Summen alle Geräte einschließen, schalte unter Einstellungen → Inkswell „Schreibverlauf zwischen Geräten synchronisieren“ ein. Inkswell führt dann pro Gerät eine kleine Protokollnotiz im Ordner „Writing log“ deines Basisordners und führt sie hier zusammen – die Synchronisierung deines Tresors (Obsidian Sync, iCloud, …) überträgt die Notizen.",

  // --- Topic: plan/beats ---
  "help.beats.title": "So funktioniert das Beat Sheet",
  "help.beats.intro": "Eine Strukturgliederung für das aktive Projekt, aufgebaut aus einer Beat-Vorlage, die du im Auswahlmenü „Vorlage“ wählst. Acht sind enthalten:",
  "help.beats.template.saveTheCat": "Save the Cat (15 Beats)",
  "help.beats.template.threeAct": "Drei-Akt-Struktur (7)",
  "help.beats.template.herosJourney": "Heldenreise (12)",
  "help.beats.template.sevenPoint": "Sieben-Punkte-Struktur (7)",
  "help.beats.template.storyCircle": "Story Circle (8)",
  "help.beats.template.romancingTheBeat": "Romancing the Beat (14)",
  "help.beats.template.twentySevenChapter": "27 Kapitel (27)",
  "help.beats.template.tenPoint": "Zehn-Punkte-Gliederung (10) – liste die zehn Dinge auf, die in deiner Geschichte passieren müssen",
  "help.beats.custom": "Du kannst unter Anpassen → Beat-Vorlagen auch eigene Strukturen hinzufügen – sie erscheinen im Auswahlmenü neben den integrierten.",
  "help.beats.perBeat": "Jeder Beat hat einen Zweck, eine Planungsnotiz, optional eine verknüpfte Szene und einen Erledigt-Schalter; der Balken oben zeigt, wie viele fertig sind. Du kannst die Vorlage jederzeit wechseln – jede behält ihre eigenen Notizen und Verknüpfungen, sodass nichts verloren geht, wenn du zurückwechselst.",
  "help.beats.tip.inline": "Tippe direkt in die Planungsnotiz eines Beats – sie steht im Beat Sheet selbst, nicht in einer eigenen Datei.",
  "help.beats.tip.link": "Verknüpfe einen Beat mit der Szene, die ihn umsetzt, damit Planen und Schreiben im Einklang bleiben.",
  "help.beats.tip.scaffold": "„Struktur anlegen“ erzeugt in einem Schritt Szenengerüste für alle nicht verknüpften Beats.",

  // --- Topic: plan/board ---
  "help.board.title": "So funktioniert das Board",
  "help.board.groupBy": "Eine Kanban-Ansicht deiner Szenen. Mit „Gruppieren nach“ ordnest du die Spalten nach Status, Akt, Kapitel oder POV.",
  "help.board.drag": "Zieh eine Karte in eine andere Spalte, um den Wert der Szene zu ändern (z. B. von „Rohfassung“ zu „Überarbeitet“). Ein Klick auf eine Karte öffnet die Szene; ein Rechtsklick (oder die Schaltfläche ⋯) bietet Umbenennen, Bearbeiten und Löschen. Die Kartenfarbe kommt aus dem Farbfeld der Szene.",

  // --- Topic: plan/grid ---
  "help.grid.title": "So funktioniert das Plot-Raster",
  "help.grid.matrix": "Eine Matrix aus Handlungssträngen × Kapiteln, um Nebenhandlungen und Bögen zu verfolgen. Spalten sind deine Handlungsstränge, Zeilen deine Kapitel; jede Zelle zeigt die Szenen, die diesen Handlungsstrang dort voranbringen. Die Zellen sind deine echten Szenen – das Raster wird aus dem Frontmatter der Szenen abgeleitet, passt also immer zum Manuskript, und eine leere Strecke in einer Spalte ist ein Hinweis aufs Tempo, keine Lücke in der Buchführung.",
  "help.grid.cells": "Klicke auf das + einer Zelle, um eine bestehende Szene zu taggen oder direkt dort ein Szenengerüst (Status „Idee“) anzulegen – so planst du einen Beat, den du noch nicht geschrieben hast. Klappe eine Kapitelzeile aus, um die Zugehörigkeit jeder Szene ohne Ziehen umzuschalten. Zieh ein Kärtchen in eine andere Zelle, um es zwischen Handlungssträngen oder Kapiteln zu verschieben; eine Szene kann zu mehreren Handlungssträngen gleichzeitig gehören.",
  "help.grid.tip.plotlines": "Verwalte Handlungsstränge über die Spaltenköpfe: umbenennen (aktualisiert jede getaggte Szene), umfärben, umsortieren, fokussieren oder löschen.",
  "help.grid.tip.compact": "Dickes Buch? Der Kompaktmodus zeigt Zellen als farbige Punkte (bei großen Rastern automatisch), und Aktzeilen klappen zu Zählern pro Spalte zusammen.",
  "help.grid.tip.untracked": "Tags, die zu keinem Handlungsstrang passen, erscheinen als Spalten mit dem Zusatz „nicht erfasst“ – übernimm sie in deine Liste oder entferne sie aus allen Szenen.",

  // --- Topic: plan/outline ---
  "help.outline.title": "So funktioniert die Gliederung",
  "help.outline.tree": "Die Baumansicht von Struktur: Gliedere dein Buch in Akte, die Kapitel enthalten, die Szenen enthalten. Zieh eine Szene in ein Kapitel (oder ein Kapitel in einen Akt) und lass sie über oder unter einer Zeile los, um umzusortieren. Dieser Baum ist maßgeblich – seine Anordnung legt auch die Lesereihenfolge des Manuskripts fest, sodass die Szenen eines Kapitels zusammenbleiben. Klicke mit der rechten Maustaste auf eine Szene (oder tippe auf ⋯), um sie umzubenennen, ihre Details oder Synopsis zu bearbeiten oder sie in ein anderes Kapitel zu verschieben. Die Ansichten Board und Raster (oben im Tab) zeigen dieselben Szenen auf andere Weise.",
  "help.outline.order": "Struktur steht in Planen mit Absicht an letzter Stelle. Der übliche Weg: Skizziere zuerst deine Beats, leite daraus Szenen ab und schreibe sie in Schreiben – die Struktur kann warten. Sobald du echte Szenen hast, komm hierher zurück, um sie in Akte und Kapitel zu gliedern.",
  "help.outline.tip.nesting": "Verschachteln ist optional – eine Szene kann außerhalb jedes Kapitels stehen und ein Kapitel außerhalb jedes Akts (die Bereiche „Kapitel ohne Akt“ / „Nicht zugeordnete Szenen“).",
  "help.outline.tip.targets": "Gib einem Kapitel ein Wortziel, um seinen Fortschritt zu verfolgen; dieselben Ziele erscheinen unter Fortschritt.",
  "help.outline.tip.open": "Klicke auf eine Szene, um sie in Schreiben zu öffnen; über das ⋯-Menü (oder Rechtsklick) kannst du sie umbenennen, verschieben oder löschen.",

  // --- Topic: codex ---
  "help.codex.title": "So funktioniert der Codex",
  "help.codex.intro": "Deine Story-Bibel: Figuren, Orte, Fraktionen, Gegenstände, Ereignisse und Konzepte, jeweils mit einem strukturierten Profil, das automatisch im Frontmatter der Notiz gespeichert wird.",
  "help.codex.scopeIntro": "Jeder Eintrag hat einen Geltungsbereich, der bestimmt, wo er erscheint:",
  "help.codex.scope.global": "Global (Standard) – in jedem Projekt verfügbar.",
  "help.codex.scope.project": "Projekt – setze codex-project in der Notiz; nur dieses Buch sieht den Eintrag. Klicke unter „Geltungsbereich“ auf „Ändern …“, wähle „Bücher“ und hake die Bücher an, um einen Eintrag mit einigen Büchern einer Reihe zu teilen, ohne ihn für die ganze Reihe freizugeben.",
  "help.codex.scope.series": "Reihe – setze codex-series; gemeinsam für alle Bücher einer Reihe.",
  "help.codex.pins": "Hefte deine Hauptfiguren an: Klicke mit der rechten Maustaste auf einen Eintrag (oder tippe auf ⋯) und wähle „In diesem Buch anheften“. Angeheftete Einträge stehen in ihrer Gruppe oben, mit einer Pinnadel markiert, und erscheinen zuerst, wenn du in Schreiben [[ tippst. Anheftungen gehören zum geöffneten Buch, daher kann eine Figur einer Reihe in einem Buch angeheftet sein und im nächsten nicht. Das Suchfeld durchsucht auch die Rolle einer Figur und die Art eines Ortes oder Gegenstands: Tippe „antag“, um deine Antagonisten zu finden.",
  "help.codex.appearsIn": "Die Liste „Kommt vor in“ jedes Eintrags aktualisiert sich selbst: Sie zeigt jede Szene, deren Text den Eintrag mit Namen oder Alias erwähnt, plus jede Szene, die ihn in ihren Metadaten verknüpft (Figuren, Ort, POV), für jede Kategorie – ein neuer Eintrag findet seine Szenen also ganz ohne Taggen. Gefüllte Kärtchen sind verknüpfte Szenen (du hast den Eintrag dort eingetragen); umrandete sind reine Erwähnungen im Text (jemand spricht über ihn). Die Zeile pro Buch zählt beides, plus POV-Szenen.",
  "help.codex.places": "Orte lassen sich verschachteln: Setze „Liegt in“ eines Ortes auf eine Welt oder einen anderen Ort, und die Liste der Orte zeigt sie als Baum (Welt › Region › Stadt). Bei einer Welt oder einem Ort erstellt „Neuer Ort darin …“ einen Ort, der schon richtig eingeordnet ist und denselben Geltungsbereich hat.",
  "help.codex.links": "Links führen irgendwohin: Klicke in einem Linkfeld (Beziehungen, Verbündete …) auf einen Namen, um diesen Eintrag zu öffnen, oder auf den Pfeil neben einer Einzelauswahl wie „Besitzer“. Strg/Cmd-Klick öffnet die Notiz stattdessen in einem neuen Tab. „Verknüpfte Dateien“ listet, worauf die Notiz des Eintrags außerhalb des Codex verlinkt (ein Moodboard-Canvas, ein PDF, eine Recherchenotiz), plus jedes Canvas, das die Karte des Eintrags enthält. Füge einen Link wie [[Moodboard.canvas]] in den Text der Notiz oder in eine Eigenschaft ein; ein Link auf ein Canvas oder PDF braucht die Dateiendung.",
  "help.codex.portraits": "Ein Bild, das du als Porträt eines Eintrags hochlädst, wird dort gespeichert, wo Obsidian neue Anhänge ablegt (Einstellungen → Dateien & Links → Standardspeicherort für neue Anhänge). Wähle „In Unterordner unter aktuellem Ordner“, um die Bilder jedes Eintrags in einem Ordner daneben zu sammeln.",

  // --- Topic: revise/audit ---
  "help.audit.title": "So funktioniert die Überarbeitungsprüfung",
  "help.audit.intro": "Gestufte Checklisten, die eine Fassung vom Rohzustand zum fertigen Text bringen, vom Großen zum Kleinen:",
  "help.audit.tier.story": "Geschichte – 18 Prüfpunkte für das ganze Manuskript (im Projekt gespeichert).",
  "help.audit.tier.chapters": "Kapitel – 10 Prüfungen pro Kapitel: Verdient es seinen Platz, hat es einen Aufhänger, bringt es die Geschichte voran, endet es mit einem Sog? (Im Projekt gespeichert; erscheint, sobald dein Buch Kapitel hat.)",
  "help.audit.tier.scene": "Szene – ein Durchgang mit 14 Punkten pro Szene (im Frontmatter jeder Szene gespeichert).",
  "help.audit.tier.prose": "Text – 32 Prüfungen auf Satzebene, gruppiert.",
  "help.audit.customize": "Prüfpunkte umbenennen, umsortieren, ausblenden oder hinzufügen kannst du unter Anpassen → Überarbeitungs-Checklisten.",
  "help.audit.opening": "Der Durchgang pro Szene stuft jeden Szenenanfang automatisch ein (Handlung / Dialog / Gedanke / Reflexion) – überschreibe die Einstufung, wenn sie falsch ist. Klicke auf eine Szene, um ihre Checkliste aufzuklappen und direkt zu bearbeiten, oder springe in Schreiben zu ihr.",

  // --- Topic: revise/todos ---
  "help.todos.title": "So funktioniert das Überarbeitungsprotokoll",
  "help.todos.intro": "Alles, was noch zu überarbeiten ist, in einer nach Szenen gruppierten Liste: die Markierungen in eckigen Klammern, die du beim Schreiben gesetzt hast, und die Überarbeitungsentscheidungen, die du unterwegs festgehalten hast. Mit den Filterchips filterst du nach Art der Markierung oder der Entscheidung.",
  "help.todos.jump": "Klicke auf eine Markierung, um in Schreiben direkt zu dieser Stelle zu springen – sie blinkt kurz auf, damit du sie schnell erledigen kannst; bearbeite den Text, um sie zu entfernen, und die Liste aktualisiert sich beim nächsten Durchsuchen.",
  "help.todos.decisions": "Entscheidungen sind Festlegungen auf Ebene der Geschichte („ab jetzt ist der Bruder tot“): Halte eine mit „Entscheidung festhalten“ fest, gib ihr eine Art und verknüpfe sie mit einer Szene oder dem ganzen Projekt. Hake sie als umgesetzt ab, sobald du die Änderung vorgenommen hast; klicke auf ihren Text, um sie zu bearbeiten. Für Rechercheprobleme und fehlende Szenen ist eine [RESEARCH: ]- oder [SCENE: ]-Markierung besser – sie markiert die genaue Stelle im Text.",

  // --- Topic: search ---
  "help.search.title": "So funktioniert die Suche",
  "help.search.scope": "Volltextsuche im Text deiner Szenen und in ihren Synopsen. Wähle einen Bereich – diese Fassung, die ganze Geschichte, die Reihe oder den ganzen Tresor – und grenze mit den Metadatenfiltern ein (Status, POV, Kapitel, Handlungsstrang, Figur).",
  "help.search.results": "Die Ergebnisse sind nach Szenen gruppiert. Klicke auf einen Treffer, um in Schreiben direkt dorthin zu springen; er blinkt kurz auf, damit du ihn schnell findest. Ein Treffer in der Synopsis öffnet die Szene ohne Aufblinken (die Synopsis gehört nicht zum bearbeitbaren Text). Setze nur einen Filter ohne Suchbegriff, um alle passenden Szenen aufzulisten – ein schneller, strukturierter Finder.",
  "help.search.matching": "Die Suche ist wörtlich (keine Platzhalter oder regulären Ausdrücke), optional mit den Schaltern „Groß-/Kleinschreibung“ und „Ganzes Wort“; archivierte Szenen werden nur einbezogen, wenn du „Archivierte einbeziehen“ anhakst.",

  // --- Topic: publish/compile ---
  "help.compile.title": "So funktioniert das Kompilieren",
  "help.compile.formats": "Füge die Szenen des aktiven Projekts zu einer Manuskriptdatei zusammen. Wähle ein Format – Markdown, HTML, Word oder PDF/EPUB über Pandoc –, lege den Namen der Ausgabedatei fest und kompiliere.",
  "help.compile.docx": "Word (.docx) ist integriert und funktioniert auf jedem Gerät. Es erzeugt ein Standard-Manuskript: doppelter Zeilenabstand, eingerückte Absätze, Kapitel auf neuer Seite, ein Titelblatt mit deinem Namen und der Wortzahl und eine Kopfzeile. Trage deinen Namen und deine Kontaktdaten unter Einstellungen → Inkswell → Manuskript ein; Pseudonym und Nachnamen für die Kopfzeile legst du pro Buch unter dem Format fest.",
  "help.compile.steps": "Der Ablauf besteht aus Schritten, die du ein- und ausschalten kannst: Schritte pro Szene (To-do-Markierungen entfernen – auch deine eigenen –, Metadaten herausfiltern) und Schritte fürs ganze Manuskript (Überschriften, Seitenumbrüche, Leerzeilen aufräumen). Deine Auswahl wird pro Projekt gespeichert.",

  // --- Topic: customize ---
  "help.customize.title": "So funktioniert Anpassen",
  "help.customize.intro": "Anpassen verändert die GESTALT von Inkswell – welche Codex-Typen es gibt und welche Felder jeder zeigt, womit ein neuer Eintrag oder eine neue Szene beginnt, Beat-Strukturen, Szenenstatus, Schreibimpulse, die Checklisten für Überarbeitung und Veröffentlichung und welche optionalen Funktionen angezeigt werden. Vorlieben (Ziele, Verhalten des Editors, Ordner) bleiben in den Einstellungen.",
  "help.customize.tip.sections": "Wähle links einen Abschnitt und bearbeite ihn rechts. Änderungen werden sofort gespeichert.",
  "help.customize.tip.templates": "Codex-Felder und Startinhalte stehen in gewöhnlichen Vorlagennotizen im Ordner „Templates“ deines Basisordners – wenn du hier etwas bearbeitest, bearbeitest du diese Notizen, und du kannst sie weiterhin direkt öffnen.",
  "help.customize.tip.lossless": "Integrierte Elemente werden nie gelöscht: Ausblenden geht ohne Verlust, Umbenennen behält die gespeicherte ID, und jeder Abschnitt lässt sich auf den Inkswell-Standard zurücksetzen.",
  "help.customize.tip.ownItems": "Deine eigenen Elemente (ein eigener Typ, ein Checklistenpunkt, ein Impuls) stehen in der data.json des Plugins und wandern mit dem Konfigurationsordner deines Tresors mit.",

  // --- Help index section: home ---
  "help.section.home.phase": "Start",
  "help.section.home.summary": "Deine Bücher in Regalen, der Szenenbaum eines Buchs und ein Eingang für Geschichtenideen.",
  "help.home.hub": "Deine Zentrale. „Alle Projekte“ zeigt deine Bücher als Karten in Regalen – ein Regal pro Reihe, in Bandreihenfolge, plus eines für Einzeltitel –, jeweils mit Cover (oder einem erzeugten Platzhalter), Bandnummer, Szenen und Wörtern, Fortschritt zum Ziel und dem Zeitpunkt deiner letzten Bearbeitung. Klicke auf eine Karte, um dich auf dieses Buch zu konzentrieren; über ihr ⋯-Menü (auf dem Computer beim Darüberfahren, auf Touchgeräten immer sichtbar) kannst du es umbenennen, seine Reihe festlegen, das Cover ändern oder es archivieren.",
  "help.home.archive": "Ein fertiges oder auf Eis gelegtes Buch zu archivieren, räumt es nur aus dem Blickfeld: Es verschwindet aus den Regalen und der Projektliste und wartet im Bereich „Archiviert“ unten auf Start. Seine Wörter zählen weiter für deine Ziele, und es lässt sich wie zuvor kompilieren und behält seinen Codex. Zurückholen kannst du es über sein ⋯-Menü. In einer Reihe bleibt ein archiviertes Buch abgeblendet im Regal – oder schalte in den Einstellungen „Archivierte Bücher in ihrer Reihe ausblenden“ ein, um es ganz aus dem Regal der Reihe zu nehmen.",
  "help.home.focused": "Ein ausgewähltes Buch zeigt die große Karte (Cover, Logline, Thema, Ziel), eine Leiste mit den anderen Covern seiner Reihe (klicke auf eines, um zu wechseln) und seinen Szenenbaum; zieh Szenenzeilen zum Umsortieren oder nutze das ⋯-Menü zum Verschieben, Umbenennen oder Löschen. Der Inspektor rechts bearbeitet die Metadaten der ausgewählten Szene.",
  "help.home.ideas": "Halte Geschichtenideen im Eingang unter den Regalen fest, ohne die Seite zu verlassen – Eingabe speichert. Klicke auf eine Idee, um sie direkt zu bearbeiten; über ihr ⋯-/Kontextmenü kannst du sie kopieren, als Notiz im Ordner „Ideas“ deines Basisordners speichern (und aus dem Eingang entfernen), oben anheften oder löschen. Ein Klick auf die Überschrift „Ideen“ klappt den Bereich ein.",
  "help.home.seriesHeading": "Reihen",
  "help.home.seriesAdd": "Eine Reihe ist eine Gruppe von Büchern mit einem gemeinsamen Namen – keine zusätzliche Notiz, nur ein Tag an jedem Buch. Füge ein Buch über sein ⋯-/Kontextmenü („Reihe …“) oder über die Reihenzeile unter dem Titel auf seiner großen Karte einer Reihe hinzu: Wähle eine bestehende Reihe oder beginne eine neue und lege die Bandnummer fest (standardmäßig die nächste freie). „Neues Projekt“ hat dieselben Felder, sodass ein Buch direkt in einer Reihe angelegt werden kann.",
  "help.home.seriesManage": "Das ⋯-/Kontextmenü im Kopf einer Reihe verwaltet die ganze Reihe: „Neues Buch in dieser Reihe“, „Bestehendes Projekt hinzufügen“, „Reihe umbenennen“ (alle Bücher und alle Codex-Einträge der Reihe ziehen mit) und „Bücher umsortieren“ (ziehen, dann nummeriert Speichern neu: 1, 2, 3 …).",

  // --- Help index section: plan ---
  "help.section.plan.phase": "Planen",
  "help.section.plan.summary": "Überblicksfelder, das Beat Sheet und Struktur (Gliederungsbaum, Board und Plot-Raster).",
  "help.plan.overview": "Überblick enthält Felder für den ganzen Roman (Logline, Thema, Genre) und längere Texte (Synopsis, Skizze in drei Akten). Beats ist das Beat Sheet. Struktur vereint Gliederungsbaum, Kanban-Board und Plot-Raster hinter einem Umschalter Baum | Board | Raster – drei Ansichten derselben Szenen. Alle werden unten ausführlich beschrieben.",
  "help.plan.sortByChapter": "Du übernimmst ein nummeriertes Manuskript, dessen Szenen durcheinandergeraten sind? Struktur → Baum hat eine Schaltfläche „Nach Kapitel sortieren“ (auch im ⋯-Menü eines Buchs auf Start und als Befehl „Szenen nach Kapitelnummer sortieren“): Sie sortiert das Manuskript einmalig nach der Nummer im Kapitelnamen jeder Szene – Ziffern oder ausgeschrieben – und lässt Szenen ohne Nummer in ihrer bisherigen Reihenfolge am Ende. Das ist eine einmalige Aktion, kein Modus; danach bestimmst du die Reihenfolge wieder selbst per Ziehen.",

  // --- Help index section: write ---
  "help.section.write.phase": "Schreiben",
  "help.section.write.summary": "Der konzentrierte Manuskript-Editor und To-do-Markierungen.",

  // --- Help index section: codex ---
  "help.section.codex.phase": "Codex",
  "help.section.codex.summary": "Deine Story-Bibel, mit Geltungsbereich global / Projekt / Reihe.",

  // --- Help index section: search ---
  "help.section.search.phase": "Suche",
  "help.section.search.summary": "Volltextsuche in den Szenen, mit Bereich und Filtern.",

  // --- Help index section: track ---
  "help.section.track.phase": "Fortschritt",
  "help.section.track.summary": "Wortzahlen, Serien, Tempo, Sprints und Struktur.",
  "help.track.dashboard": "Ein Dashboard deines Schreibens: tägliche, wöchentliche und monatliche Wortzahlen, Serien, eine Heatmap über 26 Wochen, der Sprint-Verlauf und eine Aufschlüsselung der Szenenstruktur. Die Statusleiste unten zeigt den heutigen Fortschritt und einen laufenden Sprint – ein Klick darauf öffnet Fortschritt.",
  "help.track.goals": "Für Ziele zählt nur, was du in Projekten schreibst – standardmäßig Manuskriptszenen. Unter Einstellungen → Was für Ziele zählt kannst du auch Planungsnotizen, Codex-Notizen oder andere Projektnotizen einbeziehen; der Rest deines Tresors zählt nie.",
  "help.track.sprint": "Starte einen Sprint mit Zeitlimit über die Leiste (oder den Befehl „Schreibsprint starten“), um gegen die Uhr und auf ein Wortziel hin zu schreiben.",
  "help.track.challenge": "Eine Schreib-Challenge („Schreib-Challenge einrichten“ oder der Link in der Karte „Ziele“) ist ein Zeitraum mit einem Wortziel – etwa 50.000 Wörter im November. Sie zählt jedes Wort, das für Ziele zählt und das du in diesem Zeitraum schreibst, in jedem Projekt, und zeigt, wo du heute stehen solltest, wie weit du voraus oder im Rückstand bist und was du heute noch schreiben musst. Klicke auf die Summe, um sie für die Website einer Aktion zu kopieren. Du schreibst auf mehr als einem Gerät? Schalte die Verlaufssynchronisierung ein, damit alle mitgezählt werden.",

  // --- Help index section: revise ---
  "help.section.revise.phase": "Überarbeiten",
  "help.section.revise.summary": "Prüf-Checklisten, das Überarbeitungsprotokoll und Textanalyse.",
  "help.revise.analysisHeading": "Analyse",
  "help.revise.analysis": "Lesbarkeitswerte, deine häufigsten Wörter und das Aufspüren wiederholter Wendungen (Echos) im ganzen Manuskript – auf Abruf für einen Stil-Durchgang.",

  // --- Help index section: publish ---
  "help.section.publish.phase": "Publizieren",
  "help.section.publish.summary": "Kompilieren, die Checkliste fürs Selfpublishing und die Launch-Planung.",
  "help.publish.checklistHeading": "Checkliste & Launch",
  "help.publish.checklist": "Die Checkliste verfolgt rund 50 Aufgaben fürs Selfpublishing plus ein Metadaten-Arbeitsblatt pro Format (ISBN, Klappentext, Schlüsselwörter). Launch plant einen Zeitplan für Vorbestellungen mit automatisch berechneten Meilensteinen und Trackern für Budget, Cover, Marketing und ARC-Leser.",

  // --- Help index section: customize ---
  "help.section.customize.phase": "Anpassen",
  "help.section.customize.summary": "Passe Inkswell an deine Arbeitsweise an – Typen, Felder, Vorlagen, Strukturen, Checklisten, Impulse.",

  // --- Help index section: data ---
  "help.section.data.phase": "Deine Daten & Sicherungen",
  "help.section.data.summary": "Wo alles gespeichert ist und wie du es wiederherstellst.",
  "help.data.storage": "Alles, was Inkswell speichert, ist reiner Text. Der Text der Szenen steht in gewöhnlichen Notizen im Szenenordner deines Projekts. Planungsdaten – Beats, Gliederung, Ziele, das Überarbeitungsprotokoll, Prüf-Checklisten, Einstellungen fürs Kompilieren und Veröffentlichen – stehen im Frontmatter deiner PROJEKT-INDEXNOTIZ: der Notiz, die nach deinem Projekt benannt ist und neben deinen Szenen liegt. Codex-Einträge sind gewöhnliche Notizen mit einem codex-Schlüssel. Plugin-Einstellungen, Schreibverlauf, Sprints und der Ideen-Eingang stehen in der data.json des Plugins.",
  "help.data.history": "Der Schreibverlauf zählt die Wörter, die du in Obsidian tippst – in seinen Editoren und im Bereich Schreiben. Eine Datei, die sich außerhalb von Obsidian ändert oder per Synchronisierung von einem anderen Gerät kommt, setzt nur den Ausgangspunkt dieser Datei zurück; diese Wörter werden nie als auf diesem Gerät geschrieben erfasst.",
  "help.data.sync": "Um den Verlauf aller Geräte zusammen zu sehen, schalte in den Einstellungen „Schreibverlauf zwischen Geräten synchronisieren“ ein. Jedes Gerät führt dann eine kleine, automatisch geschriebene Protokollnotiz (mit einem inkswell-log-Schlüssel im Frontmatter) im Ordner „Writing log“ deines Basisordners, und Fortschritt führt sie zusammen. Ein Gerät benennst du über die Eigenschaft device dieser Notiz um; gibt es ein Gerät nicht mehr, lösch seine Notiz.",
  "help.data.recoveryHeading": "Wenn etwas schiefgeht",
  "help.data.fileRecovery": "Obsidians Dateiwiederherstellung (Einstellungen → Dateiwiederherstellung → Anzeigen) erstellt regelmäßig Schnappschüsse jeder Notiz, die sich ändert, auch der Notizen, die Inkswell schreibt. Die Suche dort findet DATEINAMEN: Für Planungsdaten suchst du nach dem Namen deines Projekts und öffnest die Schnappschüsse der Indexnotiz; für Text suchst du nach dem Namen der Szene.",
  "help.data.conflicts": "Wann immer Inkswell eine Version deines Textes verdrängen muss – beim Lösen eines Konflikts zwischen Editor und Festplatte, wenn du eine Szene verlässt, bevor du einen Konflikt gelöst hast, oder wenn beim Kompilieren auf deinen Wunsch eine Datei überschrieben wird –, wird die verdrängte Version zuerst im Ordner „Inkswell conflicts“ gespeichert. Nichts wird stillschweigend verworfen.",
  "help.data.backups": "Inkswell legt außerdem täglich eine Sicherung der data.json an (die letzten 7 Tage), in einem Ordner „backups“ daneben – im Ordner des Plugins innerhalb des Konfigurationsverzeichnisses deines Tresors. Um nur deine Einstellungen zurückzuholen (eigene Codex-Typen, umbenannte Typen, Änderungen unter Anpassen, die Leiste), führe den Befehl „Einstellungen aus einer Sicherung wiederherstellen“ aus und wähle einen Tag; dein Schreibverlauf bleibt, wie er ist. Um alles wiederherzustellen: Deaktiviere Inkswell, kopiere die Sicherung über die data.json und aktiviere das Plugin wieder. Kann die data.json beim Start von Obsidian nicht gelesen werden, lädt Inkswell selbstständig die neueste Sicherung und sagt dir Bescheid.",

  // --- Help panel ---
  "help.panel.title": "So funktioniert Inkswell",
  "help.panel.intro": "Eine Referenz für jeden Teil der Werkstatt. Der Ablauf führt von Planen → Schreiben → Überarbeiten → Publizieren, mit Codex und Fortschritt als ständigen Begleitern. Klappe einen Abschnitt auf, um tiefer einzusteigen.",
  "help.panel.shape": "Passe Inkswell unter {link} an deine Arbeitsweise an – Codex-Typen und -Felder, Vorlagen, Strukturen, Checklisten, Impulse und welche Funktionen angezeigt werden (oder blende einen optionalen Tab per Rechtsklick aus). Ausblenden geht ohne Verlust – deine Daten bleiben erhalten, und beim Wiedereinschalten ist alles wieder da.",
  "help.panel.shape.link": "Anpassen",
  "help.panel.reset": "Tipps zurücksetzen & Willkommen erneut zeigen",
  "help.panel.reset.done": "Tipps zurückgesetzt.",

  // --- Contextual tip ---
  "help.hint.dismiss": "Diesen Tipp schließen",

  // --- Welcome ---
  "welcome.title": "Willkommen bei Inkswell",
  "welcome.intro": "Eine vollständige Werkstatt für Romanautorinnen und -autoren – ein Tab, geordnet nach der Phase, in der du gerade bist. Die Phasen wechselst du über die Symbolleiste links:",
  "welcome.phase.plan.name": "Planen",
  "welcome.phase.plan.blurb": "Überblick, Beat Sheet und Struktur der Geschichte.",
  "welcome.phase.write.name": "Schreiben",
  "welcome.phase.write.blurb": "Konzentrierter Editor mit To-do-Markierungen.",
  "welcome.phase.revise.name": "Überarbeiten",
  "welcome.phase.revise.blurb": "Prüfung, Entscheidungsprotokoll und Durchgänge.",
  "welcome.phase.publish.name": "Publizieren",
  "welcome.phase.publish.blurb": "Dein Buch kompilieren und auf den Markt bringen.",
  "welcome.phase.codex.name": "Codex",
  "welcome.phase.codex.blurb": "Deine Story-Bibel, überall griffbereit.",
  "welcome.phase.track.name": "Fortschritt",
  "welcome.phase.track.blurb": "Wortzahlen, Serien und Sprints.",
  "welcome.tips": "Neu in einem Bereich? Achte oben auf den Tipp „So funktioniert’s“ – schließ ihn, sobald du den Dreh raushast. Der Tab „Hilfe“ in der Leiste enthält die vollständige Anleitung.",
  "welcome.start": "Los geht’s",
};
