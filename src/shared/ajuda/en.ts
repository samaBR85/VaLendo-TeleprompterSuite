/**
 * O texto da Ajuda rápida: uma entrada por controle da mesa.
 *
 * Cada entrada serve a DOIS lugares ao mesmo tempo — a tooltip do controle (o
 * `nome`) e o quadro no rodapé da coluna de assets (o `texto`). Uma chave só
 * para os dois é o que impede que eles divirjam: a dica antiga da coluna
 * afirmava "ritmo à esquerda, tempo à direita" muito depois de a barra ter
 * invertido os dois, porque nada ligava aquela frase ao que ela descrevia.
 *
 * REGRA DE ESCRITA: `texto` cabe em ~180 caracteres. O quadro tem altura fixa
 * — crescendo com o texto, ele empurraria a lista de capítulos para cima a
 * cada passada do mouse.
 *
 * `comando` é opcional e traz o id do comando: o quadro lê a tecla ATUAL do
 * teclado do operador e mostra ao lado. Escrever "Space" aqui dentro viraria
 * mentira no dia em que alguém remapear.
 *
 * Só inglês por enquanto, de propósito — ver `index.ts`.
 */

export interface Ajuda {
  /** o nome do recurso: é o que a tooltip mostra, curto */
  nome: string
  /** a descrição, no quadro da coluna */
  texto: string
  /** id do comando, quando existe atalho — a tecla vem do keymap, não daqui */
  comando?: string
}

export const ajudaEn = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'About Valendo',
    texto: 'Version, credits and licence. Turns green when a newer release exists — Valendo never downloads anything on its own.'
  },
  'header.shortcuts': {
    nome: 'Shortcuts',
    texto: 'Every command and the key that runs it. Click a key to rebind it; the tooltips around the app follow whatever you set.'
  },
  'header.palette': {
    nome: 'Command search',
    texto: 'Type the name of any command and run it without hunting for its button. Faster than the mouse once you know the name.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Interface scale',
    texto: 'Grows or shrinks the operator window — text, keys, spacing together. The presenter screen never changes with it.'
  },
  'header.uiScaleSlider': {
    nome: 'Interface scale',
    texto: 'Drag to resize the whole console. Useful on a 4K panel where the default reads small from operating distance.'
  },
  'header.uiScaleReset': {
    nome: 'Back to 100%',
    texto: 'Returns the interface to its natural size. Greyed out when you are already there.'
  },
  'header.uiScaleDown': {
    nome: 'Smaller interface',
    texto: 'One click, one step of 5%. The slider crosses the whole range in a gesture, but landing on exactly 105% with it is luck.'
  },
  'header.uiScaleUp': {
    nome: 'Larger interface',
    texto: 'One click, one step of 5%. Goes up to 160% — useful on a 4K panel where the default reads small from operating distance.'
  },
  'header.dismissNotice': {
    nome: 'Dismiss this notice',
    texto: 'Clears a warning about something that already happened. A problem that is still happening has no dismiss button — it goes when it is fixed.'
  },
  'header.languageOption': {
    nome: 'Choose this language',
    texto: 'Each language is written in itself, because whoever needs to switch is the one not reading the current one.'
  },
  'header.language': {
    nome: 'Language',
    texto: 'Switches the interface language. Your script is never touched — only the labels around it.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Open project',
    texto: 'Opens a .valendo file: every tab, appearance, marker, card and pace, exactly as the machine that saved it left them.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Recent projects',
    texto: 'The last projects you opened or saved. Files that no longer exist on disk drop off the list on their own.'
  },
  'project.recentItem': {
    nome: 'Open this project',
    texto: 'Reopens it straight from disk, no file dialog. Hovering shows the full path — two projects can share a name in different folders.'
  },
  'project.saveAsItem': {
    nome: 'Save project as',
    texto: 'Always asks where to write, leaving the original untouched. From here on the new file is the one being saved.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Save project',
    texto: 'Writes the whole programme back to the .valendo already open. Asks where only the first time.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Save project as',
    texto: 'Always asks where to write, leaving the original untouched. From here on the new file is the one being saved.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'New project',
    texto: 'Starts an empty programme. Offers to save the current one first if it has changes that never reached a file.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Import script',
    texto: 'Reads .docx, .pdf, .rtf or plain text into a new tab. Formatting is stripped; chapters and directions you can mark afterwards.'
  },
  'script.save': {
    nome: 'Export script',
    texto: 'Writes the active tab out as a text file — the script alone, without the project around it.',
    comando: 'document.save'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Transport on top',
    texto: 'Puts the transport console under the tab bar, at full size — the arrangement with the most room for the clocks.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Transport as a strip',
    texto: 'Moves the transport to a slim strip at the bottom, freeing the top of the window for script and output.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Assets column',
    texto: 'Shows or hides the left column: chapters of the script, the cards of the programme and this quick help.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Cards drawer',
    texto: 'Shows or hides the drawer where images, videos and messages live — the ones you put on the presenter screen.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Settings panel',
    texto: 'Shows or hides the right panel: how the text looks, how it reads and how it leaves through the glass.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Script tab',
    texto: 'Each tab is a separate script with its own appearance and markers. Only the active one goes on air. Right-click one to duplicate, rename or close it.'
  },
  'tabs.close': {
    nome: 'Close tab',
    texto: 'Removes this script from the session. It stays in the project file until you save again.'
  },
  'tabs.new': {
    nome: 'New tab',
    texto: 'Opens an empty script alongside the current ones — a second block of the same programme, not a new project.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Blackout',
    texto: 'Kills the presenter screen to black, instantly, keeping the reading where it is. Wins over any card that is up.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Freeze',
    texto: 'Stops the text where it stands while the clock keeps running. For an unscripted break, without losing the place.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'View on network',
    texto: 'Publishes a page on the local network: any device with a browser reads the same script. Opens the panel with the address and QR code.'
  },
  'ar.webviewSound': {
    nome: 'Sound over the network',
    texto: 'Whether a video card sends its audio over the network. Off, the page never even offers to unmute. Dark until the network is up.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Identify monitors',
    texto: 'Flashes a big number on every screen so you can tell which is which. Disabled while broadcasting — it would flash on air too.'
  },
  'output.identifyRun': {
    nome: 'Show the numbers',
    texto: 'Flashes the number of each monitor for a few seconds. Nothing is sent to the presenter; it is only a label on the glass.'
  },
  'output.monitor': {
    nome: 'Choose monitor',
    texto: 'Which screen the presenter reads from. Pick it before broadcasting — this is the only thing Broadcast waits for.'
  },
  'output.broadcast': {
    nome: 'Broadcast',
    texto: 'Puts the reading on the chosen monitor, full screen. The dot is the state: dark is off, red and glowing is on air.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Back to the top',
    texto: 'Sends the reading back to the first word and resets the clocks. Keeps playing if it was already playing.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Jump back',
    texto: 'Moves the reading a few lines up without stopping — for when the presenter goes back over a sentence.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Play / Pause',
    texto: 'Starts and stops the scroll. The biggest key on the console because it is the only one you reach for without looking.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Jump forward',
    texto: 'Moves the reading a few lines down without stopping — for when the presenter skips ahead.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Create marker',
    texto: 'Drops a marker where the reading is now. Markers appear on the progress line and can be jumped to during the programme.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Reading pace',
    texto: 'Words per minute — how fast the text scrolls. The mouse wheel works anywhere in the app, not only over this ruler.'
  },
  'status.target': {
    nome: 'Target duration',
    texto: 'How long the script takes at the current pace. Click and type another one — "2:00" or plain seconds — and the pace changes to fit it.'
  },
  'transport.elapsed': {
    nome: 'Elapsed',
    texto: 'How long the reading has been running. What it counts depends on the clock mode in Settings › Output.'
  },
  'transport.remaining': {
    nome: 'Remaining',
    texto: 'How much is left at the current pace. Changing the pace changes this number immediately — that is the point of it.'
  },
  'markers.chip': {
    nome: 'Marker',
    texto: 'Click to send the reading here. Right-click removes the marker. The number is the key that jumps to it during the programme.'
  },
  'transport.progress': {
    nome: 'Progress line',
    texto: 'The whole script from edge to edge. Amber ticks are chapters, red ticks are markers you dropped by hand.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Chapter',
    texto: 'Turns the current line into a chapter — it becomes ## in the text. Chapters show up in the left column, on the progress line and in the rundown.',
    comando: 'insert.chapter'
  },
  'editor.direction': {
    nome: 'Direction',
    texto: 'Marks the line as a direction — it becomes [brackets] in the text. An instruction to the presenter, never counted as spoken words.',
    comando: 'insert.direction'
  },
  'editor.find': {
    nome: 'Find in the script',
    texto: 'Enter for the next, Shift+Enter for the previous, Esc closes on the one you see. Ignores case and accents: "acao" finds "ação". Moves the editor only — the reading position never budges.',
    comando: 'edit.find'
  },
  'editor.clearFormat': {
    nome: 'Clear formatting',
    texto: 'Turns chapters and directions back into plain text. The words stay; undo brings the marks back.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Make a presenter',
    texto: 'Select a name already written in the script and click: from there down, that person speaks — until the next name. Nothing is written into your text.'
  },
  'editor.allCaps': {
    nome: 'Caps in the editor',
    texto: 'Draws the editor in capitals without changing a single stored letter. Independent from the same switch in Settings › Text.'
  },
  'editor.undo': {
    nome: 'Undo',
    texto: 'Steps back through your edits to the script.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Redo',
    texto: 'Steps forward again through what you undid.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'Catch',
    texto: 'The reading mark follows your cursor as you type, at every pause. A Go To that never switches itself off.'
  },
  'editor.goTo': {
    nome: 'Go To',
    texto: 'Sends the reading to where the cursor is in the editor, once. For jumping to a passage you just found.'
  },
  'editor.marker': {
    nome: 'Create marker',
    texto: 'The same marker as the transport console, within reach of the script you are already looking at.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Loop',
    texto: 'On reaching the end, goes back to the top and keeps playing. For a stand or a rehearsal that must never stop.'
  },
  'editor.loopDelay': {
    nome: 'Loop delay',
    texto: 'Seconds to wait at the end before starting over. Zero restarts immediately.'
  },
  'editor.fontSmaller': {
    nome: 'Smaller type',
    texto: 'One point smaller in the editor. The presenter screen is unaffected — this is the comfort of whoever types.'
  },
  'editor.fontSize': {
    nome: 'Editor type size',
    texto: 'The size of the text you type. Nothing to do with the size the presenter reads, which lives in Settings › Text.'
  },
  'editor.fontBigger': {
    nome: 'Bigger type',
    texto: 'One point bigger in the editor. The presenter screen is unaffected — this is the comfort of whoever types.'
  },
  'editor.script': {
    nome: 'Script',
    texto: 'Type or paste here. A line starting with ## is a chapter; text in [brackets] is a direction to the presenter, never counted as spoken.'
  },
  'editor.split': {
    nome: 'Editing / Broadcast divider',
    texto: 'Drag to give more room to the script or to the preview. Double-click puts it back where it started.'
  },
  'panel.goToReading': {
    nome: 'Go to the reading',
    texto: 'Brings the editor to the word being read right now, once, and puts the cursor there. The mirror image of the Go To under the script.'
  },
  'panel.follow': {
    nome: 'Follow the reading',
    texto: 'The editor scrolls along with the broadcast and marks the line being read. It never moves your cursor, and it steps aside for 4s whenever you type or scroll.'
  },
  'panel.focusToggle': {
    nome: 'Focus mode',
    texto: 'Hides the editor and leaves the presenter view alone on screen — the arrangement for running, not writing.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Chapter',
    texto: 'Click to send the reading to the start of this chapter. The time on the right is how long it takes at the current pace.'
  },
  'sidebar.card': {
    nome: 'Card',
    texto: 'Click to put this card on the presenter screen, or to take it off if it is already there. Drag to reorder.'
  },
  'sidebar.cardOverlay': {
    nome: 'Overlay this card',
    texto: 'The text scrolls over this card instead of being replaced by it. Locked while the global OVERLAY is forcing every card.'
  },
  'sidebar.overlayGlobal': {
    nome: 'Global overlay',
    texto: 'Forces the text over EVERY card, whatever each card says. Off, each card decides for itself.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'Overlay: dark band',
    texto: 'Lays a dark band over the whole card, behind the text. The only one that guarantees legibility on any picture.'
  },
  'overlay.styleShadow': {
    nome: 'Overlay: shadow',
    texto: 'Puts a shadow around each letter instead of a band — the card stays fully visible, the text stays readable on most of them.'
  },
  'overlay.styleNone': {
    nome: 'Overlay: no treatment',
    texto: 'Text straight over the card, untreated. Only for artwork you chose knowing where the text would land.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Smaller thumbnails',
    texto: 'Shrinks the card thumbnails in this column by 10%, fitting more of the programme on screen.'
  },
  'sidebar.thumbSize': {
    nome: 'Thumbnail size',
    texto: 'How big the card pictures are in this column. A local comfort — it never travels inside the project file.'
  },
  'sidebar.thumbBigger': {
    nome: 'Bigger thumbnails',
    texto: 'Grows the card thumbnails in this column by 10%, for recognising a frame at a glance.'
  },
  'sidebar.helpToggle': {
    nome: 'Quick help',
    texto: 'Collapses this box. What you read here is whatever your mouse last pointed at — it stays until you point at something else.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Add image',
    texto: 'Copies a picture into the project, so it travels inside the .valendo and survives the machine it came from.'
  },
  'cards.addVideo': {
    nome: 'Add video',
    texto: 'Points at a video where it already lives — it is not copied. Moving or renaming that file later breaks the card.'
  },
  'cards.addText': {
    nome: 'Add message',
    texto: 'A card of plain text — a note to the presenter, big on screen. Nothing to import; you type it right here.'
  },
  'cards.addScreen': {
    nome: 'Add screen',
    texto: 'A card the app draws: a colour or a gradient, with a message over it if you want. No file, no import — a standby screen without opening an image editor.'
  },
  'cards.editScreen': {
    nome: 'Edit the screen',
    texto: 'Opens the screen with a big preview. Colour picked on a 176px tile is not the colour you get on a studio monitor.'
  },
  'cards.background': {
    nome: 'Background',
    texto: 'Flat is one colour. Gradient adds a second one and an angle to run between them.'
  },
  'cards.colours': {
    nome: 'Colours',
    texto: 'Opens the system colour picker, eyedropper included. Deep and unsaturated reads best behind teleprompter glass.'
  },
  'cards.angle': {
    nome: 'Gradient angle',
    texto: 'Which way the two colours run. 0° goes up, 90° goes right.'
  },
  'cards.screenText': {
    nome: 'Screen message',
    texto: 'What is written over the background. Where you press Enter is where it breaks on air. Leave it empty for a plain backdrop.'
  },
  'cards.screenEffect': {
    nome: 'Animated background',
    texto: 'Six ways for the two colours to move. All of them are slow on purpose — a restless background argues with whoever is reading. Each screen runs its own copy, so they are not frame-locked to each other.'
  },
  'cards.speed': {
    nome: 'Effect speed',
    texto: 'Speeds all six effects up or down together. It scales each one’s own pace rather than forcing a single duration — they were not tuned to the same number.'
  },
  'cards.intensity': {
    nome: 'Effect intensity',
    texto: 'How much the movement shows over the base colour. Low is barely there, which is what a background that stays on air for half an hour usually wants.'
  },
  'cards.fade': {
    nome: 'Where the colours meet',
    texto: 'How much of the frame the transition takes. Full is a fade from edge to edge; zero is a clean line between two solid halves.'
  },
  'cards.screenAlign': {
    nome: 'Paragraph alignment',
    texto: 'How the lines sit against each other. Independent of where the block sits on the screen — that is Place.'
  },
  'cards.size': {
    nome: 'Message size',
    texto: 'A share of the screen height, not a pixel size — so the card looks the same on the drawer tile and on a 55-inch monitor.'
  },
  'cards.place': {
    nome: 'Where it sits',
    texto: 'Top, middle or bottom. None of them touches the edge: behind glass, the last centimetre of the screen is what goes first.'
  },
  'cards.close': {
    nome: 'Close drawer',
    texto: 'Hides the cards drawer. The cards stay in the programme; only the drawer goes away.'
  },
  'cards.shortcut': {
    nome: 'Card shortcut',
    texto: 'The key that puts this card on air mid-programme. It follows the position in the drawer — reordering renumbers it.'
  },
  'cards.name': {
    nome: 'Card name',
    texto: 'What you call this card. It is what the assets column and the rundown show — the file name means nothing to you at speed.'
  },
  'cards.message': {
    nome: 'Message',
    texto: 'The text the presenter reads on this card. It is drawn large and centred, not scrolled.'
  },
  'cards.onAir': {
    nome: 'On air',
    texto: 'Puts this card on the presenter screen, or takes it off. The only two doors are this box and the video play button.'
  },
  'cards.overlay': {
    nome: 'Overlay this card',
    texto: 'The text scrolls over this card instead of being replaced by it. Locked while the global OVERLAY is forcing every card.'
  },
  'cards.remove': {
    nome: 'Delete card',
    texto: 'Removes this card from the programme. Imported pictures are cleaned from the project folder when you save.'
  },
  'cards.relink': {
    nome: 'Relink file',
    texto: 'The file this card points at is gone — moved, renamed or on a drive that is not here. Click to point the card at it again.'
  },
  'cards.videoNetwork': {
    nome: 'Video on the network',
    texto: 'Whether browsers on the network can play this file. Some formats a browser refuses even though the app plays them fine.'
  },
  'cards.videoPlay': {
    nome: 'Play video',
    texto: 'Off air, this puts the card up and starts it. On air, it plays and pauses what is already running.'
  },
  'cards.videoStartPaused': {
    nome: 'Put up paused',
    texto: 'Sends the card to the screen frozen on the current frame — for lining a shot up before it actually runs.'
  },
  'cards.videoSeek': {
    nome: 'Video position',
    texto: 'Drag to scrub the video. It moves on the presenter screen too, so scrubbing on air is scrubbing on air.'
  },
  'cards.videoMute': {
    nome: 'Mute',
    texto: 'Silences card audio on this machine and puts it back at the volume you had. Network sound has its own switch.'
  },
  'cards.videoVolume': {
    nome: 'Card volume',
    texto: 'How loud video cards play on this machine. A local preference — it never travels inside the project file.'
  },
  'cards.videoLoop': {
    nome: 'Repeat video',
    texto: 'This clip starts over on reaching the end, for as long as the card is up.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Text',
    texto: 'How the presenter screen is drawn: typeface, size, weight, alignment and colours.'
  },
  'insp.tabReading': {
    nome: 'Reading',
    texto: 'How the text reads: where it sits, how many words per line, where the reading mark is and how the pace behaves.'
  },
  'insp.tabOutput': {
    nome: 'Output',
    texto: 'What only exists on the presenter screen: the clocks and the mirroring the glass of a real teleprompter needs.'
  },
  'insp.font': {
    nome: 'Typeface',
    texto: 'The family the presenter reads. The ones offered are the ones that survive being read at distance, in mirror.'
  },
  'insp.allCaps': {
    nome: 'Caps on output',
    texto: 'Draws the presenter screen in capitals without changing a stored letter. Independent from the editor switch.'
  },
  'insp.body': {
    nome: 'Type size',
    texto: 'How big the presenter reads. The single most important number here — everything else is adjustment around it.'
  },
  'insp.weight': {
    nome: 'Type weight',
    texto: 'How heavy the strokes are. Heavier survives a bright room; lighter is calmer on a dark glass.'
  },
  'insp.lineHeight': {
    nome: 'Line height',
    texto: 'The distance between lines. Loose reads calmer and scrolls smoother; tight fits more of the text on screen.'
  },
  'insp.letterSpacing': {
    nome: 'Letter spacing',
    texto: 'The air between letters. A touch of it helps at distance; too much breaks words apart.'
  },
  'insp.align': {
    nome: 'Alignment',
    texto: 'Where each line sits inside the text box. Independent from Position, which moves the box itself.'
  },
  'insp.textColor': {
    nome: 'Text colour',
    texto: 'The colour of the words on the presenter screen.'
  },
  'insp.bgColor': {
    nome: 'Background colour',
    texto: 'The colour behind the words. On a real prompter glass, the darker it is, the less of the room reflects back.'
  },
  'insp.preset': {
    nome: 'Colour palette',
    texto: 'A tested text-and-background pair. Touching either colour by hand afterwards simply unselects the palette.'
  },
  'insp.invert': {
    nome: 'Invert',
    texto: 'Swaps text and background colours — light on dark becomes dark on light, in one click.'
  },
  'insp.presenterHide': {
    nome: 'Hide this name',
    texto: 'Takes this presenter’s name off the presenter screen — the speech stays, in their colour. Your script is never touched.'
  },
  'insp.presenterHideAll': {
    nome: 'Hide every name',
    texto: 'Takes every presenter name off the output at once, and locks the individual switches while it rules. The editor always keeps them.'
  },
  'insp.presenterRename': {
    nome: 'Rename presenter',
    texto: 'Double-click to rename. It rewrites the name in the script too — only the cue lines, never a mention inside a speech. One undo puts both back.'
  },
  'insp.presenterRelink': {
    nome: 'Relink presenter',
    texto: 'The name changed in the script. Select the new one in the editor and click: same presenter, same colour, new name — nothing already painted is lost.'
  },
  'insp.presenterRemove': {
    nome: 'Remove presenter',
    texto: 'Drops this presenter. The words stay exactly as they are — only the colour goes.'
  },
  'insp.position': {
    nome: 'Horizontal position',
    texto: 'Slides the whole text box left or right without resizing it. Snaps to the exact centre near 50%.'
  },
  'insp.presentersToggle': {
    nome: 'Presenters',
    texto: 'Who speaks this script, and in which colour. Closed, the dots still tell you how many are registered and which colours they carry.'
  },
  'insp.presetsToggle': {
    nome: 'Presets',
    texto: 'Five places to keep a whole look — type, colours, margins and the presenters. Closed, it still shows the one new tabs are born with.'
  },
  'insp.presetSlot': {
    nome: 'A preset',
    texto: 'One click dresses this tab in it. Right-click to rename, recolour, star or delete. Ctrl+Z undoes an application in one step.'
  },
  'insp.presetSave': {
    nome: 'Save preset',
    texto: 'Photographs the active tab, then asks which of the five to keep it in. Two steps on purpose: writing over a named preset should not happen by a stray click.'
  },
  'insp.margin': {
    nome: 'Margin',
    texto: 'How much of the screen edge stays empty on each side. Narrower text means shorter lines and fewer eye movements.'
  },
  'insp.minWords': {
    nome: 'Minimum words per line',
    texto: 'The floor for how few words a line may hold. Valendo breaks the text by sense, not by the width of the screen.'
  },
  'insp.maxWords': {
    nome: 'Maximum words per line',
    texto: 'The ceiling for how many words a line may hold. Too high and lines wrap on their own, which the panel warns about.'
  },
  'insp.readingMark': {
    nome: 'Reading mark',
    texto: 'How far down the screen the presenter reads. Higher up gives more text below to see coming.'
  },
  'insp.markOnOutput': {
    nome: 'Mark on output',
    texto: 'Whether the reading mark is drawn on the presenter screen as well. It is always drawn here in the preview.'
  },
  'insp.focusDim': {
    nome: 'Dim the rest',
    texto: 'Fades what is far from the reading mark, so the eye lands on the current line instead of wandering.'
  },
  'insp.focusDimPct': {
    nome: 'Dim amount',
    texto: 'How strong the fade is. Low leaves a wide readable window around the mark; high narrows it to a slit. The window follows the mark wherever you put it.'
  },
  'insp.uniform': {
    nome: 'Constant speed',
    texto: 'Every line gets the same time, whatever it weighs. Off, a heavy line takes longer than a short one — closer to real speech.'
  },
  'insp.wrappingFix': {
    nome: 'Fix the type size',
    texto: 'Shrinks the type to the largest size where no line wraps on its own, ending the mismatch the warning describes.'
  },
  'insp.clockElapsed': {
    nome: 'Elapsed clock',
    texto: 'Shows the elapsed time on the presenter screen — the one the presenter watches, not the one on your console.'
  },
  'insp.clockElapsedColor': {
    nome: 'Elapsed colour',
    texto: 'The colour of the elapsed clock on the presenter screen.'
  },
  'insp.clockRemaining': {
    nome: 'Remaining clock',
    texto: 'Shows the time left on the presenter screen — the number that tells them to speed up or take their time.'
  },
  'insp.clockRemainingColor': {
    nome: 'Remaining colour',
    texto: 'The colour of the remaining clock on the presenter screen.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Clock: from the script',
    texto: 'Elapsed and remaining come from the words read and the current pace. Change the pace and both numbers change with it.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Clock: stopwatch',
    texto: 'Elapsed counts real seconds from the moment you press play; remaining counts down from the target time you set below.'
  },
  'insp.clockModeFree': {
    nome: 'Clock: free',
    texto: 'The clocks run against the target independently of the script — for a live segment where the words are not the plan.'
  },
  'insp.clockTarget': {
    nome: 'Target time',
    texto: 'How long the piece should take. Type the digits and the colons place themselves — "320" becomes 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Clock position',
    texto: 'Which corner of the presenter screen the clocks sit in. The grid has the shape of the screen itself.'
  },
  'insp.clockSize': {
    nome: 'Clock size',
    texto: 'How big the clocks are, as a share of the screen height. Big enough to read, small enough not to fight the text.'
  },
  'insp.mirrorH': {
    nome: 'Mirror horizontally',
    texto: 'Flips the presenter screen left to right — what the beam-splitter glass in front of the lens needs. Your preview and the network page stay unmirrored, so you can read them.'
  },
  'insp.mirrorV': {
    nome: 'Mirror vertically',
    texto: 'Flips the presenter screen top to bottom, for rigs where the monitor faces up into the glass. Your preview and the network page are never mirrored.'
  },
  'insp.rotation': {
    nome: 'Rotation',
    texto: 'Turns the presenter screen in quarter turns — for a monitor mounted on its side. Your preview and the network page keep the upright image.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Editor and presenter view side by side — the arrangement for writing and running at the same time.'
  },
  'status.modeFocus': {
    nome: 'Focus',
    texto: 'The presenter view alone, as large as the window allows. For running a script that is already finished.'
  },
  'status.modeDeck': {
    nome: 'Deck',
    texto: 'Swaps the editor for the rundown: every chapter with its duration, for following a long programme.'
  },
  'status.storage': {
    nome: 'Save state',
    texto: 'Says whether Valendo is managing to write your work to disk. It turns amber the moment it cannot — silence would look the same as working.'
  },
  'status.palette': {
    nome: 'Command palette',
    texto: 'Every command in the app, searchable by name, with its shortcut beside it. The fastest way to find something you use rarely.',
    comando: 'palette.open'
  }
} as const satisfies Record<string, Ajuda>
