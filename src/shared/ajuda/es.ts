import type { Ajuda } from './en'

export const ajudaEs = {
  /* ------------------------------------------------------------ cabeçalho */
  'header.version': {
    nome: 'Acerca de Valendo',
    texto: 'Versión, créditos y licencia. Se pone verde si existe una versión más nueva — Valendo nunca descarga nada por su cuenta.'
  },
  'header.shortcuts': {
    nome: 'Atajos',
    texto: 'Todos los comandos y la tecla que los ejecuta. Haz clic en una tecla para reasignarla; los tooltips de la app siguen lo que configures.'
  },
  'header.palette': {
    nome: 'Buscar comando',
    texto: 'Escribe el nombre de un comando y ejecútalo sin buscar su botón. Más rápido que el ratón cuando ya sabes el nombre.',
    comando: 'palette.open'
  },
  'header.uiScale': {
    nome: 'Escala de la interfaz',
    texto: 'Agranda o reduce la ventana del operador — texto, teclas y espaciado juntos. La pantalla del presentador nunca cambia con esto.'
  },
  'header.uiScaleSlider': {
    nome: 'Escala de la interfaz',
    texto: 'Arrastra para cambiar el tamaño de toda la consola. Útil en un panel 4K donde el tamaño normal se ve pequeño a distancia.'
  },
  'header.uiScaleReset': {
    nome: 'Volver al 100%',
    texto: 'Devuelve la interfaz a su tamaño natural. Aparece atenuado cuando ya estás ahí.'
  },
  'header.uiScaleDown': {
    nome: 'Reducir la interfaz',
    texto: 'Un clic, un escalón de 5%. El deslizador cruza toda la franja de un gesto, pero acertar el 105% exacto con él es suerte.'
  },
  'header.uiScaleUp': {
    nome: 'Ampliar la interfaz',
    texto: 'Un clic, un escalón de 5%. Llega hasta 160% — útil en un panel 4K, donde el tamaño normal se lee pequeño a distancia de operación.'
  },
  'header.dismissNotice': {
    nome: 'Descartar este aviso',
    texto: 'Borra una advertencia sobre algo que ya pasó. Un problema que sigue activo no tiene botón de descartar — desaparece cuando se resuelve.'
  },
  'header.languageOption': {
    nome: 'Elegir este idioma',
    texto: 'Cada idioma está escrito en sí mismo, porque quien necesita cambiarlo es quien no está leyendo el actual.'
  },
  'header.language': {
    nome: 'Idioma',
    texto: 'Cambia el idioma de la interfaz. Tu guion nunca se toca — solo las etiquetas a su alrededor.'
  },

  /* --------------------------------------------------------------- PROJECT */
  'project.open': {
    nome: 'Abrir proyecto',
    texto: 'Abre un archivo .valendo: cada pestaña, aspecto, marcador, tarjeta y ritmo, tal como los dejó la máquina que lo guardó.',
    comando: 'project.open'
  },
  'project.recent': {
    nome: 'Proyectos recientes',
    texto: 'Los últimos proyectos que abriste o guardaste. Los archivos que ya no existen en el disco salen solos de la lista.'
  },
  'project.recentItem': {
    nome: 'Abrir este proyecto',
    texto: 'Lo reabre directo desde el disco, sin diálogo de archivo. Al pasar el ratón se ve la ruta completa — dos proyectos pueden compartir nombre en carpetas distintas.'
  },
  'project.saveAsItem': {
    nome: 'Guardar proyecto como',
    texto: 'Siempre pregunta dónde escribir, dejando el original intacto. Desde aquí, el archivo nuevo es el que se guarda.',
    comando: 'project.saveAs'
  },
  'project.save': {
    nome: 'Guardar proyecto',
    texto: 'Escribe todo el programa de vuelta en el .valendo ya abierto. Pregunta dónde solo la primera vez.',
    comando: 'project.save'
  },
  'project.saveAs': {
    nome: 'Guardar proyecto como',
    texto: 'Siempre pregunta dónde escribir, dejando el original intacto. Desde aquí, el archivo nuevo es el que se guarda.',
    comando: 'project.saveAs'
  },
  'project.new': {
    nome: 'Proyecto nuevo',
    texto: 'Empieza un programa vacío. Si el actual tiene cambios que nunca llegaron a un archivo, ofrece guardarlo antes.',
    comando: 'project.new'
  },

  /* ---------------------------------------------------------------- SCRIPT */
  'script.import': {
    nome: 'Importar guion',
    texto: 'Lee .docx, .pdf, .rtf o texto plano en una pestaña nueva. El formato se elimina; capítulos y acotaciones se marcan después.'
  },
  'script.save': {
    nome: 'Exportar guion',
    texto: 'Escribe la pestaña activa como archivo de texto — solo el guion, sin el proyecto alrededor.',
    comando: 'document.save'
  },

  /* ----------------------------------------------------------------- VIEWS */
  'view.transportTop': {
    nome: 'Transporte arriba',
    texto: 'Pone la consola de transporte bajo la barra de pestañas, a tamaño completo — la disposición con más espacio para los relojes.',
    comando: 'view.transportPosition'
  },
  'view.transportStrip': {
    nome: 'Transporte en regla',
    texto: 'Mueve el transporte a una regla delgada abajo, liberando la parte de arriba para el guion y la salida.',
    comando: 'view.transportPosition'
  },
  'view.sidebar': {
    nome: 'Columna de assets',
    texto: 'Muestra u oculta la columna izquierda: capítulos del guion, tarjetas del programa y esta ayuda rápida.',
    comando: 'view.sidebar'
  },
  'view.cards': {
    nome: 'Cajón de tarjetas',
    texto: 'Muestra u oculta el cajón donde viven imágenes, vídeos y mensajes — los que pones en la pantalla del presentador.',
    comando: 'view.cards'
  },
  'view.inspector': {
    nome: 'Panel de ajustes',
    texto: 'Muestra u oculta el panel derecho: cómo se ve el texto, cómo se lee y cómo sale por el cristal.',
    comando: 'view.inspector'
  },

  /* ------------------------------------------------------------------ TABS */
  'tabs.tab': {
    nome: 'Pestaña de guion',
    texto: 'Cada pestaña es un guion separado con su propio aspecto y marcadores. Solo la activa sale al aire. Clic derecho para duplicar, renombrar o cerrar.'
  },
  'tabs.close': {
    nome: 'Cerrar pestaña',
    texto: 'Quita este guion de la sesión. Sigue en el archivo del proyecto hasta que vuelvas a guardar.'
  },
  'tabs.new': {
    nome: 'Pestaña nueva',
    texto: 'Abre un guion vacío junto a los actuales — un bloque más del mismo programa, no un proyecto nuevo.',
    comando: 'tab.new'
  },

  /* -------------------------------------------------------------------- AR */
  'ar.blackout': {
    nome: 'Pantalla negra',
    texto: 'Deja la pantalla del presentador en negro al instante, sin mover la lectura. Gana sobre cualquier tarjeta que esté al aire.',
    comando: 'output.blackout'
  },
  'ar.freeze': {
    nome: 'Congelar',
    texto: 'Detiene el texto donde está mientras el reloj sigue corriendo. Para una pausa fuera de guion, sin perder el lugar.',
    comando: 'transport.freeze'
  },
  'ar.webview': {
    nome: 'Ver en la red',
    texto: 'Publica una página en la red local: cualquier dispositivo con navegador lee el mismo guion. Abre el panel con la dirección y el código QR.'
  },
  'ar.webviewSound': {
    nome: 'Sonido por la red',
    texto: 'Si una tarjeta de vídeo envía su audio por la red. Apagado, la página ni siquiera ofrece activar el sonido. Oscuro hasta que la red esté publicada.'
  },

  /* ---------------------------------------------------------------- OUTPUT */
  'output.identify': {
    nome: 'Identificar monitores',
    texto: 'Muestra un número grande en cada pantalla para saber cuál es cuál. Desactivado durante la emisión — también parpadearía al aire.'
  },
  'output.identifyRun': {
    nome: 'Mostrar los números',
    texto: 'Muestra el número de cada monitor unos segundos. No se envía nada al presentador; es solo una etiqueta en el cristal.'
  },
  'output.monitor': {
    nome: 'Elegir monitor',
    texto: 'De qué pantalla lee el presentador. Elígela antes de emitir — es lo único que espera Emitir.'
  },
  'output.broadcast': {
    nome: 'Emitir',
    texto: 'Pone la lectura en el monitor elegido, a pantalla completa. El punto es el estado: apagado es off, rojo y brillante es al aire.',
    comando: 'output.toggle'
  },

  /* ------------------------------------------------------------- TRANSPORT */
  'transport.restart': {
    nome: 'Volver al principio',
    texto: 'Envía la lectura a la primera palabra y reinicia los relojes. Sigue reproduciendo si ya estaba en marcha.',
    comando: 'transport.restart'
  },
  'transport.back': {
    nome: 'Retroceder',
    texto: 'Mueve la lectura unas líneas hacia atrás sin detenerse — para cuando el presentador repite una frase.',
    comando: 'transport.jumpBack'
  },
  'transport.playPause': {
    nome: 'Reproducir / Pausar',
    texto: 'Inicia y detiene el desplazamiento. La tecla más grande de la consola porque es la única que se busca sin mirar.',
    comando: 'transport.playPause'
  },
  'transport.forward': {
    nome: 'Avanzar',
    texto: 'Mueve la lectura unas líneas hacia adelante sin detenerse — para cuando el presentador se adelanta.',
    comando: 'transport.jumpForward'
  },
  'transport.marker': {
    nome: 'Crear marcador',
    texto: 'Deja un marcador donde está la lectura ahora. Los marcadores aparecen en la línea de progreso y se puede saltar a ellos durante el programa.',
    comando: 'marker.create'
  },
  'transport.speed': {
    nome: 'Ritmo de lectura',
    texto: 'Palabras por minuto — a qué velocidad se desplaza el texto. La rueda del ratón funciona en toda la app, no solo sobre esta regla.'
  },
  'status.target': {
    nome: 'Duración objetivo',
    texto: 'Cuánto tarda el guion al ritmo actual. Haz clic y escribe otra — "2:00" o solo segundos — y el ritmo cambia para ajustarse.'
  },
  'transport.elapsed': {
    nome: 'Transcurrido',
    texto: 'Cuánto lleva corriendo la lectura. Lo que cuenta depende del modo de reloj en Ajustes › Salida.'
  },
  'transport.remaining': {
    nome: 'Restante',
    texto: 'Cuánto falta al ritmo actual. Cambiar el ritmo cambia este número al instante — para eso sirve.'
  },
  'markers.chip': {
    nome: 'Marcador',
    texto: 'Clic para enviar la lectura aquí. Clic derecho lo elimina. El número es la tecla que salta a él durante el programa.'
  },
  'transport.progress': {
    nome: 'Línea de progreso',
    texto: 'Todo el guion de extremo a extremo. Las marcas ámbar son capítulos, las rojas son marcadores puestos a mano.'
  },

  /* ---------------------------------------------------------------- EDITOR */
  'editor.chapter': {
    nome: 'Capítulo',
    texto: 'Convierte la línea actual en capítulo — se vuelve ## en el texto. Los capítulos aparecen en la columna izquierda, en la línea de progreso y en la Mesa.',
    comando: 'insert.chapter'
  },
  'editor.direction': {
    nome: 'Acotación',
    texto: 'Marca la línea como acotación — se vuelve [corchetes] en el texto. Una instrucción para el presentador, nunca contada como palabra hablada.',
    comando: 'insert.direction'
  },
  'editor.find': {
    nome: 'Buscar en el guion',
    texto: 'Enter va a la siguiente, Shift+Enter a la anterior, Esc cierra en la que ves. Ignora mayúsculas y acentos: "acao" encuentra "ação". Mueve solo el editor — la lectura no se mueve.',
    comando: 'edit.find'
  },
  'editor.replace': {
    nome: 'Reemplazar por',
    texto: 'Lo que entra en lugar de lo que encontraste. Enter reemplaza la actual, Shift+Enter todas. Reemplazar todas es UN paso de deshacer, no treinta.'
  },
  'editor.findAll': {
    nome: 'Marcar todas las apariciones',
    texto: 'Dibuja la caja en todas a la vez, la actual más fuerte. Útil antes de reemplazar todas: ves lo que va a cambiar.'
  },
  'editor.overwrite': {
    nome: 'Pintar encima de las frases del presentador',
    texto: 'Apagado, pintar todas salta las líneas que ya tienen el color de un presentador: ese color es un sistema en el que confía quien lee. Encendido, las pinta también.'
  },
  'editor.bold': {
    nome: 'Negrita',
    texto: 'Negrita de verdad en la pantalla del presentador. En este editor sale como doble subrayado — la negrita es más ancha y el campo invisible de atrás se desalinearía.'
  },
  'editor.italic': {
    nome: 'Cursiva',
    texto: 'Cursiva de verdad en la pantalla del presentador; aquí un subrayado ondulado, por lo mismo que la negrita.'
  },
  'editor.underline': {
    nome: 'Subrayado',
    texto: 'Igual en ambos — subrayar no cambia el ancho de ninguna letra.'
  },
  'editor.color': {
    nome: 'Color del texto',
    texto: 'Cuatro atajos y el color que quieras. Ámbar y azul quedaron fuera: ya significan capítulo y acotación. La punteada quita la marca.'
  },
  'editor.clearFormat': {
    nome: 'Quitar formato',
    texto: 'Vuelve a convertir capítulos y acotaciones en texto plano. Las palabras se quedan; deshacer trae las marcas de vuelta.',
    comando: 'edit.clearFormat'
  },
  'editor.presenter': {
    nome: 'Crear presentador',
    texto: 'Selecciona un nombre ya escrito en el guion y haz clic: desde ahí habla esa persona, hasta el próximo nombre. Nada se escribe en tu texto.'
  },
  'editor.allCaps': {
    nome: 'Mayúsculas en el editor',
    texto: 'Dibuja el editor en mayúsculas sin cambiar ni una letra guardada. Independiente del mismo interruptor en Ajustes › Texto.'
  },
  'editor.undo': {
    nome: 'Deshacer',
    texto: 'Retrocede paso a paso por tus ediciones del guion.',
    comando: 'edit.undo'
  },
  'editor.redo': {
    nome: 'Rehacer',
    texto: 'Avanza otra vez por lo que deshiciste.',
    comando: 'edit.redo'
  },
  'editor.catch': {
    nome: 'Catch',
    texto: 'La marca de lectura sigue tu cursor mientras escribes, en cada pausa. Un Ir a que nunca se apaga solo.'
  },
  'editor.goTo': {
    nome: 'Ir a',
    texto: 'Envía la lectura a donde está el cursor en el editor, una vez. Para saltar a un pasaje que acabas de encontrar.'
  },
  'editor.marker': {
    nome: 'Crear marcador',
    texto: 'El mismo marcador de la consola de transporte, al alcance del guion que ya estás mirando.',
    comando: 'marker.create'
  },
  'editor.loop': {
    nome: 'Bucle',
    texto: 'Al llegar al final, vuelve al principio y sigue reproduciendo. Para un stand o un ensayo que no puede parar nunca.'
  },
  'editor.loopDelay': {
    nome: 'Espera del bucle',
    texto: 'Segundos de espera al final antes de reiniciar. Cero reinicia de inmediato.'
  },
  'editor.fontSmaller': {
    nome: 'Fuente más pequeña',
    texto: 'Un punto menos en el editor. La pantalla del presentador no se ve afectada — es la comodidad de quien escribe.'
  },
  'editor.fontSize': {
    nome: 'Tamaño de fuente del editor',
    texto: 'El tamaño del texto que escribes. No tiene relación con el tamaño que lee el presentador, que vive en Ajustes › Texto.'
  },
  'editor.fontBigger': {
    nome: 'Fuente más grande',
    texto: 'Un punto más en el editor. La pantalla del presentador no se ve afectada — es la comodidad de quien escribe.'
  },
  'editor.script': {
    nome: 'Guion',
    texto: 'Escribe o pega aquí. Una línea que empieza con ## es un capítulo; el texto en [corchetes] es una acotación, nunca contada como hablada.'
  },
  'editor.split': {
    nome: 'Divisoria Edición / Emisión',
    texto: 'Arrastra para dar más espacio al guion o a la vista previa. Doble clic la vuelve a centrar.'
  },
  'panel.goToReading': {
    nome: 'Ir a la lectura',
    texto: 'Lleva el editor a la palabra que se lee ahora, una vez, y pone ahí el cursor. La imagen inversa del Ir a bajo el guion.'
  },
  'panel.follow': {
    nome: 'Seguir la lectura',
    texto: 'El editor se desplaza junto con la emisión y marca la línea que se lee. Nunca mueve tu cursor, y se aparta 4s cada vez que escribes o desplazas.'
  },
  'panel.focusToggle': {
    nome: 'Modo foco',
    texto: 'Oculta el editor y deja sola en pantalla la vista del presentador — la disposición para emitir, no para escribir.',
    comando: 'view.focus'
  },

  /* --------------------------------------------------------------- SIDEBAR */
  'sidebar.chapter': {
    nome: 'Capítulo',
    texto: 'Clic para enviar la lectura al inicio de este capítulo. El tiempo a la derecha es lo que tarda al ritmo actual.'
  },
  'sidebar.card': {
    nome: 'Tarjeta',
    texto: 'Clic para poner esta tarjeta en la pantalla del presentador, o para quitarla si ya está ahí. Arrastra para reordenar.'
  },
  'sidebar.cardOverlay': {
    nome: 'OVERLAY en esta tarjeta',
    texto: 'El texto se desplaza sobre esta tarjeta en vez de sustituirla. Bloqueado mientras el OVERLAY global fuerza todas las tarjetas.'
  },
  'sidebar.overlayGlobal': {
    nome: 'OVERLAY global',
    texto: 'Fuerza el texto sobre TODAS las tarjetas, sin importar lo que diga cada una. Apagado, cada tarjeta decide por su cuenta.'
  },
  /* também um id por opção: faixa, sombra e nada resolvem legibilidades
     diferentes, e é justamente a diferença entre elas que o operador precisa
     saber para escolher */
  'overlay.styleBand': {
    nome: 'Overlay: franja oscura',
    texto: 'Pone una franja oscura sobre toda la tarjeta, detrás del texto. La única que garantiza legibilidad en cualquier imagen.'
  },
  'overlay.styleShadow': {
    nome: 'Overlay: sombra',
    texto: 'Pone una sombra alrededor de cada letra en vez de una franja — la tarjeta queda del todo visible, el texto se lee en casi todas.'
  },
  'overlay.styleNone': {
    nome: 'Overlay: sin tratamiento',
    texto: 'El texto va directo sobre la tarjeta, sin tratamiento. Solo para artes elegidas sabiendo dónde caería el texto.'
  },
  'sidebar.thumbSmaller': {
    nome: 'Miniaturas más pequeñas',
    texto: 'Reduce un 10% las miniaturas de tarjeta en esta columna, para que quepa más programa en pantalla.'
  },
  'sidebar.thumbSize': {
    nome: 'Tamaño de las miniaturas',
    texto: 'Qué tan grandes son las imágenes de tarjeta en esta columna. Una comodidad local — nunca viaja dentro del archivo del proyecto.'
  },
  'sidebar.thumbBigger': {
    nome: 'Miniaturas más grandes',
    texto: 'Agranda un 10% las miniaturas de tarjeta en esta columna, para reconocer un cuadro de un vistazo.'
  },
  'sidebar.helpToggle': {
    nome: 'Ayuda rápida',
    texto: 'Colapsa este cuadro. Lo que lees aquí es lo último que señaló tu ratón — se queda hasta que señales otra cosa.'
  },

  /* ----------------------------------------------------------------- CARDS */
  'cards.addImage': {
    nome: 'Añadir imagen',
    texto: 'Copia una imagen dentro del proyecto, así viaja dentro del .valendo y sobrevive a la máquina de la que vino.'
  },
  'cards.addVideo': {
    nome: 'Añadir vídeo',
    texto: 'Apunta a un vídeo donde ya vive — no se copia. Moverlo o renombrarlo después rompe la tarjeta.'
  },
  'cards.addText': {
    nome: 'Añadir recado',
    texto: 'Una tarjeta de texto plano — una nota para el presentador, grande en pantalla. Nada que importar; lo escribes aquí mismo.'
  },
  'cards.addScreen': {
    nome: 'Añadir pantalla',
    texto: 'Una tarjeta que dibuja la app: un color o un degradado, con un recado encima si quieres. Sin archivo, sin importar — una espera sin abrir un editor de imágenes.'
  },
  'cards.editScreen': {
    nome: 'Editar la pantalla',
    texto: 'Abre la pantalla con una vista previa grande. El color elegido en un cuadro de 176px no es el color que ves en un monitor de estudio.'
  },
  'cards.background': {
    nome: 'Fondo',
    texto: 'Liso es un solo color. Degradado añade un segundo color y un ángulo entre ellos.'
  },
  'cards.colours': {
    nome: 'Colores',
    texto: 'Abre el selector de color del sistema, cuentagotas incluido. Profundo y poco saturado se lee mejor detrás del cristal del teleprompter.'
  },
  'cards.angle': {
    nome: 'Ángulo del degradado',
    texto: 'Hacia dónde corren los dos colores. 0° va hacia arriba, 90° va hacia la derecha.'
  },
  'cards.screenText': {
    nome: 'Recado de la pantalla',
    texto: 'Lo que se escribe sobre el fondo. Donde pulses Intro es donde se corta al aire. Déjalo vacío para un fondo liso.'
  },
  'cards.screenEffect': {
    nome: 'Fondo animado',
    texto: 'Seis formas de mover los dos colores. Todas son lentas a propósito — un fondo inquieto compite con quien lee. Cada pantalla corre su propia copia, no van sincronizadas entre sí.'
  },
  'cards.speed': {
    nome: 'Velocidad del efecto',
    texto: 'Acelera o ralentiza los seis efectos a la vez. Escala el ritmo propio de cada uno en vez de forzar una sola duración — no se afinaron al mismo número.'
  },
  'cards.intensity': {
    nome: 'Intensidad del efecto',
    texto: 'Cuánto se nota el movimiento sobre el color base. Bajo es casi imperceptible, lo que suele querer un fondo que dura media hora al aire.'
  },
  'cards.fade': {
    nome: 'Dónde se juntan los colores',
    texto: 'Cuánto del cuadro ocupa la transición. Total es un desvanecido de extremo a extremo; cero es una línea limpia entre dos mitades sólidas.'
  },
  'cards.screenAlign': {
    nome: 'Alineación del párrafo',
    texto: 'Cómo se acomodan las líneas entre sí. Independiente de dónde se ubica el bloque en la pantalla — eso es Posición.'
  },
  'cards.size': {
    nome: 'Cuerpo del recado',
    texto: 'Una proporción de la altura de pantalla, no un tamaño en píxeles — así la tarjeta se ve igual en el cajón y en un monitor de 55 pulgadas.'
  },
  'cards.place': {
    nome: 'Dónde se ubica',
    texto: 'Arriba, centro o abajo. Ninguno toca el borde: detrás del cristal, el último centímetro de pantalla es lo primero que se pierde.'
  },
  'cards.close': {
    nome: 'Cerrar cajón',
    texto: 'Oculta el cajón de tarjetas. Las tarjetas siguen en el programa; solo el cajón desaparece.'
  },
  'cards.shortcut': {
    nome: 'Atajo de la tarjeta',
    texto: 'La tecla que pone esta tarjeta al aire en medio del programa. Sigue la posición en el cajón — reordenar la renumera.'
  },
  'cards.name': {
    nome: 'Nombre de la tarjeta',
    texto: 'Cómo llamas a esta tarjeta. Es lo que muestran la columna de assets y la Mesa — el nombre del archivo no te dice nada a esa velocidad.'
  },
  'cards.message': {
    nome: 'Recado',
    texto: 'El texto que lee el presentador en esta tarjeta. Se dibuja grande y centrado, no se desplaza.'
  },
  'cards.onAir': {
    nome: 'Al aire',
    texto: 'Pone esta tarjeta en la pantalla del presentador, o la quita. Las únicas dos puertas son este interruptor y el botón de reproducir vídeo.'
  },
  'cards.overlay': {
    nome: 'OVERLAY en esta tarjeta',
    texto: 'El texto se desplaza sobre esta tarjeta en vez de sustituirla. Bloqueado mientras el OVERLAY global fuerza todas las tarjetas.'
  },
  'cards.remove': {
    nome: 'Eliminar tarjeta',
    texto: 'Quita esta tarjeta del programa. Las imágenes importadas se limpian de la carpeta del proyecto al guardar.'
  },
  'cards.relink': {
    nome: 'Reenlazar archivo',
    texto: 'El archivo al que apunta esta tarjeta desapareció — se movió, se renombró o está en un disco que no está aquí. Clic para volver a apuntarla.'
  },
  'cards.videoNetwork': {
    nome: 'Vídeo en la red',
    texto: 'Si los navegadores de la red pueden reproducir este archivo. Algunos formatos un navegador los rechaza aunque la app los reproduzca bien.'
  },
  'cards.videoPlay': {
    nome: 'Reproducir vídeo',
    texto: 'Fuera del aire, pone la tarjeta y la inicia. Al aire, reproduce y pausa lo que ya está corriendo.'
  },
  'cards.videoStartPaused': {
    nome: 'Mostrar en pausa',
    texto: 'Envía la tarjeta a la pantalla congelada en el cuadro actual — para encuadrar un plano antes de que corra de verdad.'
  },
  'cards.videoSeek': {
    nome: 'Posición del vídeo',
    texto: 'Arrastra para recorrer el vídeo. También se mueve en la pantalla del presentador, así que recorrerlo al aire es recorrerlo al aire.'
  },
  'cards.videoMute': {
    nome: 'Silenciar',
    texto: 'Silencia el audio de la tarjeta en esta máquina y lo devuelve al volumen que tenías. El sonido en red tiene su propio interruptor.'
  },
  'cards.videoVolume': {
    nome: 'Volumen de la tarjeta',
    texto: 'Qué tan alto suenan las tarjetas de vídeo en esta máquina. Una preferencia local — nunca viaja dentro del archivo del proyecto.'
  },
  'cards.videoLoop': {
    nome: 'Repetir vídeo',
    texto: 'Este clip reinicia al llegar al final, mientras la tarjeta siga al aire.'
  },

  /* ---------------------------------------------------------------- SETTINGS */
  'insp.tabText': {
    nome: 'Texto',
    texto: 'Cómo se dibuja la pantalla del presentador: tipografía, tamaño, grosor, alineación y colores.'
  },
  'insp.tabReading': {
    nome: 'Lectura',
    texto: 'Cómo se lee el texto: dónde se ubica, cuántas palabras por línea, dónde está la marca de lectura y cómo se comporta el ritmo.'
  },
  'insp.tabOutput': {
    nome: 'Salida',
    texto: 'Lo que solo existe en la pantalla del presentador: los relojes y el espejo que necesita el cristal de un teleprompter real.'
  },
  'insp.font': {
    nome: 'Tipografía',
    texto: 'La familia que lee el presentador. Las que se ofrecen son las que sobreviven a leerse a distancia, en espejo.'
  },
  'insp.allCaps': {
    nome: 'Mayúsculas en la salida',
    texto: 'Dibuja la pantalla del presentador en mayúsculas sin cambiar ninguna letra guardada. Independiente del interruptor del editor.'
  },
  'insp.body': {
    nome: 'Cuerpo',
    texto: 'Qué tan grande lee el presentador. El número más importante de todos — lo demás es ajuste alrededor de él.'
  },
  'insp.weight': {
    nome: 'Grosor',
    texto: 'Qué tan gruesos son los trazos. Más grueso sobrevive a una sala luminosa; más fino es más calmo en un cristal oscuro.'
  },
  'insp.lineHeight': {
    nome: 'Interlineado',
    texto: 'La distancia entre líneas. Suelto se lee más calmo y se desplaza más suave; apretado cabe más texto en pantalla.'
  },
  'insp.letterSpacing': {
    nome: 'Entre letras',
    texto: 'El aire entre letras. Un poco ayuda a distancia; demasiado rompe las palabras.'
  },
  'insp.align': {
    nome: 'Alineación',
    texto: 'Dónde se ubica cada línea dentro del cuadro de texto. Independiente de Posición, que mueve el cuadro entero.'
  },
  'insp.textColor': {
    nome: 'Color del texto',
    texto: 'El color de las palabras en la pantalla del presentador.'
  },
  'insp.bgColor': {
    nome: 'Color de fondo',
    texto: 'El color detrás de las palabras. En un cristal de teleprompter real, cuanto más oscuro, menos refleja la sala.'
  },
  'insp.preset': {
    nome: 'Paleta de colores',
    texto: 'Un par de texto y fondo ya probado. Tocar cualquiera de los dos colores a mano después simplemente desmarca la paleta.'
  },
  'insp.invert': {
    nome: 'Invertir',
    texto: 'Intercambia los colores de texto y fondo — claro sobre oscuro pasa a oscuro sobre claro, en un clic.'
  },
  'insp.presenterHide': {
    nome: 'Ocultar este nombre',
    texto: 'Quita el nombre de este presentador de la pantalla del presentador — el habla se queda, en su color. Tu guion nunca se toca.'
  },
  'insp.presenterHideAll': {
    nome: 'Ocultar todos los nombres',
    texto: 'Quita todos los nombres de presentador de la salida a la vez, y bloquea los interruptores individuales mientras manda. El editor siempre los conserva.'
  },
  'insp.presenterRename': {
    nome: 'Renombrar presentador',
    texto: 'Doble clic para renombrar. También reescribe el nombre en el guion — solo las líneas de pie, nunca una mención dentro de un discurso. Un deshacer devuelve ambos.'
  },
  'insp.presenterRelink': {
    nome: 'Reenlazar presentador',
    texto: 'El nombre cambió en el guion. Selecciona el nuevo en el editor y haz clic: mismo presentador, mismo color, nombre nuevo — nada de lo ya pintado se pierde.'
  },
  'insp.presenterRemove': {
    nome: 'Quitar presentador',
    texto: 'Elimina este presentador. Las palabras quedan exactamente igual — solo el color desaparece.'
  },
  'insp.position': {
    nome: 'Posición horizontal',
    texto: 'Desliza todo el cuadro de texto a la izquierda o derecha sin cambiar su tamaño. Se ajusta al centro exacto cerca del 50%.'
  },
  'insp.presentersToggle': {
    nome: 'Presentadores',
    texto: 'Quién habla este guion, y de qué color. Cerrada, los puntos siguen diciendo cuántos hay y de qué colores.'
  },
  'insp.presetsToggle': {
    nome: 'Presets',
    texto: 'Cinco lugares para guardar un estilo entero — letra, colores, márgenes y los presentadores. Cerrado, sigue mostrando con cuál nacen las pestañas nuevas.'
  },
  'insp.presetSlot': {
    nome: 'Un preset',
    texto: 'Un clic viste esta pestaña con él. Clic derecho para renombrar, cambiar el color, poner la estrella o borrar. Ctrl+Z lo deshace de un paso.'
  },
  'insp.presetSave': {
    nome: 'Guardar preset',
    texto: 'Fotografía la pestaña activa y pregunta en cuál de los cinco guardarla. Dos pasos a propósito: sobrescribir uno con nombre no puede ser un clic torcido.'
  },
  'insp.margin': {
    nome: 'Margen',
    texto: 'Cuánto del borde de pantalla queda vacío en cada lado. Texto más angosto significa líneas más cortas y menos movimiento de ojos.'
  },
  'insp.minWords': {
    nome: 'Mínimo de palabras por línea',
    texto: 'El piso de cuántas palabras puede tener una línea, como mínimo. Valendo corta el texto por sentido, no por el ancho de la pantalla.'
  },
  'insp.maxWords': {
    nome: 'Máximo de palabras por línea',
    texto: 'El techo de cuántas palabras puede tener una línea. Demasiado alto y las líneas se parten solas, algo que el panel advierte.'
  },
  'insp.readingMark': {
    nome: 'Marca de lectura',
    texto: 'Qué tan abajo en la pantalla lee el presentador. Más arriba deja más texto abajo por ver venir.'
  },
  'insp.markOnOutput': {
    nome: 'Marca en la salida',
    texto: 'Si la marca de lectura también se dibuja en la pantalla del presentador. Aquí en la vista previa siempre se dibuja.'
  },
  'insp.focusDim': {
    nome: 'Atenuar el resto',
    texto: 'Difumina lo que está lejos de la marca de lectura, para que el ojo caiga en la línea actual en vez de vagar.'
  },
  'insp.focusDimPct': {
    nome: 'Cantidad de atenuación',
    texto: 'Qué tan fuerte es el difuminado. Bajo deja una ventana amplia y legible junto a la marca; alto la reduce a una rendija. La ventana sigue la marca donde la pongas.'
  },
  'insp.uniform': {
    nome: 'Velocidad constante',
    texto: 'Cada línea recibe el mismo tiempo, pese lo que pese. Apagado, una línea pesada tarda más que una corta — más cerca del habla real.'
  },
  'insp.wrappingFix': {
    nome: 'Ajustar el tamaño de fuente',
    texto: 'Reduce la fuente al mayor tamaño donde ninguna línea se parte sola, terminando el desajuste que describe la advertencia.'
  },
  'insp.clockElapsed': {
    nome: 'Reloj transcurrido',
    texto: 'Muestra el tiempo transcurrido en la pantalla del presentador — la que mira el presentador, no la de tu consola.'
  },
  'insp.clockElapsedColor': {
    nome: 'Color de transcurrido',
    texto: 'El color del reloj de tiempo transcurrido en la pantalla del presentador.'
  },
  'insp.clockRemaining': {
    nome: 'Reloj restante',
    texto: 'Muestra el tiempo que falta en la pantalla del presentador — el número que le dice si acelerar o tomarse su tiempo.'
  },
  'insp.clockRemainingColor': {
    nome: 'Color de restante',
    texto: 'El color del reloj de tiempo restante en la pantalla del presentador.'
  },
  /* Um id por opção, e não um para o trio: "fórmula", "cronômetro" e "livre"
     mudam o SIGNIFICADO dos dois relógios, cada um do seu jeito. Uma
     descrição só para os três seria a frase genérica que ninguém lê. */
  'insp.clockModeWords': {
    nome: 'Reloj: desde el guion',
    texto: 'Transcurrido y restante vienen de las palabras leídas y el ritmo actual. Cambia el ritmo y ambos números cambian con él.'
  },
  'insp.clockModeStopwatch': {
    nome: 'Reloj: cronómetro',
    texto: 'Transcurrido cuenta segundos reales desde que pulsas play; restante cuenta hacia atrás desde la meta que fijes abajo.'
  },
  'insp.clockModeFree': {
    nome: 'Reloj: libre',
    texto: 'Los relojes corren contra la meta con independencia del guion — para un segmento en vivo donde las palabras no son el plan.'
  },
  'insp.clockTarget': {
    nome: 'Tiempo objetivo',
    texto: 'Cuánto debería durar la pieza. Escribe los dígitos y los dos puntos se ubican solos — "320" se vuelve 03:20.'
  },
  'insp.clockPosition': {
    nome: 'Posición del reloj',
    texto: 'En qué esquina de la pantalla del presentador se ubican los relojes. La grilla tiene la forma de la pantalla misma.'
  },
  'insp.clockSize': {
    nome: 'Tamaño del reloj',
    texto: 'Qué tan grandes son los relojes, como proporción de la altura de pantalla. Grande para leerse, pequeño para no competir con el texto.'
  },
  'insp.mirrorH': {
    nome: 'Reflejar horizontal',
    texto: 'Invierte la pantalla del presentador de izquierda a derecha — lo que necesita el cristal divisor frente al lente. Tu vista previa y la página de red nunca se invierten.'
  },
  'insp.mirrorV': {
    nome: 'Reflejar vertical',
    texto: 'Invierte la pantalla del presentador de arriba abajo, para montajes donde el monitor mira hacia el cristal. Tu vista previa y la página de red nunca se invierten.'
  },
  'insp.rotation': {
    nome: 'Rotación',
    texto: 'Gira la pantalla del presentador en cuartos de vuelta — para un monitor montado de lado. Tu vista previa y la página de red mantienen la imagen derecha.'
  },

  /* -------------------------------------------------------------- RODAPÉ */
  'status.modeSplit': {
    nome: 'Split',
    texto: 'Editor y vista del presentador lado a lado — la disposición para escribir y emitir al mismo tiempo.'
  },
  'status.modeFocus': {
    nome: 'Foco',
    texto: 'La vista del presentador sola, tan grande como permita la ventana. Para emitir un guion que ya está terminado.'
  },
  'status.modeDeck': {
    nome: 'Mesa',
    texto: 'Cambia el editor por la Mesa: cada capítulo con su duración, para seguir un programa largo.'
  },
  'status.storage': {
    nome: 'Estado de guardado',
    texto: 'Dice si Valendo está logrando escribir tu trabajo en el disco. Se pone ámbar en cuanto no puede — el silencio se vería igual que funcionar.'
  },
  'status.palette': {
    nome: 'Paleta de comandos',
    texto: 'Todos los comandos de la app, buscables por nombre, con su atajo al lado. La forma más rápida de encontrar algo que usas poco.',
    comando: 'palette.open'
  }
} as const satisfies Partial<Record<string, Ajuda>>
