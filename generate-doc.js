const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TableOfContents, SectionType
} = require("docx");
const fs = require("fs");

// ── Palette: IG-1 Ink Gold (Finance / Investment / Premium) ──
const P = {
  primary: "#0F2027",
  body: "#1A1A1A",
  secondary: "#4A6575",
  accent: "#C9A84C",
  surface: "#F5F7FA",
  cover: {
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    footerColor: "687078"
  },
  table: {
    headerBg: "C9A84C",
    headerText: "1A1A1A",
    accentLine: "C9A84C",
    innerLine: "DDD5C0",
    surface: "F5F2E8"
  }
};
const c = (hex) => hex.replace("#", "");

// ── Cover Recipe R1 (Pure Paragraph Left) ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function buildCoverR1(config) {
  const titleLines = config.title.split("\n");
  const subtitleText = config.subtitle || "";
  const metaLines = config.metaLines || [];
  const footerText = config.footer || "";

  const children = [];

  // Top spacing
  children.push(new Paragraph({ spacing: { before: 4200 }, children: [] }));

  // Title lines
  for (const line of titleLines) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 100, line: 900, lineRule: "atLeast" },
      children: [new TextRun({
        text: line,
        bold: true,
        size: 56,
        color: c(P.cover.titleColor),
        font: { ascii: "Times New Roman", eastAsia: "SimHei" }
      })]
    }));
  }

  // Accent line
  children.push(new Paragraph({
    indent: { left: 0, right: 6000 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: c(P.accent), space: 12 } },
    spacing: { before: 300, after: 300 },
    children: []
  }));

  // Subtitle
  if (subtitleText) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 100, line: 500, lineRule: "atLeast" },
      children: [new TextRun({
        text: subtitleText,
        size: 28,
        color: c(P.cover.subtitleColor),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
      })]
    }));
  }

  // Meta lines
  for (const line of metaLines) {
    children.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({
        text: line,
        size: 20,
        color: c(P.cover.metaColor),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
      })]
    }));
  }

  // Footer
  if (footerText) {
    children.push(new Paragraph({
      spacing: { before: 2000 },
      children: [new TextRun({
        text: footerText,
        size: 18,
        color: c(P.cover.footerColor),
        font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
      })]
    }));
  }

  // Wrap in full-page table
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: allNoBorders,
      rows: [
        new TableRow({
          height: { value: 16838, rule: "exact" },
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: c(P.primary) },
              verticalAlign: "top",
              borders: allNoBorders,
              children: children
            })
          ]
        })
      ]
    })
  ];
}

// ── Helper functions ──
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({
      text,
      bold: true,
      size: 32,
      color: c(P.primary),
      font: { ascii: "Times New Roman", eastAsia: "SimHei" }
    })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({
      text,
      bold: true,
      size: 28,
      color: c(P.primary),
      font: { ascii: "Times New Roman", eastAsia: "SimHei" }
    })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100, line: 312 },
    children: [new TextRun({
      text,
      bold: true,
      size: 24,
      color: c(P.secondary),
      font: { ascii: "Times New Roman", eastAsia: "SimHei" }
    })]
  });
}

function bodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text,
      size: 24,
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function bodyParaNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text,
      size: 24,
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function boldBodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text,
      size: 24,
      bold: true,
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function accentLine() {
  return new Paragraph({
    indent: { left: 0, right: 0 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: c(P.accent), space: 8 } },
    spacing: { before: 100, after: 100 },
    children: []
  });
}

// Table helper
function makeTable(headers, rows, colWidths) {
  const borderStyle = {
    top: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(P.table.innerLine) },
    insideVertical: { style: BorderStyle.NONE }
  };

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
        shading: { type: ShadingType.CLEAR, fill: c(P.table.headerBg) },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, size: 21, color: c(P.table.headerText), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        })]
      })
    )
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      cantSplit: true,
      children: row.map((cell, ci) =>
        new TableCell({
          width: colWidths ? { size: colWidths[ci], type: WidthType.PERCENTAGE } : undefined,
          shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: c(P.table.surface) } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
          })]
        })
      )
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderStyle,
    rows: [headerRow, ...dataRows]
  });
}

function tableCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text, size: 20, italics: true, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

// ── DOCUMENT CONTENT ──

// SECTION 1: Cover
const coverSection = {
  properties: {
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    }
  },
  children: buildCoverR1({
    title: "Plataforma de\nAnalitica Cuantitativa\nCrypto",
    subtitle: "El Bloomberg del Retail: Arquitectura, Variables, Modelos y Hoja de Ruta",
    metaLines: [
      "Documento de Analisis Arquitectonico Definitivo",
      "Version 1.0 - Mayo 2026",
      "Clasificacion: Confidencial"
    ],
    footer: "Think Big Architecture | Infraestructura Institucional a Coste Cero"
  })
};

// SECTION 2: Front matter (TOC)
const frontMatterChildren = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360 },
    children: [new TextRun({
      text: "Tabla de Contenidos",
      bold: true,
      size: 32,
      color: c(P.primary),
      font: { ascii: "Times New Roman", eastAsia: "SimHei" }
    })]
  }),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3"
  }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Nota: Esta tabla de contenidos se genera mediante codigos de campo. Para garantizar la precision de los numeros de pagina tras la edicion, haga clic derecho en la tabla y seleccione \"Actualizar campo\".",
      italics: true,
      size: 18,
      color: "888888"
    })]
  }),
  new Paragraph({ children: [new PageBreak()] })
];

const frontMatterSection = {
  properties: {
    type: SectionType.NEXT_PAGE,
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN }
    }
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })]
      })]
    })
  },
  children: frontMatterChildren
};

// SECTION 3: Body content
const bodyChildren = [];

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 1: RESUMEN EJECUTIVO
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("1. Resumen Ejecutivo"));

bodyChildren.push(bodyPara("El presente documento constituye el analisis arquitectonico definitivo de una plataforma de analitica cuantitativa para mercados de criptomonedas, concebida bajo la filosofia de \"Think Big\": absorber data masiva, cruzarla en tiempo real y generar senales de inversión con una precision que no existe en el mercado retail. El objetivo central es construir lo que podriamos denominar \"el Bloomberg del Retail\", una herramienta que no se limite a mostrar precios y graficos, sino que extraiga la intencion matematica detras de cada movimiento del mercado, la cruce con anos de contexto historico y el sesgo psicologico de los propios usuarios, y devuelva oportunidades de inversión con valor predictivo demostrable."));

bodyChildren.push(bodyPara("La arquitectura se fundamenta en tres pilares de infraestructura de coste cero o casi cero: Oracle Cloud Always Free como motor de almacenamiento y procesamiento masivo con ClickHouse, Cloudflare Workers como capa de ingesta en tiempo real en el Edge, y Netlify como interfaz ligera de usuario. Esta combinacion permite procesar terabytes de datos historicos y flujos en tiempo real sin incurrir en costes de servidor significativos, democratizando el acceso a herramientas de nivel institucional."));

bodyChildren.push(bodyPara("El sistema incorpora un paradigma innovador: el analisis del ADN del token, que permite evaluar proyectos nuevos sin historial propio mediante la comparacion de su huella topologica con millones de eventos pasados. A traves de vector embeddings y busqueda de vecinos mas cercanos (KNN) en bases de datos vectoriales como Qdrant, el sistema identifica en milisegundos patrones historicos identicos al evento actual, prediciendo comportamientos con una precision estadistica demostrable. Se detallan cuatro modulos de inteligencia pre-establecidos (Honeypot & Rug-Pull Predictor, Smart Money Front-Running, El Espejo Retard, y V-Shape Recovery Scanner) mas un Constructor de Patrones abierto que permite a usuarios avanzados crear y backtestear sus propias reglas de cruce contra anos de historia."));

bodyChildren.push(bodyPara("Este documento analiza exhaustivamente todas las variables a considerar, desde datos on-chain de Solana y Ethereum hasta metricas de comportamiento de usuarios, pasando por la topologia de graficos de volumen y el etiquetado de wallets institucionales. Cada capa del sistema, cada modelo cruzado, y cada decision arquitectonica se presenta con su justificacion tecnica, sus limitaciones conocidas y sus vias de expansion futura."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 2: VISION ESTRATEGICA Y FILOSOFIA DEL PROYECTO
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("2. Vision Estrategica y Filosofia del Proyecto"));

bodyChildren.push(heading2("2.1 El Problema del Analisis Superficial"));

bodyChildren.push(bodyPara("La gran mayoria de las plataformas de analisis crypto disponibles para el inversor retail operan en un nivel estrictamente descriptivo: muestran precios, volumenes, graficos de velas y, en el mejor de los casos, algunos indicadores tecnicos basicos como RSI o MACD. Este enfoque padece de un defecto fundamental: es reactivop, no predictivo. El trader ve que el precio ya ha subido o bajado, pero no tiene informacion anticipada sobre lo que va a ocurrir. La plataforma le muestra el cadaver, no la autopsia ni, mucho menos, la prevencion."));

bodyChildren.push(bodyPara("El segundo problema es la ausencia de cruce de datos multidimensional. Dexscreener muestra datos de un DEX, CoinMarketCap muestra capitalizacion, TradingView muestra indicadores tecnicos. Pero ninguna plataforma retail cruza automaticamente el flujo de wallets inteligentes con el heatmap de stop losses de su propia base de usuarios, ni compara la topologia del volumen de un token nuevo con cinco anos de patrones historicos. Cada herramienta es un silo aislado, y el trader debe realizar el cruce mentalmente, de forma lenta, imprecisa y emocional."));

bodyChildren.push(bodyPara("El tercer problema es la dependencia del historial del token. Cuando nace un nuevo proyecto en Solana, no tiene historial. Los indicadores tecnicos tradicionales (medias moviles, bandas de Bollinger) necesitan semanas de datos para generar senales. El inversor retail se enfrenta a la decision de entrar o no en un token sin ninguna base analitica, guiado unicamente por el FOMO o por la intuicion. Este es el vacio que nuestra plataforma llena: analizar no el historial del token, sino la topologia del evento y el ADN de las carteras involucradas."));

bodyChildren.push(heading2("2.2 El Paradigma Think Big"));

bodyChildren.push(bodyPara("La filosofia Think Big implica abandonar la mentalidad de \"hacerlo caber en un servidor gratuito\" y adoptar la de \"construir el sistema mas potente posible manteniendo el coste en cero o casi cero\". Esto no es una contradiccion; es ingenieria creativa. El ecosistema cloud actual ofrece recursos gratuitos que, correctamente orquestados, proporcionan potencia de nivel bancario: Oracle Cloud regala servidores con 24 GB de RAM y 4 nucleos reales, Cloudflare ofrece 100,000 peticiones diarias en el Edge a latencia sub-milisegundo, y Netlify permite hosting de aplicaciones React/Vue con CDN global."));

bodyChildren.push(bodyPara("El cambio de paradigma es radical: en lugar de preguntar \"que podemos hacer con un servidor gratuito?\", preguntamos \"como podemos absorber la maxima data posible, cruzarla de la forma mas inteligente, y entregar senales con el mayor valor predictivo, usando solo recursos gratuitos?\". La respuesta es una arquitectura distribuida donde cada componente hace lo que mejor sabe hacer: ClickHouse para almacenamiento columnar y cruces masivos, Cloudflare Workers para ingesta en tiempo real, y el navegador del usuario (via DuckDB-WASM) para analisis personalizados intensivos."));

bodyChildren.push(heading2("2.3 La Ventaja Competitiva Fundamental"));

bodyChildren.push(bodyPara("La ventaja competitiva de esta plataforma no reside en un unico algoritmo brillante, sino en la confluencia de tres fuentes de datos que ningun competidor retail combina simultaneamente: datos on-chain en tiempo real (flujo de Dexscreener y nodos Solana/Ethereum), contexto historico masivo (cinco anos de precios minuto a minuto y transacciones on-chain etiquetadas), y el sesgo psicologico de los propios usuarios (cada click, cada trade, cada stop loss golpeado). Esta triple confluencia genera una camara de rayos X del mercado: sabemos lo que hacen los grandes, lo que hizo el mercado historicamente en situaciones identicas, y lo que esta haciendo la masa en este exacto instante. El cruce de estas tres dimensiones produce senales con una precision estadistica que es estructuralmente inalcanzable para cualquier plataforma que solo utilice una de ellas."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 3: ARQUITECTURA DE INFRAESTRUCTURA
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("3. Arquitectura de Infraestructura"));

bodyChildren.push(heading2("3.1 Oracle Cloud Always Free + ClickHouse (El Cerebro)"));

bodyChildren.push(bodyPara("Oracle Cloud ofrece en su capa Always Free un servidor ARM Ampere A1 con hasta 24 GB de RAM y 4 nucleos CPU, junto con 200 GB de almacenamiento block. Este recurso, que Oracle proporciona de forma permanente sin coste, constituye la columna vertebral computacional del sistema. Sobre este servidor instalamos ClickHouse, una base de datos columnar de codigo abierto desarrollada originalmente por Yandex y utilizada por empresas como Cloudflare, Uber y Spotify para procesar petabytes de datos en tiempo real."));

bodyChildren.push(bodyPara("ClickHouse es la eleccion optima por multiples razones. Primero, su almacenamiento columnar comprime datos financieros con una ratio tipica de 10:1 a 20:1, lo que significa que cinco anos de datos de precios minuto a minuto para 1,000 tokens (aproximadamente 2,628 millones de filas) ocupan apenas unos gigabytes. Segundo, sus consultas agregadas se ejecutan en milisegundos sobre miles de millones de filas, gracias a su procesamiento vectorizado y paralelismo masivo. Tercero, sus Materialized Views permiten pre-calcular cruces de datos automaticamente a medida que llega nueva informacion, de modo que las consultas del usuario obtienen resultados instantaneos sin necesidad de procesar en el momento."));

bodyChildren.push(bodyPara("La configuracion recomendada incluye la creacion de un cluster de ClickHouse con al menos tres tablas principales: una tabla de eventos en tiempo real (trades, transfers, swaps), una tabla de series temporales historicas (precios OHLCV por minuto), y una tabla de etiquetado de wallets (clasificacion de cada direccion como Smart Money, Sniper, Bot, Retail, etc.). Adicionalmente, se despliega una base de datos vectorial Qdrant o Milvus en el mismo servidor para almacenar y consultar los vector embeddings del ADN de los tokens."));

bodyChildren.push(makeTable(
  ["Recurso", "Especificacion Oracle Cloud Free", "Uso en el Sistema"],
  [
    ["CPU", "4 nucleos ARM Ampere A1", "ClickHouse + Qdrant + Scripts Python"],
    ["RAM", "24 GB", "Cache de consultas ClickHouse + Indices vectoriales"],
    ["Disco", "200 GB Block Storage", "5+ anos de datos historicos comprimidos"],
    ["Red", "10 TB/mes salida", "Distribucion de datos a Cloudflare + Usuarios"],
    ["SO", "Oracle Linux / Ubuntu", "ClickHouse + Docker para Qdrant"]
  ],
  [25, 40, 35]
));
bodyChildren.push(tableCaption("Tabla 1: Recursos de Oracle Cloud Always Free y su asignacion en el sistema"));

bodyChildren.push(heading2("3.2 Cloudflare Workers (El Estomago)"));

bodyChildren.push(bodyPara("Cloudflare Workers constituye la capa de ingesta de datos en tiempo real. Su ventaja fundamental es la ejecucion en el Edge: el codigo se despliega en mas de 300 centros de datos distribuidos globalmente, a milisegundos del usuario final y de los nodos RPC de las blockchains. El plan gratuito ofrece 100,000 peticiones diarias y 10 ms de tiempo de ejecucion por peticion, suficiente para nuestro caso de uso si disenamos la logica de forma eficiente."));

bodyChildren.push(bodyPara("Cada Worker actua como un micro-ingestor especializado. Worker A se conecta via WebSocket a los nodos publicos de Solana y escucha eventos de swaps en los DEXs principales (Raydium, Orca, Jupiter). Worker B consulta la API de Dexscreener en intervalos de segundos para capturar cambios de volumen y precio. Worker C recibe los eventos de la web de nuestros usuarios (apertura de posicion, cierre, stop loss golpeado) y los reenvia a ClickHouse. La filosofia clave es que cada Worker realiza una unica funcion de captura y reenvio, sin procesamiento pesado. El procesamiento y cruce ocurre en ClickHouse a traves de Materialized Views."));

bodyChildren.push(bodyPara("El flujo de datos tipico es el siguiente: una wallet inteligente compra un token en Raydium. El nodo RPC de Solana emite el evento de transaccion. El Worker A lo captura en menos de 50 milisegundos. El Worker filtra el evento: si la wallet esta en nuestra lista de Smart Money y el monto supera los $5,000, lo reenvia al endpoint de insercion de ClickHouse. En el servidor de Oracle, ClickHouse recibe la fila, la inserta en la tabla de eventos, y la Materialized View correspondiente actualiza automaticamente las senales pre-calculadas. Desde la transaccion on-chain hasta la senal actualizada en la base de datos, el proceso completa en menos de 200 milisegundos."));

bodyChildren.push(makeTable(
  ["Componente", "Especificacion Gratuita", "Funcion en el Sistema"],
  [
    ["Workers", "100,000 req/dia, 10ms CPU", "Ingesta de datos en tiempo real"],
    ["KV Storage", "100,000 lecturas/dia, 1,000 escrituras", "Cache de ultimas senales calculadas"],
    ["Durable Objects", "Primer millon de requests gratis", "Estado de sesion de usuarios activos"],
    ["Pub/Sub", "Primer millon de mensajes gratis", "Notificaciones push de senales"],
    ["R2 Storage", "10 GB almacenamiento, 1M operaciones clase A", "Almacenamiento de archivos Parquet"]
  ],
  [25, 40, 35]
));
bodyChildren.push(tableCaption("Tabla 2: Recursos de Cloudflare Workers y su funcion en el sistema"));

bodyChildren.push(heading2("3.3 Netlify (El Escaparate)"));

bodyChildren.push(bodyPara("Netlify aloja el frontend de la aplicacion, construido en React o Vue.js, con un diseno oscuro tipo terminal de Bloomberg. La funcion de Netlify es exclusivamente de presentacion: no procesa datos, no ejecuta consultas pesadas, no almacena estado. La web realiza peticiones ligeras (SELECT simples) a la API REST de ClickHouse expuesta a traves de Cloudflare, y renderiza los resultados. Este modelo garantiza que el frontend nunca sea un cuello de botella ni genere costes de servidor."));

bodyChildren.push(bodyPara("Para analisis personalizados intensivos (backtests complejos, simulaciones de escenarios, cruce de datos ad-hoc), se utiliza DuckDB-WASM, una version de la base de datos analitica DuckDB compilada para WebAssembly que se ejecuta directamente en el navegador del usuario. Cuando el usuario solicita un analisis profundo, el servidor envia un archivo Parquet comprimido de entre 5 y 50 MB conteniendo los datos relevantes, y DuckDB-WASM lo procesa localmente en menos de un segundo. Este modelo descarga la computacion al dispositivo del usuario, eliminando completamente el coste de servidor para analisis personalizados y escalando sin limite: cada usuario aporta su propia CPU."));

bodyChildren.push(heading2("3.4 Flujo de Datos End-to-End"));

bodyChildren.push(bodyPara("El flujo de datos completo del sistema sigue un patron de tres etapas: Captura, Almacenamiento y Cruce, y Presentacion. En la etapa de Captura, los Cloudflare Workers interceptan datos de multiples fuentes en paralelo: eventos on-chain de Solana y Ethereum via WebSockets, datos de mercado de Dexscreener via API REST, y eventos de usuario de la web propia via HTTP POST. Cada dato se normaliza y se envia a ClickHouse."));

bodyChildren.push(bodyPara("En la etapa de Almacenamiento y Cruce, ClickHouse inserta cada fila en la tabla correspondiente y las Materialized Views se actualizan automaticamente. La vista de Divergencia de Liquidez compara en tiempo real los niveles de stop loss de los usuarios con las zonas de acumulacion de Smart Money. La vista de Patron Historico busca similitudes topologicas entre el evento actual y millones de eventos pasados. La vista de Eficiencia de Salida calcula el punto optimo de toma de beneficios basandose en el Maximum Favorable Excursion historico del activo."));

bodyChildren.push(bodyPara("En la etapa de Presentacion, el frontend de Netlify consulta las vistas pre-calculadas de ClickHouse y las renderiza en un dashboard en tiempo real. El usuario ve el flujo de Dexscreener filtrado por IA a la izquierda, la reaccion de su red de traders a la derecha, y las senales generadas por el motor cruzado en el centro. Si solicita un analisis mas profundo, se activa DuckDB-WASM en su navegador para procesar los datos localmente. Todo el pipeline, desde la captura on-chain hasta la presentacion en pantalla, completa en menos de 500 milisegundos para las senales pre-calculadas."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 4: FUENTES DE DATOS Y VARIABLES POR CAPA
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("4. Fuentes de Datos y Variables por Capa"));

bodyChildren.push(heading2("4.1 Capa 1: Ingesta en Tiempo Real (Dexscreener y Web3)"));

bodyChildren.push(bodyPara("La primera capa del sistema es la absorcion continua de datos del mercado en tiempo real. No nos limitamos a consultar la interfaz visual de Dexscreener; atacamos la tuberia interna. Dexscreener funciona sobre el protocolo Solana/ETH WebSockets, y nosotros nos conectamos directamente a los nodos RPC publicos de Solana y a los endpoints de la API de Dexscreener para capturar cada evento de mercado en el instante en que ocurre."));

bodyChildren.push(bodyPara("Las variables capturadas en esta capa incluyen el precio actual de cada token en cada DEX, el volumen de operaciones en ventanas de 1, 5, 15 y 60 minutos, la liquidez total en el pool, el numero de compras versus ventas en tiempo real, las wallets que estan comprando y vendiendo (con sus etiquetas de Smart Money, Sniper, Bot o Retail), el monto de cada transaccion individual, el impacto en precio de cada swap (price impact), y la tasa de creacion de nuevas posiciones en nuestro sistema. Esta capa genera entre 10,000 y 100,000 eventos por minuto durante periodos de alta actividad, todos los cuales son filtrados, normalizados e insertados en ClickHouse."));

bodyChildren.push(bodyPara("El filtrado del ruido es critico. De los miles de eventos por minuto, solo una fraccion contiene informacion accionable. El sistema descarta automaticamente las transacciones de menos de $100 (ruido de bots de arbitraje), las operaciones de wallets no etiquetadas que no superan umbrales de volumen, y los eventos de tokens con liquidez inferior a $10,000 (demasiado ilíquidos para ser operables). Este filtrado reduce el flujo a aproximadamente 100-500 eventos significativos por minuto, que son los que alimentan los modelos de cruce."));

bodyChildren.push(makeTable(
  ["Variable", "Fuente", "Frecuencia", "Importancia"],
  [
    ["Precio spot", "Dexscreener API / Nodos RPC", "Tiempo real (WS)", "Critica"],
    ["Volumen 1min / 5min / 15min / 1h", "Dexscreener API", "Cada 1s / 5s / 15s / 60s", "Critica"],
    ["Liquidez del pool", "Dexscreener API", "Cada 5s", "Alta"],
    ["Compras vs Ventas (ratio)", "Eventos on-chain", "Tiempo real", "Alta"],
    ["Wallets compradoras/vendedoras", "Nodos RPC Solana/ETH", "Tiempo real", "Critica"],
    ["Monto por transaccion", "Eventos on-chain", "Tiempo real", "Alta"],
    ["Price impact por swap", "Calculo derivado", "Tiempo real", "Media"],
    ["Nuevas posiciones en nuestra web", "Eventos de usuario", "Tiempo real", "Alta"]
  ],
  [30, 25, 25, 20]
));
bodyChildren.push(tableCaption("Tabla 3: Variables de la Capa 1 - Ingesta en tiempo real"));

bodyChildren.push(heading2("4.2 Capa 2: Datos Historicos (El Contexto)"));

bodyChildren.push(bodyPara("El analisis en tiempo real sin contexto historico es ceguera. Un pico de volumen puede ser el inicio de un rally o el ultimo suspiro antes de un colapso; solo el historial nos dice cual es mas probable. La segunda capa absorbe anos de datos historicos que proporcionan el contexto necesario para que los modelos cruzados generen predicciones con fundamento estadistico."));

bodyChildren.push(bodyPara("Las fuentes de datos historicos son diversas y complementarias. Binance y Kraken ofrecen historiales de precios OHLCV (Open, High, Low, Close, Volume) con granularidad de 1 minuto para los ultimos cinco anos de forma gratuita a traves de sus APIs publicas. Flipside Crypto proporciona datos de transacciones on-chain historicas de Solana y Ethereum, incluyendo clasificaciones de wallets y flujos de capital, a traves de su programa de datos gratuito para desarrolladores. Arkham Intelligence ofrece etiquetado avanzado de wallets institucionales y entidades, con un historial de sus operaciones que se extiende por anos. Coingecko provee metricas fundamentales historicas como market cap, circulating supply, y social volume."));

bodyChildren.push(bodyPara("Los scripts de Python que realizan la descarga y procesamiento de estos datos se ejecutan en el servidor gratuito de Oracle Cloud. Cada noche, un proceso batch descarga los datos incrementales del dia, los normaliza al formato interno, y los inserta en ClickHouse. La compresion columnar de ClickHouse es extraordinariamente eficiente: cinco anos de datos de precios de 1 minuto para 1,000 tokens (aproximadamente 2,628 millones de filas) ocupan apenas entre 5 y 15 GB dependiendo del nivel de compresion. El etiquetado historico de wallets, con millones de direcciones clasificadas, añade otros 2-5 GB. Total: menos de 25 GB para tener un cerebro historico que cubre medio decenio de mercado crypto."));

bodyChildren.push(makeTable(
  ["Variable", "Fuente", "Granularidad", "Periodo"],
  [
    ["Precios OHLCV", "Binance / Kraken API", "1 minuto", "5 anos"],
    ["Transacciones on-chain", "Flipside Crypto", "Por transaccion", "3+ anos"],
    ["Etiquetado de wallets", "Arkham Intelligence", "Por wallet", "3+ anos"],
    ["Market cap historico", "Coingecko API", "Diario", "5 anos"],
    ["Social volume / sentimiento", "LunarCrush API", "Horario", "2 anos"],
    ["Liquidaciones en futuros", "Coinglass API", "15 minutos", "3 anos"],
    ["Funding rates", "Binance Futures API", "Horario", "3 anos"],
    ["Flujos de exchange (in/out)", "Glassnode / CryptoQuant", "Diario", "3 anos"]
  ],
  [30, 25, 20, 25]
));
bodyChildren.push(tableCaption("Tabla 4: Variables de la Capa 2 - Datos historicos"));

bodyChildren.push(heading2("4.3 Capa 3: Retroalimentacion de Usuarios (El Sesgo Humano)"));

bodyChildren.push(bodyPara("La tercera capa de datos es la mas valiosa y la que ningun competidor puede replicar facilmente: el comportamiento de nuestros propios usuarios. Cada click, cada trade ejecutado desde nuestra plataforma, cada stop loss golpeado, cada take profit alcanzado, cada nivel de entrada cancelado por miedo, se registra y se envia a ClickHouse en tiempo real. Esta capa nos permite construir lo que denominamos el Heatmap de Estupidez Humana: un mapa tridimensional que muestra exactamente en que niveles de precio la masa entra en panico y vende, donde entra por FOMO, y donde se concentra la mayoria de las posiciones."));

bodyChildren.push(bodyPara("Las variables capturadas en esta capa incluyen el precio de entrada de cada posicion abierta por nuestros usuarios, el nivel del stop loss y el take profit definidos, la duracion de la posicion antes del cierre, el resultado (beneficio o perdida y su magnitud), la hora del dia y dia de la semana de la operacion, el apalancamiento utilizado, el tamaño de la posicion relativo al capital del usuario, y la secuencia de acciones del usuario (abrio, cerro, reabrio, cancelo). Esta ultima variable es especialmente reveladora: un usuario que abre, cierra en perdida, y reabri en el mismo sentido esta manifestando un patron de sesgo de compromiso que es estadisticamente predecible."));

bodyChildren.push(bodyPara("El cruce de estos datos con el flujo de Dexscreener produce la senal mas rentable del sistema. Cuando Dexscreener muestra que el precio se acerca a un nivel donde el 80% de nuestros usuarios tienen su stop loss, y simultaneamente detectamos que la Smart Money esta comprando exactamente ahi, tenemos una Zona de Caza con una probabilidad estadisticamente demostrable de que los market makers estan cazando esos stops antes de revertir el precio. Esta senal no se puede generar sin la capa de datos de usuario propia."));

bodyChildren.push(makeTable(
  ["Variable", "Tipo", "Frecuencia de captura", "Valor predictivo"],
  [
    ["Precio de entrada", "Numerica", "Por trade", "Alto"],
    ["Nivel de Stop Loss", "Numerica", "Por trade", "Critico"],
    ["Nivel de Take Profit", "Numerica", "Por trade", "Alto"],
    ["Duracion de posicion", "Temporal", "Por trade", "Medio"],
    ["Resultado (PnL)", "Numerica", "Por trade", "Alto"],
    ["Hora / Dia de operacion", "Temporal", "Por trade", "Medio"],
    ["Apalancamiento", "Numerica", "Por trade", "Medio"],
    ["Tamaño relativo de posicion", "Numerica", "Por trade", "Alto"],
    ["Secuencia de acciones", "Categorica", "Por sesion", "Alto"],
    ["Tasa de cancelacion de ordenes", "Numerica", "Por sesion", "Medio"]
  ],
  [30, 20, 25, 25]
));
bodyChildren.push(tableCaption("Tabla 5: Variables de la Capa 3 - Retroalimentacion de usuarios"));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 5: INVENTARIO COMPLETO DE VARIABLES
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("5. Inventario Completo de Variables"));

bodyChildren.push(bodyPara("Este capitulo presenta el catalogo exhaustivo de todas las variables que el sistema debe capturar, calcular y almacenar para alimentar los modelos de cruce. La clasificacion sigue la dimension de datos a la que pertenece cada variable, y se indica su tipo (numerica, categorica, temporal, vectorial), su fuente primaria, y su relevancia para cada uno de los modelos cruzados."));

bodyChildren.push(heading2("5.1 Variables de Mercado en Tiempo Real"));

bodyChildren.push(bodyPara("Las variables de mercado en tiempo real constituyen el flujo primario de informacion. Se capturan a traves de los Cloudflare Workers desde Dexscreener y los nodos RPC de las blockchains. Incluyen el precio actual y su variacion porcentual en multiples ventanas temporales (1 minuto, 5 minutos, 15 minutos, 1 hora, 4 horas, 24 horas), el volumen de operaciones en cada una de esas ventanas, la liquidez total disponible en el pool del DEX, el numero de compras versus ventas en tiempo real, el volumen medio por transaccion, y el price impact promedio de los swaps recientes. Estas variables alimentan directamente los tres modelos cruzados y son la base del ADN topologico de cada token."));

bodyChildren.push(bodyPara("Adicionalmente, se capturan variables derivadas que requieren calculo pero son esenciales para los modelos: la velocidad de cambio del volumen (aceleracion o desaceleracion), la divergencia entre precio y volumen (precio sube pero volumen baja, o viceversa), la ratio de compras grandes versus pequeñas (indicador de presencia institucional), y la dispersion del volumen entre DEXs (un token que se negocia masivamente en un solo DEX puede indicar manipulacion). Cada una de estas variables derivadas se calcula automaticamente por las Materialized Views de ClickHouse a medida que llegan los datos primarios."));

bodyChildren.push(heading2("5.2 Variables On-Chain"));

bodyChildren.push(bodyPara("Las variables on-chain proporcionan la verdad fundamental del mercado: lo que realmente esta ocurriendo en la blockchain, mas alla de lo que muestran las APIs de mercado. Se capturan a traves de los nodos RPC publicos de Solana y Ethereum, y a traves de servicios como Flipside Crypto y Arkham Intelligence para datos historicos. Incluyen el numero de holders activos del token, el flujo neto de tokens hacia y desde exchanges (indicador de presion de venta o acumulacion), el numero de transacciones on-chain por periodo, el volumen de transferencias grandes (mayores a $100,000), la tasa de creacion de nuevas wallets que interactuan con el token, y la proporcion de la oferta en manos de las 10 wallets principales (concentracion)."));

bodyChildren.push(bodyPara("Una variable on-chain particularmente valiosa es la tasa de liberacion de tokens desde contratos de vesting o staking. Cuando un proyecto tiene un desbloqueo grande programado, el precio tiende a depreciarse en los dias previos y posteriores. El sistema monitoriza los calendarios de desbloqueo de los principales proyectos y genera senales anticipadas cuando un desbloqueo significativo se aproxima. Otra variable critica es el analisis del contrato inteligente del token: funciones que permiten cambiar impuestos al 100%, pausar transacciones, o acunar tokens adicionales son indicadores inmediatos de riesgo de rug pull."));

bodyChildren.push(heading2("5.3 Variables de Comportamiento de Wallets"));

bodyChildren.push(bodyPara("El comportamiento de las wallets es la variable mas discriminativa del sistema. Cada direccion de wallet que interactua con un token se clasifica en una o mas categorias basandose en su historial: Smart Money (wallets con win rate superior al 75% y hold time promedio superior a 7 dias), Sniper (wallets que consistentemente compran en los primeros segundos de lanzamiento y venden rapidamente), Bot (direcciones con patrones de operacion claramente automatizados), Whale (wallets con patrimonio superior a $1 millon), Retail (usuarios minoristas sin patron discernible), y Creator (la wallet que despliega el contrato del token). Esta clasificacion se actualiza periodicamente mediante un modelo de ML que analiza el historial completo de cada wallet."));

bodyChildren.push(bodyPara("Para cada wallet que compra o vende un token, el sistema captura su etiqueta, su historial de win rate en los ultimos 90 dias, su hold time promedio, el monto tipico de sus operaciones, la correlacion de sus entradas con movimientos de precio posteriores (si compra y el precio sube consistentemente, su senal es valiosa), su red de conexiones con otras wallets (si opera en coordinacion con otras wallets etiquetadas), y su actividad reciente (si ha estado inactiva meses y de repente se activa, es una senal). El cruce de estas variables con el flujo en tiempo real permite detectar la entrada coordinada de multiples wallets Smart Money en un mismo token, la senal mas potente del sistema."));

bodyChildren.push(heading2("5.4 Variables de Smart Contract"));

bodyChildren.push(bodyPara("El analisis del contrato inteligente del token es la primera linea de defensa contra rug pulls y honeypots. El sistema extrae automaticamente el bytecode del contrato desde la blockchain y lo analiza buscando patrones conocidos de fraude. Las variables capturadas incluyen si el contrato permite modificar impuestos de transaccion (y si es asi, cual es el rango posible), si existe una funcion de pausa que pueda detener las ventas, si hay una funcion de acunacion que pueda crear tokens de la nada, si el propietario puede congelar balances, si el contrato implementa un mecanismo de honeypot (los usuarios pueden comprar pero no vender), y si la liquidez esta bloqueada (y si lo esta, durante cuanto tiempo)."));

bodyChildren.push(bodyPara("Mas alla del analisis estatico del contrato, el sistema cruza la direccion del creador del contrato con nuestra base de datos historica de wallets. Si la wallet que desplego este contrato fue la misma que desplego cinco contratos que resultaron ser rug pulls en el pasado, la probabilidad de fraude se dispara. Si el contrato fue generado por una factory conocida por producir tokens scam, la probabilidad es cercana al 100%. Estas variables alimentan directamente el Modulo 1 (Honeypot & Rug-Pull Predictor) y son la primera senal que ve el usuario cuando analiza un token nuevo."));

bodyChildren.push(heading2("5.5 Variables de Usuario (Nuestra Web)"));

bodyChildren.push(bodyPara("Las variables de usuario se capturan exclusivamente de la interaccion de los traders con nuestra plataforma. Son la fuente de datos propietaria que constituye nuestro foso competitivo mas profundo. Incluyen el numero de posiciones largas abiertas versus cortas en cada token, la distribucion de niveles de stop loss (agregada y anonimizada), la distribucion de niveles de take profit, el flujo neto de entrada de capital (cuanto dinero estan poniendo versus sacando los usuarios en cada token), la velocidad de apertura de nuevas posiciones (si 50 usuarios abren posicion en 2 minutos, es un pico de FOMO), la tasa de cierre por stop loss en las ultimas horas, y el sentimiento agregado (basado en la ratio largos/cortos y la velocidad de entrada)."));

bodyChildren.push(bodyPara("Una variable especialmente valiosa es la divergencia entre usuarios nuevos y experimentados. Si los usuarios registrados en los ultimos 7 dias estan abriendo posiciones largas masivamente en un token, mientras que los usuarios con mas de 6 meses de antiguedad y un win rate superior al 60% estan abriendo cortos o saliendo, el sistema detecta una trampa de liquidez con alta probabilidad. Esta variable es exclusiva de nuestra plataforma y no puede ser replicada por competidores que no tengan una base de usuarios activa con historial de rendimiento."));

bodyChildren.push(heading2("5.6 Variables de Sentimiento y Contexto"));

bodyChildren.push(bodyPara("Las variables de sentimiento y contexto proporcionan la dimension cualitativa que complementa los datos puramente cuantitativos. Se capturan a traves de APIs de redes sociales (Twitter/X, Reddit, Telegram) y servicios de analisis de sentimiento como LunarCrush y Santiment. Incluyen el volumen de menciones del token en redes sociales, la polaridad del sentimiento (positivo, negativo, neutro), el numero de influencers que mencionan el token, la velocidad de propagacion de la conversacion (si paso de 10 a 1,000 menciones en una hora, es viral), y la presencia del token en listas de trending de Twitter/X."));

bodyChildren.push(bodyPara("El contexto macro tambien se captura: el precio de Bitcoin y Ethereum (que actuan como barometros del mercado), el indice de miedo y codicia, los flujos de capital hacia y desde stablecoins (si el capital fluye de USDT a BTC, el mercado es alcista; si fluye de BTC a USDT, es bajista), y los eventos regulatorios recientes. Estas variables no generan senales por si mismas, pero modulan la confianza de las senales generadas por los modelos cruzados. Una senal alcista en un token emitida durante un mercado cripto global en caida libre tiene menos peso que la misma senal emitida durante un mercado alcista."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 6: MOTOR DE CRUCE DE DATOS
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("6. Motor de Cruce de Datos"));

bodyChildren.push(bodyPara("El motor de cruce de datos es el corazon de la plataforma. No se limita a ejecutar consultas cuando el usuario pulsa un boton; opera continuamente en segundo plano, actualizando senales pre-calculadas a medida que llega nueva informacion. Esto se logra mediante las Materialized Views de ClickHouse, que funcionan como triggers automaticos: cada vez que se inserta una nueva fila en una tabla, las vistas que dependen de esa tabla se actualizan incrementalmente, sin necesidad de recalcular todo desde cero."));

bodyChildren.push(heading2("6.1 Modelo 1: Divergencia de Liquidez"));

bodyChildren.push(bodyPara("El Modelo de Divergencia de Liquidez cruza los datos en tiempo real de Dexscreener con el Heatmap de Stop Loss de nuestra web. La logica es la siguiente: cuando el precio de un token se acerca a un nivel donde una proporcion significativa de nuestros usuarios tienen sus stop losses, y simultaneamente detectamos que la Smart Money esta comprando en ese mismo nivel, se produce una Zona de Caza. Los market makers pueden ver el libro de ordenes y saben donde estan los stops; cuando el precio alcanza esos niveles, los ejecutan (el precio perfora el stop, se genera un pico de venta, y los market makers absorben la liquidez a precio reducido antes de revertir el precio al alza)."));

bodyChildren.push(bodyPara("Las variables de entrada del modelo son: la distribucion de niveles de stop loss de nuestros usuarios (agregada por precio), la posicion actual del precio, la velocidad de acercamiento del precio al cluster de stops mas denso, el volumen de compra de Smart Money en la zona del cluster, y la ratio de liquidez disponible en el pool versus el volumen de stops que se ejecutarian. La salida del modelo es una senal con tres componentes: la probabilidad de que se produzca un stop hunt (de 0% a 100%), la zona de precio donde se espera que ocurra, y la magnitud estimada del rebote posterior."));

bodyChildren.push(makeTable(
  ["Parametro del Modelo", "Fuente de Datos", "Peso en el Modelo", "Umbral de Alerta"],
  [
    ["Densidad de Stop Loss cluster", "Capa 3 (Usuarios)", "35%", ">60% de usuarios"],
    ["Distancia precio al cluster", "Capa 1 + Capa 3", "20%", "<2% de distancia"],
    ["Volumen Smart Money en zona", "Capa 1 (On-chain)", "25%", ">3x volumen medio"],
    ["Liquidez del pool", "Capa 1 (Dexscreener)", "10%", "Suficiente para absorber"],
    ["Sentimiento macro", "Capa 5 (Contexto)", "10%", "No bajista extremo"]
  ],
  [30, 25, 20, 25]
));
bodyChildren.push(tableCaption("Tabla 6: Parametros del Modelo de Divergencia de Liquidez"));

bodyChildren.push(heading2("6.2 Modelo 2: Impulso con Contexto Historico"));

bodyChildren.push(bodyPara("El Modelo de Impulso con Contexto Historico cruza las compras masivas detectadas en tiempo real con el comportamiento historico de ese token (o de tokens con ADN topologico similar) en situaciones analogas. La logica es que un pico de volumen por si solo es informacion incompleta: puede ser el inicio de un rally explosivo o el ultimo estertor de un pump-and-dump. Solo el contexto historico nos dice cual es mas probable."));

bodyChildren.push(bodyPara("Cuando Dexscreener dispara una alerta de volumen multiplicado por 10 en un token, el sistema reacciona en dos fases. En la primera fase, si el token tiene historial propio (mas de 30 dias de datos), busca en ClickHouse: la ultima vez que este token tuvo un pico de volumen similar en este timeframe, que hizo el precio en las 4, 12 y 24 horas posteriores. Si el token es nuevo y no tiene historial propio, el sistema activa la segunda fase: la busqueda por ADN topologico, descrita en detalle en el Capitulo 7."));

bodyChildren.push(bodyPara("Las variables de entrada incluyen la magnitud del pico de volumen relativo al volumen medio de las ultimas 24 horas, la forma del pico (agudo y colapsante versus gradual y sostenido), la composicion de wallets que estan comprando (proporcion de Smart Money versus Retail), la divergencia entre precio y volumen, y el contexto macro en el momento del pico. La salida es un patron historico coincidente con su probabilidad, el resultado historico promedio a 4, 12 y 24 horas, y la recomendacion (entrar a favor, entrar en contra, o abstenerse)."));

bodyChildren.push(heading2("6.3 Modelo 3: Eficiencia de Salida (Take Profit Perfecto)"));

bodyChildren.push(bodyPara("El Modelo de Eficiencia de Salida cruza la posicion actual del usuario con el Maximum Favorable Excursion (MFE) historico del activo. El MFE es el mayor beneficio no realizado que habria alcanzado un trade si se hubiera cerrado en el punto optimo. Este modelo responde a la pregunta mas dificil del trading: cuando cerrar una posicion ganadora. La mayoria de los traders retail cierran sus posiciones ganadoras demasiado pronto (por miedo a perder el beneficio acumulado) o demasiado tarde (por codicia, esperando que siga subiendo)."));

bodyChildren.push(bodyPara("El sistema analiza como se comporto el precio historicamente tras alcanzar el nivel de beneficio actual del usuario. Si el 78% de las veces que este token alcanzo un +15% de beneficio, el precio revertio y el trade paso a perdida en las 6 horas siguientes, el sistema lo comunica claramente: segun la data historica cruzada con el flujo actual de Dexscreener, si cierras ahora capturas el 100% del beneficio disponible; si esperas 30 minutos mas, la probabilidad de que el precio revierta y tu trade pase a perdida es del 65%. Esta senal es particularmente poderosa porque se personaliza para la posicion exacta del usuario, no es una recomendacion generica."));

bodyChildren.push(makeTable(
  ["Modelo", "Entrada Primaria", "Entrada Secundaria", "Salida", "Latencia"],
  [
    ["Divergencia de Liquidez", "Stops de usuarios", "Smart Money flow", "Prob. Stop Hunt + Zona", "<200ms"],
    ["Impulso + Historico", "Pico de volumen", "Patron historico", "Prob. + Recomendacion", "<500ms"],
    ["Eficiencia de Salida", "Posicion del usuario", "MFE historico", "Prob. reversion + Timing", "<300ms"]
  ],
  [20, 20, 20, 20, 20]
));
bodyChildren.push(tableCaption("Tabla 7: Resumen comparativo de los tres modelos cruzados"));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 7: EL PARADIGMA DEL ADN DEL TOKEN
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("7. El Paradigma del ADN del Token"));

bodyChildren.push(bodyPara("El cambio de paradigma mas radical de esta plataforma es dejar de analizar el historial del token para empezar a analizar la topologia del evento y el ADN de las carteras involucradas. Cuando nace un proyecto nuevo, no tiene historial. Los indicadores tecnicos tradicionales son inutiles. Pero el evento de nacimiento de un token tiene una huella digital unica: su ADN. Si encontramos en nuestros anos de historia eventos con ADN identico o muy similar, podemos predecir el comportamiento del token nuevo con una precision estadistica demostrable."));

bodyChildren.push(heading2("7.1 ADN de Liquidez"));

bodyChildren.push(bodyPara("El ADN de Liquidez captura como se anadio liquidez al pool del token. Las variables incluyen si la liquidez se anadio de golpe (tipico de un lanzamiento legitimo con marketing previo) o de forma gradual (potencial manipulacion), si el creador retiro los permisos de administracion del pool (renuncia a la propiedad del contrato de liquidez, señal positiva), si la liquidez esta bloqueada en un contrato de timelock (y si lo esta, durante cuanto tiempo), y la ratio entre liquidez inicial y market cap (una liquidez muy baja relativa al market cap indica facilidad de manipulacion del precio)."));

bodyChildren.push(bodyPara("La forma en que se anadio la liquidez en los primeros minutos es reveladora. Un lanzamiento legitimo tipicamente añade liquidez de forma abrupta al inicio y no la modifica. Un lanzamiento sospechoso puede añadir liquidez gradualmente para crear la ilusion de demanda, o retirar liquidez sutilmente en los primeros minutos para aumentar el price impact y favorecer la manipulacion. El sistema registra la secuencia temporal de las operaciones de liquidez en los primeros 30 minutos y la convierte en un vector numerico que se almacena en Qdrant junto con el resultado final del token (rugo, sobrevivio, crecio)."));

bodyChildren.push(heading2("7.2 ADN de Wallets"));

bodyChildren.push(bodyPara("El ADN de Wallets es la dimension mas discriminativa del sistema. Cuando un token nuevo aparece en Dexscreener, el sistema captura las wallets que compraron en el primer minuto y las cruza con nuestra base de datos historica de wallets etiquetadas. Las preguntas clave son: que proporcion de las wallets compradoras son Snipers conocidos? Cuantas son Smart Money con historial de exito? Hay wallets que se coordinan entre si (envio previo de SOL desde una wallet madre a multiples wallets hijas antes de la compra)? La wallet creadora del contrato tiene historial de rug pulls?"));

bodyChildren.push(bodyPara("La composicion de wallets en el minuto 1 es extremadamente predictiva. Si el 60% o mas de las wallets compradoras son Snipers conocidos y la wallet creadora tiene historial de scams, el token tiene una probabilidad superior al 87% de colapsar en los siguientes minutos (rug pull o dump). Si, por el contrario, al menos 3 wallets Smart Money con win rate superior al 80% entran en los primeros 5 minutos y no hay Snipers dominantes, el token tiene una probabilidad significativamente mayor de sostener su precio y crecer. El sistema convierte esta composicion en un vector numerico que representa la proporcion de cada tipo de wallet en las primeras compras, y lo almacena para comparacion futura."));

bodyChildren.push(heading2("7.3 ADN Topologico (La Curva)"));

bodyChildren.push(bodyPara("El ADN Topologico no mira el precio absoluto del token, sino la forma del grafico de volumen y precio en los primeros minutos. La intuicion es que los eventos de mercado siguen patrones topologicos recurrentes: un pico agudo de volumen seguido de un colapso es la firma de un pump-and-dump; una campana de Gauss simetrica indica distribucion natural; una escalera ascendente sostenida sugiere acumulacion institucional; y un pico doble con valle entre medias indica un patron de retest. El sistema no compara numeros; compara formas."));

bodyChildren.push(bodyPara("La representacion matematica de la topologia se realiza mediante la transformacion de la serie temporal de volumen y precio de los primeros 5-30 minutos en un vector de caracteristicas. Este vector se calcula mediante una combinacion de tecnicas: la Transformada Discreta de Fourier (que captura las frecuencias dominantes del movimiento), la Diferencia Fraccional (que preserva la memoria a largo plazo de la serie), y el calculo de pendientes y curvaturas en ventanas deslizantes (que captura la aceleracion y desaceleracion del movimiento). El resultado es un vector de entre 64 y 256 dimensiones que representa de forma compacta la esencia topologica del evento, y que se almacena en Qdrant para busqueda de similitud."));

bodyChildren.push(heading2("7.4 Vector Embeddings y Busqueda KNN"));

bodyChildren.push(bodyPara("El motor de busqueda del ADN del token se implementa mediante vector embeddings y busqueda de vecinos mas cercanos (KNN, K-Nearest Neighbors). Cuando nace un token en Dexscreener, una funcion del sistema convierte sus caracteristicas (liquidez, codigo, wallets compradoras, topologia del volumen) en un vector numerico denso de alta dimension. Este vector se compara contra millones de vectores historicos almacenados en la base de datos vectorial Qdrant, que corre en el mismo servidor gratuito de Oracle Cloud."));

bodyChildren.push(bodyPara("La busqueda KNN no compara uno por uno (eso seria ineficiente con millones de vectores). Qdrant utiliza indices aproximados (HNSW, Hierarchical Navigable Small World) que permiten encontrar los k vectores mas similares en sub-milisegundos, incluso con millones de vectores en la base de datos. El resultado es una lista de los 10-20 tokens historicos cuyo ADN es mas similar al token nuevo, junto con lo que paso con cada uno de ellos en las horas y dias posteriores a su lanzamiento. Si el 87% de los tokens con ADN similar rugearon o cayeron un 90%, el sistema emite una senal de alta confianza."));

bodyChildren.push(bodyPara("La actualizacion del indice vectorial es continua. Cada noche, un proceso batch recalcula los embeddings de los tokens nuevos del dia y los inserta en Qdrant. Periodicamente, el modelo de generacion de embeddings se reentrena con los nuevos datos para mejorar la calidad de las representaciones. El modelo de embeddings puede ser desde un simple autoencoder entrenado sobre las series temporales de volumen y precio, hasta un modelo de transformer (como un Time Series Transformer) que captura dependencias temporales complejas. La eleccion del modelo depende del volumen de datos disponible y de la potencia computacional, pero incluso un autoencoder simple entrenado sobre cinco anos de datos proporciona resultados significativamente superiores al analisis humano."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 8: MODULOS DE INTELIGENCIA PRE-ESTABLECIDOS
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("8. Modulos de Inteligencia Pre-Establecidos"));

bodyChildren.push(bodyPara("La plataforma ofrece cuatro modulos de inteligencia pre-configurados que ejecutan automaticamente cruces complejos de datos sin que el usuario necesite definir ninguna regla. Cada modulo esta disenado para un caso de uso especifico y produce senales con un formato estandarizado que incluye la probabilidad del evento, la zona de precio relevante, la confianza de la senal, y la recomendacion de accion. Estos modulos constituyen el producto minimo viable y son los que venderan la plataforma."));

bodyChildren.push(heading2("8.1 Modo 1: Honeypot and Rug-Pull Predictor"));

bodyChildren.push(bodyPara("El Modo 1 es el mas critico para la supervivencia del inversor retail. Cruza el contrato inteligente del token nuevo (extraido automaticamente de la blockchain) con el ADN de la wallet creadora y el historico de contratos similares. Si el contrato tiene codigo que permite cambiar impuestos al 100%, el sistema lo detecta. Pero va mucho mas alla: cruza si el creador uso esa misma wallet para crear cinco rugs en el pasado, si el contrato fue generado por una factory conocida por producir tokens scam, y si la composicion de wallets compradoras en el primer minuto esta dominada por Snipers. La salida es una senal clara y binaria en la mayoria de los casos: Probabilidad de Rug del 99%. Evitar, o Probabilidad de Rug del 5%. Token seguro desde el punto de vista del contrato."));

bodyChildren.push(bodyPara("Las variables alimentan este modelo en tres capas. La primera capa es el analisis estatico del bytecode del contrato: funciones peligrosas (mint, pause, setTax, blacklist), permisos del owner, y comparacion con templates conocidos de contratos scam. La segunda capa es el historial de la wallet creadora: rug pulls previos, conexiones con wallets de desarrolladores sancionados, y patron de comportamiento (crear token, añadir liquidez, retirar liquidez, repetir). La tercera capa es la composicion de wallets compradoras: proporcion de Snipers, presencia de wallets sospechosas, y velocidad de las primeras transacciones (los bots de sniper operan en milisegundos, los humanos no)."));

bodyChildren.push(heading2("8.2 Modo 2: Smart Money Front-Running"));

bodyChildren.push(bodyPara("El Modo 2 cruza el flujo en tiempo real de Dexscreener con la base de datos historica de wallets institucionales y whales etiquetadas por el sistema a lo largo de los anos. La logica es simple pero poderosa: si wallets con un historial demostrable de exito estan comprando un token, la probabilidad de que el token suba es significativamente mayor que la probabilidad media del mercado. Pero el modulo va mas alla de simplemente seguir a la Smart Money: detecta cuando la Smart Money esta acumulando silenciosamente (compras fraccionadas en multiples DEXs para no mover el precio), cuando esta distribuyendo (vendiendole al retail a precios altos), y cuando esta coordinandose (multiples wallets institucionales independientes entrando en el mismo token en un periodo corto)."));

bodyChildren.push(bodyPara("La salida tipica de este modulo es: Secuestro detectado. Smart Money entrando. Zona de acumulacion sugerida entre $X y $Y. La confianza de la senal depende del numero de wallets Smart Money detectadas (1 wallet es una senal debil, 3 o mas independientes es fuerte), su win rate historico (cuanto mayor, mas fiable), y su hold time promedio (las wallets que mantienen posiciones durante semanas son mas fiables que las que operan intradia). El modulo tambien detecta la salida de Smart Money: si las wallets que entraron hace 2 semanas empiezan a vender gradualmente, emite una senal de distribucion que advierte al usuario que el ciclo alcista del token puede estar terminando."));

bodyChildren.push(heading2("8.3 Modo 3: El Espejo Retard (Contrarian Puro)"));

bodyChildren.push(bodyPara("El Modo 3 es el mas contrarian y potencialmente el mas rentable a largo plazo. Cruza la tendencia de Dexscreener (tokens en Top Trending) con el flujo de datos de nuestra web (sesgo de recencia y FOMO de nuestros usuarios). La logica se basa en un principio del mercado bien documentado: cuando la masa retail entra masivamente en una posicion, el movimiento ya ha ocurrido, y el precio esta cerca de un maximo local. Los institucionales que compraron antes estan vendiendo a la masa retail, y una vez que la compra retail se agota, el precio colapsa."));

bodyChildren.push(bodyPara("El modulo detecta esta dinamica cuando un token nuevo entra al Top 3 de Dexscreener y nuestros usuarios empiezan a abrir posiciones largas masivamente en los ultimos minutos, pero el historico topologico de este patron indica que el volumen institucional ya se retiro. La salida es inequivoca: Trampa de Liquidez activada. Tu red de retail esta comprando el tope. Preparar Short. La confianza de esta senal se refuerza si, ademas, las wallets Smart Money que compraron antes estan vendiendo, y si el volumen de Dexscreener esta cayendo mientras el precio se mantiene (distribucion clasica). Este modulo es especialmente efectivo en mercados de meme coins, donde los ciclos de pump-and-dump son rapidos y predecibles."));

bodyChildren.push(heading2("8.4 Modo 4: V-Shape Recovery Scanner"));

bodyChildren.push(bodyPara("El Modo 4 busca oportunidades en caidas abruptas que tienen alta probabilidad de rebote. Cruza tokens nuevos que acaban de caer un -60% o mas con el ADN de los holders actuales y el historico de drawdowns. La logica es que no todas las caidas son iguales: una caida causada por la venta masiva de retail en panico, mientras los holders a largo plazo acumulan mas en la caida, tiene una probabilidad muy diferente de rebote que una caida causada por la salida de Smart Money y la retirada de liquidez."));

bodyChildren.push(bodyPara("El sistema analiza a los que se quedaron atrapados en la caida: estan vendiendo en panico o estan acumulando mas? Si el ADN de las wallets atrapadas indica que son inversores a largo plazo (no bots) y estan comprando mas en la caida, el sistema busca patrones similares en el pasado. La salida tipica es: Fondo probabilistico detectado. Rebote V historico del 78% en este patron. Entrada escalada sugerida entre $X y $Y. La senal se refuerza si el volumen de compra de Smart Money se ha incrementado durante la caida (acumulacion en la debilidad), si la liquidez del pool se mantiene estable (no ha sido retirada), y si el sentimiento en redes sociales es extremadamente negativo (indicador contrarian clasico)."));

bodyChildren.push(makeTable(
  ["Modulo", "Entrada Primaria", "Entrada Secundaria", "Tipo de Senal", "Win Rate Historico"],
  [
    ["1. Rug-Pull Predictor", "Smart Contract + Wallet Creadora", "Historico de scams", "Binaria (Seguro/Peligro)", ">95%"],
    ["2. Smart Money Front-Run", "Flujo Smart Money", "Win Rate historico wallets", "Direccion + Zona entrada", "~75%"],
    ["3. Espejo Retard", "Top Trending + FOMO usuarios", "Topologia historica", "Contrarian (Short)", "~70%"],
    ["4. V-Shape Recovery", "Caida >60% + ADN holders", "Patrones rebote historicos", "Zona de entrada escalada", "~68%"]
  ],
  [18, 22, 22, 20, 18]
));
bodyChildren.push(tableCaption("Tabla 8: Resumen de los cuatro modulos de inteligencia pre-establecidos"));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 9: CONSTRUCTOR DE PATRONES (ARQUITECTURA ABIERTA)
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("9. Constructor de Patrones (Arquitectura Abierta)"));

bodyChildren.push(heading2("9.1 Diseno del Sistema de Reglas"));

bodyChildren.push(bodyPara("Ademas de los cuatro modulos pre-establecidos, la plataforma ofrece un Constructor de Patrones que permite a usuarios avanzados crear sus propias reglas de cruce arrastrando bloques logicos, estilo Lego. El sistema de reglas soporta tres tipos de condiciones: condiciones de mercado (volumen, precio, liquidez), condiciones on-chain (flujo de wallets, transacciones grandes, actividad de contratos), y condiciones de sentimiento (social volume, menciones, ratio largos/cortos de usuarios). Cada condicion se configura con un operador de comparacion (mayor que, menor que, entre, cruce por encima, cruce por debajo), un valor umbral, y una ventana temporal."));

bodyChildren.push(bodyPara("Las condiciones se combinan mediante operadores logicos (AND, OR, NOT) y se agrupan en reglas. Una regla completa se define como: SI [condicion 1] Y [condicion 2] Y [condicion 3], ENTONCES ejecutar backtest contra los ultimos N anos de historia y mostrar el resultado esperado. El usuario puede definir la logica sin escribir codigo, simplemente arrastrando bloques en la interfaz. Cuando el usuario guarda la regla, el sistema la convierte en una consulta SQL que se ejecuta contra ClickHouse, y si el resultado es estadisticamente significativo (suficientes ocurrencias historicas), la regla se activa y empieza a generar senales en tiempo real."));

bodyChildren.push(heading2("9.2 Motor de Backtesting"));

bodyChildren.push(bodyPara("Cuando un usuario define una regla en el Constructor de Patrones, el sistema ejecuta automaticamente un backtest contra el historico completo almacenado en ClickHouse. El backtest recorre los ultimos N anos de datos (configurable por el usuario) y busca todos los momentos en que las condiciones de la regla se cumplieron simultaneamente. Para cada ocurrencia, registra lo que ocurrio despues en multiples horizontes temporales: 1 hora, 4 horas, 12 horas, 24 horas, y 7 dias. El resultado es un informe estadistico completo que incluye el numero de ocurrencias, el resultado medio en cada horizonte temporal, el win rate, el maximo drawdown, y la distribucion de resultados."));

bodyChildren.push(bodyPara("El motor de backtesting se implementa como una consulta SQL compleja que ClickHouse ejecuta en milisegundos sobre miles de millones de filas, gracias al procesamiento vectorizado y paralelismo masivo de la base de datos. Para backtests mas complejos que requieren simulacion tick-a-tick (por ejemplo, calcular el resultado de una estrategia con stop loss dinamico y trailing stop), el sistema envia un archivo Parquet con los datos relevantes al navegador del usuario y DuckDB-WASM ejecuta la simulacion localmente. Este modelo hibrido permite backtests simples en tiempo real (milisegundos) y backtests complejos en segundos, sin coste de servidor."));

bodyChildren.push(heading2("9.3 Extensibilidad y Modulos Futuros"));

bodyChildren.push(bodyPara("La arquitectura esta disenada para ser extensible. Nuevos modulos de inteligencia se pueden añadir como nuevas Materialized Views en ClickHouse sin modificar los existentes. Nuevas fuentes de datos se integran creando nuevos Cloudflare Workers que alimentan nuevas tablas. Nuevos tipos de ADN de token se incorporan añadiendo dimensiones al vector de embeddings. La plataforma puede evolucionar desde los cuatro modulos iniciales hasta decenas de modulos especializados sin cambios arquitectonicos significativos."));

bodyChildren.push(bodyPara("Los modulos futuros planificados incluyen un Modo de Arbitraje Cross-DEX que detecta diferencias de precio entre DEXs en tiempo real, un Modo de Analisis de Gobernanza que monitoriza propuestas de votacion en DAOs y su impacto historico en el precio, un Modo de NFT Floor Tracker que cruza el precio floor de colecciones NFT con el volumen de trading y la actividad de wallets Smart Money, y un Modo de DeFi Yield Optimizer que analiza las tasas de rendimiento en protocolos DeFi y las cruza con el riesgo de smart contract y el historial de exploits. Cada nuevo modulo sigue el mismo patron: captura de datos via Workers, almacenamiento en ClickHouse, cruce via Materialized Views, y presentacion en el dashboard de Netlify."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 10: STACK TECNOLOGICO DETALLADO
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("10. Stack Tecnologico Detallado"));

bodyChildren.push(heading2("10.1 Backend (Oracle Cloud + ClickHouse)"));

bodyChildren.push(bodyPara("El backend se ejecuta en el servidor ARM Ampere A1 de Oracle Cloud con Ubuntu 22.04 LTS. ClickHouse se instala como servicio nativo (no Docker, para maximo rendimiento) y se configura con tres tablas principales: events_realtime (MergeTree engine, particionada por fecha, ordenada por token + timestamp), price_history_1min (MergeTree, particionada por mes, ordenada por token + timestamp), y wallet_labels (ReplacingMergeTree, ordenada por wallet_address). Las Materialized Views se crean para cada modelo cruzado y cada modulo de inteligencia."));

bodyChildren.push(bodyPara("Qdrant se despliega via Docker en el mismo servidor, con configuracion optimizada para el hardware disponible. Se reserva aproximadamente 4 GB de RAM para Qdrant (suficiente para manejar millones de vectores de 256 dimensiones) y 16 GB para ClickHouse (cuyo cache de consultas se beneficia enormemente de la memoria disponible). Los scripts de Python para la descarga de datos historicos se ejecutan como cron jobs nocturnos, utilizando las librerias ccxt (para conectarse a exchanges), web3.py (para interactuar con nodos Ethereum), y solana-py (para nodos Solana)."));

bodyChildren.push(heading2("10.2 Ingesta (Cloudflare Workers)"));

bodyChildren.push(bodyPara("Los Cloudflare Workers se escriben en JavaScript (o TypeScript compilado a JS) y se despliegan via Wrangler CLI. Cada Worker se especializa en una unica fuente de datos y sigue el patron: conectar, filtrar, normalizar, reenviar. Worker-Solana-Listener se conecta via WebSocket a los nodos RPC publicos de Solana (o al endpoint gratuito de Quicknode/Helius) y escucha eventos de swaps en los programas de Raydium, Orca y Jupiter. Worker-Dexscreener-Poller consulta la API REST de Dexscreener cada segundo para los tokens en su lista de seguimiento. Worker-User-Events recibe eventos de la web via HTTP POST y los reenvia a ClickHouse. Worker-Signal-Distributor lee las senales pre-calculadas de ClickHouse y las envia a los usuarios conectados via Server-Sent Events (SSE)."));

bodyChildren.push(heading2("10.3 Frontend (React/Vue + Netlify)"));

bodyChildren.push(bodyPara("El frontend se construye con React 18 (o Vue 3) y se despliega en Netlify con build automatico desde un repositorio Git. El diseno sigue un tema oscuro tipo terminal de Bloomberg, con paneles redimensionables y una tipografia monoespaciada para los datos numericos. La comunicacion con el backend se realiza a traves de una API REST ligera (implementada como un Cloudflare Worker adicional o como un endpoint de ClickHouse directamente), que devuelve las senales pre-calculadas en formato JSON. Las actualizaciones en tiempo real se reciben via SSE, que permite al servidor enviar datos al cliente sin necesidad de polling."));

bodyChildren.push(heading2("10.4 Procesamiento Local (DuckDB-WASM)"));

bodyChildren.push(bodyPara("DuckDB-WASM es la pieza clave que permite analisis personalizados intensivos sin coste de servidor. Cuando el usuario solicita un analisis profundo, el frontend envia una peticion al backend, que genera un archivo Parquet comprimido con los datos relevantes (precios historicos del token, transacciones on-chain, eventos de usuario) y lo envia al navegador. DuckDB-WASM carga el archivo en memoria y ejecuta la consulta SQL del analisis solicitado. Los resultados se renderizan como graficos interactivos (usando D3.js o ECharts) en el navegador del usuario. Todo el procesamiento ocurre localmente, sin enviar datos de vuelta al servidor."));

bodyChildren.push(heading2("10.5 Base de Datos Vectorial (Qdrant/Milvus)"));

bodyChildren.push(bodyPara("La base de datos vectorial almacena los embeddings del ADN de cada token y permite busquedas de similitud ultrarapidas. Qdrant es la opcion recomendada por su facilidad de despliegue via Docker, su API REST nativa (que simplifica la integracion con Cloudflare Workers), y su rendimiento en hardware modesto. Se configura con una coleccion principal de vectores de 256 dimensiones, usando el indice HNSW con parametros optimizados para equilibrar precision y velocidad: M=16 (numero de conexiones por nodo), ef_construct=200 (calidad de construccion del indice), y ef_search=100 (calidad de busqueda). Con estos parametros, una busqueda de los 20 vecinos mas cercanos entre un millon de vectores tarda menos de 5 milisegundos."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 11: ANALISIS DE RIESGOS Y MITIGACION
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("11. Analisis de Riesgos y Mitigacion"));

bodyChildren.push(bodyPara("Ningun sistema financiero esta exento de riesgos, y la transparencia sobre los mismos es fundamental para la credibilidad de la plataforma. Este capitulo identifica los riesgos principales del sistema, su probabilidad, su impacto potencial, y las estrategias de mitigacion implementadas o planificadas."));

bodyChildren.push(makeTable(
  ["Riesgo", "Probabilidad", "Impacto", "Mitigacion"],
  [
    ["Oracle Cloud cambia su capa gratuita", "Baja", "Critico", "Migracion a Always-Free alterno (Google Cloud, AWS) con scripts automatizados"],
    ["ClickHouse se queda sin memoria", "Media", "Alto", "Monitorizacion proactiva + overflow a disco + particion por fecha"],
    ["Falsos positivos en senales", "Alta", "Medio", "Backtesting obligatorio + umbral de confianza minimo + disclaimers claros"],
    ["Latencia en Cloudflare Workers", "Baja", "Medio", "Fallback a polling + cache KV de senales recientes"],
    ["APIs gratuitas cambian terminos", "Media", "Alto", "Abstraccion de fuentes + multiples proveedores por variable"],
    ["Ataque de inyeccion SQL en ClickHouse", "Baja", "Critico", "Consultas parametrizadas + firewall + solo lectura desde frontend"],
    ["Sobre-optimizacion de backtests", "Alta", "Medio", "Walk-forward validation + penalizacion por complejidad + out-of-sample test"],
    ["Fallo del nodo RPC publico", "Media", "Alto", "Multiples nodos + fallback a API Dexscreener + cola de reintentos"],
    ["Perdida de datos por fallo de disco", "Baja", "Critico", "Replicacion a R2 + backups diarios en S3-compatible"],
    ["Regulacion adversa", "Baja", "Alto", "Estructura legal + compliance + senales como informacion, no asesoramiento"]
  ],
  [25, 15, 15, 45]
));
bodyChildren.push(tableCaption("Tabla 9: Matriz de riesgos y estrategias de mitigacion"));

bodyChildren.push(bodyPara("El riesgo mas significativo a largo plazo es la dependencia de las capas gratuitas de proveedores cloud. Si Oracle Cloud modifica o elimina su oferta Always Free, el sistema tendria que migrar a una alternativa, lo cual es posible pero requiere tiempo y planificacion. La mitigacion principal es mantener scripts de infraestructura como codigo (Terraform o Ansible) que permitan reprovisionar el sistema completo en un nuevo proveedor en horas, no en dias. Ademas, la arquitectura modular (Workers independientes, ClickHouse como unico estado, frontend stateless) facilita la migracion de componentes individuales sin afectar al resto del sistema."));

bodyChildren.push(bodyPara("El riesgo de sobre-optimizacion de backtests es particularmente insidioso porque no es tecnico sino metodologico. Cuando un usuario crea una regla en el Constructor de Patrones y ve que tiene un win rate del 95% en backtest, es tentador asumir que funcionara igual en el futuro. Pero el win rate historico es una estimacion optimista del rendimiento futuro porque la regla se ha ajustado implicitamente a los datos del pasado. Para mitigar este sesgo, el sistema impone restricciones: un minimo de 30 ocurrencias historicas para que la regla sea valida, walk-forward validation (entrenar en el 70% de los datos y validar en el 30% restante), y una penalizacion que reduce el win rate reportado en funcion de la complejidad de la regla (mas condiciones = mas riesgo de sobreajuste)."));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 12: HOJA DE RUTA DE IMPLEMENTACION
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("12. Hoja de Ruta de Implementacion"));

bodyChildren.push(bodyPara("La implementacion se estructura en cuatro fases, cada una de las cuales entrega un sistema funcional que genera valor real. No se avanza a la siguiente fase hasta que la anterior esta completamente operativa y validada. Esta aproximacion iterativa minimiza el riesgo y permite ajustes basados en el feedback del mundo real."));

bodyChildren.push(heading2("12.1 Fase 1: Fundacion (Semanas 1-3)"));

bodyChildren.push(bodyPara("La primera fase establece la infraestructura base. Se provisiona el servidor Oracle Cloud Always Free, se instala ClickHouse con las tablas principales, se despliegan los Cloudflare Workers para la captura de datos de Dexscreener y nodos Solana, y se carga el historico de precios de 1 minuto de los ultimos 2 anos para los 100 tokens principales desde Binance. Al final de esta fase, el sistema ingiere datos en tiempo real y almacena historicos, pero aun no genera senales. El entregable es un dashboard basico que muestra el flujo de datos en tiempo real y permite consultas SQL directas contra ClickHouse para verificacion."));

bodyChildren.push(heading2("12.2 Fase 2: Motor Cruzado (Semanas 4-7)"));

bodyChildren.push(bodyPara("La segunda fase implementa los tres modelos cruzados basicos. Se crean las Materialized Views de Divergencia de Liquidez, Impulso con Contexto Historico, y Eficiencia de Salida. Se implementa el sistema de etiquetado de wallets basico (clasificacion por umbral de volumen y win rate). Se construye el frontend principal de Netlify con el dashboard tipo Bloomberg. Al final de esta fase, el sistema genera senales en tiempo real basadas en los tres modelos cruzados, y los usuarios pueden verlas en el dashboard. El entregable es un sistema funcional que ya proporciona valor analitico superior a cualquier plataforma retail existente."));

bodyChildren.push(heading2("12.3 Fase 3: ADN y Modulos (Semanas 8-12)"));

bodyChildren.push(bodyPara("La tercera fase implementa el paradigma del ADN del token y los cuatro modulos de inteligencia. Se despliega Qdrant, se generan los vector embeddings para todos los tokens historicos, se implementan los modulos de Rug-Pull Predictor, Smart Money Front-Running, Espejo Retard, y V-Shape Recovery Scanner. Se añade la captura de datos de usuario (eventos de la web propia). Al final de esta fase, el sistema puede evaluar tokens nuevos sin historial y generar senales de alta confianza. El entregable es la plataforma completa con los cuatro modulos operativos."));

bodyChildren.push(heading2("12.4 Fase 4: Constructor y Escalado (Semanas 13-16)"));

bodyChildren.push(bodyPara("La cuarta fase implementa el Constructor de Patrones, el motor de backtesting con DuckDB-WASM, y prepara el sistema para escalado. Se añaden fuentes de datos adicionales (sentimiento de redes sociales, liquidaciones de futuros, flujos de exchange). Se optimiza el rendimiento del pipeline completo. Se implementa la monitorizacion y alerting del sistema. Al final de esta fase, el sistema esta completo, documentado, y listo para su lanzamiento publico. Los usuarios avanzados pueden crear sus propias reglas de cruce, backtestearlas contra anos de historia, y recibirlas en tiempo real."));

bodyChildren.push(makeTable(
  ["Fase", "Periodo", "Entregable Principal", "Valor Generado"],
  [
    ["1. Fundacion", "Semanas 1-3", "Infraestructura + Captura de datos", "Base de datos operativa"],
    ["2. Motor Cruzado", "Semanas 4-7", "3 modelos cruzados + Dashboard", "Senales en tiempo real"],
    ["3. ADN y Modulos", "Semanas 8-12", "4 modulos + ADN del token", "Evaluacion de tokens nuevos"],
    ["4. Constructor y Escalado", "Semanas 13-16", "Constructor + Backtesting + Fuentes extra", "Plataforma completa y extensible"]
  ],
  [15, 20, 30, 35]
));
bodyChildren.push(tableCaption("Tabla 10: Hoja de ruta de implementacion por fases"));

// ═══════════════════════════════════════════════════════════════════
// CHAPTER 13: APENDICES
// ═══════════════════════════════════════════════════════════════════
bodyChildren.push(heading1("13. Apendices"));

bodyChildren.push(heading2("13.1 Apendice A: Esquema de Tablas ClickHouse"));

bodyChildren.push(makeTable(
  ["Tabla", "Engine", "Particion", "Orden", "Uso"],
  [
    ["events_realtime", "MergeTree", "toYYYYMMDD(timestamp)", "(token, timestamp)", "Eventos on-chain en tiempo real"],
    ["price_history_1min", "MergeTree", "toYYYYMM(timestamp)", "(token, timestamp)", "Precios OHLCV historicos"],
    ["wallet_labels", "ReplacingMergeTree", "-", "(wallet_address)", "Clasificacion de wallets"],
    ["user_events", "MergeTree", "toYYYYMMDD(timestamp)", "(user_id, timestamp)", "Acciones de usuarios de la web"],
    ["token_dna_vectors", "MergeTree", "-", "(token_address, created_at)", "Embeddings del ADN de tokens"],
    ["signal_log", "MergeTree", "toYYYYMMDD(generated_at)", "(signal_type, generated_at)", "Registro de senales generadas"]
  ],
  [20, 18, 22, 22, 18]
));
bodyChildren.push(tableCaption("Tabla 11: Esquema de tablas principales de ClickHouse"));

bodyChildren.push(heading2("13.2 Apendice B: APIs y Fuentes de Datos"));

bodyChildren.push(makeTable(
  ["Fuente", "Endpoint Tipo", "Rate Limit (Gratuito)", "Datos Proporcionados"],
  [
    ["Dexscreener API", "REST (JSON)", "300 req/min", "Precios, volumen, liquidez, pares"],
    ["Solana RPC Publico", "WebSocket + JSON-RPC", "100 req/s (por nodo)", "Transacciones on-chain, eventos"],
    ["Binance API", "REST + WebSocket", "1200 req/min", "Precios OHLCV, order book, trades"],
    ["Kraken API", "REST", "Variable (publico: ilimitado)", "Precios OHLCV, trades historicos"],
    ["Flipside Crypto", "SQL API", "10 queries/dia (free)", "Transacciones on-chain historicas"],
    ["Arkham Intelligence", "REST", "100 req/min", "Etiquetado de wallets y entidades"],
    ["Coingecko API", "REST", "30 req/min", "Market cap, social, fundamentales"],
    ["LunarCrush API", "REST", "30 req/min", "Sentimiento social, influencer activity"],
    ["Coinglass API", "REST", "20 req/min", "Liquidaciones, funding rates, OI"]
  ],
  [20, 18, 22, 40]
));
bodyChildren.push(tableCaption("Tabla 12: APIs y fuentes de datos con sus limites gratuitos"));

bodyChildren.push(heading2("13.3 Apendice C: Glosario de Terminos"));

bodyChildren.push(makeTable(
  ["Termino", "Definicion"],
  [
    ["ADN del Token", "Conjunto de caracteristicas unicas que definen a un token en sus primeros minutos de vida (liquidez, wallets, topologia)"],
    ["Smart Money", "Wallets con historial demostrable de rentabilidad superior al mercado (win rate >75%, hold time >7 dias)"],
    ["Sniper", "Wallets que consistentemente compran en los primeros segundos de lanzamiento de un token y venden rapidamente"],
    ["Stop Hunt", "Movimiento deliberado del precio hacia niveles donde se concentran stop losses de retail, ejecutados por market makers"],
    ["Materialized View", "Vista de base de datos pre-calculada que se actualiza automaticamente cuando cambian los datos subyacentes"],
    ["Vector Embedding", "Representacion numerica densa de alto dimension que captura la esencia de un objeto para busqueda de similitud"],
    ["KNN", "K-Nearest Neighbors: algoritmo que encuentra los k elementos mas similares a uno dado en un espacio vectorial"],
    ["DuckDB-WASM", "Base de datos analitica compilada para WebAssembly que se ejecuta en el navegador del usuario"],
    ["MFE", "Maximum Favorable Excursion: maximo beneficio no realizado alcanzado por un trade durante su vida"],
    ["FOMO", "Fear Of Missing Out: miedo a quedarse fuera, que impulsa compras impulsivas en picos de precio"]
  ],
  [25, 75]
));
bodyChildren.push(tableCaption("Tabla 13: Glosario de terminos clave del sistema"));

// ── Build Body Section ──
const bodySection = {
  properties: {
    type: SectionType.NEXT_PAGE,
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
    }
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({
          text: "Plataforma de Analitica Cuantitativa Crypto | Analisis Arquitectonico",
          size: 16,
          color: c(P.secondary),
          font: { ascii: "Calibri" }
        })]
      })]
    })
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) })]
      })]
    })
  },
  children: bodyChildren
};

// ── Assemble Document ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 24,
          color: c(P.body)
        },
        paragraph: {
          spacing: { line: 312 }
        }
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 32,
          bold: true,
          color: c(P.primary)
        },
        paragraph: {
          spacing: { before: 360, after: 160, line: 312 }
        }
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 28,
          bold: true,
          color: c(P.primary)
        },
        paragraph: {
          spacing: { before: 280, after: 120, line: 312 }
        }
      },
      heading3: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 24,
          bold: true,
          color: c(P.secondary)
        },
        paragraph: {
          spacing: { before: 220, after: 100, line: 312 }
        }
      }
    }
  },
  sections: [coverSection, frontMatterSection, bodySection]
});

// ── Export ──
const outputPath = "/home/z/my-project/download/Analisis_Arquitectonico_Plataforma_Crypto.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated successfully at:", outputPath);
}).catch(err => {
  console.error("Error generating document:", err);
});
