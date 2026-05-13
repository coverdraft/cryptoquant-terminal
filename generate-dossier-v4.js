const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, ShadingType, PageBreak, TableOfContents,
  PageNumber, NumberFormat, BorderStyle, WidthType, ImageRun,
  Header, Footer, Tab, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');

// === PALETTE: Lapis Tech (Deep Blue) ===
const C = {
  primary: '0D1B2A',    // deep navy
  secondary: '1B2838',  // dark blue-gray
  accent: '00B4D8',     // electric cyan
  accentGold: 'E8A838', // warm gold
  surface: 'F0F4F8',    // light gray-blue
  text: '1A1A2E',       // near-black
  textLight: '4A5568',  // medium gray
  white: 'FFFFFF',
  danger: 'E53E3E',
  success: '38A169',
  warning: 'D69E2E',
  info: '3182CE',
  highlight: 'EBF8FF',
  codeBg: 'EDF2F7',
  cardBorder: 'CBD5E0',
};

// === FONTS ===
const F = {
  heading: 'Calibri',
  body: 'Calibri',
  mono: 'Consolas',
  headingCjk: 'Microsoft YaHei',
  bodyCjk: 'SimSun',
};

// === HELPERS ===
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, font: F.heading, size: 32, bold: true, color: C.primary })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: F.heading, size: 28, bold: true, color: C.secondary })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: F.heading, size: 24, bold: true, color: C.accent })],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 312 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text,
      font: opts.font || F.body,
      size: opts.size || 21,
      bold: opts.bold || false,
      italic: opts.italic || false,
      color: opts.color || C.text,
    })],
  });
}

function boldPara(label, text) {
  return new Paragraph({
    spacing: { after: 120, line: 312 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: label, font: F.body, size: 21, bold: true, color: C.primary }),
      new TextRun({ text, font: F.body, size: 21, color: C.text }),
    ],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    indent: { left: 480 + level * 360 },
    children: [new TextRun({ text: `\u2022  ${text}`, font: F.body, size: 21, color: C.text })],
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    indent: { left: 480 },
    children: [
      new TextRun({ text: `${num}. `, font: F.body, size: 21, bold: true, color: C.accent }),
      new TextRun({ text, font: F.body, size: 21, color: C.text }),
    ],
  });
}

function codeBlock(lines) {
  return lines.map(line => new Paragraph({
    spacing: { after: 40, line: 276 },
    shading: { type: ShadingType.CLEAR, fill: C.codeBg },
    indent: { left: 480 },
    children: [new TextRun({ text: line, font: F.mono, size: 18, color: C.text })],
  }));
}

function statusLine(icon, label, status, color) {
  return new Paragraph({
    spacing: { after: 80, line: 312 },
    indent: { left: 480 },
    children: [
      new TextRun({ text: `${icon}  `, font: F.body, size: 21 }),
      new TextRun({ text: label, font: F.body, size: 21, bold: true, color: C.text }),
      new TextRun({ text: `  ${status}`, font: F.body, size: 21, color }),
    ],
  });
}

function makeCell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      spacing: { after: 0, line: 276 },
      alignment: opts.align || AlignmentType.LEFT,
      children: [new TextRun({
        text,
        font: opts.font || F.body,
        size: opts.size || 19,
        bold: opts.bold || false,
        color: opts.color || C.text,
      })],
    })],
  });
}

function makeRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    cantSplit: true,
    children: cells.map(c => makeCell(c.text, {
      bold: isHeader || c.bold,
      shading: isHeader ? C.primary : (c.shading || undefined),
      color: isHeader ? C.white : (c.color || C.text),
      width: c.width,
      align: c.align,
    })),
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      makeRow(headers.map((h, i) => ({ text: h, width: colWidths?.[i] })), true),
      ...rows.map(r => makeRow(r.map((c, i) => typeof c === 'string' ? { text: c, width: colWidths?.[i] } : { ...c, width: colWidths?.[i] }))),
    ],
  });
}

function spacer(size = 120) {
  return new Paragraph({ spacing: { after: size } });
}

// ==================== DOCUMENT CONTENT ====================

const sections = [];

// ===== COVER SECTION =====
sections.push({
  properties: {
    page: {
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      size: { width: 11906, height: 16838 },
    },
  },
  children: [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        height: { value: 16838, rule: 'exact' },
        children: [new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: C.primary },
          margins: { top: 0, bottom: 0, left: 1440, right: 1440 },
          verticalAlign: 'center',
          children: [
            new Paragraph({ spacing: { before: 2400 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: 'CRYPTOQUANT TERMINAL', font: F.heading, size: 56, bold: true, color: C.accent })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [new TextRun({ text: '\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014', font: F.body, size: 20, color: C.accent })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: 'An\u00e1lisis Arquitect\u00f3nico V4', font: F.heading, size: 40, color: C.white })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'Big Data Predictive Engine \u2014 Arquitectura de Retroalimentaci\u00f3n Continua', font: F.body, size: 24, color: C.accentGold })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'Modelado de Ciclo de Vida del Token \u2022 Comportamiento Humano \u2022 Sistemas Auto-Generados', font: F.body, size: 22, color: '#B0C4DE' })],
            }),
            new Paragraph({ spacing: { before: 1200 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'Diagn\u00f3stico del Estado Actual + Arquitectura Objetivo', font: F.body, size: 22, color: '#8FAABE' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [new TextRun({ text: 'Mayo 2026', font: F.body, size: 22, color: '#8FAABE' })],
            }),
          ],
        })],
      })],
    }),
  ],
});

// ===== TOC SECTION =====
sections.push({
  properties: {
    page: {
      margin: { top: 1440, bottom: 1417, left: 1701, right: 1440 },
      pageNumbers: { start: 1, formatType: NumberFormat.LOWERCASE_ROMAN },
    },
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'CryptoQuant Terminal \u2014 An\u00e1lisis Arquitect\u00f3nico V4', font: F.body, size: 16, color: C.textLight, italic: true })],
      })],
    }),
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'P\u00e1gina ', font: F.body, size: 16, color: C.textLight }), new TextRun({ children: [PageNumber.CURRENT], font: F.body, size: 16, color: C.textLight })],
      })],
    }),
  },
  children: [
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: '\u00cdndice de Contenidos', font: F.heading, size: 36, bold: true, color: C.primary })],
    }),
    new TableOfContents('TOC', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '(Haga clic derecho sobre el \u00edndice \u2192 "Actualizar campo" para refrescar los n\u00fameros de p\u00e1gina)', font: F.body, size: 18, italic: true, color: C.textLight })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
});

// ===== BODY SECTION =====
const bodyChildren = [];

// ============ SECTION 1: RESUMEN EJECUTIVO ============
bodyChildren.push(
  heading1('1. Resumen Ejecutivo'),
  para('El presente documento constituye la cuarta iteraci\u00f3n del an\u00e1lisis arquitect\u00f3nico de CryptoQuant Terminal, una plataforma de an\u00e1lisis cripto dise\u00f1ada como un "Bloomberg para Retail". Esta versi\u00f3n se centra en un diagn\u00f3stico exhaustivo del estado actual del Big Data Predictive Engine y propone una arquitectura radicalmente mejorada que incorpora tres pilares fundamentales: el modelado del ciclo de vida del token, el an\u00e1lisis del comportamiento humano, y un sistema de retroalimentaci\u00f3n continua que permite la auto-mejora autom\u00e1tica de los sistemas de trading.'),
  para('El análisis revela que, aunque la plataforma cuenta con una base técnica sólida que incluye más de 6,800 líneas de código en el motor predictivo, un sistema de backtesting con 40+ métricas, 30 plantillas de trading, y clientes API reales para DexScreener, DexPaprika, CoinGecko, Solana RPC y Etherscan, existe una desconexión crítica entre estos componentes. El motor predictivo opera con datos sintéticos en lugar de OHLCV reales, el wallet profiler nunca es invocado por ninguna ruta API, y los resultados del backtesting no retroalimentan al cerebro para refinar los sistemas de trading. Estos gaps impiden que el Big Data arroje su verdadero potencial analítico.'),
  para('La arquitectura propuesta transforma el motor de un sistema reactivo basado en se\u00f1ales puntuales a un ecosistema inteligente con capacidad de aprendizaje continuo: recolecta datos masivos del mercado, detecta la fase del ciclo de vida de cada token, modela el comportamiento psicol\u00f3gico de los traders en cada fase, ejecuta backtests con datos reales, y utiliza los resultados para refinar autom\u00e1ticamente los sistemas de trading existentes y generar nuevos sistemas sint\u00e9ticos optimizados. Este ciclo de retroalimentaci\u00f3n crea una espiral de mejora continua donde cada iteraci\u00f3n produce sistemas m\u00e1s precisos y adaptados a las condiciones del mercado.'),
  spacer(),
);

// ============ SECTION 2: DIAGNOSTICO ============
bodyChildren.push(
  heading1('2. Diagn\u00f3stico del Estado Actual'),
  heading2('2.1. Componentes Existentes y su Estado'),
  para('A continuaci\u00f3n se presenta un inventario detallado de cada componente del sistema, su l\u00edneas de c\u00f3digo, su funcionalidad actual, y su grado de conectividad con el resto del ecosistema. Este inventario permite identificar tanto las fortalezas como las debilidades de la arquitectura actual, proporcionando la base sobre la cual dise\u00f1ar las mejoras necesarias.'),
  makeTable(
    ['Componente', 'L\u00edneas', 'Estado', 'Datos Reales', 'Conectado'],
    [
      ['Big Data Engine', '~1,170', 'Funcional parcial', '\u274c Sint\u00e9tico', '\u26a0 Solo API predictiva'],
      ['Data Ingestion', '745', 'Funcional', '\u2705 6 APIs reales', '\u26a0 No alimenta al motor'],
      ['Backtesting Engine', '~1,230', 'Funcional parcial', '\u274c Necesita OHLCV', '\u26a0 No retroalimenta'],
      ['Trading System Engine', '~1,500', 'Funcional', '\u2705 30 plantillas', '\u274c No auto-genera'],
      ['Bot Detection', '478', 'Funcional parcial', '\u26a0 Input externo', '\u274c No conectado a WS'],
      ['Wallet Profiler', '626', 'Funcional parcial', '\u26a0 Input externo', '\u274c Nunca importado'],
      ['Capital Allocation', '1,051', 'Funcional', '\u2705 16 m\u00e9todos', '\u274c Sin API expuesta'],
      ['WebSocket Server', '770', 'Parcial', '\u26a0 5/7 simulados', '\u274c C\u00f3digo duplicado'],
      ['Prisma Schema', '582', 'Funcional', '\u274c Sin OHLCV', '\u26a0 SQLite limitado'],
    ],
  ),
  spacer(),
  heading2('2.2. Problemas Cr\u00edticos Identificados'),
  heading3('2.2.1. Datos Sint\u00e9ticos Disfrazados de Reales'),
  para('El problema m\u00e1s grave del sistema actual es que el motor predictivo opera con series de precios fabricadas. La ruta POST /api/predictive genera una serie de 50 puntos interpolando linealmente entre priceChange1h y priceChange24h, creando una ilusi\u00f3n de datos hist\u00f3ricos que no existe. Este dato sint\u00e9tico alimenta las funciones de detecci\u00f3n de r\u00e9gimen, zonas de reversi\u00f3n a la media, y detecci\u00f3n de anomal\u00edas, lo que invalida completamente la utilidad de estas se\u00f1ales. Un operador que tome decisiones basadas en estas se\u00f1ales estar\u00eda actuando sobre ruido estad\u00edstico, no sobre informaci\u00f3n real del mercado.'),
  para('Paradójicamente, el cliente DexPaprika ya proporciona datos OHLCV a través de su API, y CoinGecko ofrece velas japonesas para tokens con ID conocido. Sin embargo, nunca se ha establecido un pipeline que persista estos datos ni los alimente al motor predictivo. Las funciones se invocan únicamente desde la ruta de detalle de token como operaciones fire-and-forget que no se almacenan de forma persistente. Ahora existe un modelo PriceCandle en el schema de Prisma, pero el pipeline de persistencia automática aún no está completamente conectado.'),
  heading3('2.2.2. Componentes Desconectados'),
  para('El an\u00e1lisis de conectividad revela que la plataforma sufre de un problema de "islas funcionales": cada componente funciona de forma aislada sin comunicarse con los dem\u00e1s. El wallet-profiler, con sus 626 l\u00edneas de c\u00f3digo que implementan scoring de Smart Money, Whale, Sniper, y detecci\u00f3n de 12 patrones de comportamiento, nunca es importado por ninguna ruta API. El bot-detection, capaz de identificar 8 tipos distintos de bots, no est\u00e1 conectado al servidor WebSocket. El capital-allocation, con 16 m\u00e9todos matem\u00e1ticos implementados incluyendo Markowitz MPT y Risk Parity, no tiene endpoint API expuesto. Y el servidor WebSocket duplica la implementaci\u00f3n del cliente DexScreener en lugar de reutilizar data-ingestion.'),
  makeTable(
    ['Componente', 'Conectado A', 'Desconectado De'],
    [
      ['Big Data Engine', 'API Predictiva', 'Backtesting, WS, Wallet Profiler'],
      ['Bot Detection', 'API Predictiva (v\u00eda m\u00e9tricas)', 'WS Server, Wallet Profiler'],
      ['Wallet Profiler', 'Nada', 'Todo el sistema'],
      ['Capital Allocation', 'Backtesting (sizing)', 'Sin API, sin live trading'],
      ['Data Ingestion', 'APIs de mercado', 'Motor predictivo (sin OHLCV), WS (duplica)'],
      ['Backtesting Engine', 'APIs de backtest', 'Sin fuente OHLCV, sin feedback loop'],
      ['WS Server', 'Frontend v\u00eda Socket.IO', 'Todos los servicios lib/ (c\u00f3digo propio)'],
    ],
  ),
  spacer(),
  heading3('2.2.3. Sin Retroalimentaci\u00f3n Continua'),
  para('El modelo PredictiveSignal incluye un campo wasCorrect dise\u00f1ado espec\u00edficamente para rastrear la precisi\u00f3n de las se\u00f1ales, pero este campo nunca se rellena. No existe ning\u00fan mecanismo que compare las predicciones del motor con los resultados reales del mercado. Cuando se ejecuta un backtest, sus resultados (Sharpe ratio, drawdown, win rate, profit factor) se almacenan en la tabla BacktestRun pero nunca se utilizan para ajustar los par\u00e1metros de los sistemas de trading ni para retroalimentar al motor predictivo. Esta desconexi\u00f3n impide la mejora continua del sistema: cada se\u00f1al se genera como si fuera la primera, sin aprender de \u00e9xitos o fracasos anteriores.'),
  heading3('2.2.4. Sin Modelado de Ciclo de Vida del Token'),
  para('Actualmente, un token reci\u00e9n lanzado se analiza con los mismos criterios que un token establecido con meses de historial. El sistema no distingue entre un token en fase g\u00e9nesis (donde la liquidez es m\u00ednima y los bots snipers dominan), un token en fase FOMO (donde la psicolog\u00eda de masas impulsa precios irracionales), o un token en fase de declive (donde la salida de smart money marca la tendencia). Esta uniformidad anal\u00edtica es conceptualmente err\u00f3nea porque los indicadores t\u00e9cnicos, las se\u00f1ales de smart money, y los patrones de bots tienen significados completamente distintos seg\u00fan la fase del ciclo de vida. Un volumen alto en fase g\u00e9nesis probablemente indica wash trading; el mismo volumen en fase crecimiento indica inter\u00e9s genuino.'),
  heading3('2.2.5. Sin Modelado de Comportamiento Humano'),
  para('La plataforma carece de modelos que capturen la psicolog\u00eda del trader en funci\u00f3n del estado del proyecto. Un trader experimentado en un token en fase FOMO exhibe patrones de fear-of-missing-out distintos a los de un trader novato. Un holder en fase de declive muestra sesgo de aversi\u00f3n a la p\u00e9rdida (loss aversion bias), mientras que un sniper en fase g\u00e9nesis opera con l\u00f3gica puramente mec\u00e1nica. Sin estos modelos conductuales, las se\u00f1ales del motor predictivo carecen del contexto psicol\u00f3gico necesario para predecir movimientos de mercado basados en comportamiento humano agregado.'),
  heading3('2.2.6. Infraestructura de Datos Insuficiente'),
  para('El uso de SQLite como base de datos principal impone limitaciones severas: no soporta acceso concurrente, no ofrece optimizaciones para series temporales, y no escala para almacenar datos OHLCV de miles de tokens a resoluciones de minutos. El schema carece de la tabla PriceCandle necesaria para almacenar velas hist\u00f3ricas, y campos complejos como tradingHourPattern o botDetectionSignals se almacenan como cadenas JSON no tipadas, impidiendo consultas eficientes. Adem\u00e1s, no hay \u00edndices definidos m\u00e1s all\u00e1 de las restricciones de unicidad, lo que resulta en escaneos completos de tabla para consultas frecuentes como filtrado por cadena, tipo de se\u00f1al, o clasificaci\u00f3n de bot.'),
);

// ============ SECTION 3: NUEVA ARQUITECTURA ============
bodyChildren.push(
  heading1('3. Arquitectura Objetivo: Cerebro con Retroalimentaci\u00f3n Continua'),
  heading2('3.1. Visi\u00f3n General'),
  para('La nueva arquitectura transforma el Big Data Engine de un generador de se\u00f1ales puntuales a un sistema cognitivo con capacidad de aprendizaje. El dise\u00f1o sigue un flujo de procesamiento en cinco capas que se retroalimentan c\u00edclicamente: (1) Recolecci\u00f3n masiva de datos, (2) An\u00e1lisis contextual con detecci\u00f3n de fase del ciclo de vida, (3) Modelado de comportamiento humano, (4) Generaci\u00f3n y ejecuci\u00f3n de sistemas de trading, y (5) Retroalimentaci\u00f3n desde los resultados hacia el cerebro para refinar modelos y generar nuevos sistemas autom\u00e1ticamente. Este ciclo crea una espiral de mejora continua donde cada iteraci\u00f3n produce un sistema m\u00e1s adaptado a las condiciones reales del mercado.'),
  para('La clave conceptual es que el "cerebro" de la plataforma no es un componente pasivo que espera consultas, sino un proceso activo que constantemente ingiere datos, refina sus modelos internos, y genera nuevas hip\u00f3tesis de trading. Cuando un backtest demuestra que un sistema de trading tiene un Sharpe ratio bajo en tokens en fase FOMO pero alto en fase g\u00e9nesis, el cerebro ajusta autom\u00e1ticamente los pesos de ese sistema por fase, o genera un sistema derivado especializado en FOMO con par\u00e1metros optimizados. Este proceso es an\u00e1logo a c\u00f3mo un analista humano mejora con la experiencia, pero a escala computacional y sin sesgos emocionales.'),
  spacer(),
  heading2('3.2. Flujo de Datos del Cerebro'),
  para('El cerebro opera como un pipeline de procesamiento continuo con las siguientes etapas encadenadas. Cada etapa produce artefactos que alimentan a la siguiente, y los resultados finales retroalimentan a la primera etapa, cerrando el ciclo:'),
  spacer(),
  heading3('Etapa 1: Recolecci\u00f3n Masiva de Datos'),
  para('La primera capa del cerebro es un sistema de ingesta continua que recolecta datos de m\u00faltiples fuentes en tiempo real y en modo hist\u00f3rico. Los datos se normalizan, enriquecen y almacenan en una base de datos time-series optimizada (ClickHouse en producci\u00f3n, SQLite con tabla PriceCandle en desarrollo). Las fuentes de datos incluyen:'),
  bulletItem('DexScreener: Precios, volumen, liquidez, transacciones, tokens trending y boosted. Se consulta cada 30 segundos para datos en tiempo real y se backfill para hist\u00f3rico.'),
  bulletItem('DexPaprika: OHLCV (velas japonesas), historial de swaps por wallet, listas de tokens, búsqueda multi-cadena. Fuente de datos históricos de precios y actividad de DEX.'),
  bulletItem('Solana RPC: Transacciones on-chain detalladas, firmas, account info. Permite rastrear el comportamiento real de wallets en Solana.'),
  bulletItem('Ethereum RPC: Transacciones, receipts, logs de eventos. Permite analizar DeFi activity en Ethereum (uniswap swaps, liquidations, etc.).'),
  bulletItem('Jupiter: Rutas de swap, precios agregados, lista de tokens. Fuente de datos de DEX aggregator para Solana.'),
  para('El pipeline de recolecci\u00f3n implementa un sistema de prioridades: los tokens trending y los que tienen posiciones abiertas en nuestros sistemas de trading reciben actualizaciones cada 30 segundos, mientras que los tokens del universo general se actualizan cada 5 minutos. Los datos OHLCV hist\u00f3ricos se backfill en ventanas de 7 d\u00edas para tokens nuevos y se mantiene un hist\u00f3rico de hasta 5 a\u00f1os para los tokens establecidos.'),
  para('Cada punto de datos se enriquece con metadatos: timestamp UTC, fuente de origen, nivel de confiabilidad, y flags de calidad (datos estimados vs observados, precios stale vs frescos). Este enriquecimiento es crucial para que las capas posteriores del cerebro puedan ponderar la calidad de los inputs en sus an\u00e1lisis.'),
  spacer(),
  heading3('Etapa 2: Detecci\u00f3n de Fase del Ciclo de Vida del Token'),
  para('Esta etapa clasifica cada token en una de las seis fases de su ciclo de vida, aplicando un modelo de detecci\u00f3n que combina indicadores cuantitativos con se\u00f1ales cualitativas. La fase detectada determina qu\u00e9 modelos anal\u00edticos se aplican, c\u00f3mo se interpretan las se\u00f1ales, y qu\u00e9 estrategias de trading son apropiadas. Las seis fases y sus caracter\u00edsticas definitorias son:'),
  makeTable(
    ['Fase', 'Edad T\u00edpica', 'Liquidez', 'Volumen', 'Dominancia', 'Patr\u00f3n Clave'],
    [
      ['G\u00e9nesis', '< 1 hora', '< $10K', 'Explosivo inicial', 'Bots 80%+', 'Sniper entry, wash trading'],
      ['Incipiente', '1h - 24h', '$10K-$100K', 'Alto relativo', 'Bots 50%+, SM 10%', 'Primeros SM entran, bots a\u00fan dominan'],
      ['Crecimiento', '1d - 30d', '$100K-$1M', 'Creciente', 'SM 30%, Retail 30%', 'SM acumula, retail entra gradualmente'],
      ['FOMO', 'Variable', '$1M-$10M+', 'M\u00e1ximo', 'Retail 60%+', 'Miedo a perder, compras emocionales'],
      ['Declive', 'Variable', 'Decreciente', 'Bajando', 'SM sale, Retail atrapado', 'SM distribuye, retail niega p\u00e9rdidas'],
      ['Legado', '> 6 meses', 'Estable', 'Moderado', 'Mixto equilibrado', 'Comportamiento c\u00edclico predecible'],
    ],
  ),
  spacer(),
  para('El modelo de detecci\u00f3n de fase utiliza un sistema de scoring ponderado que evalua m\u00faltiples se\u00f1ales simult\u00e1neamente. No se basa en un solo indicador sino en una combinaci\u00f3n de factores que incluyen la edad del token, la evoluci\u00f3n de la liquidez, el ratio de actividad bot vs humana, la velocidad de entrada de nuevos holders, la distribuci\u00f3n temporal del volumen, y la relaci\u00f3n entre smart money flow y retail flow. Cada se\u00f1al contribuye un score parcial, y la fase se determina por la combinaci\u00f3n de scores que maximiza la verosimilitud del modelo.'),
  para('Un aspecto cr\u00edtico del modelo es la detecci\u00f3n de transiciones entre fases. Un token puede transitar de G\u00e9nesis a Crecimiento en cuesti\u00f3n de horas si atrae smart money leg\u00edtimo, o puede saltar directamente a FOMO si un influencer lo promociona. El modelo mantiene una distribuci\u00f3n de probabilidad sobre las fases posibles en lugar de una clasificaci\u00f3n determinista, lo que permite cuantificar la incertidumbre y detectar fases de transici\u00f3n donde el comportamiento es mixto.'),
  spacer(),
  heading3('Etapa 3: Modelado de Comportamiento Humano'),
  para('Esta capa construye modelos predictivos del comportamiento agregado de los traders humanos, diferenciando entre archetypes de trader y su comportamiento esperado en cada fase del ciclo de vida del token. El modelo no intenta predecir acciones individuales sino patrones de comportamiento a nivel de cohorte, lo que proporciona una se\u00f1al m\u00e1s estable y estad\u00edsticamente significativa.'),
  para('Los archetypes de trader modelados son los siguientes, cada uno con su propio conjunto de par\u00e1metros de comportamiento que var\u00edan seg\u00fan la fase del token:'),
  makeTable(
    ['Archetype', 'Decisi\u00f3n', 'Horizonte', 'Emoci\u00f3n Dominante', 'Indicador Clave'],
    [
      ['Smart Money', 'An\u00e1lisis profundo', 'Semanas-Meses', 'Calculador/Fr\u00edo', 'Acumulaci\u00f3n silenciosa'],
      ['Whale', 'Estrat\u00e9gico', 'Semanas-Meses', 'Controlador', 'Movimientos grandes escalonados'],
      ['Sniper', 'Automatizado', 'Minutos', 'Sin emoci\u00f3n', 'Block-0 entry, r\u00e1pida salida'],
      ['Retail FOMO', 'Emocional', 'D\u00edas', 'Miedo/Avaricia', 'Compras en pico, ventas en p\u00e1nico'],
      ['Retail Holder', 'Leal/Pasivo', 'Meses', 'Esperanza', 'Holding sin stop-loss'],
      ['Scalper', 'T\u00e9cnico', 'Minutos-Horas', 'Disciplinado', 'Entradas/salidas r\u00e1pidas'],
      ['DeGen', 'Arriesgado', 'Horas-D\u00edas', 'Adrenalina', 'Apuestas en tokens nuevos'],
      ['Contrarian', 'Inverso', 'D\u00edas-Semanas', 'Escepticismo', 'Venta en FOMO, compra en p\u00e1nico'],
    ],
  ),
  spacer(),
  para('El modelo de comportamiento humano se implementa como una red de matrices de transici\u00f3n probabil\u00edsticas, donde cada matriz representa las probabilidades de acci\u00f3n de un archetype en una fase espec\u00edfica. Por ejemplo, la matriz del Retail FOMO en fase FOMO indica alta probabilidad de compra agresiva (0.7), moderada probabilidad de hold (0.2), y baja probabilidad de venta (0.1). La misma matriz para Smart Money en fase FOMO indica alta probabilidad de distribuci\u00f3n (0.6), moderada de hold (0.3), y baja de compra adicional (0.1). Estas matrices se inicializan con valores basados en la literatura acad\u00e9mica de finanzas conductuales (Kahneman & Tversky, Barberis & Thaler) y se refinan continuamente con datos observados del mercado.'),
  para('El modelo genera predicciones a tres niveles de granularidad: (1) Probabilidad de flujo neto por archetype (entrar\u00e1n m\u00e1s retailers o m\u00e1s smart money?), (2) Probabilidad de cambio de sentimiento (pasar\u00e1 de bullish a bearish?), y (3) Probabilidad de evento cr\u00edtico (crash, pump, rug pull). Cada predicci\u00f3n incluye un intervalo de confianza que refleja la incertidumbre del modelo, y se actualiza en tiempo real conforme llegan nuevos datos de mercado.'),
  spacer(),
  heading3('Etapa 4: Generaci\u00f3n y Ejecuci\u00f3n de Sistemas de Trading'),
  para('Las se\u00f1ales generadas por las capas anteriores alimentan los sistemas de trading existentes y, crucialmente, tambi\u00e9n alimentan un generador autom\u00e1tico de nuevos sistemas. El generador combina patrones del motor Big Data con templates de sistema existentes para crear variantes optimizadas para fases espec\u00edficas del ciclo de vida del token. Por ejemplo, si el cerebro detecta que los sistemas de tipo ALPHA_HUNTER tienen un Sharpe de 2.1 en fase G\u00e9nesis pero solo 0.3 en fase FOMO, puede generar un sistema derivado "ALPHA_HUNTER_FOMO_V2" con par\u00e1metros ajustados para la fase FOMO: stop-loss m\u00e1s tight, take-profit m\u00e1s conservador, y filtros de entry que evitan compras en pico emocional.'),
  para('El proceso de generaci\u00f3n autom\u00e1tica sigue una metodolog\u00eda de tres pasos: (1) An\u00e1lisis de gap: identifica qu\u00e9 combinaciones de archetype de sistema y fase del token est\u00e1n sub-optimizadas, (2) S\u00edntesis: crea nuevas configuraciones de sistema combinando elementos de sistemas exitosos con ajustes espec\u00edficos de fase, y (3) Validaci\u00f3n: ejecuta backtests autom\u00e1ticos contra datos hist\u00f3ricos reales para verificar que el nuevo sistema supera al padre en la fase objetivo sin degradar significativamente en otras fases. Solo los sistemas que pasan la validaci\u00f3n se promocionan a producci\u00f3n.'),
  spacer(),
  heading3('Etapa 5: Retroalimentaci\u00f3n Continua'),
  para('La capa de retroalimentaci\u00f3n es el componente que cierra el ciclo y convierte al sistema en un organismo de aprendizaje continuo. Funciona en tres modos complementarios: retroalimentaci\u00f3n de se\u00f1ales, retroalimentaci\u00f3n de backtesting, y retroalimentaci\u00f3n de rendimiento en vivo.'),
  para('Retroalimentaci\u00f3n de se\u00f1ales: Cada se\u00f1al predictiva generada por el motor se almacena con su predicci\u00f3n, confianza, y horizonte temporal. Un proceso peri\u00f3dico (cada 5 minutos en producci\u00f3n) compara las predicciones pasadas con los resultados reales del mercado y actualiza el campo wasCorrect del modelo PredictiveSignal. Las tasas de acierto por tipo de se\u00f1al, fase del token, y conditions de mercado se calculan continuamente, y los modelos del motor ajustan sus pesos internos para priorizar los tipos de se\u00f1al con mejor historial de precisi\u00f3n.'),
  para('Retroalimentaci\u00f3n de backtesting: Cuando se ejecuta un backtest, sus resultados detallados (Sharpe, Sortino, Calmar, max drawdown, win rate por fase, MFE/MAE distribution) se alimentan de vuelta al cerebro. El cerebro utiliza esta informaci\u00f3n para tres prop\u00f3sitos: (1) Ajustar los par\u00e1metros del sistema backtesteado (optimizaci\u00f3n bayesiana de umbrales, ventanas, y pesos), (2) Actualizar las matrices de comportamiento humano si el backtest revela que los traders actuaron diferente a lo predicho, y (3) Generar nuevos sistemas de trading derivados que capitalicen las debilidades encontradas.'),
  para('Retroalimentaci\u00f3n en vivo: Los sistemas de trading que est\u00e1n generando se\u00f1ales en tiempo real env\u00edan sus resultados ( trades ejecutados, PnL, duraci\u00f3n, contexto de mercado ) de vuelta al cerebro. Esta retroalimentaci\u00f3n es la m\u00e1s valiosa porque refleja rendimiento real, no simulado, pero tambi\u00e9n la m\u00e1s ruidosa porque un \u00fanico trade puede ser at\u00edpico. El cerebro utiliza promedios m\u00f3viles exponenciales de rendimiento para suavizar el ruido y detectar tendencias de degradaci\u00f3n que indiquen cu\u00e1ndo un sistema necesita recalibraci\u00f3n.'),
);

// ============ SECTION 4: ARQUITECTURA DETALLADA ============
bodyChildren.push(
  heading1('4. Arquitectura Detallada por Componente'),
  heading2('4.1. Pipeline de Recolecci\u00f3n de Datos'),
  heading3('4.1.1. Modelo PriceCandle (Nuevo)'),
  para('El primer requisito arquitect\u00f3nico es a\u00f1adir un modelo PriceCandle al schema de Prisma para almacenar velas OHLCV hist\u00f3ricas. Este modelo es la base sobre la cual se construye todo el resto del sistema: sin datos hist\u00f3ricos persistentes, ni el motor predictivo ni el backtesting pueden funcionar con datos reales.'),
  ...codeBlock([
    'model PriceCandle {',
    '  id          String   @id @default(cuid())',
    '  tokenAddress String',
    '  chain       String   // "solana" | "ethereum" | "base" | ...',
    '  timeframe   String   // "1m" | "5m" | "15m" | "1h" | "4h" | "1d"',
    '  timestamp   DateTime // UTC open time',
    '  open        Float',
    '  high        Float',
    '  low         Float',
    '  close       Float',
    '  volume      Float',
    '  trades      Int?     // Number of trades in period',
    '  source      String   // "dexscreener" | "dexpaprika" | "coingecko" | "internal"',
    '  createdAt   DateTime @default(now())',
    '',
    '  token       Token    @relation(fields: [tokenAddress], references: [address])',
    '',
    '  @@unique([tokenAddress, chain, timeframe, timestamp])',
    '  @@index([tokenAddress, timeframe, timestamp])',
    '  @@index([chain, timeframe, timestamp])',
    '}',
  ]),
  spacer(),
  para('Las velas se almacenan con resoluci\u00f3n m\u00faltiple: 1m y 5m para an\u00e1lisis intrad\u00eda (scalping, bot detection), 15m y 1h para swing trading y detecci\u00f3n de r\u00e9gimen, 4h para posicionamiento de smart money, y 1d para an\u00e1lisis macro y detecci\u00f3n de ciclo de vida. Los \u00edndices compuestos aseguran que las consultas por token y timeframe sean eficientes incluso con millones de registros.'),
  spacer(),
  heading3('4.1.2. Script de Backfill Hist\u00f3rico'),
  para('Se implementa un script de backfill que utiliza las APIs de CoinGecko y DexPaprika para recolectar datos históricos masivos. El script opera en modo batch con control de rate limiting y reintentos con backoff exponencial. El proceso de backfill sigue una estrategia prioritizada: primero los top 100 tokens por volumen (datos de 5 años), luego los top 500 (1 año), y finalmente el universo completo (6 meses). Para cada token, se solicitan velas en todos los timeframes, comenzando por 1d y progresando hacia resoluciones más finas.'),
  para('El script tambi\u00e9n implementa un mecanismo de backfill incremental: cada vez que se ejecuta, solo solicita las velas desde el \u00faltimo timestamp almacenado hasta el presente, evitando duplicados y minimizando el uso de la API. Este mecanismo se configura como un cron job que ejecuta el backfill cada hora para mantener los datos actualizados.'),
  spacer(),
  heading3('4.1.3. Pipeline de Ingesta en Tiempo Real'),
  para('El pipeline de ingesta en tiempo real extiende el DataIngestionPipeline existente con capacidades de persistencia automática y enriquecimiento. Cada vez que se obtiene un precio de DexScreener o DexPaprika, se construye una vela aggregada del período actual y se almacena en PriceCandle. Para tokens con alta actividad (trending o con posiciones abiertas), los precios se consultan cada 30 segundos y se agregan en velas de 1 minuto. Para el resto del universo, los precios se consultan cada 5 minutos y se agregan en velas de 5 minutos.'),
  para('El pipeline tambi\u00e9n enriquece cada dato con informaci\u00f3n contextual: la fase del ciclo de vida detectada para ese token en ese momento, el r\u00e9gimen de mercado vigente, y las se\u00f1ales activas del motor predictivo. Este enriquecimiento permite que las consultas posteriores sobre velas hist\u00f3ricas incluyan el contexto en el que se generaron, facilitando an\u00e1lisis como "c\u00f3mo se comport\u00f3 este token la \u00faltima vez que estuvo en fase FOMO durante un r\u00e9gimen bearish".'),
  spacer(),
  heading2('4.2. Motor de Detecci\u00f3n de Fase del Token'),
  heading3('4.2.1. Algoritmo de Clasificaci\u00f3n de Fase'),
  para('El motor de detecci\u00f3n de fase implementa un clasificador probabil\u00edstico multi-se\u00f1al que asigna a cada token una distribuci\u00f3n de probabilidad sobre las seis fases posibles. El clasificador combina las siguientes se\u00f1ales de entrada con sus pesos correspondientes:'),
  makeTable(
    ['Se\u00f1al', 'Peso', 'Fuente de Datos', 'C\u00f3mputo'],
    [
      ['Edad del token', '15%', 'token.createdAt', 'Tiempo desde creaci\u00f3n'],
      ['Evoluci\u00f3n de liquidez', '20%', 'PriceCandle + DexScreener', 'Regresi\u00f3n lineal del curve de liquidez'],
      ['Ratio bot/humano', '15%', 'Bot Detection + Trader data', 'Porcentaje de volumen bot vs humano'],
      ['Smart money flow', '15%', 'Wallet Profiler + On-chain', 'Net flow de wallets SM identificadas'],
      ['Velocidad de nuevos holders', '10%', 'On-chain + DexScreener', 'Derivada temporal de holderCount'],
      ['Distribuci\u00f3n temporal volumen', '10%', 'PriceCandle intrad\u00eda', 'HHI de volumen por hora'],
      ['Volatilidad relativa', '10%', 'PriceCandle', 'ATR normalizado / media m\u00f3vil'],
      ['Rug score / seguridad', '5%', 'DexScreener + On-chain', 'Contract verification + LP lock'],
    ],
  ),
  spacer(),
  para('El algoritmo funciona en dos pasadas: primero computa scores individuales para cada se\u00f1al normaliz\u00e1ndolos al rango [0,1], luego combina los scores ponderados y los compara con patrones de referencia predefinidos para cada fase. Los patrones de referencia se derivan del an\u00e1lisis emp\u00edrico de cientos de tokens en diferentes fases, y se actualizan peri\u00f3dicamente mediante el proceso de retroalimentaci\u00f3n. La fase asignada es la que maximiza la similitud con su patr\u00f3n de referencia, y la probabilidad asignada es proporcional a esa similitud.'),
  para('La detecci\u00f3n de transiciones es un caso especial donde el sistema identifica tokens que est\u00e1n cambiando de fase. Un token se marca como "en transici\u00f3n" cuando su distribuci\u00f3n de probabilidad tiene dos fases con probabilidades cercanas (diferencia menor a 0.2) o cuando la fase asignada cambia respecto a la detecci\u00f3n anterior. Las transiciones se almacenan como eventos en la base de datos, permitiendo analizar patrones de transici\u00f3n hist\u00f3ricos y construir modelos predictivos de cu\u00e1ndo un token est\u00e1 a punto de cambiar de fase.'),
  spacer(),
  heading3('4.2.2. Modelo TokenLifecycleState (Nuevo)'),
  para('Para persistir la informaci\u00f3n del ciclo de vida de cada token, se a\u00f1ade un modelo que registra la fase detectada, su probabilidad, y las se\u00f1ales que la determinaron:'),
  ...codeBlock([
    'model TokenLifecycleState {',
    '  id              String   @id @default(cuid())',
    '  tokenAddress    String',
    '  chain           String',
    '  phase           String   // GENESIS | INCIPIENT | GROWTH | FOMO | DECLINE | LEGACY',
    '  phaseProbability Float   // 0.0 - 1.0 confidence',
    '  phaseDistribution Json   // {genesis: 0.05, incipient: 0.1, ...}',
    '  transitionFrom  String?  // Previous phase if transitioning',
    '  transitionProb  Float?   // Transition probability',
    '  signals         Json     // Input signals and their scores',
    '  detectedAt      DateTime @default(now())',
    '',
    '  token           Token    @relation(fields: [tokenAddress], references: [address])',
    '',
    '  @@index([tokenAddress, detectedAt])',
    '  @@index([phase, detectedAt])',
    '}',
  ]),
  spacer(),
  heading2('4.3. Motor de Comportamiento Humano'),
  heading3('4.3.1. Matrices de Transici\u00f3n Comportamental'),
  para('El modelo de comportamiento humano se implementa como un sistema de matrices de transici\u00f3n probabil\u00edsticas, donde cada matriz define las probabilidades de acci\u00f3n para un archetype de trader en una fase espec\u00edfica del token. La estructura de datos es un mapa tridimensional: archetype x fase x acci\u00f3n, donde cada celda contiene una probabilidad que se actualiza continuamente basada en datos observados.'),
  para('Las acciones modeladas para cada archetype son: comprar (buy), vender (sell), mantener (hold), acumular (accumulate - compras discretas y escalonadas), distribuir (distribute - ventas discretas y escalonadas), y observar (watch - sin acci\u00f3n pero monitoreando). Cada acci\u00f3n tiene asociada una intensidad esperada (porcentaje del portafolio comprometido) y una duraci\u00f3n t\u00edpica.'),
  para('Las matrices se inicializan con valores derivados de la literatura de finanzas conductuales y se refinan mediante un proceso de actualizaci\u00f3n bayesiana. Cuando el sistema observa una acci\u00f3n real en la blockchain (por ejemplo, una wallet clasificada como Smart Money que vende el 30% de sus holdings en un token en fase FOMO), esta observaci\u00f3n actualiza la probabilidad de la acci\u00f3n "distribuir" para el archetype Smart Money en la fase FOMO. La actualizaci\u00f3n sigue una regla bayesiana con un prior de Laplace suavizado para evitar sobreajuste a observaciones recientes.'),
  spacer(),
  heading3('4.3.2. Modelo TraderBehaviorModel (Nuevo)'),
  para('Para persistir los modelos de comportamiento y su evoluci\u00f3n, se introduce el siguiente modelo:'),
  ...codeBlock([
    'model TraderBehaviorModel {',
    '  id              String   @id @default(cuid())',
    '  archetype       String   // SMART_MONEY | WHALE | SNIPER | ...',
    '  tokenPhase      String   // GENESIS | INCIPIENT | GROWTH | FOMO | DECLINE | LEGACY',
    '  action          String   // BUY | SELL | HOLD | ACCUMULATE | DISTRIBUTE | WATCH',
    '  probability     Float    // Current estimated probability',
    '  intensity       Float    // Expected portfolio % commitment',
    '  duration        Float    // Expected duration in hours',
    '  observations    Int      // Number of real observations used',
    '  confidence      Float    // Statistical confidence of the estimate',
    '  lastUpdated     DateTime @updatedAt',
    '',
    '  @@unique([archetype, tokenPhase, action])',
    '  @@index([archetype, tokenPhase])',
    '}',
  ]),
  spacer(),
  heading3('4.3.3. Predicci\u00f3n de Comportamiento Agregado'),
  para('El modelo genera predicciones de comportamiento agregado combinando las matrices de comportamiento con la distribuci\u00f3n observada de archetypes en el mercado actual. Si el 40% del volumen de un token proviene de Retail FOMO, el 25% de Smart Money, y el 35% de bots, la predicci\u00f3n de flujo neto es la suma ponderada de las probabilidades de compra/venta de cada archetype multiplicada por su participaci\u00f3n en el volumen. Esta predicci\u00f3n se emite como una se\u00f1al del tipo "BEHAVIORAL_PREDICTION" en el motor predictivo, con un confidence score que refleja la incertidumbre del modelo.'),
  para('El sistema tambi\u00e9n detecta "anomal\u00edas de comportamiento" cuando el comportamiento observado difiere significativamente del predicho. Estas anomal\u00edas son se\u00f1ales particularmente valiosas porque indican que el mercado est\u00e1 haciendo algo inesperado, lo que a menudo precede a movimientos de precio significativos. Por ejemplo, si el modelo predice que Smart Money deber\u00eda estar distribuyendo en fase FOMO pero las observaciones muestran que est\u00e1n acumulando, esto genera una anomal\u00eda con implicaciones alcistas que puede alimentar sistemas de trading espec\u00edficos.'),
  spacer(),
  heading2('4.4. Sistema de Retroalimentaci\u00f3n Continua'),
  heading3('4.4.1. Validador de Se\u00f1ales'),
  para('El validador de se\u00f1ales es un proceso en background que compara las predicciones pasadas del motor predictivo con los resultados reales del mercado. Funciona en ciclos de 5 minutos y eval\u00faa cada se\u00f1al activa contra el movimiento de precio real en el horizonte temporal predicho. Una se\u00f1al de whale_accumulation con horizonte de 4 horas se eval\u00faa 4 horas despu\u00e9s de su generaci\u00f3n, comparando la predicci\u00f3n de direcci\u00f3n con el movimiento real del precio.'),
  para('El validador calcula m\u00faltiples m\u00e9tricas de precisi\u00f3n: tasa de acierto bruta (wasCorrect), Brier score (calibraci\u00f3n probabil\u00edstica), precisi\u00f3n por tipo de se\u00f1al, precisi\u00f3n por fase del token, y precisi\u00f3n por r\u00e9gimen de mercado. Estas m\u00e9tricas se almacenan en el modelo FeedbackMetrics (nuevo) y se utilizan para ajustar los pesos del motor predictivo mediante descenso de gradiente estoc\u00e1stico sobre la funci\u00f3n de p\u00e9rdida definida como el negativo del Brier score.'),
  spacer(),
  heading3('4.4.2. Modelo FeedbackMetrics (Nuevo)'),
  ...codeBlock([
    'model FeedbackMetrics {',
    '  id              String   @id @default(cuid())',
    '  sourceType      String   // "signal" | "backtest" | "live_trade"',
    '  sourceId        String   // ID of the signal, backtest run, or trade',
    '  metricName      String   // "accuracy" | "brier_score" | "sharpe" | ...',
    '  metricValue     Float',
    '  context         Json     // Phase, regime, token, conditions',
    '  period          String   // "1h" | "4h" | "24h" | "7d" | "30d"',
    '  measuredAt      DateTime @default(now())',
    '',
    '  @@index([sourceType, metricName, measuredAt])',
    '  @@index([sourceType, sourceId])',
    '}',
  ]),
  spacer(),
  heading3('4.4.3. Refinamiento Autom\u00e1tico de Sistemas'),
  para('El proceso de refinamiento autom\u00e1tico analiza los resultados de backtesting y live trading para identificar oportunidades de mejora en los sistemas de trading existentes. Funciona en tres niveles de granularidad:'),
  numberedItem(1, 'Ajuste de par\u00e1metros: Modifica umbrales, ventanas temporales, y pesos dentro de un sistema existente. Por ejemplo, si un sistema tiene un stop-loss de 5% que se activa con frecuencia en fase FOMO (donde la volatilidad es alta), el refinamiento puede aumentar el stop-loss a 8% para esa fase espec\u00edfica, mejorando el win rate sin aumentar excesivamente el riesgo.'),
  numberedItem(2, 'Especializaci\u00f3n por fase: Crea variantes de un sistema optimizadas para cada fase del ciclo de vida. Si el sistema original "SMART_MONEY_TRACKER" tiene un Sharpe de 1.8 en fase Crecimiento pero 0.4 en fase FOMO, el refinamiento genera "SMART_MONEY_TRACKER_FOMO" con par\u00e1metros ajustados espec\u00edficamente para FOMO, manteniendo el sistema original para Crecimiento.'),
  numberedItem(3, 'Generaci\u00f3n de nuevos sistemas: Cuando los gaps de rendimiento no se pueden resolver ajustando sistemas existentes, el generador crea sistemas completamente nuevos combinando elementos de m\u00faltiples sistemas exitosos. Por ejemplo, si el sistema A tiene buen entry timing pero mal exit, y el sistema B tiene buen exit pero mal entry, el generador puede crear un sistema h\u00edbrido que use el entry de A y el exit de B.'),
  spacer(),
  heading3('4.4.4. Modelo SystemEvolution (Nuevo)'),
  para('Para rastrear la evoluci\u00f3n de los sistemas de trading a trav\u00e9s del proceso de refinamiento, se introduce:'),
  ...codeBlock([
    'model SystemEvolution {',
    '  id              String   @id @default(cuid())',
    '  parentSystemId  String?  // NULL for original systems',
    '  childSystemId   String   // The evolved system',
    '  evolutionType   String   // "parameter_adjust" | "phase_specialize" | "hybrid_generate"',
    '  triggerMetric   String   // What metric triggered the evolution',
    '  triggerValue    Float    // The metric value that triggered it',
    '  improvementPct  Float    // Measured improvement in target metric',
    '  backtestId      String?  // Backtest that validated the evolution',
    '  approvedAt      DateTime?', 
    '  createdAt       DateTime @default(now())',
    '',
    '  @@index([parentSystemId])',
    '  @@index([evolutionType])',
    '}',
  ]),
  spacer(),
  heading2('4.5. Integraci\u00f3n Wallet Analysis \u2194 Big Data'),
  heading3('4.5.1. Flujo de Datos On-Chain'),
  para('La integraci\u00f3n del an\u00e1lisis de wallets con el motor Big Data es fundamental para alimentar el modelo de comportamiento humano. El flujo de datos on-chain conecta tres componentes que actualmente est\u00e1n desconectados: data-ingestion (que obtiene transacciones de Solana y Ethereum), wallet-profiler (que clasifica wallets y detecta patrones), y big-data-engine (que genera se\u00f1ales predictivas).'),
  para('El flujo completo opera as\u00ed: (1) El pipeline de ingesta obtiene transacciones recientes de wallets monitoreadas v\u00eda Solana RPC y Ethereum RPC, (2) Cada transacci\u00f3n se enriquece con contexto (qu\u00e9 token, qu\u00e9 fase, qu\u00e9 r\u00e9gimen), (3) Las transacciones enriquecidas alimentan el wallet-profiler que actualiza los scores de Smart Money, Whale, y Sniper as\u00ed como los patrones de comportamiento, (4) Los perfiles actualizados de wallets alimentan el modelo de comportamiento humano que actualiza las matrices de transici\u00f3n, y (5) Las matrices actualizadas generan nuevas predicciones que se integran como se\u00f1ales en el motor predictivo.'),
  para('Esta integraci\u00f3n transforma el wallet-profiler de un componente aislado en un proveedor cr\u00edtico de datos para el cerebro. Cada acci\u00f3n de una wallet clasificada se convierte en una observaci\u00f3n que refina el modelo de comportamiento, y cada refinamiento del modelo mejora la precisi\u00f3n de las predicciones del motor. El resultado es un sistema donde la observaci\u00f3n emp\u00edrica del comportamiento on-chain alimenta directamente las capacidades predictivas del motor.'),
  spacer(),
  heading3('4.5.2. An\u00e1lisis de Wallets desde DexScreener'),
  para('DexScreener proporciona datos de transacciones recientes para cada token, incluyendo las wallets que compraron y vendieron, los montos, y los timestamps. Aunque estos datos son menos detallados que los obtenidos directamente del RPC (no incluyen gas fees, transacciones fallidas, o interacciones con m\u00faltiples contratos), son m\u00e1s accesibles y cubren m\u00faltiples DEXes y cadenas. El pipeline utiliza DexScreener como fuente primaria para identificaci\u00f3n r\u00e1pida de wallets activas y complementa con datos RPC para an\u00e1lisis profundo de wallets de inter\u00e9s.'),
  para('Espec\u00edficamente, para cada token monitoreado, se extraen las \u00faltimas 100 transacciones de DexScreener, se identifican las wallets \u00fanicas, y se cruzan con la base de datos de Traders existente. Las wallets nuevas se perfilan autom\u00e1ticamente: se obtiene su historial de transacciones v\u00eda Solana/ETH RPC, se ejecuta el wallet-profiler para clasificarlas, y se a\u00f1aden al pool de wallets monitoreadas. Las wallets existentes se actualizan con la nueva actividad, recalculando scores y patrones de comportamiento.'),
  spacer(),
  heading3('4.5.3. An\u00e1lisis de Comportamiento en Solana y Ethereum'),
  para('El an\u00e1lisis on-chain es donde el sistema obtiene su ventaja competitiva m\u00e1s significativa. En Solana, cada transacci\u00f3n DEX deja un rastro completo: la wallet que inici\u00f3 el swap, el token de entrada y salida, los montos, el DEX utilizado, y los timestamps con precisi\u00f3n de slot. El pipeline actual de data-ingestion ya tiene un parseSolanaTransaction() que extrae esta informaci\u00f3n, aunque actualmente es un stub que devuelve valores placeholder. La mejora consiste en implementar un parser completo que decodifique las instrucciones de los programas DEX m\u00e1s comunes (Raydium, Orca, Jupiter) para obtener los detalles exactos de cada swap.'),
  para('En Ethereum, el an\u00e1lisis es m\u00e1s complejo pero tambi\u00e9n m\u00e1s rico. Cada swap en Uniswap, SushiSwap, o Curve genera eventos en los logs de la transacci\u00f3n (Swap, Mint, Burn) que contienen los montos exactos de cada token. El pipeline utiliza eth_getLogs para obtener estos eventos y reconstruir la actividad de cada wallet. Adem\u00e1s, en Ethereum es m\u00e1s f\u00e1cil detectar patrones de MEV y sandwich attacks porque las transacciones se ordenan por gas price, revelando intenciones de frontrunning. La integraci\u00f3n con Etherscan API (actualmente referenciada pero no implementada) a\u00f1adir\u00eda la capacidad de obtener el historial completo de transacciones de cualquier wallet, no solo las recientes.'),
);

// ============ SECTION 5: MODELOS COMPARATIVOS ============
bodyChildren.push(
  heading1('5. Modelos Comparativos de Predicci\u00f3n'),
  heading2('5.1. Framework de Comparaci\u00f3n'),
  para('Los modelos comparativos de predicci\u00f3n constituyen una capa anal\u00edtica superior que permite al sistema evaluar y comparar el rendimiento de diferentes enfoques de predicci\u00f3n en funci\u00f3n del contexto. En lugar de depender de un \u00fanico modelo predictivo, el sistema mantiene m\u00faltiples modelos en paralelo y selecciona din\u00e1micamente el m\u00e1s apropiado seg\u00fan la fase del token y las condiciones del mercado. Este enfoque de ensemble adaptativo es an\u00e1logo a c\u00f3mo un equipo de analistas con diferentes especializaciones contribuye con perspectivas complementarias.'),
  para('El framework define tres dimensiones de comparaci\u00f3n: (1) Modelo vs Modelo: compara diferentes algoritmos de predicci\u00f3n sobre el mismo conjunto de datos, (2) Fase vs Fase: compara c\u00f3mo el mismo modelo rinde en diferentes fases del ciclo de vida, y (3) Periodo vs Periodo: compara la estabilidad temporal del modelo a trav\u00e9s de diferentes ventanas temporales. Cada comparaci\u00f3n genera un ranking de modelos con m\u00e9tricas estandarizadas que se almacena para consulta y retroalimentaci\u00f3n.'),
  spacer(),
  heading2('5.2. Modelos de Predicci\u00f3n por Fase'),
  para('Cada fase del ciclo de vida del token tiene un modelo de predicci\u00f3n optimizado que pondera diferentes se\u00f1ales seg\u00fan su relevancia emp\u00edrica. Los modelos por fase no son independientes sino variantes del modelo general con pesos especializados, lo que permite comparaci\u00f3n directa y transferencia de aprendizaje entre fases.'),
  makeTable(
    ['Fase', 'Se\u00f1al Primaria', 'Se\u00f1al Secundaria', 'Se\u00f1al Terciaria', 'Horizonte \u00d3ptimo'],
    [
      ['G\u00e9nesis', 'Bot ratio (40%)', 'Rug score (25%)', 'Sniper entry (20%)', '5-15 min'],
      ['Incipiente', 'SM flow (35%)', 'Liquidez growth (25%)', 'Holder velocity (20%)', '1-4 horas'],
      ['Crecimiento', 'SM accumulation (30%)', 'Volume trend (25%)', 'Regime alignment (20%)', '4-24 horas'],
      ['FOMO', 'Retail sentiment (35%)', 'SM distribution (30%)', 'Volatility regime (20%)', '1-8 horas'],
      ['Declive', 'SM exit (40%)', 'Liquidez drain (25%)', 'Holder exodus (20%)', '4-24 horas'],
      ['Legado', 'Mean reversion (30%)', 'Regime detection (25%)', 'Correlation breaks (20%)', '1-7 d\u00edas'],
    ],
  ),
  spacer(),
  para('La distribuci\u00f3n de pesos refleja la relevancia emp\u00edrica de cada se\u00f1al en cada fase. En G\u00e9nesis, el bot ratio domina porque el 80%+ del volumen proviene de bots, y distinguir bot activity leg\u00edtima de wash trading es cr\u00edtico. En FOMO, el sentimiento retail domina porque el precio se mueve por psicolog\u00eda de masas, no por fundamentos. En Declive, la salida de Smart Money domina porque los traders m\u00e1s informados son los primeros en salir, y su comportamiento anticipa ca\u00eddas adicionales.'),
  spacer(),
  heading2('5.3. Modelo ComparativeAnalysis (Nuevo)'),
  ...codeBlock([
    'model ComparativeAnalysis {',
    '  id              String   @id @default(cuid())',
    '  modelA          String   // System/model identifier',
    '  modelB          String   // System/model identifier',
    '  dimension       String   // "model_vs_model" | "phase_vs_phase" | "period_vs_period"',
    '  context         Json     // Phase, regime, timeframe, token set',
    '  metricsA        Json     // {accuracy, sharpe, brier, ...}',
    '  metricsB        Json     // {accuracy, sharpe, brier, ...}',
    '  winner          String   // "A" | "B" | "tie"',
    '  confidenceDiff  Float    // Statistical significance of difference',
    '  measuredAt      DateTime @default(now())',
    '',
    '  @@index([dimension, measuredAt])',
    '  @@index([modelA, modelB])',
    '}',
  ]),
  spacer(),
  heading2('5.4. Ciclo de Mejora Basado en Comparaci\u00f3n'),
  para('El modelo comparativo no es simplemente un reporte est\u00e1tico sino un motor activo de mejora. Cuando un modelo comparativo revela que el Modelo B supera consistentemente al Modelo A en una fase espec\u00edfica (por ejemplo, en FOMO), el sistema toma acciones concretas: (1) Aumenta el peso del Modelo B en la fase FOMO del ensemble, (2) Reduce el peso del Modelo A proporcionalmente, (3) Si la diferencia es estad\u00edsticamente significativa (p < 0.05) y persiste durante m\u00faltiples periodos, marca el Modelo A como "degradado" para esa fase y genera un sistema derivado que reemplaza sus componentes d\u00e9biles con los del Modelo B. Este proceso garantiza que el sistema evoluciona continuamente hacia configuraciones de mayor rendimiento sin intervenci\u00f3n manual.'),
  para('Adem\u00e1s, las comparaciones hist\u00f3ricas permiten detectar "cambios de r\u00e9gimen de modelo" donde un modelo que hist\u00f3ricamente funcionaba bien comienza a degradarse. Este fen\u00f3meno, conocido como model decay, es com\u00fan en mercados financieros donde las condiciones cambian con el tiempo. El sistema detecta el decay cuando el rendimiento de un modelo cae por debajo de su percentil 25 hist\u00f3rico durante 3 periodos consecutivos, y responde aumentando la exploraci\u00f3n de modelos alternativos y reduciendo la confianza en las se\u00f1ales del modelo degradado.'),
);

// ============ SECTION 6: INTEGRACION DE COMPONENTES ============
bodyChildren.push(
  heading1('6. Plan de Integraci\u00f3n de Componentes'),
  heading2('6.1. Conectividad Objetivo'),
  para('El objetivo de la integraci\u00f3n es transformar el ecosistema actual de islas funcionales en un sistema interconectado donde cada componente alimenta y es alimentado por los dem\u00e1s. La siguiente tabla muestra el estado objetivo de conectividad, donde cada celda indica el tipo de dato que fluye entre componentes:'),
  makeTable(
    ['Desde \\ Hacia', 'Big Data', 'Backtest', 'Wallet', 'Bot Det.', 'Capital', 'WS Server'],
    [
      ['Big Data', '\u2014', 'Contexto + se\u00f1ales', 'Predicciones', 'Scores bot', 'R\u00e9gimen + riesgo', 'Se\u00f1ales + alerts'],
      ['Backtest', 'Feedback m\u00e9tricas', '\u2014', 'Win rates', 'Falsos positivos', 'Optimizaci\u00f3n', 'Resultados'],
      ['Wallet', 'SM/Whale flow', 'Perfiles hist\u00f3ricos', '\u2014', 'Bot scores', 'Risk profiles', 'Alertas wallet'],
      ['Bot Det.', 'Bot ratios', 'Bot activity', 'Clasificaci\u00f3n', '\u2014', 'Ajuste riesgo', 'Alertas bot'],
      ['Capital', 'N/A', 'M\u00e9todo \u00f3ptimo', 'Posiciones', 'N/A', '\u2014', 'Size updates'],
      ['WS Server', 'Datos tiempo real', 'Se\u00f1ales live', 'Actividad wallet', 'Actividad bot', 'N/A', '\u2014'],
    ],
  ),
  spacer(),
  heading2('6.2. WebSocket Server Integrado'),
  para('El servidor WebSocket actual tiene c\u00f3digo duplicado y 5 de 7 eventos simulados. La integraci\u00f3n lo transforma para que consuma directamente los servicios de la librer\u00eda: big-data-engine para se\u00f1ales predictivas reales, wallet-profiler para alertas de smart money y whale, bot-detection para alertas de bots, y capital-allocation para updates de posici\u00f3n. En modo h\u00edbrido, los datos en tiempo real provienen de DexScreener (cada 30s) y las se\u00f1ales anal\u00edticas provienen del cerebro que procesa esos datos. Los eventos simulados se eliminan completamente en producci\u00f3n, quedando solo como fallback para desarrollo.'),
  spacer(),
  heading2('6.3. Eliminaci\u00f3n de Datos Sint\u00e9ticos'),
  para('La transici\u00f3n de datos sint\u00e9ticos a datos reales sigue un plan gradual que garantiza la estabilidad del sistema en cada paso:'),
  numberedItem(1, 'Fase 1 - PriceCandle + Backfill: A\u00f1adir el modelo, ejecutar backfill masivo, y verificar integridad de datos. El motor predictivo sigue usando datos sint\u00e9ticos como fallback.'),
  numberedItem(2, 'Fase 2 - Conectar motor a OHLCV real: Modificar la ruta /api/predictive para cargar velas reales desde PriceCandle en lugar de fabricar series. Mantener fallback sint\u00e9tico para tokens sin datos.'),
  numberedItem(3, 'Fase 3 - Conectar wallet-profiler: Implementar rutas API que invoquen el wallet-profiler con datos reales de transacciones on-chain.'),
  numberedItem(4, 'Fase 4 - Activar feedback loop: Implementar el validador de se\u00f1ales y el proceso de refinamiento autom\u00e1tico.'),
  numberedItem(5, 'Fase 5 - Generaci\u00f3n autom\u00e1tica: Activar el generador de sistemas de trading basado en Big Data.'),
  numberedItem(6, 'Fase 6 - Eliminar todo MOCK: Remover todos los datos simulados, fallbacks sint\u00e9ticos, y constantes hardcoded del c\u00f3digo.'),
  spacer(),
  heading2('6.4. Procesamiento en Background'),
  para('El sistema necesita procesos en background para funciones que no pueden ejecutarse s\u00edncronamente en request handlers. Se implementan los siguientes cron jobs y workers:'),
  makeTable(
    ['Proceso', 'Frecuencia', 'Funci\u00f3n', 'Prioridad'],
    [
      ['Price Backfill', 'Cada hora', 'Incremental OHLCV para tokens sin datos recientes', 'Alta'],
      ['Phase Detection', 'Cada 5 min', 'Re-evaluar fase de tokens monitoreados', 'Alta'],
      ['Signal Validation', 'Cada 5 min', 'Validar predicciones pasadas vs resultados reales', 'Alta'],
      ['Wallet Profiling', 'Cada 15 min', 'Actualizar perfiles de wallets activas', 'Media'],
      ['Behavioral Model Update', 'Cada 30 min', 'Refinar matrices de comportamiento', 'Media'],
      ['Auto-Refinement', 'Cada 6 horas', 'Refinar sistemas de trading basado en feedback', 'Media'],
      ['Comparative Analysis', 'Diario', 'Comparar modelos y generar rankings', 'Baja'],
      ['Deep Backfill', 'Semanal', 'Backfill profundo para tokens nuevos', 'Baja'],
    ],
  ),
);

// ============ SECTION 7: ROADMAP ============
bodyChildren.push(
  heading1('7. Roadmap de Implementaci\u00f3n'),
  heading2('7.1. Fases de Desarrollo'),
  heading3('Fase 1: Fundamentos de Datos (Semana 1-2)'),
  para('La primera fase establece la base de datos histórica que todo el resto del sistema necesita. Sin datos reales, ninguna mejora analítica es posible. Las tareas incluyen: asegurar el modelo PriceCandle en el schema de Prisma, implementar el script de backfill histórico con CoinGecko y DexPaprika, crear el pipeline de ingesta en tiempo real con persistencia automática, y implementar el cron job de backfill incremental. Al finalizar esta fase, el sistema tendrá datos OHLCV reales para los top 500 tokens en múltiples timeframes.'),
  spacer(),
  heading3('Fase 2: Motor de Fase del Token (Semana 3-4)'),
  para('La segunda fase implementa el motor de detecci\u00f3n de fase del ciclo de vida, que transforma el an\u00e1lisis de uniforme a contextual. Las tareas incluyen: implementar el clasificador probabil\u00edstico multi-se\u00f1al, a\u00f1adir el modelo TokenLifecycleState, crear el API endpoint para consultar la fase de un token, e integrar la fase detectada como contexto en las se\u00f1ales del motor predictivo. Al finalizar, cada se\u00f1al incluir\u00e1 la fase del token como metadato, permitiendo que los sistemas de trading ajusten su comportamiento seg\u00fan la fase.'),
  spacer(),
  heading3('Fase 3: Modelo de Comportamiento Humano (Semana 5-6)'),
  para('La tercera fase implementa el modelo de comportamiento humano, que a\u00f1ade la dimensi\u00f3n psicol\u00f3gica al an\u00e1lisis. Las tareas incluyen: implementar las matrices de transici\u00f3n comportamental, a\u00f1adir el modelo TraderBehaviorModel, conectar el wallet-profiler al motor de comportamiento, implementar la predicci\u00f3n de comportamiento agregado, y crear el API endpoint de predicci\u00f3n de comportamiento. Al finalizar, el sistema podr\u00e1 predecir el flujo neto esperado por archetype de trader y detectar anomal\u00edas de comportamiento.'),
  spacer(),
  heading3('Fase 4: Retroalimentaci\u00f3n Continua (Semana 7-8)'),
  para('La cuarta fase cierra el ciclo de retroalimentaci\u00f3n, convirtiendo al sistema en un organismo de aprendizaje. Las tareas incluyen: implementar el validador de se\u00f1ales, a\u00f1adir el modelo FeedbackMetrics, implementar el refinamiento autom\u00e1tico de par\u00e1metros, a\u00f1adir el modelo SystemEvolution, y activar los cron jobs de validaci\u00f3n y refinamiento. Al finalizar, el sistema mejorar\u00e1 autom\u00e1ticamente sus predicciones bas\u00e1ndose en los resultados observados.'),
  spacer(),
  heading3('Fase 5: Generaci\u00f3n Autom\u00e1tica y Comparaci\u00f3n (Semana 9-10)'),
  para('La quinta fase implementa la generaci\u00f3n autom\u00e1tica de sistemas de trading y los modelos comparativos, completando la visi\u00f3n del cerebro auto-mejorable. Las tareas incluyen: implementar el generador de sistemas sint\u00e9ticos, a\u00f1adir el modelo ComparativeAnalysis, implementar el framework de comparaci\u00f3n de modelos, y crear los dashboards de evoluci\u00f3n del sistema. Al finalizar, el sistema generar\u00e1 y validar\u00e1 autom\u00e1ticamente nuevos sistemas de trading basados en los patrones descubiertos por el Big Data.'),
  spacer(),
  heading2('7.2. Resumen de Modelos Nuevos'),
  makeTable(
    ['Modelo', 'Prop\u00f3sito', 'Prioridad', 'Fase'],
    [
      ['PriceCandle', 'Almacenar velas OHLCV hist\u00f3ricas', 'Cr\u00edtica', '1'],
      ['TokenLifecycleState', 'Fase del ciclo de vida del token', 'Alta', '2'],
      ['TraderBehaviorModel', 'Matrices de comportamiento por archetype', 'Alta', '3'],
      ['FeedbackMetrics', 'M\u00e9tricas de retroalimentaci\u00f3n', 'Alta', '4'],
      ['SystemEvolution', 'Evoluci\u00f3n de sistemas de trading', 'Media', '4'],
      ['ComparativeAnalysis', 'Comparaci\u00f3n de modelos predictivos', 'Media', '5'],
    ],
  ),
  spacer(),
  heading2('7.3. Estimaci\u00f3n de Esfuerzo'),
  para('El esfuerzo total estimado para completar las 5 fases es de aproximadamente 10 semanas de desarrollo intensivo, con un total estimado de 8,000-12,000 l\u00edneas de c\u00f3digo nuevo y 3,000-5,000 l\u00edneas de c\u00f3digo modificado. Las fases 1 y 4 son las m\u00e1s cr\u00edticas y deben completarse sin atajos, ya que establecen los cimientos de datos y retroalimentaci\u00f3n sobre los cuales se construye todo lo dem\u00e1s. Las fases 2 y 3 pueden desarrollarse en paralelo parcialmente, ya que la detecci\u00f3n de fase y el modelado de comportamiento son independientes hasta el punto de integraci\u00f3n. La fase 5 es la m\u00e1s experimental y puede iterarse bas\u00e1ndose en los resultados de las fases anteriores.'),
);

// ===== BODY SECTION WITH PAGE NUMBERS =====
sections.push({
  properties: {
    page: {
      margin: { top: 1440, bottom: 1417, left: 1701, right: 1440 },
      pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
    },
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'CryptoQuant Terminal \u2014 An\u00e1lisis Arquitect\u00f3nico V4', font: F.body, size: 16, color: C.textLight, italic: true })],
      })],
    }),
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'P\u00e1gina ', font: F.body, size: 16, color: C.textLight }), new TextRun({ children: [PageNumber.CURRENT], font: F.body, size: 16, color: C.textLight })],
      })],
    }),
  },
  children: bodyChildren,
});

// ===== CREATE DOCUMENT =====
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: F.body, size: 21 },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: F.heading, size: 32, bold: true, color: C.primary },
        paragraph: { spacing: { before: 480, after: 240 } },
      },
      heading2: {
        run: { font: F.heading, size: 28, bold: true, color: C.secondary },
        paragraph: { spacing: { before: 360, after: 180 } },
      },
      heading3: {
        run: { font: F.heading, size: 24, bold: true, color: C.accent },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
    },
  },
  sections,
});

// ===== EXPORT =====
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/z/my-project/download/Analisis_Arquitectonico_Plataforma_Crypto_V4.docx', buffer);
  console.log('V4 dossier generated successfully!');
}).catch(err => {
  console.error('Error:', err);
});
