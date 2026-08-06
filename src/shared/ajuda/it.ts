import type { Ajuda } from './en'

export const ajudaIt = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'Informazioni su Valendo',
    texto: 'Versione, crediti e licenza. Diventa verde quando esiste una versione più recente — Valendo non scarica mai nulla da solo.'
  },
  'header.shortcuts': {
    nome: 'Scorciatoie',
    texto: 'Ogni comando e il tasto che lo esegue. Clicca un tasto per riassegnarlo; i suggerimenti dell’app seguono quello che imposti.'
  },
  'header.palette': {
    nome: 'Ricerca comandi',
    texto: 'Scrivi il nome di un comando ed eseguilo senza cercare il suo pulsante. Più veloce del mouse, una volta che sai il nome.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Scala dell’interfaccia',
    texto: 'Ingrandisce o rimpicciolisce la finestra dell’operatore — testo, tasti e spaziatura insieme. Lo schermo del presentatore non cambia mai.'
  },
  'header.uiScaleSlider': {
    nome: 'Scala dell’interfaccia',
    texto: 'Trascina per ridimensionare tutta la consolle. Utile su un pannello 4K, dove la dimensione predefinita si legge piccola a distanza operativa.'
  },
  'header.uiScaleReset': {
    nome: 'Torna al 100%',
    texto: 'Riporta l’interfaccia alla dimensione naturale. In grigio quando sei già lì.'
  },
  'header.uiScaleDown': {
    nome: 'Riduci l’interfaccia',
    texto: 'Un clic, uno scatto del 5%. Il cursore attraversa tutta la fascia in un gesto, ma centrare esattamente il 105% è fortuna.'
  },
  'header.uiScaleUp': {
    nome: 'Ingrandisci l’interfaccia',
    texto: 'Un clic, uno scatto del 5%. Fino al 160% — utile su un pannello 4K, dove la dimensione normale si legge piccola a distanza di lavoro.'
  },
  'header.dismissNotice': {
    nome: 'Ignora questo avviso',
    texto: 'Cancella un avviso su qualcosa già successo. Un problema ancora in corso non ha un pulsante per ignorarlo — sparisce quando è risolto.'
  },
  'header.languageOption': {
    nome: 'Scegli questa lingua',
    texto: 'Ogni lingua è scritta in se stessa, perché chi ha bisogno di cambiarla è proprio chi non legge quella attuale.'
  },
  'header.language': {
    nome: 'Lingua',
    texto: 'Cambia la lingua dell’interfaccia. Il copione non viene mai toccato — solo le etichette intorno a esso.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Apri progetto',
    texto: 'Apre un file .valendo: ogni scheda, aspetto, segnalibro, cartello e ritmo, esattamente come li ha lasciati la macchina che l’ha salvato.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Progetti recenti',
    texto: 'Gli ultimi progetti aperti o salvati. I file non più presenti sul disco escono dall’elenco da soli.'
  },
  'project.recentItem': {
    nome: 'Apri questo progetto',
    texto: 'Lo riapre direttamente dal disco, senza finestra di dialogo. Passando il mouse vedi il percorso intero — due progetti possono avere lo stesso nome.'
  },
  'project.saveAsItem': {
    nome: 'Salva progetto con nome',
    texto: 'Chiede sempre dove scrivere, lasciando intatto l’originale. Da qui in poi è il nuovo file quello che viene salvato.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Salva progetto',
    texto: 'Scrive tutto il programma nel .valendo già aperto. Chiede dove salvare solo la prima volta.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Salva progetto con nome',
    texto: 'Chiede sempre dove scrivere, lasciando intatto l’originale. Da qui in poi è il nuovo file quello che viene salvato.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'Nuovo progetto',
    texto: 'Avvia un programma vuoto. Propone di salvare prima quello attuale se ha modifiche mai arrivate a un file.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Importa copione',
    texto: 'Legge .docx, .pdf, .rtf o testo semplice in una scheda nuova. La formattazione viene rimossa; capitoli e indicazioni si segnano dopo.'
  },
  'script.save': {
    nome: 'Esporta copione',
    texto: 'Scrive la scheda attiva come file di testo — solo il copione, senza il progetto intorno.',
    comando: 'document.save'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Trasporto in alto',
    texto: 'Mette la consolle di trasporto sotto la barra delle schede, a piena dimensione — la disposizione con più spazio per gli orologi.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Trasporto come barra sottile',
    texto: 'Sposta il trasporto in una barra sottile in basso, liberando la parte alta della finestra per copione e uscita.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Colonna Assets',
    texto: 'Mostra o nasconde la colonna a sinistra: capitoli del copione, cartelli del programma e questo aiuto rapido.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Cassetto dei cartelli',
    texto: 'Mostra o nasconde il cassetto dove vivono immagini, video e messaggi — quelli che metti sullo schermo del presentatore.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Pannello impostazioni',
    texto: 'Mostra o nasconde il pannello a destra: come appare il testo, come si legge e come esce attraverso il vetro.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Scheda di copione',
    texto: 'Ogni scheda è un copione separato, con aspetto e segnalibri propri. Solo quella attiva va in onda. Clic destro per duplicarla, rinominarla o chiuderla.'
  },
  'tabs.close': {
    nome: 'Chiudi scheda',
    texto: 'Rimuove questo copione dalla sessione. Resta nel file di progetto finché non salvi di nuovo.'
  },
  'tabs.new': {
    nome: 'Nuova scheda',
    texto: 'Apre un copione vuoto accanto a quelli attuali — un secondo blocco dello stesso programma, non un nuovo progetto.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Schermo nero',
    texto: 'Spegne subito al nero lo schermo del presentatore, mantenendo la lettura dov’è. Prevale su qualsiasi cartello attivo.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Congela',
    texto: 'Ferma il testo dov’è mentre l’orologio continua. Per una pausa non prevista, senza perdere il punto.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'Guarda sulla rete',
    texto: 'Pubblica una pagina sulla rete locale: ogni dispositivo con un browser legge lo stesso copione. Apre il pannello con indirizzo e codice QR.'
  },
  'ar.webviewSound': {
    nome: 'Audio sulla rete',
    texto: 'Se un cartello video manda il suo audio sulla rete. Spento, la pagina non offre nemmeno di riattivarlo. Scuro finché la rete non è attiva.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Identifica i monitor',
    texto: 'Fa lampeggiare un numero grande su ogni schermo, per distinguerli. Disattivato durante la trasmissione — lampeggerebbe anche in onda.'
  },
  'output.identifyRun': {
    nome: 'Mostra i numeri',
    texto: 'Fa lampeggiare il numero di ogni monitor per qualche secondo. Non arriva nulla al presentatore; è solo un’etichetta sul vetro.'
  },
  'output.monitor': {
    nome: 'Scegli monitor',
    texto: 'Su quale schermo legge il presentatore. Scegli prima di trasmettere — è l’unica cosa che Trasmetti aspetta.'
  },
  'output.broadcast': {
    nome: 'Trasmetti',
    texto: 'Manda la lettura sul monitor scelto, a schermo intero. Il pallino è lo stato: scuro è spento, rosso acceso è in onda.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Torna all’inizio',
    texto: 'Riporta la lettura alla prima parola e azzera gli orologi. Continua a scorrere se stava già scorrendo.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Salta indietro',
    texto: 'Sposta la lettura di qualche riga indietro senza fermarsi — per quando il presentatore torna su una frase.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Avvia / Pausa',
    texto: 'Avvia e ferma lo scorrimento. Il tasto più grande della consolle, perché è l’unico che cerchi senza guardare.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Salta avanti',
    texto: 'Sposta la lettura di qualche riga avanti senza fermarsi — per quando il presentatore salta in avanti.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Crea segnalibro',
    texto: 'Mette un segnalibro dove si trova ora la lettura. I segnalibri appaiono sulla linea di avanzamento e si possono raggiungere durante il programma.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Ritmo di lettura',
    texto: 'Parole al minuto — quanto veloce scorre il testo. La rotellina del mouse funziona ovunque nell’app, non solo su questo righello.'
  },
  'status.target': {
    nome: 'Durata obiettivo',
    texto: 'Quanto dura il copione al ritmo attuale. Clicca e scrivine un’altra — "2:00" o solo i secondi — e il ritmo cambia per adattarsi.'
  },
  'transport.elapsed': {
    nome: 'Trascorso',
    texto: 'Da quanto tempo va avanti la lettura. Ciò che conta dipende dalla modalità dell’orologio in Impostazioni › Uscita.'
  },
  'transport.remaining': {
    nome: 'Restante',
    texto: 'Quanto manca al ritmo attuale. Cambiare il ritmo cambia subito questo numero — è proprio questo il suo scopo.'
  },
  'markers.chip': {
    nome: 'Segnalibro',
    texto: 'Clicca per mandare qui la lettura. Clic destro rimuove il segnalibro. Il numero è il tasto che ci salta durante il programma.'
  },
  'transport.progress': {
    nome: 'Linea di avanzamento',
    texto: 'Tutto il copione da un capo all’altro. I trattini ambra sono i capitoli, quelli rossi i segnalibri messi a mano.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Capitolo',
    texto: 'Trasforma la riga attuale in un capitolo — diventa ## nel testo. I capitoli appaiono nella colonna a sinistra, sulla linea di avanzamento e nella scaletta.',
    comando: 'insert.chapter'
  },
  'editor.chapterAll': {
    nome: 'Tutte le righe uguali',
    texto: 'Rende capitolo ogni riga il cui testo INTERO è uguale alla selezione, in un solo passo. Una parola dentro una frase non entra mai.'
  },
  'editor.direction': {
    nome: 'Indicazione',
    texto: 'Segna la riga come indicazione — diventa [parentesi] nel testo. Un’istruzione per il presentatore, mai contata come parole dette.',
    comando: 'insert.direction'
  },
  'editor.find': {
    nome: 'Cerca nel copione',
    texto: 'Invio per la successiva, Maiusc+Invio per la precedente, Esc chiude su quella che vedi. Ignora maiuscole e accenti. Muove solo l’editor — la lettura non si sposta.',
    comando: 'edit.find'
  },
  'editor.replace': {
    nome: 'Sostituisci con',
    texto: 'Che cosa prende il posto di quello che hai trovato. Invio sostituisce quella attuale, Maiusc+Invio tutte. Sostituire tutte è UN passo di annulla, non trenta.'
  },
  'editor.findAll': {
    nome: 'Segna tutte le occorrenze',
    texto: 'Disegna il riquadro su tutte insieme, quella attuale più forte. Utile prima di sostituire tutte: vedi che cosa cambierà.'
  },
  'editor.overwrite': {
    nome: 'Colorare sopra le battute',
    texto: 'Spento, colorare tutte salta le righe che hanno già il colore di un presentatore: quel colore è un sistema su cui chi legge conta. Acceso, colora anche quelle.'
  },
  'editor.bold': {
    nome: 'Grassetto',
    texto: 'Grassetto vero sullo schermo del presentatore. In questo editor appare come doppia sottolineatura — il grassetto è più largo e il campo invisibile dietro si sposterebbe.'
  },
  'editor.italic': {
    nome: 'Corsivo',
    texto: 'Corsivo vero sullo schermo del presentatore; qui una sottolineatura ondulata, per lo stesso motivo del grassetto.'
  },
  'editor.underline': {
    nome: 'Sottolineato',
    texto: 'Uguale in entrambi — sottolineare non cambia la larghezza di nessuna lettera.'
  },
  'editor.color': {
    nome: 'Colore del testo',
    texto: 'Apre la tavolozza: 71 tonalità, più le ultime quattro che hai usato. Vale per ciò che è selezionato nel copione.'
  },
  'editor.findStep': {
    nome: 'Occorrenza precedente / successiva',
    texto: 'Scorre le occorrenze senza toccare la posizione di lettura: il presentatore non vede saltare lo schermo.'
  },
  'editor.replaceToFind': {
    nome: 'Porta nella ricerca',
    texto: 'Taglia il testo di Sostituisci e lo rende il termine cercato. Dopo una sostituzione, così si trova la parola nuova senza riscriverla.'
  },
  'editor.apply': {
    nome: 'Applica',
    texto: 'Fa tutto ciò che è spuntato sopra, in un passo solo: sostituire, colorare o entrambi. A sinistra questa occorrenza, a destra tutte.'
  },
  'editor.findClose': {
    nome: 'Chiudi la ricerca',
    texto: 'Lascia il cursore sull’occorrenza che stavi guardando, per continuare a scrivere lì. Esc fa lo stesso.'
  },
  'editor.paintWith': {
    nome: 'Colorare le occorrenze',
    texto: 'Spuntato, applicare colora anche ciò che è stato trovato. Con Sostituisci, il colore va sulla parola NUOVA, non su quella sparita.'
  },
  'editor.recentColors': {
    nome: 'Colori recenti',
    texto: 'Gli ultimi quattro scelti, a ruota: un colore nuovo occupa la casella seguente e riparte dalla prima. Il punteggiato toglie il colore.'
  },
  'editor.clearFormat': {
    nome: 'Rimuovi formattazione',
    texto: 'Riporta capitoli e indicazioni a testo semplice. Le parole restano; annulla le riporta.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Crea presentatore',
    texto: 'Seleziona un nome già scritto nel copione e clicca: da lì in poi parla quella persona, fino al nome successivo. Nulla viene scritto nel tuo testo.'
  },
  'editor.allCaps': {
    nome: 'Maiuscole nell’editor',
    texto: 'Disegna l’editor in maiuscolo senza cambiare una sola lettera salvata. Indipendente dallo stesso interruttore in Impostazioni › Testo.'
  },
  'editor.undo': {
    nome: 'Annulla',
    texto: 'Torna indietro tra le modifiche fatte al copione.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Ripeti',
    texto: 'Va avanti di nuovo tra ciò che hai annullato.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'Catch',
    texto: 'Il segno di lettura segue il cursore mentre scrivi, a ogni pausa. Un Vai A che non si spegne mai da solo.'
  },
  'editor.goTo': {
    nome: 'Vai A',
    texto: 'Manda la lettura dove si trova il cursore nell’editor, una volta sola. Per saltare a un passaggio appena trovato.'
  },
  'editor.marker': {
    nome: 'Crea segnalibro',
    texto: 'Lo stesso segnalibro della consolle di trasporto, a portata di mano mentre guardi già il copione.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Loop',
    texto: 'Arrivato alla fine, torna all’inizio e continua a scorrere. Per uno stand o una prova che non deve mai fermarsi.'
  },
  'editor.loopDelay': {
    nome: 'Attesa del loop',
    texto: 'Secondi da aspettare alla fine prima di ricominciare. Zero riparte subito.'
  },
  'editor.fontSmaller': {
    nome: 'Carattere più piccolo',
    texto: 'Un punto più piccolo nell’editor. Lo schermo del presentatore non cambia — è la comodità di chi scrive.'
  },
  'editor.fontSize': {
    nome: 'Dimensione carattere editor',
    texto: 'La dimensione del testo che scrivi. Non ha nulla a che fare con quella letta dal presentatore, che sta in Impostazioni › Testo.'
  },
  'editor.fontBigger': {
    nome: 'Carattere più grande',
    texto: 'Un punto più grande nell’editor. Lo schermo del presentatore non cambia — è la comodità di chi scrive.'
  },
  'editor.script': {
    nome: 'Copione',
    texto: 'Scrivi o incolla qui. Una riga che inizia con ## è un capitolo; il testo tra [parentesi] è un’indicazione, mai contata come parlato.'
  },
  'editor.split': {
    nome: 'Divisore modifica / trasmissione',
    texto: 'Trascina per dare più spazio al copione o all’anteprima. Doppio clic lo rimette al centro.'
  },
  'panel.goToReading': {
    nome: 'Vai alla lettura',
    texto: 'Porta l’editor alla parola letta in questo momento, una volta sola, e mette lì il cursore. L’immagine speculare del Vai A sotto il copione.'
  },
  'panel.follow': {
    nome: 'Segui la lettura',
    texto: 'L’editor scorre insieme alla trasmissione e segna la riga letta. Non sposta mai il cursore, e si mette da parte per 4s quando scrivi o scorri.'
  },
  'panel.focusToggle': {
    nome: 'Modo focus',
    texto: 'Nasconde l’editor e lascia sullo schermo solo la vista del presentatore — la disposizione per andare in onda, non per scrivere.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Capitolo',
    texto: 'Clicca per mandare la lettura all’inizio di questo capitolo. Il tempo a destra è quanto dura al ritmo attuale.'
  },
  'sidebar.card': {
    nome: 'Cartello',
    texto: 'Clicca per mettere questo cartello sullo schermo del presentatore, o per toglierlo se è già lì. Trascina per riordinare.'
  },
  'sidebar.cardOverlay': {
    nome: 'Sovrapponi questo cartello',
    texto: 'Il testo scorre sopra questo cartello invece di sostituirlo. Bloccato mentre l’OVERLAY globale forza ogni cartello.'
  },
  'sidebar.overlayGlobal': {
    nome: 'Overlay globale',
    texto: 'Forza il testo sopra OGNI cartello, qualunque cosa dica ciascuno. Spento, ogni cartello decide da sé.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'Overlay: fascia scura',
    texto: 'Stende una fascia scura su tutto il cartello, dietro al testo. L’unico che garantisce leggibilità su qualsiasi immagine.'
  },
  'overlay.styleShadow': {
    nome: 'Overlay: ombra',
    texto: 'Mette un’ombra intorno a ogni lettera invece di una fascia — il cartello resta pienamente visibile, il testo resta leggibile sulla maggior parte.'
  },
  'overlay.styleNone': {
    nome: 'Overlay: nessun trattamento',
    texto: 'Testo direttamente sul cartello, senza trattamento. Solo per grafiche scelte sapendo dove sarebbe finito il testo.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Miniature più piccole',
    texto: 'Rimpicciolisce del 10% le miniature dei cartelli in questa colonna, per farne stare di più a schermo.'
  },
  'sidebar.thumbSize': {
    nome: 'Dimensione miniature',
    texto: 'Quanto grandi sono le immagini dei cartelli in questa colonna. Una comodità locale — non viaggia mai dentro il file di progetto.'
  },
  'sidebar.thumbBigger': {
    nome: 'Miniature più grandi',
    texto: 'Ingrandisce del 10% le miniature dei cartelli in questa colonna, per riconoscere un fotogramma a colpo d’occhio.'
  },
  'sidebar.helpToggle': {
    nome: 'Aiuto rapido',
    texto: 'Comprime questo riquadro. Quello che leggi qui è l’ultima cosa puntata dal mouse — resta finché non punti qualcos’altro.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Aggiungi immagine',
    texto: 'Copia un’immagine nel progetto, così viaggia dentro il .valendo e sopravvive alla macchina da cui viene.'
  },
  'cards.addVideo': {
    nome: 'Aggiungi video',
    texto: 'Punta a un video dove già si trova — non viene copiato. Spostare o rinominare quel file in seguito rompe il cartello.'
  },
  'cards.addText': {
    nome: 'Aggiungi messaggio',
    texto: 'Un cartello di solo testo — un appunto per il presentatore, grande sullo schermo. Niente da importare; lo scrivi qui.'
  },
  'cards.addScreen': {
    nome: 'Aggiungi schermata',
    texto: 'Un cartello disegnato dall’app: un colore o una sfumatura, con un messaggio sopra se vuoi. Nessun file, nessuna importazione — una schermata di attesa.'
  },
  'cards.editScreen': {
    nome: 'Modifica la schermata',
    texto: 'Apre la schermata con un’anteprima grande. Il colore scelto su un riquadro di 176px non è quello che ottieni su un monitor da studio.'
  },
  'cards.background': {
    nome: 'Sfondo',
    texto: 'Pieno è un solo colore. Sfumatura ne aggiunge un secondo e un angolo lungo cui passare tra i due.'
  },
  'cards.colours': {
    nome: 'Colori',
    texto: 'Apre il selettore di colore del sistema, contagocce incluso. Profondo e desaturato si legge meglio dietro il vetro del teleprompter.'
  },
  'cards.angle': {
    nome: 'Angolo della sfumatura',
    texto: 'In che direzione corrono i due colori. 0° va in alto, 90° va a destra.'
  },
  'cards.screenText': {
    nome: 'Messaggio della schermata',
    texto: 'Cosa è scritto sopra lo sfondo. Dove premi Invio, lì si spezza in onda. Lascialo vuoto per uno sfondo semplice.'
  },
  'cards.screenEffect': {
    nome: 'Sfondo animato',
    texto: 'Sei modi in cui i due colori si muovono. Tutti lenti apposta — uno sfondo irrequieto disturba chi legge. Ogni schermo esegue una copia propria, senza sincronia tra loro.'
  },
  'cards.speed': {
    nome: 'Velocità dell’effetto',
    texto: 'Accelera o rallenta insieme tutti e sei gli effetti. Scala il ritmo proprio di ciascuno invece di imporre una sola durata — non sono tarati sullo stesso numero.'
  },
  'cards.intensity': {
    nome: 'Intensità dell’effetto',
    texto: 'Quanto si vede il movimento sopra il colore di base. Bassa è quasi impercettibile, ciò che di solito serve a uno sfondo in onda per mezz’ora.'
  },
  'cards.fade': {
    nome: 'Dove si incontrano i colori',
    texto: 'Quanto dell’inquadratura occupa la transizione. Piena è una dissolvenza da un bordo all’altro; zero è una linea netta tra due metà piene.'
  },
  'cards.screenAlign': {
    nome: 'Allineamento del paragrafo',
    texto: 'Come le righe si dispongono tra loro. Indipendente da dove sta il blocco sullo schermo — quello è Posizione.'
  },
  'cards.size': {
    nome: 'Dimensione del messaggio',
    texto: 'Una quota dell’altezza dello schermo, non una dimensione in pixel — così il cartello appare uguale sulla miniatura e su un monitor da 55 pollici.'
  },
  'cards.place': {
    nome: 'Dove si trova',
    texto: 'Alto, centro o basso. Nessuno tocca il bordo: dietro il vetro, l’ultimo centimetro dello schermo è il primo a sparire.'
  },
  'cards.close': {
    nome: 'Chiudi cassetto',
    texto: 'Nasconde il cassetto dei cartelli. I cartelli restano nel programma; sparisce solo il cassetto.'
  },
  'cards.shortcut': {
    nome: 'Scorciatoia del cartello',
    texto: 'Il tasto che manda in onda questo cartello a metà programma. Segue la posizione nel cassetto — riordinare lo rinumera.'
  },
  'cards.name': {
    nome: 'Nome del cartello',
    texto: 'Come chiami questo cartello. È quello che mostrano la colonna Assets e la scaletta — il nome del file non dice nulla mentre corri.'
  },
  'cards.message': {
    nome: 'Messaggio',
    texto: 'Il testo che il presentatore legge su questo cartello. È disegnato grande e centrato, non scorre.'
  },
  'cards.onAir': {
    nome: 'In onda',
    texto: 'Mette questo cartello sullo schermo del presentatore, o lo toglie. Le uniche due porte sono questa casella e il tasto play del video.'
  },
  'cards.overlay': {
    nome: 'Sovrapponi questo cartello',
    texto: 'Il testo scorre sopra questo cartello invece di sostituirlo. Bloccato mentre l’OVERLAY globale forza ogni cartello.'
  },
  'cards.remove': {
    nome: 'Elimina cartello',
    texto: 'Rimuove questo cartello dal programma. Le immagini importate vengono ripulite dalla cartella del progetto al salvataggio.'
  },
  'cards.relink': {
    nome: 'Ricollega file',
    texto: 'Il file a cui punta questo cartello non c’è più — spostato, rinominato o su un disco non presente. Clicca per farlo puntare di nuovo lì.'
  },
  'cards.videoNetwork': {
    nome: 'Video sulla rete',
    texto: 'Se i browser sulla rete possono riprodurre questo file. Alcuni formati un browser li rifiuta, anche se l’app li riproduce bene.'
  },
  'cards.videoPlay': {
    nome: 'Riproduci video',
    texto: 'Fuori onda, mette su il cartello e lo avvia. In onda, avvia e mette in pausa quello già in corso.'
  },
  'cards.videoStartPaused': {
    nome: 'Mostra in pausa',
    texto: 'Manda il cartello sullo schermo fermo sul fotogramma attuale — per inquadrare uno scatto prima che parta davvero.'
  },
  'cards.videoSeek': {
    nome: 'Posizione del video',
    texto: 'Trascina per scorrere il video. Si muove anche sullo schermo del presentatore, quindi scorrerlo è farlo anche in onda.'
  },
  'cards.videoMute': {
    nome: 'Silenzia',
    texto: 'Silenzia l’audio del cartello su questa macchina e lo ripristina al volume di prima. L’audio in rete ha un interruttore proprio.'
  },
  'cards.videoVolume': {
    nome: 'Volume del cartello',
    texto: 'Quanto forte suonano i cartelli video su questa macchina. Una preferenza locale — non viaggia mai dentro il file di progetto.'
  },
  'cards.videoLoop': {
    nome: 'Ripeti video',
    texto: 'Questa clip ricomincia una volta arrivata alla fine, per tutto il tempo in cui il cartello resta su.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Testo',
    texto: 'Come viene disegnato lo schermo del presentatore: carattere, corpo, spessore, allineamento e colori.'
  },
  'insp.tabReading': {
    nome: 'Lettura',
    texto: 'Come si legge il testo: dove si trova, quante parole per riga, dov’è il segno di lettura e come si comporta il ritmo.'
  },
  'insp.tabOutput': {
    nome: 'Uscita',
    texto: 'Ciò che esiste solo sullo schermo del presentatore: gli orologi e lo specchiamento richiesti dal vetro di un vero teleprompter.'
  },
  'insp.font': {
    nome: 'Carattere',
    texto: 'La famiglia che legge il presentatore. Quelle proposte sono quelle che reggono la lettura a distanza, specchiate.'
  },
  'insp.allCaps': {
    nome: 'Maiuscole in uscita',
    texto: 'Disegna lo schermo del presentatore in maiuscolo senza cambiare una lettera salvata. Indipendente dall’interruttore dell’editor.'
  },
  'insp.body': {
    nome: 'Corpo del testo',
    texto: 'Quanto grande legge il presentatore. Il numero più importante di tutti — il resto è aggiustamento intorno a esso.'
  },
  'insp.weight': {
    nome: 'Spessore del carattere',
    texto: 'Quanto sono spessi i tratti. Più pesante regge in una stanza luminosa; più leggero è più calmo su un vetro scuro.'
  },
  'insp.lineHeight': {
    nome: 'Interlinea',
    texto: 'La distanza tra le righe. Ampia si legge più calma e scorre più morbida; stretta fa stare più testo a schermo.'
  },
  'insp.letterSpacing': {
    nome: 'Spaziatura tra lettere',
    texto: 'Lo spazio tra le lettere. Un tocco aiuta a distanza; troppo spezza le parole.'
  },
  'insp.align': {
    nome: 'Allineamento',
    texto: 'Dove sta ogni riga dentro il riquadro di testo. Indipendente da Posizione, che sposta il riquadro stesso.'
  },
  'insp.textColor': {
    nome: 'Colore del testo',
    texto: 'Il colore delle parole sullo schermo del presentatore.'
  },
  'insp.bgColor': {
    nome: 'Colore dello sfondo',
    texto: 'Il colore dietro le parole. Su un vero vetro da prompter, più è scuro, meno la stanza si riflette.'
  },
  'insp.preset': {
    nome: 'Palette di colori',
    texto: 'Una coppia testo-sfondo già collaudata. Toccare uno dei due colori a mano dopo deseleziona semplicemente la palette.'
  },
  'insp.invert': {
    nome: 'Inverti',
    texto: 'Scambia i colori di testo e sfondo — chiaro su scuro diventa scuro su chiaro, in un clic.'
  },
  'insp.presenterHide': {
    nome: 'Nascondi questo nome',
    texto: 'Toglie il nome di questo presentatore dallo schermo del presentatore — il discorso resta, nel suo colore. Il copione non viene mai toccato.'
  },
  'insp.presenterHideAll': {
    nome: 'Nascondi tutti i nomi',
    texto: 'Toglie tutti i nomi dei presentatori dall’uscita in una volta, e blocca gli interruttori singoli finché comanda lui. L’editor li mantiene sempre.'
  },
  'insp.presenterRename': {
    nome: 'Rinomina presentatore',
    texto: 'Doppio clic per rinominare. Riscrive il nome anche nel copione — solo le righe di attacco, mai una menzione dentro un discorso. Un annulla riporta entrambi.'
  },
  'insp.presenterRelink': {
    nome: 'Ricollega presentatore',
    texto: 'Il nome è cambiato nel copione. Seleziona quello nuovo nell’editor e clicca: stesso presentatore, stesso colore, nome nuovo — nulla di già colorato va perso.'
  },
  'insp.presenterRemove': {
    nome: 'Rimuovi presentatore',
    texto: 'Elimina questo presentatore. Le parole restano esattamente come sono — sparisce solo il colore.'
  },
  'insp.position': {
    nome: 'Posizione orizzontale',
    texto: 'Sposta tutto il riquadro di testo a sinistra o a destra senza ridimensionarlo. Scatta al centro esatto vicino al 50%.'
  },
  'insp.presentersToggle': {
    nome: 'Presentatori',
    texto: 'Chi legge questo copione, e di che colore. Chiusa, i pallini dicono ancora quanti sono e con quali colori.'
  },
  'insp.presetsToggle': {
    nome: 'Presets',
    texto: 'Cinque posti per un aspetto intero — carattere, colori, margini e i presentatori. Chiuso, mostra ancora quello da cui nascono le schede nuove.'
  },
  'insp.presetSlot': {
    nome: 'Un preset',
    texto: 'Un clic veste questa scheda. Tasto destro per rinominare, cambiare colore, mettere la stella o eliminare. Ctrl+Z annulla in un passo solo.'
  },
  'insp.presetSave': {
    nome: 'Salva preset',
    texto: 'Fotografa la scheda attiva e poi chiede in quale dei cinque tenerla. Due passi apposta: sovrascrivere uno con un nome non può dipendere da un clic storto.'
  },
  'insp.margin': {
    nome: 'Margine',
    texto: 'Quanto bordo dello schermo resta vuoto su ogni lato. Testo più stretto vuol dire righe più corte e meno movimenti dell’occhio.'
  },
  'insp.minWords': {
    nome: 'Minimo di parole per riga',
    texto: 'Il minimo di parole che una riga può contenere. Valendo spezza il testo per senso, non per la larghezza dello schermo.'
  },
  'insp.maxWords': {
    nome: 'Massimo di parole per riga',
    texto: 'Il massimo di parole che una riga può contenere. Troppo alto e le righe vanno a capo da sole, cosa che il pannello segnala.'
  },
  'insp.readingMark': {
    nome: 'Segno di lettura',
    texto: 'A che altezza dello schermo legge il presentatore. Più in alto lascia più testo sotto da vedere arrivare.'
  },
  'insp.markOnOutput': {
    nome: 'Segno in uscita',
    texto: 'Se il segno di lettura viene disegnato anche sullo schermo del presentatore. Qui nell’anteprima è sempre visibile.'
  },
  'insp.focusDim': {
    nome: 'Attenua il resto',
    texto: 'Sfuma ciò che è lontano dal segno di lettura, così l’occhio si posa sulla riga attuale invece di vagare.'
  },
  'insp.focusDimPct': {
    nome: 'Intensità dell’attenuazione',
    texto: 'Quanto è forte la sfumatura. Bassa lascia una finestra ampia intorno al segno; alta la stringe a una fessura. La finestra segue il segno ovunque lo metta.'
  },
  'insp.uniform': {
    nome: 'Velocità costante',
    texto: 'Ogni riga riceve lo stesso tempo, qualunque sia il suo peso. Spento, una riga pesante dura più di una corta — più vicino al parlato reale.'
  },
  'insp.wrappingFix': {
    nome: 'Correggi il corpo',
    texto: 'Riduce il corpo fino al valore più grande in cui nessuna riga va a capo da sola, risolvendo lo scarto segnalato dall’avviso.'
  },
  'insp.clockElapsed': {
    nome: 'Orologio del trascorso',
    texto: 'Mostra il tempo trascorso sullo schermo del presentatore — quello che guarda lui, non quello sulla tua consolle.'
  },
  'insp.clockElapsedColor': {
    nome: 'Colore del trascorso',
    texto: 'Il colore dell’orologio del trascorso sullo schermo del presentatore.'
  },
  'insp.clockRemaining': {
    nome: 'Orologio del restante',
    texto: 'Mostra il tempo restante sullo schermo del presentatore — il numero che dice se accelerare o prendersela con calma.'
  },
  'insp.clockRemainingColor': {
    nome: 'Colore del restante',
    texto: 'Il colore dell’orologio del restante sullo schermo del presentatore.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Orologio: dal copione',
    texto: 'Trascorso e restante derivano dalle parole lette e dal ritmo attuale. Cambia il ritmo e entrambi i numeri cambiano con lui.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Orologio: cronometro',
    texto: 'Il trascorso conta i secondi reali da quando premi play; il restante conta alla rovescia dall’obiettivo impostato sotto.'
  },
  'insp.clockModeFree': {
    nome: 'Orologio: libero',
    texto: 'Gli orologi corrono verso l’obiettivo indipendentemente dal copione — per un segmento dal vivo dove le parole non sono il piano.'
  },
  'insp.clockTarget': {
    nome: 'Tempo obiettivo',
    texto: 'Quanto dovrebbe durare il pezzo. Scrivi le cifre e i due punti si mettono da soli — "320" diventa 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Posizione degli orologi',
    texto: 'In quale angolo dello schermo del presentatore stanno gli orologi. La griglia ha la forma dello schermo stesso.'
  },
  'insp.clockSize': {
    nome: 'Dimensione degli orologi',
    texto: 'Quanto sono grandi gli orologi, come quota dell’altezza dello schermo. Grandi abbastanza da leggere, piccoli abbastanza da non disturbare il testo.'
  },
  'insp.mirrorH': {
    nome: 'Specchia in orizzontale',
    texto: 'Ribalta lo schermo del presentatore da sinistra a destra — ciò che serve al vetro semiriflettente davanti all’obiettivo. Anteprima e pagina di rete restano leggibili.'
  },
  'insp.mirrorV': {
    nome: 'Specchia in verticale',
    texto: 'Ribalta lo schermo del presentatore dall’alto in basso, per impianti dove il monitor guarda verso l’alto nel vetro. Anteprima e pagina di rete non sono mai specchiate.'
  },
  'insp.rotation': {
    nome: 'Rotazione',
    texto: 'Ruota lo schermo del presentatore a scatti di 90° — per un monitor montato di lato. Anteprima e pagina di rete mantengono l’immagine dritta.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Editor e vista del presentatore affiancati — la disposizione per scrivere e andare in onda insieme.'
  },
  'status.modeFocus': {
    nome: 'Focus',
    texto: 'Solo la vista del presentatore, grande quanto permette la finestra. Per andare in onda con un copione già finito.'
  },
  'status.modeDeck': {
    nome: 'Regia',
    texto: 'Sostituisce l’editor con la scaletta: ogni capitolo con la sua durata, per seguire un programma lungo.'
  },
  'status.storage': {
    nome: 'Stato del salvataggio',
    texto: 'Dice se Valendo riesce a scrivere il tuo lavoro sul disco. Diventa ambra quando non ci riesce — il silenzio sembrerebbe uguale al funzionare.'
  },
  'status.palette': {
    nome: 'Palette dei comandi',
    texto: 'Ogni comando dell’app, cercabile per nome, con la sua scorciatoia accanto. Il modo più veloce di trovare qualcosa che usi di rado.',
    comando: 'palette.open'
  }
} as const satisfies Partial<Record<string, Ajuda>>
