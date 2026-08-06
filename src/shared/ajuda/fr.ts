import type { Ajuda } from './en'

export const ajudaFr = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'À propos de Valendo',
    texto: 'Version, crédits et licence. Devient vert quand une nouvelle version existe — Valendo ne télécharge jamais rien seul.'
  },
  'header.shortcuts': {
    nome: 'Raccourcis',
    texto: 'Toutes les commandes et leur touche. Cliquez sur une touche pour la réattribuer ; les infobulles suivent votre choix.'
  },
  'header.palette': {
    nome: 'Recherche de commande',
    texto: 'Tapez le nom d’une commande pour l’exécuter sans chercher son bouton. Plus rapide que la souris, une fois le nom connu.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Échelle de l’interface',
    texto: 'Agrandit ou réduit la fenêtre de l’opérateur — texte, touches et espacements ensemble. L’écran du présentateur n’en dépend jamais.'
  },
  'header.uiScaleSlider': {
    nome: 'Échelle de l’interface',
    texto: 'Glissez pour redimensionner toute la console. Utile sur un écran 4K où la taille par défaut paraît petite à distance.'
  },
  'header.uiScaleReset': {
    nome: 'Retour à 100%',
    texto: 'Ramène l’interface à sa taille normale. Grisé quand elle y est déjà.'
  },
  'header.uiScaleDown': {
    nome: 'Réduire l’interface',
    texto: 'Un clic, un cran de 5%. Le curseur traverse toute la plage d’un geste, mais tomber pile sur 105% avec lui tient de la chance.'
  },
  'header.uiScaleUp': {
    nome: 'Agrandir l’interface',
    texto: 'Un clic, un cran de 5%. Jusqu’à 160% — utile sur un écran 4K, où la taille normale paraît petite à distance de travail.'
  },
  'header.dismissNotice': {
    nome: 'Masquer cet avis',
    texto: 'Efface un avertissement sur quelque chose de déjà arrivé. Un problème en cours n’a pas de bouton — il part une fois résolu.'
  },
  'header.languageOption': {
    nome: 'Choisir cette langue',
    texto: 'Chaque langue est écrite dans sa propre langue, car qui a besoin de changer est justement celui qui ne lit pas la langue actuelle.'
  },
  'header.language': {
    nome: 'Langue',
    texto: 'Change la langue de l’interface. Votre texte n’est jamais modifié — seules les étiquettes autour changent.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Ouvrir un projet',
    texto: 'Ouvre un fichier .valendo : onglets, apparence, repères, cartons et rythme, exactement comme la machine qui l’a enregistré.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Projets récents',
    texto: 'Les derniers projets ouverts ou enregistrés. Les fichiers disparus du disque sortent seuls de la liste.'
  },
  'project.recentItem': {
    nome: 'Ouvrir ce projet',
    texto: 'Le rouvre directement depuis le disque, sans boîte de dialogue. Survolez pour voir le chemin complet — deux projets peuvent partager un nom.'
  },
  'project.saveAsItem': {
    nome: 'Enregistrer le projet sous…',
    texto: 'Demande toujours où écrire, sans toucher à l’original. À partir de là, c’est le nouveau fichier qui est enregistré.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Enregistrer le projet',
    texto: 'Réécrit toute l’émission dans le .valendo déjà ouvert. Ne demande où qu’à la première fois.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Enregistrer le projet sous…',
    texto: 'Demande toujours où écrire, sans toucher à l’original. À partir de là, c’est le nouveau fichier qui est enregistré.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'Nouveau projet',
    texto: 'Démarre une émission vide. Propose d’abord d’enregistrer l’actuelle si elle a des changements non enregistrés.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Importer un texte',
    texto: 'Lit .docx, .pdf, .rtf ou texte brut dans un nouvel onglet. La mise en forme est effacée ; chapitres et indications se marquent après.'
  },
  'script.save': {
    nome: 'Exporter le texte',
    texto: 'Écrit l’onglet actif dans un fichier texte — le texte seul, sans le projet autour.',
    comando: 'document.save'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Transport en haut',
    texto: 'Place la console de transport sous la barre d’onglets, en pleine taille — l’arrangement qui laisse le plus de place aux horloges.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Transport en bande',
    texto: 'Déplace le transport vers une fine bande en bas, libérant le haut de la fenêtre pour le texte et la sortie.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Colonne Assets',
    texto: 'Affiche ou masque la colonne de gauche : chapitres du texte, cartons de l’émission et cette aide rapide.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Tiroir des cartons',
    texto: 'Affiche ou masque le tiroir où vivent images, vidéos et messages — ceux que vous mettez sur l’écran du présentateur.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Panneau des réglages',
    texto: 'Affiche ou masque le panneau de droite : l’aspect du texte, sa lecture et sa sortie à travers le verre.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Onglet de texte',
    texto: 'Chaque onglet est un texte distinct avec sa propre apparence et ses repères. Seul l’actif passe à l’antenne. Clic droit pour dupliquer, renommer, fermer.'
  },
  'tabs.close': {
    nome: 'Fermer l’onglet',
    texto: 'Retire ce texte de la session. Il reste dans le fichier projet jusqu’au prochain enregistrement.'
  },
  'tabs.new': {
    nome: 'Nouvel onglet',
    texto: 'Ouvre un texte vide à côté des autres — un second bloc de la même émission, pas un nouveau projet.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Écran noir',
    texto: 'Coupe instantanément l’écran du présentateur au noir, sans bouger la lecture. L’emporte sur tout carton affiché.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Figer la sortie',
    texto: 'Arrête le texte où il est pendant que l’horloge continue. Pour une pause imprévue, sans perdre la place.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'Voir sur le réseau',
    texto: 'Publie une page sur le réseau local : tout appareil avec un navigateur lit le même texte. Ouvre le panneau avec l’adresse et le QR code.'
  },
  'ar.webviewSound': {
    nome: 'Son sur le réseau',
    texto: 'Détermine si un carton vidéo envoie son audio sur le réseau. Coupé, la page ne propose même pas d’activer le son. Inactif tant que rien n’est publié.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Identifier les écrans',
    texto: 'Affiche un grand numéro clignotant sur chaque écran pour les distinguer. Désactivé en diffusion — il clignoterait aussi à l’antenne.'
  },
  'output.identifyRun': {
    nome: 'Afficher les numéros',
    texto: 'Affiche le numéro de chaque écran pendant quelques secondes. Rien n’est envoyé au présentateur ; c’est juste une étiquette sur le verre.'
  },
  'output.monitor': {
    nome: 'Choisir écran',
    texto: 'L’écran où lit le présentateur. Choisissez-le avant de diffuser — c’est la seule chose que Diffuser attend.'
  },
  'output.broadcast': {
    nome: 'Diffuser',
    texto: 'Envoie la lecture sur l’écran choisi, en plein écran. Le point indique l’état : éteint hors antenne, rouge et allumé à l’antenne.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Revenir au début',
    texto: 'Renvoie la lecture au premier mot et remet les horloges à zéro. Continue de jouer si elle jouait déjà.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Reculer',
    texto: 'Remonte la lecture de quelques lignes sans s’arrêter — pour quand le présentateur revient sur une phrase.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Lecture / Pause',
    texto: 'Démarre et arrête le défilement. La plus grande touche de la console, car c’est la seule qu’on cherche sans regarder.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Avancer',
    texto: 'Avance la lecture de quelques lignes sans s’arrêter — pour quand le présentateur saute en avant.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Créer un repère',
    texto: 'Dépose un repère à l’endroit actuel de la lecture. Les repères apparaissent sur la ligne de progression et permettent d’y sauter.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Rythme de lecture',
    texto: 'Mots par minute — la vitesse de défilement du texte. La molette fonctionne partout dans l’app, pas seulement sur cette règle.'
  },
  'status.target': {
    nome: 'Durée visée',
    texto: 'La durée du texte au rythme actuel. Cliquez et tapez une autre valeur — « 2:00 » ou des secondes — et le rythme s’ajuste.'
  },
  'transport.elapsed': {
    nome: 'Écoulé',
    texto: 'Depuis combien de temps la lecture tourne. Ce qui est compté dépend du mode d’horloge dans Réglages › Sortie.'
  },
  'transport.remaining': {
    nome: 'Restant',
    texto: 'Ce qu’il reste au rythme actuel. Changer le rythme change ce nombre aussitôt — c’est tout l’intérêt.'
  },
  'markers.chip': {
    nome: 'Repère',
    texto: 'Cliquez pour envoyer la lecture ici. Clic droit pour retirer le repère. Le numéro est la touche qui y saute pendant l’émission.'
  },
  'transport.progress': {
    nome: 'Ligne de progression',
    texto: 'Tout le texte d’un bord à l’autre. Les repères ambre sont les chapitres, les rouges sont posés à la main.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Chapitre',
    texto: 'Transforme la ligne actuelle en chapitre — elle devient ## dans le texte. Apparaît dans la colonne de gauche, la ligne de progression et le conducteur.',
    comando: 'insert.chapter'
  },
  'editor.direction': {
    nome: 'Indication',
    texto: 'Marque la ligne comme indication — elle devient [entre crochets]. Une instruction au présentateur, jamais comptée comme parole.',
    comando: 'insert.direction'
  },
  'editor.find': {
    nome: 'Rechercher dans le script',
    texto: 'Entrée pour la suivante, Maj+Entrée pour la précédente, Échap ferme sur celle que vous voyez. Ignore la casse et les accents. Ne bouge que l’éditeur — la lecture ne bouge pas.',
    comando: 'edit.find'
  },
  'editor.replace': {
    nome: 'Remplacer par',
    texto: 'Ce qui prend la place de ce que vous avez trouvé. Entrée remplace l’occurrence courante, Maj+Entrée toutes. Tout remplacer, c’est UNE annulation, pas trente.'
  },
  'editor.findAll': {
    nome: 'Marquer toutes les occurrences',
    texto: 'Encadre toutes les occurrences d’un coup, la courante plus vive. Utile avant de tout remplacer : vous voyez ce qui va changer.'
  },
  'editor.overwrite': {
    nome: 'Peindre par-dessus les répliques',
    texto: "Désactivé, peindre toutes saute les lignes qui portent déjà la couleur d'un présentateur — cette couleur est un repère pour qui lit. Activé, il les peint aussi."
  },
  'editor.bold': {
    nome: 'Gras',
    texto: 'Vrai gras sur l’écran du présentateur. Dans cet éditeur, un double soulignement — le gras est plus large, et le champ invisible derrière se décalerait.'
  },
  'editor.italic': {
    nome: 'Italique',
    texto: 'Vrai italique sur l’écran du présentateur ; ici un soulignement ondulé, pour la même raison que le gras.'
  },
  'editor.underline': {
    nome: 'Souligné',
    texto: 'Pareil dans les deux — souligner ne change la largeur d’aucune lettre.'
  },
  'editor.color': {
    nome: 'Couleur du texte',
    texto: 'Ouvre la palette : 71 teintes, plus les quatre dernières utilisées. S’applique à ce qui est sélectionné dans le texte.'
  },
  'editor.recentColors': {
    nome: 'Couleurs récentes',
    texto: 'Les quatre dernières choisies, en roue : une nouvelle prend la case suivante et repart de la première. Le pointillé retire la couleur.'
  },
  'editor.clearFormat': {
    nome: 'Effacer la mise en forme',
    texto: 'Retransforme chapitres et indications en texte brut. Les mots restent ; annuler ramène les marques.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Créer un présentateur',
    texto: 'Sélectionnez un nom déjà écrit dans le texte et cliquez : à partir de là, cette personne parle — jusqu’au nom suivant. Rien n’est ajouté au texte.'
  },
  'editor.allCaps': {
    nome: 'Majuscules dans l’éditeur',
    texto: 'Affiche l’éditeur en majuscules sans changer une seule lettre enregistrée. Indépendant du même interrupteur dans Réglages › Texte.'
  },
  'editor.undo': {
    nome: 'Annuler',
    texto: 'Revient en arrière dans vos modifications du texte.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Rétablir',
    texto: 'Avance à nouveau dans ce que vous avez annulé.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'CATCH',
    texto: 'Le repère de lecture suit votre curseur en écrivant, à chaque pause. Un Aller à qui ne s’éteint jamais.'
  },
  'editor.goTo': {
    nome: 'Aller à',
    texto: 'Envoie la lecture là où est le curseur dans l’éditeur, une fois. Pour sauter à un passage qu’on vient de trouver.'
  },
  'editor.marker': {
    nome: 'Créer un repère',
    texto: 'Le même repère que la console de transport, à portée du texte que vous regardez déjà.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Boucle',
    texto: 'À la fin, revient au début et continue de jouer. Pour un stand ou une répétition qui ne doit jamais s’arrêter.'
  },
  'editor.loopDelay': {
    nome: 'Attente de la boucle',
    texto: 'Secondes d’attente à la fin avant de recommencer. Zéro relance immédiatement.'
  },
  'editor.fontSmaller': {
    nome: 'Police plus petite',
    texto: 'Un point de moins dans l’éditeur. L’écran du présentateur n’est pas concerné — c’est le confort de qui tape.'
  },
  'editor.fontSize': {
    nome: 'Taille de police de l’éditeur',
    texto: 'La taille du texte que vous tapez. Rien à voir avec celle que lit le présentateur, réglée dans Réglages › Texte.'
  },
  'editor.fontBigger': {
    nome: 'Police plus grande',
    texto: 'Un point de plus dans l’éditeur. L’écran du présentateur n’est pas concerné — c’est le confort de qui tape.'
  },
  'editor.script': {
    nome: 'Texte',
    texto: 'Tapez ou collez ici. Une ligne commençant par ## est un chapitre ; un texte [entre crochets] est une indication, jamais comptée comme parole.'
  },
  'editor.split': {
    nome: 'Séparateur édition / diffusion',
    texto: 'Glissez pour donner plus de place au texte ou à l’aperçu. Double-clic le recentre.'
  },
  'panel.goToReading': {
    nome: 'Aller à la lecture',
    texto: 'Amène l’éditeur au mot en cours de lecture, une fois, et y place le curseur. L’image miroir du Aller à sous le texte.'
  },
  'panel.follow': {
    nome: 'Suivre la lecture',
    texto: 'L’éditeur défile avec la diffusion et marque la ligne lue. Il ne déplace jamais votre curseur, et s’efface 4s dès que vous tapez ou défilez.'
  },
  'panel.focusToggle': {
    nome: 'Mode Focus',
    texto: 'Masque l’éditeur et laisse seule la vue du présentateur à l’écran — l’arrangement pour jouer, pas pour écrire.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Chapitre',
    texto: 'Cliquez pour envoyer la lecture au début de ce chapitre. Le temps à droite est sa durée au rythme actuel.'
  },
  'sidebar.card': {
    nome: 'Carton',
    texto: 'Cliquez pour mettre ce carton sur l’écran du présentateur, ou le retirer s’il y est déjà. Glissez pour réordonner.'
  },
  'sidebar.cardOverlay': {
    nome: 'OVERLAY sur ce carton',
    texto: 'Le texte défile sur ce carton au lieu d’être remplacé par lui. Verrouillé quand l’OVERLAY global force tous les cartons.'
  },
  'sidebar.overlayGlobal': {
    nome: 'OVERLAY global',
    texto: 'Force le texte sur TOUS les cartons, quoi que chacun indique. Désactivé, chaque carton décide seul.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'OVERLAY : bande sombre',
    texto: 'Pose une bande sombre sur tout le carton, derrière le texte. Le seul qui garantit la lisibilité sur toute image.'
  },
  'overlay.styleShadow': {
    nome: 'OVERLAY : ombre',
    texto: 'Met une ombre autour de chaque lettre au lieu d’une bande — le carton reste visible, le texte reste lisible sur la plupart.'
  },
  'overlay.styleNone': {
    nome: 'OVERLAY : sans traitement',
    texto: 'Le texte brut sur le carton, sans traitement. Seulement pour un visuel choisi en connaissant l’emplacement du texte.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Miniatures plus petites',
    texto: 'Réduit les miniatures des cartons dans cette colonne de 10%, pour voir plus de l’émission à l’écran.'
  },
  'sidebar.thumbSize': {
    nome: 'Taille des miniatures',
    texto: 'La taille des images des cartons dans cette colonne. Un confort local — il ne voyage jamais dans le fichier projet.'
  },
  'sidebar.thumbBigger': {
    nome: 'Miniatures plus grandes',
    texto: 'Agrandit les miniatures des cartons dans cette colonne de 10%, pour reconnaître une image d’un coup d’œil.'
  },
  'sidebar.helpToggle': {
    nome: 'Aide rapide',
    texto: 'Replie cette boîte. Ce que vous lisez ici est ce que votre souris a pointé en dernier — ça reste jusqu’au prochain survol.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Ajouter une image',
    texto: 'Copie une image dans le projet, pour qu’elle voyage dans le .valendo et survive à la machine d’origine.'
  },
  'cards.addVideo': {
    nome: 'Ajouter une vidéo',
    texto: 'Pointe vers une vidéo là où elle se trouve déjà — elle n’est pas copiée. La déplacer ou la renommer casse le carton.'
  },
  'cards.addText': {
    nome: 'Ajouter un message',
    texto: 'Un carton de texte simple — une note au présentateur, en grand à l’écran. Rien à importer ; tapez-la ici.'
  },
  'cards.addScreen': {
    nome: 'Ajouter un écran',
    texto: 'Un carton que l’app dessine : une couleur ou un dégradé, avec un message si vous voulez. Aucun fichier, aucun import à préparer.'
  },
  'cards.editScreen': {
    nome: 'Modifier l’écran',
    texto: 'Ouvre l’écran avec un grand aperçu. La couleur choisie sur une vignette de 176px n’est pas celle d’un moniteur de studio.'
  },
  'cards.background': {
    nome: 'Fond',
    texto: 'Uni, c’est une couleur. Dégradé en ajoute une seconde et un angle entre les deux.'
  },
  'cards.colours': {
    nome: 'Couleurs',
    texto: 'Ouvre le sélecteur de couleurs du système, pipette incluse. Foncé et peu saturé se lit mieux derrière le verre du prompteur.'
  },
  'cards.angle': {
    nome: 'Angle du dégradé',
    texto: 'La direction entre les deux couleurs. 0° va vers le haut, 90° vers la droite.'
  },
  'cards.screenText': {
    nome: 'Message de l’écran',
    texto: 'Ce qui est écrit sur le fond. Où vous appuyez sur Entrée, ça se coupe à l’antenne. Laissez vide pour un fond uni.'
  },
  'cards.screenEffect': {
    nome: 'Fond animé',
    texto: 'Six façons pour les deux couleurs de bouger, toutes volontairement lentes — un fond agité distrait de la lecture. Chaque écran tourne sa propre copie.'
  },
  'cards.speed': {
    nome: 'Vitesse de l’effet',
    texto: 'Accélère ou ralentit les six effets ensemble. Ajuste le rythme propre à chacun plutôt qu’une durée unique — ils n’étaient pas calés pareil.'
  },
  'cards.intensity': {
    nome: 'Intensité de l’effet',
    texto: 'À quel point le mouvement se voit sur la couleur de base. Faible se remarque à peine — souvent ce que veut un fond affiché une demi-heure.'
  },
  'cards.fade': {
    nome: 'Où les couleurs se rejoignent',
    texto: 'Quelle part de l’image prend la transition. Plein fait un fondu bord à bord ; zéro fait une ligne nette entre deux moitiés unies.'
  },
  'cards.screenAlign': {
    nome: 'Alignement du paragraphe',
    texto: 'Comment les lignes se placent entre elles. Indépendant de la position du bloc à l’écran — c’est Position.'
  },
  'cards.size': {
    nome: 'Taille du message',
    texto: 'Une part de la hauteur de l’écran, pas une taille en pixels — le carton reste identique sur la vignette et sur un écran de 55 pouces.'
  },
  'cards.place': {
    nome: 'Position',
    texto: 'Haut, milieu ou bas. Aucun ne touche le bord : derrière le verre, le dernier centimètre de l’écran part en premier.'
  },
  'cards.close': {
    nome: 'Fermer le tiroir',
    texto: 'Masque le tiroir des cartons. Les cartons restent dans l’émission ; seul le tiroir disparaît.'
  },
  'cards.shortcut': {
    nome: 'Raccourci du carton',
    texto: 'La touche qui met ce carton à l’antenne en cours d’émission. Elle suit la position dans le tiroir — réordonner la renumérote.'
  },
  'cards.name': {
    nome: 'Nom du carton',
    texto: 'Comment vous appelez ce carton. C’est ce qu’affichent la colonne Assets et le conducteur — le nom du fichier ne sert à rien dans l’urgence.'
  },
  'cards.message': {
    nome: 'Message',
    texto: 'Le texte que lit le présentateur sur ce carton. Affiché en grand et centré, jamais en défilement.'
  },
  'cards.onAir': {
    nome: 'À l’écran',
    texto: 'Met ce carton sur l’écran du présentateur, ou l’en retire. Seules deux portes : cette case et le bouton lecture vidéo.'
  },
  'cards.overlay': {
    nome: 'OVERLAY sur ce carton',
    texto: 'Le texte défile sur ce carton au lieu d’être remplacé par lui. Verrouillé quand l’OVERLAY global force tous les cartons.'
  },
  'cards.remove': {
    nome: 'Supprimer le carton',
    texto: 'Retire ce carton de l’émission. Les images importées sont nettoyées du dossier projet à l’enregistrement.'
  },
  'cards.relink': {
    nome: 'Relier le fichier',
    texto: 'Le fichier pointé par ce carton a disparu — déplacé, renommé, ou sur un disque absent. Cliquez pour le repointer.'
  },
  'cards.videoNetwork': {
    nome: 'Vidéo sur le réseau',
    texto: 'Détermine si les navigateurs du réseau peuvent lire ce fichier. Certains formats sont refusés par le navigateur, même si l’app les lit bien.'
  },
  'cards.videoPlay': {
    nome: 'Lire la vidéo',
    texto: 'Hors antenne, affiche le carton et le lance. À l’antenne, joue et met en pause ce qui tourne déjà.'
  },
  'cards.videoStartPaused': {
    nome: 'Afficher en pause',
    texto: 'Envoie le carton à l’écran figé sur l’image actuelle — pour cadrer un plan avant qu’il ne tourne vraiment.'
  },
  'cards.videoSeek': {
    nome: 'Position de la vidéo',
    texto: 'Glissez pour naviguer dans la vidéo. Ça bouge aussi sur l’écran du présentateur — naviguer à l’antenne, c’est à l’antenne.'
  },
  'cards.videoMute': {
    nome: 'Muet',
    texto: 'Coupe le son des cartons sur cette machine et le remet au volume précédent. Le son réseau a son propre interrupteur.'
  },
  'cards.videoVolume': {
    nome: 'Volume du carton',
    texto: 'Le volume des cartons vidéo sur cette machine. Une préférence locale — elle ne voyage jamais dans le fichier projet.'
  },
  'cards.videoLoop': {
    nome: 'Répéter la vidéo',
    texto: 'Ce clip recommence à la fin, tant que le carton reste affiché.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Texte',
    texto: 'Comment l’écran du présentateur est dessiné : police, taille, graisse, alignement et couleurs.'
  },
  'insp.tabReading': {
    nome: 'Lecture',
    texto: 'Comment le texte se lit : sa position, le nombre de mots par ligne, le repère de lecture et le comportement du rythme.'
  },
  'insp.tabOutput': {
    nome: 'Sortie',
    texto: 'Ce qui n’existe que sur l’écran du présentateur : les horloges et le miroir qu’exige le verre d’un vrai prompteur.'
  },
  'insp.font': {
    nome: 'Police',
    texto: 'La famille que lit le présentateur. Celles proposées survivent à une lecture à distance, en miroir.'
  },
  'insp.allCaps': {
    nome: 'Majuscules sur la sortie',
    texto: 'Affiche l’écran du présentateur en majuscules sans changer une lettre enregistrée. Indépendant de l’interrupteur de l’éditeur.'
  },
  'insp.body': {
    nome: 'Corps',
    texto: 'La taille de lecture du présentateur. Le chiffre le plus important ici — tout le reste s’ajuste autour.'
  },
  'insp.weight': {
    nome: 'Graisse',
    texto: 'À quel point les traits sont épais. Plus épais résiste à une pièce claire ; plus fin est plus calme sur un verre sombre.'
  },
  'insp.lineHeight': {
    nome: 'Interligne',
    texto: 'La distance entre les lignes. Lâche se lit plus calmement et défile mieux ; serré affiche plus de texte à l’écran.'
  },
  'insp.letterSpacing': {
    nome: 'Interlettrage',
    texto: 'L’air entre les lettres. Un peu aide à distance ; trop casse les mots.'
  },
  'insp.align': {
    nome: 'Alignement',
    texto: 'Où chaque ligne se place dans le bloc de texte. Indépendant de Position, qui déplace le bloc lui-même.'
  },
  'insp.textColor': {
    nome: 'Couleur du texte',
    texto: 'La couleur des mots sur l’écran du présentateur.'
  },
  'insp.bgColor': {
    nome: 'Couleur de fond',
    texto: 'La couleur derrière les mots. Sur un vrai verre de prompteur, plus elle est foncée, moins la pièce se reflète.'
  },
  'insp.preset': {
    nome: 'Palette de couleurs',
    texto: 'Une paire texte-fond déjà testée. Modifier une couleur à la main désélectionne simplement la palette.'
  },
  'insp.invert': {
    nome: 'Inverser',
    texto: 'Échange les couleurs du texte et du fond — clair sur foncé devient foncé sur clair, en un clic.'
  },
  'insp.presenterHide': {
    nome: 'Masquer ce nom',
    texto: 'Retire le nom de ce présentateur de l’écran — la parole reste, dans sa couleur. Votre texte n’est jamais modifié.'
  },
  'insp.presenterHideAll': {
    nome: 'Masquer tous les noms',
    texto: 'Retire tous les noms de présentateurs de la sortie d’un coup, et verrouille les interrupteurs individuels. L’éditeur les garde toujours.'
  },
  'insp.presenterRename': {
    nome: 'Renommer le présentateur',
    texto: 'Double-clic pour renommer. Réécrit aussi le nom dans le texte — seulement les lignes de repère, jamais une réplique. Un annuler restaure les deux.'
  },
  'insp.presenterRelink': {
    nome: 'Relier le présentateur',
    texto: 'Le nom a changé dans le texte. Sélectionnez le nouveau dans l’éditeur et cliquez : même présentateur, même couleur, rien n’est perdu.'
  },
  'insp.presenterRemove': {
    nome: 'Retirer le présentateur',
    texto: 'Supprime ce présentateur. Les mots restent exactement tels quels — seule la couleur disparaît.'
  },
  'insp.position': {
    nome: 'Position horizontale',
    texto: 'Glisse tout le bloc de texte à gauche ou à droite sans le redimensionner. S’aligne au centre exact près de 50%.'
  },
  'insp.presentersToggle': {
    nome: 'Présentateurs',
    texto: 'Qui dit ce script, et de quelle couleur. Replié, les points disent encore combien sont enregistrés et avec quelles couleurs.'
  },
  'insp.presetsToggle': {
    nome: 'Presets',
    texto: 'Cinq emplacements pour un look entier — police, couleurs, marges et les présentateurs. Replié, il montre encore celui dont héritent les nouveaux onglets.'
  },
  'insp.presetSlot': {
    nome: 'Un preset',
    texto: 'Un clic habille cet onglet avec. Clic droit pour renommer, recolorer, étoiler ou supprimer. Ctrl+Z annule en une seule fois.'
  },
  'insp.presetSave': {
    nome: 'Enregistrer le preset',
    texto: 'Photographie l’onglet actif, puis demande dans lequel des cinq le garder. Deux étapes volontaires : écraser un preset nommé ne doit pas tenir à un clic de travers.'
  },
  'insp.margin': {
    nome: 'Marge',
    texto: 'Combien de bord d’écran reste vide de chaque côté. Un texte plus étroit fait des lignes plus courtes et moins de mouvements d’œil.'
  },
  'insp.minWords': {
    nome: 'Minimum de mots par ligne',
    texto: 'Le plancher du nombre de mots par ligne. Valendo coupe le texte par le sens, pas par la largeur de l’écran.'
  },
  'insp.maxWords': {
    nome: 'Maximum de mots par ligne',
    texto: 'Le plafond du nombre de mots par ligne. Trop haut, les lignes se coupent seules, ce que le panneau signale.'
  },
  'insp.readingMark': {
    nome: 'Repère de lecture',
    texto: 'À quelle hauteur de l’écran lit le présentateur. Plus haut laisse voir venir plus de texte en dessous.'
  },
  'insp.markOnOutput': {
    nome: 'Ligne sur la diffusion',
    texto: 'Détermine si le repère de lecture est aussi dessiné sur l’écran du présentateur. Il l’est toujours ici, dans l’aperçu.'
  },
  'insp.focusDim': {
    nome: 'Assombrir les bords',
    texto: 'Estompe ce qui est loin du repère de lecture, pour que l’œil se pose sur la ligne actuelle plutôt que d’errer.'
  },
  'insp.focusDimPct': {
    nome: 'Intensité',
    texto: 'La force de l’estompage. Faible laisse une large fenêtre lisible autour du repère ; fort la réduit à une fente.'
  },
  'insp.uniform': {
    nome: 'Vitesse constante',
    texto: 'Chaque ligne reçoit le même temps, quel que soit son poids. Désactivé, une ligne longue prend plus de temps — plus proche de la vraie parole.'
  },
  'insp.wrappingFix': {
    nome: 'Corriger la taille',
    texto: 'Réduit le corps à la plus grande taille où aucune ligne ne se coupe seule, réglant l’écart signalé par l’avertissement.'
  },
  'insp.clockElapsed': {
    nome: 'Horloge écoulée',
    texto: 'Affiche le temps écoulé sur l’écran du présentateur — celui qu’il regarde, pas celui de votre console.'
  },
  'insp.clockElapsedColor': {
    nome: 'Couleur du temps écoulé',
    texto: 'La couleur de l’horloge du temps écoulé sur l’écran du présentateur.'
  },
  'insp.clockRemaining': {
    nome: 'Horloge restante',
    texto: 'Affiche le temps restant sur l’écran du présentateur — le nombre qui dit d’accélérer ou de prendre son temps.'
  },
  'insp.clockRemainingColor': {
    nome: 'Couleur du temps restant',
    texto: 'La couleur de l’horloge du temps restant sur l’écran du présentateur.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Horloge : depuis le texte',
    texto: 'Écoulé et restant viennent des mots lus et du rythme actuel. Changez le rythme et les deux nombres changent avec lui.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Horloge : chronomètre',
    texto: 'Écoulé compte les vraies secondes depuis la lecture ; restant décompte depuis l’objectif réglé ci-dessous.'
  },
  'insp.clockModeFree': {
    nome: 'Horloge : libre',
    texto: 'Les horloges tournent contre l’objectif, indépendamment du texte — pour un segment en direct où les mots ne sont pas le plan.'
  },
  'insp.clockTarget': {
    nome: 'Objectif',
    texto: 'La durée visée du sujet. Tapez les chiffres, les deux-points se placent seuls — « 320 » devient 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Position de l’horloge',
    texto: 'Dans quel coin de l’écran du présentateur se placent les horloges. La grille a la forme de l’écran lui-même.'
  },
  'insp.clockSize': {
    nome: 'Taille de l’horloge',
    texto: 'La taille des horloges, en part de la hauteur de l’écran. Assez grande pour se lire, assez petite pour ne pas gêner le texte.'
  },
  'insp.mirrorH': {
    nome: 'Miroir horizontal',
    texto: 'Retourne l’écran du présentateur de gauche à droite — ce qu’exige le verre séparateur devant l’objectif. Aperçu et page réseau restent lisibles.'
  },
  'insp.mirrorV': {
    nome: 'Miroir vertical',
    texto: 'Retourne l’écran du présentateur de haut en bas, pour les montages où le moniteur regarde vers le verre. Aperçu et page réseau ne sont jamais inversés.'
  },
  'insp.rotation': {
    nome: 'Rotation',
    texto: 'Fait pivoter l’écran du présentateur par quarts de tour — pour un moniteur monté sur le côté. Aperçu et page réseau gardent l’image droite.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Éditeur et vue du présentateur côte à côte — l’arrangement pour écrire et jouer en même temps.'
  },
  'status.modeFocus': {
    nome: 'Focus',
    texto: 'La vue du présentateur seule, aussi grande que la fenêtre le permet. Pour jouer un texte déjà terminé.'
  },
  'status.modeDeck': {
    nome: 'Régie',
    texto: 'Remplace l’éditeur par le conducteur : chaque chapitre avec sa durée, pour suivre une longue émission.'
  },
  'status.storage': {
    nome: 'État de l’enregistrement',
    texto: 'Indique si Valendo réussit à écrire votre travail sur le disque. Devient ambre dès que ce n’est plus le cas.'
  },
  'status.palette': {
    nome: 'Palette de commandes',
    texto: 'Toutes les commandes de l’app, cherchables par nom, avec leur raccourci à côté. Le plus rapide moyen de retrouver ce qu’on utilise rarement.',
    comando: 'palette.open'
  }
} as const satisfies Partial<Record<string, Ajuda>>
