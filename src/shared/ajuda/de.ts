import type { Ajuda } from './en'

export const ajudaDe = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'Über Valendo',
    texto: 'Version, Mitwirkende und Lizenz. Wird grün, wenn eine neue Version verfügbar ist — Valendo lädt nie von selbst etwas herunter.'
  },
  'header.shortcuts': {
    nome: 'Tastenkürzel',
    texto: 'Jeder Befehl und seine Taste. Klicken Sie eine Taste an, um sie neu zu belegen; die Tooltips folgen Ihrer Einstellung.'
  },
  'header.palette': {
    nome: 'Befehlssuche',
    texto: 'Tippen Sie den Namen eines Befehls und führen Sie ihn aus, ohne die Taste zu suchen. Schneller als die Maus, sobald Sie den Namen kennen.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Oberflächengröße',
    texto: 'Vergrößert oder verkleinert das Operator-Fenster — Text, Tasten und Abstände zusammen. Der Bildschirm des Sprechers ändert sich nie mit.'
  },
  'header.uiScaleSlider': {
    nome: 'Oberflächengröße',
    texto: 'Ziehen, um die ganze Konsole zu skalieren. Nützlich an einem 4K-Panel, wo die Standardgröße aus Arbeitsabstand klein wirkt.'
  },
  'header.uiScaleReset': {
    nome: 'Zurück auf 100 %',
    texto: 'Setzt die Oberfläche auf ihre natürliche Größe zurück. Ausgegraut, wenn Sie dort schon sind.'
  },
  'header.dismissNotice': {
    nome: 'Hinweis ausblenden',
    texto: 'Blendet eine Warnung zu etwas Vergangenem aus. Ein noch bestehendes Problem hat keinen Ausblenden-Knopf — es verschwindet, wenn es behoben ist.'
  },
  'header.languageOption': {
    nome: 'Diese Sprache wählen',
    texto: 'Jede Sprache ist in sich selbst geschrieben, denn wer wechseln muss, ist genau die Person, die die aktuelle nicht liest.'
  },
  'header.language': {
    nome: 'Sprache',
    texto: 'Wechselt die Sprache der Oberfläche. Ihr Skript bleibt unberührt — nur die Beschriftungen drumherum ändern sich.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Projekt öffnen',
    texto: 'Öffnet eine .valendo-Datei: jeder Tab, jedes Aussehen, Marker, Karte und Tempo, genau wie die speichernde Maschine sie hinterließ.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Zuletzt verwendete Projekte',
    texto: 'Die zuletzt geöffneten oder gespeicherten Projekte. Dateien, die nicht mehr existieren, verschwinden von selbst aus der Liste.'
  },
  'project.recentItem': {
    nome: 'Dieses Projekt öffnen',
    texto: 'Öffnet direkt von der Festplatte, ohne Dateidialog. Beim Zeigen erscheint der volle Pfad — zwei Projekte können denselben Namen tragen.'
  },
  'project.saveAsItem': {
    nome: 'Projekt speichern unter',
    texto: 'Fragt immer, wohin geschrieben wird, und lässt das Original unberührt. Von da an ist die neue Datei die gespeicherte.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Projekt speichern',
    texto: 'Schreibt das ganze Programm zurück in die bereits geöffnete .valendo. Fragt nur beim ersten Mal, wohin.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Projekt speichern unter',
    texto: 'Fragt immer, wohin geschrieben wird, und lässt das Original unberührt. Von da an ist die neue Datei die gespeicherte.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'Neues Projekt',
    texto: 'Startet ein leeres Programm. Bietet an, das aktuelle zuerst zu speichern, wenn es ungespeicherte Änderungen hat.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Skript importieren',
    texto: 'Liest .docx, .pdf, .rtf oder reinen Text in einen neuen Tab. Formatierung entfällt; Kapitel und Regieanweisungen markieren Sie danach.'
  },
  'script.save': {
    nome: 'Skript exportieren',
    texto: 'Schreibt den aktiven Tab als Textdatei — nur das Skript, ohne das Projekt drumherum.',
    comando: 'document.save'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Transport oben',
    texto: 'Legt die Transportkonsole unter die Tableiste, in voller Größe — die Anordnung mit dem meisten Platz für die Uhren.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Transport als Leiste',
    texto: 'Verschiebt den Transport in eine schmale Leiste unten und gibt oben Platz für Skript und Ausgabe frei.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Assets-Spalte',
    texto: 'Zeigt oder verbirgt die linke Spalte: Kapitel des Skripts, Karten des Programms und diese Schnellhilfe.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Kartenfach',
    texto: 'Zeigt oder verbirgt das Fach mit Bildern, Videos und Nachrichten — die Sie auf den Bildschirm des Sprechers legen.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Einstellungsfeld',
    texto: 'Zeigt oder verbirgt das rechte Feld: wie der Text aussieht, wie er gelesen wird und wie er durch das Glas geht.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Skript-Tab',
    texto: 'Jeder Tab ist ein eigenes Skript mit eigenem Aussehen und Markern. Nur der aktive geht auf Sendung. Rechtsklick zum Duplizieren, Umbenennen oder Schließen.'
  },
  'tabs.close': {
    nome: 'Tab schließen',
    texto: 'Entfernt dieses Skript aus der Sitzung. Es bleibt in der Projektdatei, bis Sie erneut speichern.'
  },
  'tabs.new': {
    nome: 'Neuer Tab',
    texto: 'Öffnet ein leeres Skript neben den aktuellen — ein zweiter Block desselben Programms, kein neues Projekt.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Schwarzbild',
    texto: 'Schaltet den Bildschirm des Sprechers sofort schwarz, die Lesung bleibt an ihrer Stelle. Setzt sich gegen jede offene Karte durch.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Einfrieren',
    texto: 'Stoppt den Text an seiner Stelle, während die Uhr weiterläuft. Für eine ungeplante Pause, ohne die Stelle zu verlieren.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'Im Netz ansehen',
    texto: 'Veröffentlicht eine Seite im lokalen Netz: jedes Gerät mit Browser liest dasselbe Skript. Öffnet das Feld mit Adresse und QR-Code.'
  },
  'ar.webviewSound': {
    nome: 'Ton über das Netz',
    texto: 'Ob eine Videokarte ihren Ton über das Netz sendet. Aus, bietet die Seite das Entstummen gar nicht erst an. Dunkel, bis das Netz aktiv ist.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Monitore identifizieren',
    texto: 'Zeigt auf jedem Bildschirm eine große Zahl, damit Sie sie unterscheiden können. Deaktiviert während der Sendung — sie würde auch dort blinken.'
  },
  'output.identifyRun': {
    nome: 'Zahlen anzeigen',
    texto: 'Zeigt die Zahl jedes Monitors für ein paar Sekunden. An den Sprecher wird nichts gesendet; es ist nur eine Beschriftung auf dem Glas.'
  },
  'output.monitor': {
    nome: 'Monitor wählen',
    texto: 'Von welchem Bildschirm der Sprecher liest. Vor dem Senden wählen — das Einzige, worauf Senden noch wartet.'
  },
  'output.broadcast': {
    nome: 'Senden',
    texto: 'Legt die Lesung auf den gewählten Monitor, im Vollbild. Der Punkt zeigt den Status: dunkel ist aus, rot und leuchtend ist auf Sendung.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Zurück zum Anfang',
    texto: 'Schickt die Lesung zurück zum ersten Wort und setzt die Uhren zurück. Läuft weiter, wenn sie schon lief.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Zurückspringen',
    texto: 'Bewegt die Lesung ein paar Zeilen nach oben, ohne zu stoppen — wenn der Sprecher einen Satz wiederholt.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Start / Pause',
    texto: 'Startet und stoppt den Lauf. Die größte Taste der Konsole, weil es die einzige ist, die Sie ohne hinzusehen finden.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Vorspringen',
    texto: 'Bewegt die Lesung ein paar Zeilen nach unten, ohne zu stoppen — wenn der Sprecher vorausspringt.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Marker setzen',
    texto: 'Setzt einen Marker an der aktuellen Stelle der Lesung. Marker erscheinen auf der Fortschrittslinie und sind während der Sendung anspringbar.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Lesetempo',
    texto: 'Wörter pro Minute — wie schnell der Text rollt. Das Mausrad wirkt überall in der App, nicht nur über diesem Regler.'
  },
  'status.target': {
    nome: 'Zieldauer',
    texto: 'Wie lange das Skript beim aktuellen Tempo dauert. Klicken und eine andere Zeit eingeben — „2:00" oder Sekunden — passt das Tempo an.'
  },
  'transport.elapsed': {
    nome: 'Vergangen',
    texto: 'Wie lange die Lesung schon läuft. Was gezählt wird, hängt vom Uhrmodus in Einstellungen › Ausgabe ab.'
  },
  'transport.remaining': {
    nome: 'Verbleibend',
    texto: 'Wie viel beim aktuellen Tempo noch bleibt. Eine Tempoänderung ändert diese Zahl sofort — genau dafür ist sie da.'
  },
  'markers.chip': {
    nome: 'Marker',
    texto: 'Klicken, um die Lesung hierher zu schicken. Rechtsklick entfernt den Marker. Die Zahl ist die Taste, die während der Sendung dorthin springt.'
  },
  'transport.progress': {
    nome: 'Fortschrittslinie',
    texto: 'Das ganze Skript von Rand zu Rand. Gelbe Striche sind Kapitel, rote Striche sind von Hand gesetzte Marker.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Kapitel',
    texto: 'Macht die aktuelle Zeile zu einem Kapitel — sie wird zu ## im Text. Kapitel erscheinen links, auf der Fortschrittslinie und im Ablaufplan.',
    comando: 'insert.chapter'
  },
  'editor.direction': {
    nome: 'Regieanweisung',
    texto: 'Markiert die Zeile als Regieanweisung — sie wird zu [Klammern] im Text. Eine Anweisung an den Sprecher, nie als gesprochen gezählt.',
    comando: 'insert.direction'
  },
  'editor.clearFormat': {
    nome: 'Formatierung entfernen',
    texto: 'Macht aus Kapiteln und Regieanweisungen wieder reinen Text. Die Wörter bleiben; Rückgängig bringt die Markierungen zurück.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Sprecher zuweisen',
    texto: 'Einen bereits im Skript stehenden Namen markieren und klicken: von dort an spricht diese Person — bis zum nächsten Namen. Ihr Text bleibt unverändert.'
  },
  'editor.allCaps': {
    nome: 'Großbuchstaben im Editor',
    texto: 'Zeigt den Editor in Großbuchstaben, ohne einen gespeicherten Buchstaben zu ändern. Unabhängig vom gleichen Schalter in Einstellungen › Text.'
  },
  'editor.undo': {
    nome: 'Rückgängig',
    texto: 'Macht Ihre Änderungen am Skript schrittweise rückgängig.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Wiederholen',
    texto: 'Stellt schrittweise wieder her, was Sie rückgängig gemacht haben.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'Catch',
    texto: 'Die Lesemarke folgt Ihrem Cursor beim Tippen, bei jeder Pause. Ein Gehe-zu, das sich nie von selbst abschaltet.'
  },
  'editor.goTo': {
    nome: 'Gehe zu',
    texto: 'Schickt die Lesung einmalig dorthin, wo der Cursor im Editor steht. Zum Springen zu einer Stelle, die Sie eben gefunden haben.'
  },
  'editor.marker': {
    nome: 'Marker setzen',
    texto: 'Derselbe Marker wie an der Transportkonsole, in Reichweite des Skripts, das Sie schon vor sich haben.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Schleife',
    texto: 'Am Ende angekommen, geht es zurück zum Anfang und läuft weiter. Für einen Stand oder eine Probe, die nie stoppen darf.'
  },
  'editor.loopDelay': {
    nome: 'Schleifenverzögerung',
    texto: 'Sekunden Wartezeit am Ende, bevor es von vorn beginnt. Null startet sofort neu.'
  },
  'editor.fontSmaller': {
    nome: 'Schrift verkleinern',
    texto: 'Einen Punkt kleiner im Editor. Der Bildschirm des Sprechers bleibt unberührt — das ist nur für den Komfort der Tippenden.'
  },
  'editor.fontSize': {
    nome: 'Schriftgröße des Editors',
    texto: 'Die Größe des Textes, den Sie tippen. Hat nichts mit der Größe zu tun, die der Sprecher liest — die liegt in Einstellungen › Text.'
  },
  'editor.fontBigger': {
    nome: 'Schrift vergrößern',
    texto: 'Einen Punkt größer im Editor. Der Bildschirm des Sprechers bleibt unberührt — das ist nur für den Komfort der Tippenden.'
  },
  'editor.script': {
    nome: 'Skript',
    texto: 'Hier tippen oder einfügen. Eine Zeile mit ## ist ein Kapitel; Text in [Klammern] ist eine Regieanweisung, nie als gesprochen gezählt.'
  },
  'editor.split': {
    nome: 'Trenner Bearbeitung / Sendung',
    texto: 'Ziehen, um Skript oder Vorschau mehr Platz zu geben. Doppelklick setzt ihn zurück an den Anfang.'
  },
  'panel.goToReading': {
    nome: 'Zur Lesung springen',
    texto: 'Bringt den Editor einmalig zum gerade gelesenen Wort und setzt den Cursor dorthin. Das Gegenstück zum Gehe-zu unter dem Skript.'
  },
  'panel.follow': {
    nome: 'Der Lesung folgen',
    texto: 'Der Editor scrollt mit der Sendung mit und markiert die gelesene Zeile. Bewegt nie Ihren Cursor und weicht 4 s zurück, sobald Sie tippen oder scrollen.'
  },
  'panel.focusToggle': {
    nome: 'Fokusmodus',
    texto: 'Blendet den Editor aus und lässt nur die Sprecheransicht auf dem Bildschirm — die Anordnung zum Senden, nicht zum Schreiben.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Kapitel',
    texto: 'Klicken, um die Lesung an den Anfang dieses Kapitels zu schicken. Die Zeit rechts zeigt die Dauer beim aktuellen Tempo.'
  },
  'sidebar.card': {
    nome: 'Karte',
    texto: 'Klicken, um diese Karte auf den Bildschirm des Sprechers zu legen oder sie zu entfernen, falls schon dort. Ziehen zum Umsortieren.'
  },
  'sidebar.cardOverlay': {
    nome: 'Diese Karte überlagern',
    texto: 'Der Text läuft über dieser Karte, statt sie zu ersetzen. Gesperrt, solange das globale OVERLAY jede Karte erzwingt.'
  },
  'sidebar.overlayGlobal': {
    nome: 'Globales Overlay',
    texto: 'Erzwingt den Text über JEDER Karte, unabhängig davon, was jede Karte einzeln sagt. Aus, entscheidet jede Karte selbst.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'Overlay: dunkler Streifen',
    texto: 'Legt einen dunklen Streifen über die ganze Karte, hinter dem Text. Der einzige Stil, der Lesbarkeit auf jedem Bild garantiert.'
  },
  'overlay.styleShadow': {
    nome: 'Overlay: Schatten',
    texto: 'Legt einen Schatten um jeden Buchstaben statt eines Streifens — die Karte bleibt voll sichtbar, der Text bleibt auf den meisten lesbar.'
  },
  'overlay.styleNone': {
    nome: 'Overlay: keine Behandlung',
    texto: 'Text direkt über der Karte, unbehandelt. Nur für Motive, die Sie gewählt haben und bei denen Sie wissen, wo der Text landet.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Kleinere Vorschaubilder',
    texto: 'Verkleinert die Kartenvorschaubilder in dieser Spalte um 10 % und zeigt mehr vom Programm auf dem Bildschirm.'
  },
  'sidebar.thumbSize': {
    nome: 'Vorschaubildgröße',
    texto: 'Wie groß die Kartenbilder in dieser Spalte sind. Eine lokale Einstellung — sie reist nie in der Projektdatei mit.'
  },
  'sidebar.thumbBigger': {
    nome: 'Größere Vorschaubilder',
    texto: 'Vergrößert die Kartenvorschaubilder in dieser Spalte um 10 %, um ein Bild auf einen Blick zu erkennen.'
  },
  'sidebar.helpToggle': {
    nome: 'Schnellhilfe',
    texto: 'Klappt dieses Feld ein. Was Sie hier lesen, ist, worauf Ihre Maus zuletzt zeigte — es bleibt, bis Sie auf etwas anderes zeigen.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Bild hinzufügen',
    texto: 'Kopiert ein Bild ins Projekt, sodass es in der .valendo mitreist und die Ursprungsmaschine überlebt.'
  },
  'cards.addVideo': {
    nome: 'Video hinzufügen',
    texto: 'Verweist auf ein Video, wo es schon liegt — es wird nicht kopiert. Verschieben oder Umbenennen der Datei bricht die Karte später.'
  },
  'cards.addText': {
    nome: 'Nachricht hinzufügen',
    texto: 'Eine Karte aus reinem Text — eine Notiz an den Sprecher, groß auf dem Bildschirm. Nichts zu importieren; Sie tippen sie direkt hier ein.'
  },
  'cards.addScreen': {
    nome: 'Bildtafel hinzufügen',
    texto: 'Eine Karte, die die App selbst zeichnet: eine Farbe oder ein Verlauf, mit Nachricht darüber, wenn gewünscht. Ohne Datei, ohne Bildbearbeitung.'
  },
  'cards.editScreen': {
    nome: 'Bildtafel bearbeiten',
    texto: 'Öffnet die Bildtafel mit großer Vorschau. Eine auf einer 176px-Kachel gewählte Farbe ist nicht die Farbe auf einem Studiomonitor.'
  },
  'cards.background': {
    nome: 'Hintergrund',
    texto: 'Einfarbig ist eine Farbe. Verlauf fügt eine zweite Farbe und einen Winkel hinzu, um dazwischen zu laufen.'
  },
  'cards.colours': {
    nome: 'Farben',
    texto: 'Öffnet den System-Farbwähler, inklusive Pipette. Tief und ungesättigt liest sich am besten hinter dem Prompter-Glas.'
  },
  'cards.angle': {
    nome: 'Verlaufswinkel',
    texto: 'In welche Richtung die zwei Farben laufen. 0° geht nach oben, 90° nach rechts.'
  },
  'cards.screenText': {
    nome: 'Bildtafel-Nachricht',
    texto: 'Was über dem Hintergrund steht. Wo Sie Enter drücken, bricht die Zeile auch auf Sendung um. Leer lassen für einen reinen Hintergrund.'
  },
  'cards.screenEffect': {
    nome: 'Bewegter Hintergrund',
    texto: 'Sechs Arten, wie sich die zwei Farben bewegen. Alle absichtlich langsam — ein unruhiger Hintergrund stört die Lesung. Jeder Bildschirm läuft unabhängig.'
  },
  'cards.speed': {
    nome: 'Effektgeschwindigkeit',
    texto: 'Beschleunigt oder verlangsamt alle sechs Effekte zusammen. Skaliert das jeweils eigene Tempo, statt eine Dauer zu erzwingen.'
  },
  'cards.intensity': {
    nome: 'Effektstärke',
    texto: 'Wie stark die Bewegung über der Grundfarbe zu sehen ist. Niedrig ist kaum spürbar — meist richtig für einen langen Hintergrund.'
  },
  'cards.fade': {
    nome: 'Wo die Farben sich treffen',
    texto: 'Wie viel vom Bild der Übergang einnimmt. Voll ist ein Verlauf von Rand zu Rand; null ist eine klare Linie zwischen zwei festen Hälften.'
  },
  'cards.screenAlign': {
    nome: 'Absatzausrichtung',
    texto: 'Wie die Zeilen zueinander stehen. Unabhängig davon, wo der Block auf dem Bildschirm sitzt — das regelt Lage.'
  },
  'cards.size': {
    nome: 'Nachrichtengröße',
    texto: 'Ein Anteil der Bildschirmhöhe, keine Pixelgröße — so wirkt die Karte auf der Fachkachel wie auf einem großen Monitor gleich.'
  },
  'cards.place': {
    nome: 'Lage',
    texto: 'Oben, Mitte oder unten. Keine berührt den Rand: hinter Glas geht der letzte Zentimeter des Bildschirms als Erstes verloren.'
  },
  'cards.close': {
    nome: 'Fach schließen',
    texto: 'Verbirgt das Kartenfach. Die Karten bleiben im Programm; nur das Fach verschwindet.'
  },
  'cards.shortcut': {
    nome: 'Kartentaste',
    texto: 'Die Taste, die diese Karte mitten in der Sendung auf Sendung legt. Sie folgt der Position im Fach — Umsortieren nummeriert neu.'
  },
  'cards.name': {
    nome: 'Kartenname',
    texto: 'Wie Sie diese Karte nennen. Das zeigen die Assets-Spalte und der Ablaufplan — der Dateiname sagt Ihnen im Tempo nichts.'
  },
  'cards.message': {
    nome: 'Nachricht',
    texto: 'Der Text, den der Sprecher auf dieser Karte liest. Er wird groß und zentriert angezeigt, nicht gerollt.'
  },
  'cards.onAir': {
    nome: 'Auf Sendung',
    texto: 'Legt diese Karte auf den Bildschirm des Sprechers oder nimmt sie herunter. Nur dieses Feld und die Video-Play-Taste öffnen diese Tür.'
  },
  'cards.overlay': {
    nome: 'Diese Karte überlagern',
    texto: 'Der Text läuft über dieser Karte, statt sie zu ersetzen. Gesperrt, solange das globale OVERLAY jede Karte erzwingt.'
  },
  'cards.remove': {
    nome: 'Karte löschen',
    texto: 'Entfernt diese Karte aus dem Programm. Importierte Bilder werden beim Speichern aus dem Projektordner entfernt.'
  },
  'cards.relink': {
    nome: 'Datei neu verknüpfen',
    texto: 'Die Datei, auf die diese Karte zeigt, fehlt — verschoben, umbenannt oder auf einem Laufwerk, das nicht hier ist. Klicken, um neu zu verknüpfen.'
  },
  'cards.videoNetwork': {
    nome: 'Video im Netz',
    texto: 'Ob Browser im Netz diese Datei abspielen können. Manche Formate lehnt ein Browser ab, obwohl die App sie problemlos abspielt.'
  },
  'cards.videoPlay': {
    nome: 'Video abspielen',
    texto: 'Nicht auf Sendung legt dies die Karte auf und startet sie. Auf Sendung spielt und pausiert es, was schon läuft.'
  },
  'cards.videoStartPaused': {
    nome: 'Pausiert einblenden',
    texto: 'Legt die Karte eingefroren auf dem aktuellen Bild auf den Bildschirm — um eine Einstellung vorzubereiten, bevor sie läuft.'
  },
  'cards.videoSeek': {
    nome: 'Videoposition',
    texto: 'Ziehen, um im Video zu scrubben. Bewegt sich auch auf dem Bildschirm des Sprechers — Scrubben auf Sendung ist Scrubben auf Sendung.'
  },
  'cards.videoMute': {
    nome: 'Stumm',
    texto: 'Stummt den Kartenton auf dieser Maschine und stellt ihn auf die vorherige Lautstärke zurück. Netzwerkton hat einen eigenen Schalter.'
  },
  'cards.videoVolume': {
    nome: 'Kartenlautstärke',
    texto: 'Wie laut Videokarten auf dieser Maschine spielen. Eine lokale Einstellung — sie reist nie in der Projektdatei mit.'
  },
  'cards.videoLoop': {
    nome: 'Video wiederholen',
    texto: 'Dieser Clip beginnt am Ende von vorn, solange die Karte auf dem Bildschirm bleibt.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Text',
    texto: 'Wie der Bildschirm des Sprechers dargestellt wird: Schrift, Größe, Stärke, Ausrichtung und Farben.'
  },
  'insp.tabReading': {
    nome: 'Lesen',
    texto: 'Wie der Text gelesen wird: wo er sitzt, wie viele Wörter pro Zeile, wo die Lesemarke ist und wie sich das Tempo verhält.'
  },
  'insp.tabOutput': {
    nome: 'Ausgabe',
    texto: 'Was nur auf dem Bildschirm des Sprechers existiert: die Uhren und die Spiegelung, die das Glas eines echten Teleprompters braucht.'
  },
  'insp.font': {
    nome: 'Schriftart',
    texto: 'Die Familie, die der Sprecher liest. Angeboten werden nur die, die aus der Ferne und im Spiegel lesbar bleiben.'
  },
  'insp.allCaps': {
    nome: 'Großbuchstaben auf Ausgabe',
    texto: 'Zeigt den Bildschirm des Sprechers in Großbuchstaben, ohne einen gespeicherten Buchstaben zu ändern. Unabhängig vom Editor-Schalter.'
  },
  'insp.body': {
    nome: 'Schriftgröße',
    texto: 'Wie groß der Sprecher liest. Die wichtigste Zahl hier — alles andere ist Feinabstimmung darum herum.'
  },
  'insp.weight': {
    nome: 'Schriftstärke',
    texto: 'Wie kräftig die Striche sind. Kräftiger übersteht einen hellen Raum; leichter wirkt ruhiger auf dunklem Glas.'
  },
  'insp.lineHeight': {
    nome: 'Zeilenabstand',
    texto: 'Der Abstand zwischen den Zeilen. Locker liest sich ruhiger und rollt weicher; eng zeigt mehr Text auf dem Bildschirm.'
  },
  'insp.letterSpacing': {
    nome: 'Laufweite',
    texto: 'Der Raum zwischen den Buchstaben. Etwas davon hilft aus der Ferne; zu viel reißt Wörter auseinander.'
  },
  'insp.align': {
    nome: 'Ausrichtung',
    texto: 'Wo jede Zeile im Textfeld sitzt. Unabhängig von Position, die das Feld selbst verschiebt.'
  },
  'insp.textColor': {
    nome: 'Textfarbe',
    texto: 'Die Farbe der Wörter auf dem Bildschirm des Sprechers.'
  },
  'insp.bgColor': {
    nome: 'Hintergrundfarbe',
    texto: 'Die Farbe hinter den Wörtern. Auf echtem Prompter-Glas gilt: je dunkler, desto weniger spiegelt sich der Raum darin.'
  },
  'insp.preset': {
    nome: 'Farbpalette',
    texto: 'Ein getestetes Paar aus Text- und Hintergrundfarbe. Eine der Farben von Hand zu ändern, hebt die Palettenauswahl einfach auf.'
  },
  'insp.invert': {
    nome: 'Umkehren',
    texto: 'Vertauscht Text- und Hintergrundfarbe — hell auf dunkel wird dunkel auf hell, mit einem Klick.'
  },
  'insp.presenterHide': {
    nome: 'Diesen Namen verbergen',
    texto: 'Nimmt den Namen dieses Sprechers von der Ausgabe — die Rede bleibt, in seiner Farbe. Ihr Skript bleibt unberührt.'
  },
  'insp.presenterHideAll': {
    nome: 'Alle Namen verbergen',
    texto: 'Nimmt alle Sprechernamen auf einmal von der Ausgabe und sperrt die einzelnen Schalter, solange sie aktiv ist. Der Editor behält sie immer.'
  },
  'insp.presenterRename': {
    nome: 'Sprecher umbenennen',
    texto: 'Doppelklick zum Umbenennen. Ändert den Namen auch im Skript — nur die Sprecherzeilen, nie eine Erwähnung in einer Rede. Rückgängig stellt beides wieder her.'
  },
  'insp.presenterRelink': {
    nome: 'Sprecher neu verknüpfen',
    texto: 'Der Name hat sich im Skript geändert. Neuen Namen im Editor markieren und klicken: gleicher Sprecher, gleiche Farbe, neuer Name — nichts geht verloren.'
  },
  'insp.presenterRemove': {
    nome: 'Sprecher entfernen',
    texto: 'Entfernt diesen Sprecher. Die Wörter bleiben genau, wie sie sind — nur die Farbe verschwindet.'
  },
  'insp.position': {
    nome: 'Horizontale Position',
    texto: 'Verschiebt das ganze Textfeld nach links oder rechts, ohne es zu vergrößern. Rastet nahe 50 % genau in der Mitte ein.'
  },
  'insp.margin': {
    nome: 'Rand',
    texto: 'Wie viel vom Bildschirmrand auf jeder Seite leer bleibt. Schmalerer Text bedeutet kürzere Zeilen und weniger Augenbewegung.'
  },
  'insp.minWords': {
    nome: 'Minimum Wörter pro Zeile',
    texto: 'Die Untergrenze, wie wenige Wörter eine Zeile halten darf. Valendo bricht den Text nach Sinn, nicht nach Bildschirmbreite.'
  },
  'insp.maxWords': {
    nome: 'Maximum Wörter pro Zeile',
    texto: 'Die Obergrenze, wie viele Wörter eine Zeile halten darf. Zu hoch, und Zeilen brechen von selbst um — davor warnt das Feld.'
  },
  'insp.readingMark': {
    nome: 'Lesemarke',
    texto: 'Wie weit unten auf dem Bildschirm der Sprecher liest. Weiter oben zeigt mehr kommenden Text darunter.'
  },
  'insp.markOnOutput': {
    nome: 'Marke auf Ausgabe',
    texto: 'Ob die Lesemarke auch auf dem Bildschirm des Sprechers gezeichnet wird. In der Vorschau hier ist sie immer sichtbar.'
  },
  'insp.focusDim': {
    nome: 'Rest abdunkeln',
    texto: 'Blendet ab, was weit von der Lesemarke entfernt ist, damit der Blick auf der aktuellen Zeile bleibt statt zu wandern.'
  },
  'insp.focusDimPct': {
    nome: 'Abdunkelungsstärke',
    texto: 'Wie stark die Abblendung ist. Niedrig lässt ein breites Fenster um die Marke; hoch verengt es zu einem Schlitz. Es folgt der Marke.'
  },
  'insp.uniform': {
    nome: 'Konstante Geschwindigkeit',
    texto: 'Jede Zeile bekommt dieselbe Zeit, egal wie schwer sie wiegt. Aus, dauert eine schwere Zeile länger als eine kurze — näher an echter Sprache.'
  },
  'insp.wrappingFix': {
    nome: 'Schriftgröße korrigieren',
    texto: 'Verkleinert die Schrift auf die größte Größe, bei der keine Zeile von selbst umbricht, und beendet die Warnung.'
  },
  'insp.clockElapsed': {
    nome: 'Uhr: vergangen',
    texto: 'Zeigt die vergangene Zeit auf dem Bildschirm des Sprechers — die, auf die der Sprecher schaut, nicht die auf Ihrer Konsole.'
  },
  'insp.clockElapsedColor': {
    nome: 'Farbe: vergangen',
    texto: 'Die Farbe der vergangenen Zeit auf dem Bildschirm des Sprechers.'
  },
  'insp.clockRemaining': {
    nome: 'Uhr: verbleibend',
    texto: 'Zeigt die verbleibende Zeit auf dem Bildschirm des Sprechers — die Zahl, die sagt, schneller zu werden oder sich Zeit zu lassen.'
  },
  'insp.clockRemainingColor': {
    nome: 'Farbe: verbleibend',
    texto: 'Die Farbe der verbleibenden Zeit auf dem Bildschirm des Sprechers.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Uhr: aus dem Skript',
    texto: 'Vergangen und verbleibend ergeben sich aus gelesenen Wörtern und aktuellem Tempo. Ändert sich das Tempo, ändern sich beide Zahlen mit.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Uhr: Stoppuhr',
    texto: 'Vergangen zählt echte Sekunden ab dem Drücken von Play; verbleibend zählt von der unten gesetzten Zielzeit herunter.'
  },
  'insp.clockModeFree': {
    nome: 'Uhr: frei',
    texto: 'Die Uhren laufen unabhängig vom Skript gegen das Ziel — für einen Live-Abschnitt, in dem die Wörter nicht der Plan sind.'
  },
  'insp.clockTarget': {
    nome: 'Zielzeit',
    texto: 'Wie lange der Beitrag dauern soll. Ziffern eingeben, die Doppelpunkte setzen sich von selbst — „320" wird zu 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Uhrenposition',
    texto: 'In welcher Ecke des Bildschirms des Sprechers die Uhren sitzen. Das Raster hat die Form des Bildschirms selbst.'
  },
  'insp.clockSize': {
    nome: 'Uhrengröße',
    texto: 'Wie groß die Uhren sind, als Anteil der Bildschirmhöhe. Groß genug zum Lesen, klein genug, um den Text nicht zu stören.'
  },
  'insp.mirrorH': {
    nome: 'Horizontal spiegeln',
    texto: 'Kippt den Bildschirm des Sprechers von links nach rechts — was das Spiegelglas vor dem Objektiv braucht. Vorschau und Netzseite bleiben unverändert.'
  },
  'insp.mirrorV': {
    nome: 'Vertikal spiegeln',
    texto: 'Kippt den Bildschirm des Sprechers von oben nach unten, für Rigs mit nach oben gerichtetem Monitor. Vorschau und Netzseite werden nie gespiegelt.'
  },
  'insp.rotation': {
    nome: 'Drehung',
    texto: 'Dreht den Bildschirm des Sprechers in Vierteldrehungen — für einen seitlich montierten Monitor. Vorschau und Netzseite bleiben aufrecht.'
  },
  'insp.saveDefaults': {
    nome: 'Als Standard speichern',
    texto: 'Macht diese Einstellungen zu denen, mit denen jeder neue Tab startet. Bestehendes bleibt unverändert.'
  },
  'insp.resetDefaults': {
    nome: 'Zurück auf Werkseinstellung',
    texto: 'Verwirft Ihre gespeicherten Standards und kehrt zu denen zurück, mit denen Valendo ausgeliefert wird. Offene Tabs bleiben unberührt.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Editor und Sprecheransicht nebeneinander — die Anordnung zum gleichzeitigen Schreiben und Senden.'
  },
  'status.modeFocus': {
    nome: 'Fokus',
    texto: 'Nur die Sprecheransicht, so groß wie das Fenster erlaubt. Zum Senden eines bereits fertigen Skripts.'
  },
  'status.modeDeck': {
    nome: 'Pult',
    texto: 'Tauscht den Editor gegen den Ablaufplan: jedes Kapitel mit seiner Dauer, um einer langen Sendung zu folgen.'
  },
  'status.storage': {
    nome: 'Speicherstatus',
    texto: 'Zeigt, ob Valendo Ihre Arbeit auf die Festplatte schreiben kann. Wird bernsteinfarben, sobald es nicht klappt — Stille würde wie Erfolg aussehen.'
  },
  'status.palette': {
    nome: 'Befehlspalette',
    texto: 'Jeder Befehl der App, durchsuchbar nach Namen, mit seinem Tastenkürzel daneben. Der schnellste Weg zu etwas, das Sie selten benutzen.',
    comando: 'palette.open'
  }
} as const satisfies Partial<Record<string, Ajuda>>
