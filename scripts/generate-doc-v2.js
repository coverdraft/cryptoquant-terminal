/**
 * CryptoQuant Terminal — Análisis Arquitectónico V2
 * Document generator using docx npm package
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, PageBreak,
  ShadingType, TableOfContents, StyleLevel, Tab, TabStopType, TabStopPosition,
  convertInchesToTwip, Footer, Header, PageNumber, NumberFormat,
} = require('docx');

const fs = require('fs');
const path = require('path');

// ============================================================
// COLOR PALETTE — Ink Gold Professional Finance
// ============================================================
const C = {
  gold: 'D4AF37',
  darkNavy: '0D1117',
  navy: '161B22',
  darkGray: '21262D',
  gray: '30363D',
  midGray: '6E7681',
  lightGray: 'C9D1D9',
  white: 'F0F6FC',
  pureWhite: 'FFFFFF',
  accent: 'D4AF37',
  accentDark: 'B8962E',
  tableBorder: '30363D',
  tableHeaderBg: '161B22',
  tableAltBg: '0D1117',
  tableBodyBg: '0D1117',
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: C.gold,
        font: 'Calibri',
      }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: C.gold, space: 4 },
    },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 26,
        color: C.gold,
        font: 'Calibri',
      }),
    ],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 22,
        color: C.accentDark,
        font: 'Calibri',
      }),
    ],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { line: 276, after: 120 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        size: opts.size || 20,
        color: opts.color || C.lightGray,
        font: opts.font || 'Calibri',
        bold: opts.bold || false,
        italics: opts.italics || false,
      }),
    ],
  });
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { line: 276, after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 20, color: C.gold, font: 'Calibri' }),
      new TextRun({ text: value, size: 20, color: C.lightGray, font: 'Calibri' }),
    ],
  });
}

function bulletPoint(text, level = 0) {
  return new Paragraph({
    spacing: { line: 276, after: 60 },
    indent: { left: convertInchesToTwip(0.3 + level * 0.3) },
    children: [
      new TextRun({ text: '\u2022 ', size: 20, color: C.gold, font: 'Calibri' }),
      new TextRun({ text, size: 20, color: C.lightGray, font: 'Calibri' }),
    ],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { line: 240, after: 60 },
    indent: { left: convertInchesToTwip(0.3) },
    shading: { type: ShadingType.SOLID, color: C.darkGray },
    children: [
      new TextRun({ text, size: 16, color: '7EE787', font: 'Consolas' }),
    ],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function spacer(twips = 200) {
  return new Paragraph({ spacing: { after: twips }, children: [] });
}

// Table helpers
function headerCell(text, width) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.SOLID, color: C.tableHeaderBg },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, color: C.gold, font: 'Calibri' })],
      }),
    ],
  });
}

function bodyCell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.SOLID, color: opts.bg || C.tableBodyBg },
    margins: { top: 30, bottom: 30, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 17, color: opts.color || C.lightGray, font: 'Calibri', bold: opts.bold || false })],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: C.tableBorder,
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h, i) => headerCell(h, widths?.[i])),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) =>
            bodyCell(cell, { width: widths?.[ci], bg: ri % 2 === 0 ? C.tableBodyBg : C.tableAltBg })
          ),
        })
      ),
    ],
    borders: {
      top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle,
      insideHorizontal: borderStyle, insideVertical: borderStyle,
    },
  });
}

// ============================================================
// CHAPTER CONTENT GENERATORS
// ============================================================

function coverPage() {
  return [
    spacer(2000),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', size: 20, color: C.gold, font: 'Calibri' }),
      ],
    }),
    spacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'CryptoQuant Terminal', bold: true, size: 56, color: C.gold, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'Analisis Arquitectonico V2', bold: true, size: 36, color: C.lightGray, font: 'Calibri' }),
      ],
    }),
    spacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', size: 20, color: C.gold, font: 'Calibri' }),
      ],
    }),
    spacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'El Bloomberg del Retail: Plataforma de Analisis Cuantitativo Crypto',
          italics: true, size: 24, color: C.midGray, font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'con Trading Systems Lab y Backtesting Engine',
          italics: true, size: 24, color: C.midGray, font: 'Calibri',
        }),
      ],
    }),
    spacer(600),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'Mayo 2026', size: 22, color: C.midGray, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Documento Confidencial', italics: true, size: 18, color: C.midGray, font: 'Calibri' }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function chapter1() {
  return [
    heading1('Capitulo 1: Vision General'),
    para('CryptoQuant Terminal es una plataforma de analisis cuantitativo de criptomonedas disenada para proporcionar a inversores retail capacidades de nivel institucional. La plataforma opera como un terminal integral que combina inteligencia de mercado en tiempo real, deteccion de patrones on-chain, y herramientas de trading sistematico en una unica interfaz cohesiva.'),
    para('La arquitectura se estructura en tres capas fundamentales que operan de forma jerarquica y sinergica, donde cada capa alimenta a la siguiente en un ciclo continuo de mejora:'),
    heading2('Las Tres Capas Fundamentales'),
    heading3('Capa 0 — Big Data Predictive Engine'),
    para('La base de la plataforma. Este motor analiza datos historicos y en tiempo real para detectar patrones y predecir eventos de mercado ANTES de que ocurran. Genera senales predictivas que alimentan a los sistemas de trading superiores. Incluye deteccion de regimen de mercado, prediccion de movimientos de ballenas, deteccion de enjambres de bots, zonas de reversion a la media, y drenaje de liquidez.'),
    heading3('Zona 1 — Trading Systems Lab'),
    para('La capa intermedia. Laboratorio de sistemas de trading con 30 plantillas preconstruidas organizadas en 8 categorias. Cada sistema implementa una arquitectura de 5 capas (Filtro de Activos, Configuracion de Fase, Senal de Entrada, Ejecucion, Senal de Salida) y se adapta automaticamente a las 7 fases del ciclo de vida de un token (GENESIS a LEGACY).'),
    heading3('Zona 2 — Backtesting Engine'),
    para('La capa superior. Motor de backtesting con 3 modos de operacion (Historico, Paper, Forward), 16 metodos de asignacion de capital, optimizacion de parametros, y proteccion contra overfitting. Los resultados retroalimentan la base de datos para mejorar iterativamente las estrategias.'),
    heading2('Flujo de Datos'),
    para('El flujo de informacion sigue un patrón unidireccional con retroalimentacion: Los datos on-chain son ingeridos desde multiples fuentes (DexScreener, Birdeye, Jupiter, Solana RPC, Ethereum RPC) y procesados por el Big Data Engine, que genera contexto de mercado. Este contexto alimenta al Trading Systems Lab, que produce senales de trading. Estas senales son validadas por el Backtesting Engine, cuyos resultados mejoran la base de conocimiento del sistema, cerrando el ciclo de aprendizaje.'),
    para('La plataforma esta construida sobre Next.js 16 con TypeScript, utilizando Prisma ORM con SQLite para persistencia y ClickHouse para analisis de big data, proporcionando una combinacion de velocidad de desarrollo y capacidad de procesamiento analitico a gran escala.'),
  ];
}

function chapter2() {
  return [
    heading1('Capitulo 2: Arquitectura de Datos'),
    heading2('Motor de Base de Datos Dual'),
    para('La plataforma utiliza una arquitectura de base de datos dual que optimiza para diferentes patrones de acceso:'),
    boldPara('ClickHouse: ', 'Motor de almacenamiento columnar para analisis OLAP a gran escala. Almacena series temporales de precios, volumenes, y metricas historicas. Permite consultas agregadas sobre millones de registros en milisegundos.'),
    boldPara('SQLite + Prisma: ', 'Base de datos relacional para datos operacionales y configuracion. Prisma ORM proporciona type-safety, migraciones automaticas, y una capa de abstraccion limpia sobre SQLite.'),
    heading2('Los 15 Modelos de Datos'),
    para('El esquema de base de datos consta de 15 modelos Prisma que cubren todas las entidades del sistema:'),
    makeTable(
      ['#', 'Modelo', 'Descripcion', 'Capa'],
      [
        ['1', 'Token', 'Datos multi-chain de tokens: precio, volumen, liquidez, market cap, cambios de precio en multiples ventanas temporales', 'Datos'],
        ['2', 'TokenDNA', 'Perfil enriquecido del token: scores de bot, smart money, retail, whale, probabilidad de wash trade, composicion de traders', 'Datos'],
        ['3', 'Trader', 'Perfil completo de wallet: clasificacion, metricas de rendimiento, comportamiento, portfolio, scores SM/Whale/Sniper', 'Inteligencia'],
        ['4', 'TraderTransaction', 'Transacciones individuales: hashes, montos, slippage, flags anti-MEV (frontrun, sandwich, wash, JIT)', 'Inteligencia'],
        ['5', 'WalletTokenHolding', 'Posiciones actuales por wallet: balance, valor USD, PnL no realizado, historial de compras/ventas', 'Inteligencia'],
        ['6', 'TraderBehaviorPattern', 'Patrones de comportamiento detectados: acumulador, dumper, scalper, momentum rider, etc.', 'Inteligencia'],
        ['7', 'CrossChainWallet', 'Vinculos entre wallets en diferentes chains: tipo de enlace, confianza, evidencia de bridge', 'Inteligencia'],
        ['8', 'TraderLabelAssignment', 'Etiquetas asignadas a wallets: fuente, confianza, evidencia, fecha de expiracion', 'Inteligencia'],
        ['9', 'Signal', 'Senales generadas para tokens: tipo, confianza, direccion, precio objetivo', 'Senales'],
        ['10', 'UserEvent', 'Eventos de usuario: posiciones abiertas, SL/TP, PnL realizado', 'Senales'],
        ['11', 'PatternRule', 'Reglas de patrones configuradas: condiciones, resultados de backtest, win rate', 'Senales'],
        ['12', 'PredictiveSignal', 'Senales predictivas del Big Data Engine: tipo, prediccion, confianza, evidencia, hit rate historico', 'Capa 0'],
        ['13', 'TradingSystem', 'Sistemas de trading: 5 capas de config, risk management, metricas de backtest, auto-optimizacion', 'Zona 1'],
        ['14', 'BacktestRun', 'Ejecuciones de backtest: modo, periodo, capital, resultados completos, metricas de riesgo, anti-overfitting', 'Zona 2'],
        ['15', 'BacktestOperation', 'Operaciones individuales del backtest: entrada, salida, PnL, MFE/MAE, contexto Big Data', 'Zona 2'],
      ],
      [5, 18, 55, 12]
    ),
  ];
}

function chapter3() {
  return [
    heading1('Capitulo 3: Capa 0 — Big Data Predictive Engine'),
    para('El Big Data Predictive Engine es la capa foundational de CryptoQuant Terminal. Su mision es analizar datos historicos y en tiempo real para detectar patrones y predecir eventos de mercado ANTES de que ocurran. Este motor alimenta a todos los sistemas de trading con contexto predictivo.'),
    heading2('Modulos Predictivos'),
    heading3('1. Deteccion de Regimen de Mercado'),
    para('Analiza el estado general del mercado utilizando un sistema de scoring ponderado que evalua cuatro dimensiones: Cruce de Medias Moviles (SMA20 vs SMA50, peso 30%), Distancia entre MAs (15%), Momentum via Rate of Change (25%), y Fuerza de Tendencia via R2 de regresion lineal (20%). Los regimenes detectados son: BULL (SMA20 > SMA50, momentum positivo), BEAR (SMA20 < SMA50, momentum negativo), SIDEWAYS (MAs planas, bajo momentum), y TRANSITION (senales conflictivas, probable cambio de regimen).'),
    heading3('2. Deteccion de Enjambres de Bots (Bot Swarm Detection)'),
    para('Detecta cuando multiples bots coordinan sus acciones en un evento tipo "enjambre". Utiliza el indice Herfindahl-Hirschman (HHI) para medir la concentracion de tipos de bots, analiza la proporcion bot/total, la velocidad de trading bot, y identifica grupos coordinados (3+ bots del mismo tipo). Retorna niveles de enjambre: NONE, LOW, MEDIUM, HIGH, CRITICAL basados en un score ponderado de 0 a 100.'),
    heading3('3. Prediccion de Movimientos de Ballenas'),
    para('Predice la direccion del movimiento de capital de ballenas basandose en: flujo neto (compra vs venta), patrones de tiempo de tenencia (acumuladores mantienen >24h), frecuencia de operaciones (acumulacion sigilosa = muchas operaciones pequenas con tenencia larga), y sincronizacion cross-wallet (coeficiente de variacion). Retorna: ACCUMULATING, DISTRIBUTING, NEUTRAL, o ROTATING con confianza y evidencia detallada.'),
    heading3('4. Deteccion de Anomalias'),
    para('Utiliza analisis Z-Score para detectar valores anomales comparando contra un baseline historico. Un valor se considera anomalo si |z-score| > umbral (default 2.0). El score de anomalia escala con la magnitud del z-score. Retorna score agregado y desglose por valor individual, con direccion (ABOVE/BELOW/NEUTRAL).'),
    heading3('5. Smart Money Positioning'),
    para('Analiza las posiciones de billeteras Smart Money para detectar hacia donde fluye el capital. Evalua: direccion neta (BUY vs SELL), magnitud del capital (USD), concentracion por token (destinos preferidos), y desglose por sector (MEME, DEFI, INFRASTRUCTURE, etc.). Retorna: INFLOW, OUTFLOW, o NEUTRAL con magnitud, destino principal, y confianza.'),
    heading3('6. Zonas de Reversion a la Media'),
    para('Identifica niveles de precio donde la reversion es probable usando Bandas de Bollinger (2sigma), desviacion actual de la media en desviaciones estandar, y analisis de percentil del bandwidth historico. La probabilidad de reversion aumenta con: distancia > 2sigma de la media, precio fuera de las bandas, y bandwidth en percentil alto. Retorna: limites superior/inferior, media, desviacion actual, y probabilidad de reversion.'),
    heading3('7. Deteccion de Drenaje de Liquidez'),
    para('Detecta cuando la liquidez esta siendo retirada del mercado. Utiliza regresion lineal de la serie de liquidez (pendiente negativa = drenaje), comparacion de tasa de cambio reciente vs historica, desviacion porcentual del baseline, y aceleracion (segunda derivada). Niveles: ACCUMULATING, STABLE, DRAINING, CRITICAL_DRAIN.'),
    heading2('Modelo PredictiveSignal'),
    codeBlock('model PredictiveSignal {'),
    codeBlock('  id              String   @id @default(cuid())'),
    codeBlock('  signalType      String   // REGIME_CHANGE, BOT_SWARM, WHALE_MOVEMENT,'),
    codeBlock('                           // LIQUIDITY_DRAIN, CORRELATION_BREAK, ANOMALY,'),
    codeBlock('                           // CYCLE_POSITION, SECTOR_ROTATION,'),
    codeBlock('                           // MEAN_REVERSION_ZONE, SMART_MONEY_POSITIONING,'),
    codeBlock('                           // VOLATILITY_REGIME'),
    codeBlock('  chain           String   @default("SOL")'),
    codeBlock('  tokenAddress    String?'),
    codeBlock('  sector          String?'),
    codeBlock('  prediction      String   @default("{}") // JSON'),
    codeBlock('  confidence      Float    @default(0)    // 0-1'),
    codeBlock('  timeframe       String   @default("1h")'),
    codeBlock('  validUntil      DateTime?'),
    codeBlock('  evidence        String   @default("[]") // JSON'),
    codeBlock('  historicalHitRate Float  @default(0)'),
    codeBlock('  dataPointsUsed  Int      @default(0)'),
    codeBlock('  wasCorrect      Boolean?'),
    codeBlock('  actualOutcome   String?  // JSON'),
    codeBlock('  createdAt       DateTime @default(now())'),
    codeBlock('  updatedAt       DateTime @updatedAt'),
    codeBlock('}'),
  ];
}

function chapter4() {
  const categories = [
    { name: 'Alpha Hunter', icon: '\uD83C\uDFAF', desc: 'Buscan retornos extremos en tokens recien creados. Alto riesgo, alto reward.', risk: 'EXTREMO', templates: 'Sniper Genesis, Meme Rocket, Bot Follower Alpha, New Listing Scalper' },
    { name: 'Smart Money', icon: '\uD83E\uDDE0', desc: 'Siguen al dinero inteligente. Baja frecuencia, alta conviccion.', risk: 'MEDIO', templates: 'Whale Tail, Smart Entry Mirror, Early Bird, SM Exit Detector' },
    { name: 'Technical', icon: '\uD83D\uDCCA', desc: 'Analisis tecnico potenciado con datos on-chain y Big Data.', risk: 'MEDIO', templates: 'Momentum Breakout, Mean Reversion, Trend Rider, V-Shape Recovery, Range Breakout' },
    { name: 'Defensive', icon: '\uD83D\uDEE1\uFE0F', desc: 'Proteccion de capital como prioridad. Win rate alto, retornos moderados.', risk: 'BAJO', templates: 'Rug Pull Avoider, Liquidity Guardian, Stable Yield, Capital Preserver, Drawdown Limiter' },
    { name: 'Bot Aware', icon: '\uD83E\uDD16', desc: 'Explotan o se protegen del comportamiento de bots.', risk: 'ALTO', templates: 'MEV Shadow, Anti-Sniper Shield, Wash Trade Filter, Bot Swarm Predictor' },
    { name: 'Deep Analysis', icon: '\uD83D\uDD2C', desc: 'Estrategias de profundidad con analisis multi-capa.', risk: 'MEDIO', templates: 'Fundamental Scanner, Holder Evolution, Cross-Chain Arbitrage, DEX Depth Analyzer, Long-Term Accumulation' },
    { name: 'Micro Structure', icon: '\u26A1', desc: 'Operan en micro-estructura: order flow, mempool, latencia.', risk: 'ALTO', templates: 'Mempool Sniper, Order Flow Imbalance, Gas Fee Predictor, Block Timing' },
    { name: 'Adaptive', icon: '\uD83D\uDD04', desc: 'Se adaptan automaticamente al regimen del mercado.', risk: 'MEDIO', templates: 'Regime Switcher, Volatility Adapter, Multi-Strategy Fusion, Self-Optimizer' },
  ];

  return [
    heading1('Capitulo 4: Zona 1 — Trading Systems Lab'),
    para('El Trading Systems Lab es el laboratorio central donde los usuarios configuran, personalizan y ejecutan sistemas de trading sistematico. Proporciona 30 plantillas preconstruidas que cubren desde alta frecuencia agresiva hasta estrategias defensivas de proteccion de capital.'),
    heading2('Las 8 Categorias de Sistemas'),
    makeTable(
      ['Icono', 'Categoria', 'Descripcion', 'Riesgo', 'Plantillas'],
      categories.map(c => [c.icon, c.name, c.desc, c.risk, c.templates]),
      [6, 14, 36, 9, 35]
    ),
    heading2('Arquitectura de 5 Capas'),
    para('Cada sistema de trading implementa una arquitectura modular de 5 capas que permite configuracion granular:'),
    boldPara('Capa 1 — Asset Filter: ', 'Define que tokens califican para el sistema. Incluye filtros de liquidez minima/maxima, market cap, holders, volumen 24h, edad del token, chains, tipos de token, score de rug, ratio de bots, y presencia de smart money.'),
    boldPara('Capa 2 — Phase Config: ', 'Configura que fases del ciclo de vida del token son validas para operar. Cada fase tiene un peso que determina la prioridad del sistema para tokens en esa fase. Permite excluidir fases incompatibles con la estrategia.'),
    boldPara('Capa 3 — Entry Signal: ', 'Define las condiciones que disparan la apertura de una posicion. Especifica tipo de senal, condiciones requeridas, confianza minima, necesidad de confirmacion en timeframes adicionales, indicadores técnicos, y umbrales especificos.'),
    boldPara('Capa 4 — Execution: ', 'Configura como se ejecuta la orden: tipo (MARKET, LIMIT, TWAP, DCA, ICEBERG), tolerancia a slippage, tamano maximo de posicion, niveles DCA, offsets de limit, tiempo en fuerza (GTC, IOC, FOK), y priority fees.'),
    boldPara('Capa 5 — Exit Signal: ', 'Define las condiciones de salida: stop loss, take profit, trailing stop con activacion, salida por tiempo, condiciones de salida personalizadas, salidas parciales en niveles de beneficio, y movimiento a breakeven.'),
    heading2('Las 7 Fases del Token'),
    para('Cada token pasa por un ciclo de vida con 7 fases distintas, cada una con caracteristicas de riesgo y comportamiento diferentes:'),
    makeTable(
      ['Fase', 'Edad', 'Riesgo', 'SL Recomendado', 'TP Recomendado', 'Estrategias Optimas'],
      [
        ['GENESIS', '< 6 horas', 'EXTREMO', '-5% a -10%', '30% a 100%', 'Sniper Genesis, Bot Follower Alpha, New Listing Scalper'],
        ['LAUNCH', '6h - 48h', 'MUY ALTO', '-8% a -12%', '25% a 50%', 'Meme Rocket, Smart Entry Mirror, MEV Shadow'],
        ['EARLY', '2d - 14d', 'ALTO', '-10% a -15%', '20% a 40%', 'Whale Tail, Early Bird, Momentum Breakout'],
        ['GROWTH', '14d - 60d', 'MEDIO', '-10% a -15%', '15% a 35%', 'Trend Rider, Mean Reversion, Smart Entry Mirror'],
        ['MATURE', '60d - 180d', 'BAJO-MEDIO', '-8% a -12%', '15% a 25%', 'Range Breakout, Stable Yield, Capital Preserver'],
        ['ESTABLISHED', '180d - 1 ano', 'BAJO', '-5% a -10%', '10% a 20%', 'Mean Reversion, Liquidity Guardian, Fundamental Scanner'],
        ['LEGACY', '> 1 ano', 'MUY BAJO', '-5% a -8%', '8% a 15%', 'Long-Term Accumulation, Drawdown Limiter, Risk Parity'],
      ],
      [12, 12, 10, 12, 12, 32]
    ),
    heading2('Los 8 Tipos de Operacion'),
    bulletPoint('LONG — Posicion larga clasica, beneficio si el precio sube'),
    bulletPoint('SHORT — Posicion corta, beneficio si el precio baja'),
    bulletPoint('LONG_SHORT — Estrategia market-neutral que combina larga y corta'),
    bulletPoint('SCALP — Operaciones muy cortas (minutos) capturando pequenos movimientos'),
    bulletPoint('SWING — Operaciones de dias a semanas capturando movimientos oscilantes'),
    bulletPoint('POSITION — Operaciones de largo plazo (semanas a meses) siguiendo tendencias'),
    bulletPoint('EXIT_ONLY — Sistema de solo salida, genera alertas de venta'),
    bulletPoint('HEDGE — Estrategia de cobertura para proteger posiciones existentes'),
    heading2('Modelo TradingSystem'),
    codeBlock('model TradingSystem {'),
    codeBlock('  id                String   @id @default(cuid())'),
    codeBlock('  name              String'),
    codeBlock('  description       String?'),
    codeBlock('  category          String   // ALPHA_HUNTER, SMART_MONEY, TECHNICAL,'),
    codeBlock('                             // DEFENSIVE, BOT_AWARE, DEEP_ANALYSIS,'),
    codeBlock('                             // MICRO_STRUCTURE, ADAPTIVE'),
    codeBlock('  icon              String   @default("\uD83C\uDFAF")'),
    codeBlock('  assetFilter       String   @default("{}")   // JSON'),
    codeBlock('  phaseConfig       String   @default("{}")   // JSON'),
    codeBlock('  entrySignal       String   @default("{}")   // JSON'),
    codeBlock('  executionConfig   String   @default("{}")   // JSON'),
    codeBlock('  exitSignal        String   @default("{}")   // JSON'),
    codeBlock('  bigDataContext    String   @default("{}")   // JSON'),
    codeBlock('  primaryTimeframe  String   @default("1h")'),
    codeBlock('  maxPositionPct    Float    @default(5)'),
    codeBlock('  maxOpenPositions  Int      @default(10)'),
    codeBlock('  stopLossPct       Float    @default(15)'),
    codeBlock('  takeProfitPct     Float    @default(40)'),
    codeBlock('  allocationMethod  String   @default("KELLY_MODIFIED")'),
    codeBlock('  isActive          Boolean  @default(false)'),
    codeBlock('  totalBacktests    Int      @default(0)'),
    codeBlock('  bestSharpe        Float    @default(0)'),
    codeBlock('  bestWinRate       Float    @default(0)'),
    codeBlock('  bestPnlPct        Float    @default(0)'),
    codeBlock('  autoOptimize      Boolean  @default(false)'),
    codeBlock('  optimizationMethod String? // GRID, WALK_FORWARD, BAYESIAN, GENETIC'),
    codeBlock('}'),
    heading2('Catalogo de 30 Plantillas'),
    para('Las 30 plantillas de sistema cubren todo el espectro de riesgo y estilos de trading:'),
    makeTable(
      ['#', 'Nombre', 'Icono', 'Categoria', 'Operacion'],
      [
        ['1', 'Sniper Genesis', '\uD83C\uDFAF', 'Alpha Hunter', 'SCALP'],
        ['2', 'Meme Rocket', '\uD83D\uDE80', 'Alpha Hunter', 'SWING'],
        ['3', 'Bot Follower Alpha', '\uD83E\uDD16', 'Alpha Hunter', 'SCALP'],
        ['4', 'New Listing Scalper', '\u26A1', 'Alpha Hunter', 'SCALP'],
        ['5', 'Whale Tail', '\uD83D\uDC33', 'Smart Money', 'SWING'],
        ['6', 'Smart Entry Mirror', '\uD83E\uDDE0', 'Smart Money', 'SWING'],
        ['7', 'Early Bird', '\uD83D\uDC26', 'Smart Money', 'SWING'],
        ['8', 'SM Exit Detector', '\uD83D\uDEAA', 'Smart Money', 'EXIT_ONLY'],
        ['9', 'Momentum Breakout', '\uD83D\uDCC8', 'Technical', 'SWING'],
        ['10', 'Mean Reversion', '\uD83D\uDCC9', 'Technical', 'SWING'],
        ['11', 'Trend Rider', '\uD83C\uDFC4', 'Technical', 'POSITION'],
        ['12', 'V-Shape Recovery', '\uD83D\uDCCA', 'Technical', 'SWING'],
        ['13', 'Range Breakout', '\uD83D\uDD13', 'Technical', 'SWING'],
        ['14', 'Rug Pull Avoider', '\uD83D\uDEE1\uFE0F', 'Defensive', 'EXIT_ONLY'],
        ['15', 'Liquidity Guardian', '\uD83D\uDD12', 'Defensive', 'POSITION'],
        ['16', 'Stable Yield', '\uD83D\uDCB0', 'Defensive', 'POSITION'],
        ['17', 'Capital Preserver', '\uD83C\uDFF4\uFE0F', 'Defensive', 'HEDGE'],
        ['18', 'Drawdown Limiter', '\uD83D\uDEE1\uFE0F', 'Defensive', 'HEDGE'],
        ['19', 'MEV Shadow', '\uD83D\uDC64', 'Bot Aware', 'SCALP'],
        ['20', 'Anti-Sniper Shield', '\uD83D\uDEE1\uFE0F', 'Bot Aware', 'HEDGE'],
        ['21', 'Wash Trade Filter', '\uD83D\uDD0D', 'Bot Aware', 'EXIT_ONLY'],
        ['22', 'Bot Swarm Predictor', '\uD83E\uDD16', 'Bot Aware', 'SCALP'],
        ['23', 'Fundamental Scanner', '\uD83D\uDD2C', 'Deep Analysis', 'POSITION'],
        ['24', 'Holder Evolution', '\uD83D\uDCCA', 'Deep Analysis', 'SWING'],
        ['25', 'Cross-Chain Arbitrage', '\u26A1', 'Deep Analysis', 'SCALP'],
        ['26', 'DEX Depth Analyzer', '\uD83D\uDCA0', 'Deep Analysis', 'SWING'],
        ['27', 'Long-Term Accumulation', '\uD83C\uDFAF', 'Deep Analysis', 'POSITION'],
        ['28', 'Mempool Sniper', '\u26A1', 'Micro Structure', 'SCALP'],
        ['29', 'Order Flow Imbalance', '\uD83D\uDCCA', 'Micro Structure', 'SCALP'],
        ['30', 'Regime Switcher', '\uD83D\uDD04', 'Adaptive', 'SWING'],
      ],
      [5, 22, 8, 18, 12]
    ),
  ];
}

function chapter5() {
  const methods = [
    { name: 'Fraccion Fija', icon: '\uD83D\uCD30', cat: 'BASIC' },
    { name: 'Ratio Fijo (Ryan Jones)', icon: '\uD83D\uDCCF', cat: 'BASIC' },
    { name: 'Objetivo de Volatilidad', icon: '\uD83C\uDF0A', cat: 'ADVANCED' },
    { name: 'Control de Drawdown Maximo', icon: '\uD83D\uDEE1\uFE0F', cat: 'ADVANCED' },
    { name: 'Peso Igualitario', icon: '\u2696\uFE0F', cat: 'BASIC' },
    { name: 'Media-Varianza (Markowitz)', icon: '\uD83D\uDCCA', cat: 'PORTFOLIO' },
    { name: 'Minima Varianza', icon: '\uD83D\uDCC9', cat: 'PORTFOLIO' },
    { name: 'Paridad de Riesgo', icon: '\uD83C\uDFAF', cat: 'PORTFOLIO' },
    { name: 'Asignacion por Puntuacion', icon: '\uD83C\uDFC6', cat: 'ADVANCED' },
    { name: 'Kelly Modificado', icon: '\uD83E\uDDEE', cat: 'ADVANCED' },
    { name: 'Asignacion por Regimen', icon: '\u2600\uFE0F', cat: 'ADAPTIVE' },
    { name: 'Asignacion por RL', icon: '\uD83E\uDD16', cat: 'ADAPTIVE' },
    { name: 'Meta-Asignacion', icon: '\uD83D\uDD00', cat: 'COMBINED' },
    { name: 'Dimensionamiento Adaptativo', icon: '\uD83D\uDCC8', cat: 'ADAPTIVE' },
    { name: 'Compuesto Personalizado', icon: '\uD83E\uDDE9', cat: 'COMBINED' },
    { name: 'Cantidad Fija', icon: '\uD83D\uDCB2', cat: 'BASIC' },
  ];

  return [
    heading1('Capitulo 5: Zona 2 — Backtesting Engine'),
    para('El Backtesting Engine es la capa de validacion de CryptoQuant Terminal. Permite simular estrategias sobre datos historicos, ejecutar paper trading en tiempo real, y realizar forward testing antes de comprometer capital real. Su diseno prioriza la precision estadistica y la proteccion contra overfitting.'),
    heading2('Los 3 Modos de Backtesting'),
    heading3('1. Historical (Historico)'),
    para('Simula operaciones sobre datos pasados. Es el modo principal para desarrollo y validacion de estrategias. Toma series temporales OHLCV y metricas on-chain por barra, aplica las senales de entrada/salida del sistema, simula ejecucion con slippage y fees, y calcula todas las metricas de rendimiento. Ideal para prototipado rapido y seleccion de estrategias candidatas.'),
    heading3('2. Paper Trading'),
    para('Ejecuta el sistema en tiempo real con capital virtual. Permite validar la estrategia en condiciones de mercado actuales sin riesgo financiero. Captura slippage real, latencia de ejecucion, y condiciones de mercado que no se reproducen en backtesting historico. Es el paso intermedio obligatorio entre backtest y forward testing.'),
    heading3('3. Forward Testing'),
    para('Combina datos historicos recientes con ejecucion en tiempo real. El sistema opera con una ventana de datos que incluye historia y presente, validando que las senales generadas en backtesting se mantienen validas en condiciones actuales. Es la prueba definitiva antes de activar el sistema con capital real.'),
    heading2('Los 16 Metodos de Asignacion de Capital'),
    para('El motor de backtesting soporta 16 metodologias de dimensionamiento de posiciones y asignacion de cartera, desde las mas simples hasta las mas avanzadas:'),
    makeTable(
      ['#', 'Icono', 'Metodo', 'Categoria'],
      methods.map((m, i) => [String(i + 1), m.icon, m.name, m.cat]),
      [5, 8, 55, 20]
    ),
    heading2('Optimizacion de Parametros'),
    para('El motor soporta cuatro metodos de optimizacion para encontrar los mejores parametros del sistema:'),
    boldPara('Grid Search: ', 'Exploracion exhaustiva de todas las combinaciones de parametros en una grilla definida. Garantiza encontrar el optimo global dentro de la grilla pero es computacionalmente costoso. Ideal para espacios de parametros pequenos.'),
    boldPara('Walk-Forward Analysis: ', 'Divide el periodo en ventanas de entrenamiento y prueba. Optimiza parametros en una ventana y valida en la siguiente, simulando uso real. El ratio walk-forward (rendimiento OOS / IS) es la metrica clave de robustez.'),
    boldPara('Bayesian Optimization: ', 'Utiliza procesos gaussianos para modelar la funcion objetivo y seleccionar inteligentemente los siguientes puntos a evaluar. Mas eficiente que Grid para espacios de alta dimension. Requiere menos evaluaciones para encontrar buenos parametros.'),
    boldPara('Genetic Algorithm: ', 'Evolucion de poblaciones de parametros mediante seleccion, cruce y mutacion. Eficiente para espacios no convexos con multiples optimos locales. Permite explorar el espacio de parametros de forma global con presupuesto computacional limitado.'),
    heading2('Proteccion Anti-Overfitting'),
    para('El motor implementa multiples mecanismos para detectar y mitigar el sobreajuste:'),
    bulletPoint('Score de Overfitting (0-1): Compara rendimiento de la primera mitad vs segunda mitad de operaciones. Degradacion grande sugiere sobreajuste.'),
    bulletPoint('Estabilidad de Parametros: Analiza consistencia de win rate en 4 ventanas temporales. Baja varianza = alta estabilidad = menos riesgo de sobreajuste.'),
    bulletPoint('Walk-Forward Ratio: Compara rendimiento in-sample vs out-of-sample. Ratio < 0.5 indica posible sobreajuste.'),
    bulletPoint('Parametros de Control en BacktestRun: inSampleScore, outOfSampleScore, walkForwardRatio permiten evaluacion cuantitativa.'),
    heading2('Modelo BacktestRun'),
    codeBlock('model BacktestRun {'),
    codeBlock('  id                String   @id @default(cuid())'),
    codeBlock('  systemId          String'),
    codeBlock('  mode              String   @default("HISTORICAL")'),
    codeBlock('  periodStart       DateTime'),
    codeBlock('  periodEnd         DateTime'),
    codeBlock('  initialCapital    Float'),
    codeBlock('  finalCapital      Float    @default(0)'),
    codeBlock('  totalPnl          Float    @default(0)'),
    codeBlock('  winRate           Float    @default(0)'),
    codeBlock('  sharpeRatio       Float    @default(0)'),
    codeBlock('  sortinoRatio      Float?'),
    codeBlock('  calmarRatio       Float?'),
    codeBlock('  maxDrawdown       Float    @default(0)'),
    codeBlock('  maxDrawdownPct    Float    @default(0)'),
    codeBlock('  profitFactor      Float    @default(0)'),
    codeBlock('  expectancy        Float    @default(0)'),
    codeBlock('  recoveryFactor    Float?'),
    codeBlock('  inSampleScore     Float?   // Anti-overfitting'),
    codeBlock('  outOfSampleScore  Float?   // Anti-overfitting'),
    codeBlock('  walkForwardRatio  Float?   // Anti-overfitting'),
    codeBlock('  status            String   @default("PENDING")'),
    codeBlock('}'),
    heading2('Modelo BacktestOperation'),
    codeBlock('model BacktestOperation {'),
    codeBlock('  id                String   @id @default(cuid())'),
    codeBlock('  backtestId        String'),
    codeBlock('  systemId          String'),
    codeBlock('  tokenAddress      String'),
    codeBlock('  tokenPhase        String   // GENESIS..LEGACY'),
    codeBlock('  operationType     String   // SCALP, SWING_LONG, DCA_ENTRY...'),
    codeBlock('  entryPrice        Float'),
    codeBlock('  entryTime         DateTime'),
    codeBlock('  exitPrice         Float?'),
    codeBlock('  exitTime          DateTime?'),
    codeBlock('  exitReason        String?  // TAKE_PROFIT, STOP_LOSS, TRAILING_STOP...'),
    codeBlock('  pnlUsd            Float?'),
    codeBlock('  pnlPct            Float?'),
    codeBlock('  holdTimeMin       Float?'),
    codeBlock('  maxFavorableExc   Float?   // MFE'),
    codeBlock('  maxAdverseExc     Float?   // MAE'),
    codeBlock('  capitalAllocPct   Float'),
    codeBlock('}'),
  ];
}

function chapter6() {
  return [
    heading1('Capitulo 6: Motor de Asignacion de Capital'),
    para('Este capitulo profundiza en los 16 metodos de asignacion de capital disponibles en CryptoQuant Terminal, con formulas detalladas y recomendaciones de uso.'),
    heading2('Metodos Basicos'),
    heading3('1. Fraccion Fija'),
    para('Arriesga un porcentaje fijo del capital en cada operacion. Formula: tamanoPosicion = (capital x riesgoPct) / stopLossPct. Si el capital es $10,000 y el riesgo es 1% con SL de 2%, se arriesgan $100 y el tamano de posicion es $5,000. Es el metodo mas sencillo y recomendado para principiantes.'),
    heading3('2. Ratio Fijo (Ryan Jones)'),
    para('Aumenta el tamano de posicion solo cuando el capital crece en una cantidad fija (delta). Formula: unidades = (-delta + sqrt(delta^2 + 4 x delta x capital)) / (2 x delta). Permite crecimiento acelerado en ganancias y protege en perdidas, ya que no se aumenta tamano hasta superar el umbral.'),
    heading3('3. Peso Igualitario'),
    para('Distribuye el capital equitativamente entre N activos: tamano = capital / N. Segun estudios academicos, frecuentemente supera a asignaciones mas complejas porque evita errores de estimacion en parametros estadisticos.'),
    heading3('4. Cantidad Fija'),
    para('Asigna una cantidad fija de dolares por operacion, independientemente del capital total. No escala con el crecimiento ni protege contra perdidas proporcionales. Util para cuentas pequenas o trading experimental.'),
    heading2('Metodos Avanzados'),
    heading3('5. Objetivo de Volatilidad'),
    para('Ajusta tamano inversamente proporcional a la volatilidad del activo. Formula: tamano = (volatilidadObjetivo / volatilidadActivo) x capital. Si un activo tiene el doble de volatilidad, recibe la mitad del tamano. Ideal para mantener perfil de riesgo constante.'),
    heading3('6. Control de Drawdown Maximo'),
    para('Reduce progresivamente el tamano conforme el drawdown se aproxima al limite. Formula: tamano = tamanoBase x (1 - drawdownActual / drawdownMaximo). Cuando DD es 0%, tamano completo; al acercarse al limite, tiende a cero.'),
    heading3('7. Asignacion por Puntuacion'),
    para('Dimensiona proporcionalmente a la puntuacion de senal (0-100). Formula: tamano = tamanoBase x (puntuacion / 100). Senal con score 80 recibe 80% del tamano base; score 40 solo 40%.'),
    heading3('8. Kelly Modificado (Fraccional)'),
    para('Criterio de Kelly con fraccion ajustable. Formula completa: f* = (p x b - q) / b, donde p = winRate, q = 1-p, b = avgWin/avgLoss. El Kelly completo maximiza crecimiento a largo plazo pero produce gran volatilidad. Se usa Kelly fraccional (tipicamente f/2 o "half-Kelly"). Con fraccion = 0.5 se obtiene ~75% del crecimiento optimo con ~50% menos de varianza.'),
    heading2('Optimizacion de Portfolio'),
    heading3('9. Media-Varianza (Markowitz MPT)'),
    para('Optimizacion clasica de Markowitz. Resuelve: max w\'u - lambda x w\'Sigma x w, sujeto a sum(wi) = 1. La solucion analitica es w* = (Sigma^-1 x u) / (1\' x Sigma^-1 x u). Requiere matriz de covarianza y vector de rendimientos esperados. Pilar de la teoria moderna de carteras, aunque sensible a errores de estimacion.'),
    heading3('10. Minima Varianza'),
    para('Minimiza varianza total sin considerar rendimiento esperado. Resuelve: min w\'Sigma x w sujeto a sum(wi) = 1. Solucion: w = Sigma^-1 x 1 / (1\' x Sigma^-1 x 1). Util cuando las estimaciones de rendimiento son poco fiables.'),
    heading3('11. Paridad de Riesgo'),
    para('Cada activo contribuye igualmente al riesgo total. Contribucion de riesgo del activo i: RCi = wi x (Sigma x w)i. Se igualan todas las contribuciones mediante algoritmo iterativo (Spinu 2013). Los activos menos volatiles reciben mayor asignacion. Popularizado por Ray Dalio y Bridgewater en su cartera "All Weather".'),
    heading2('Metodos Adaptativos'),
    heading3('12. Asignacion por Regimen'),
    para('Ajusta segun regimen de mercado (BULL, BEAR, SIDEWAYS, VOLATILE). En alcista se aumenta exposicion; en bajista se reduce. Pesos por defecto: BULL=80%, BEAR=20%, SIDEWAYS=40%, VOLATILE=30%. Permite adaptar la estrategia a condiciones macro.'),
    heading3('13. Asignacion por Aprendizaje por Refuerzo'),
    para('Utiliza Q-table simplificada donde cada estado del mercado mapea a un valor de asignacion. Estado se codifica combinando regimen, volatilidad y drawdown. Accion = argmax Q(s, a). Mapeo sigmoide: asignacion = 0.1 + 0.8 x sigmoid(Q-value). Version simplificada de RL para entornos sin simulacion completa.'),
    heading3('14. Dimensionamiento Adaptativo'),
    para('Aumenta tamano tras rachas de victorias, reduce tras derrotas. Tras k victorias: tamano = base x (1 + 0.05 x k). Tras k perdidas: tamano = base x (1 - 0.05 x k), minimo 25% del base. Captura la idea de "apostar con las ganancias" protegiendo en rachas negativas.'),
    heading2('Metodos Combinados'),
    heading3('15. Meta-Asignacion'),
    para('Distribuye capital entre multiples sistemas de trading basandose en rendimiento historico. Cada sistema recibe peso proporcional a su performance normalizada. Si Sistema A rinde 2x y B 1x, A recibe el doble. Diversifica entre estrategias, no solo activos.'),
    heading3('16. Compuesto Personalizado'),
    para('Combina multiples metodos con pesos personalizados: posicion = sum(wi x posi) / sum(wi). Permite combinar Kelly (50%) + Paridad de Riesgo (30%) + Volatilidad Objetivo (20%) para aprovechar fortalezas de cada enfoque y mitigar debilidades individuales.'),
  ];
}

function chapter7() {
  return [
    heading1('Capitulo 7: Deteccion de Fases del Token'),
    para('El sistema de deteccion de fases clasifica cada token en una de 7 etapas de su ciclo de vida, desde su creacion hasta su consolidacion como activo estable. Esta clasificacion es fundamental para seleccionar estrategias apropiadas y gestionar el riesgo.'),
    heading2('Las 7 Fases en Detalle'),
    heading3('GENESIS (< 6 horas)'),
    para('Fase inicial de un token. Liquidez minima ($5K-$50K), pocos holders (<100), volatilidad extrema. La mayoria de operadores son bots snipers y MEV extractores. Riesgo EXTREMO. Solo adecuado para sistemas Alpha Hunter con ejecucion automatizada. SL: -5% a -10%. TP: 30% a 100%. Hold time tipico: minutos a pocas horas.'),
    heading3('LAUNCH (6h - 48h)'),
    para('El token ha sobrevivido las primeras horas y esta en descubrimiento de precio. Liquidez creciente ($20K-$200K), holders aumentando. Bots todavia dominan pero aparece retail. Riesgo MUY ALTO. Estrategias: Meme Rocket, Smart Entry Mirror, MEV Shadow. SL: -8% a -12%. TP: 25% a 50%.'),
    heading3('EARLY (2d - 14d)'),
    para('El token ha demostrado cierta resiliencia. Liquidez estable ($50K-$500K), holders en crecimiento (100-500). Smart Money comienza a entrar. Riesgo ALTO. Estrategias: Whale Tail, Early Bird, Momentum Breakout. SL: -10% a -15%. TP: 20% a 40%.'),
    heading3('GROWTH (14d - 60d)'),
    para('Fase de crecimiento sostenido. Liquidez significativa ($100K-$2M), holders expandiendose (500-2000). Diversidad de traders. Riesgo MEDIO. Estrategias: Trend Rider, Mean Reversion, Smart Entry Mirror. SL: -10% a -15%. TP: 15% a 35%.'),
    heading3('MATURE (60d - 180d)'),
    para('Token consolidado con patron de precio estable. Liquidez alta ($500K+), holders consolidados (2000+). Patrones tecnicos mas fiables. Riesgo BAJO-MEDIO. Estrategias: Range Breakout, Stable Yield, Capital Preserver. SL: -8% a -12%. TP: 15% a 25%.'),
    heading3('ESTABLISHED (180d - 1 ano)'),
    para('Token bien establecido. Alta liquidez, muchos holders, patrones predecibles. Smart Money puede estar distribuyendo. Riesgo BAJO. Estrategias: Mean Reversion, Liquidity Guardian, Fundamental Scanner. SL: -5% a -10%. TP: 10% a 20%.'),
    heading3('LEGACY (> 1 ano)'),
    para('Token con historial largo. Comportamiento similar a activos tradicionales. Baja volatilidad relativa. Riesgo MUY BAJO. Estrategias: Long-Term Accumulation, Drawdown Limiter, Risk Parity. SL: -5% a -8%. TP: 8% a 15%.'),
    heading2('Matriz de Fases y Estrategias'),
    para('La siguiente tabla muestra que categorias de sistema son optimas para cada fase:'),
    makeTable(
      ['Fase', 'Alpha Hunter', 'Smart Money', 'Technical', 'Defensive', 'Bot Aware', 'Deep Analysis', 'Micro Structure', 'Adaptive'],
      [
        ['GENESIS', '\u2705', '\u274C', '\u274C', '\u274C', '\u2705', '\u274C', '\u2705', '\u274C'],
        ['LAUNCH', '\u2705', '\u2705', '\u274C', '\u274C', '\u2705', '\u274C', '\u2705', '\u274C'],
        ['EARLY', '\u274C', '\u2705', '\u2705', '\u274C', '\u2705', '\u2705', '\u274C', '\u2705'],
        ['GROWTH', '\u274C', '\u2705', '\u2705', '\u2705', '\u274C', '\u2705', '\u274C', '\u2705'],
        ['MATURE', '\u274C', '\u274C', '\u2705', '\u2705', '\u274C', '\u2705', '\u274C', '\u2705'],
        ['ESTABLISHED', '\u274C', '\u274C', '\u2705', '\u2705', '\u274C', '\u2705', '\u274C', '\u2705'],
        ['LEGACY', '\u274C', '\u274C', '\u274C', '\u2705', '\u274C', '\u2705', '\u274C', '\u2705'],
      ],
      [12, 11, 11, 11, 11, 11, 11, 11, 11]
    ),
  ];
}

function chapter8() {
  const templates = [
    { name: 'Sniper Genesis', cat: 'Alpha Hunter', desc: 'Entra en bloque 0-1 de tokens recien listados. Maxima velocidad, maximo riesgo. Ejecucion MARKET con IOC, SL -8%, TP 50%, trailing 15%.', params: 'maxAgeHours: 6, minLiquidity: $5K, SL: -8%, TP: 50%' },
    { name: 'Meme Rocket', cat: 'Alpha Hunter', desc: 'Detecta tokens meme con potencial viral antes del pump. Analiza velocidad de adopcion, social momentum y patrones de memes exitosos.', params: 'maxAgeHours: 72, minHolderGrowth: 1.5x, SL: -12%, TP: 40%' },
    { name: 'Bot Follower Alpha', cat: 'Alpha Hunter', desc: 'Copia operaciones de bots MEV rentables identificados. Aprovecha velocidad e informacion de bots que generan ganancias.', params: 'minBotWinrate: 60%, maxDelayBlocks: 2, SL: -10%, TP: 30%' },
    { name: 'New Listing Scalper', cat: 'Alpha Hunter', desc: 'Aprovecha volatilidad extrema de tokens recien listados en DEX. Entrada rapida, salida rapida.', params: 'maxAgeHours: 48, SL: -8%, TP: 25%, holdMax: 60min' },
    { name: 'Whale Tail', cat: 'Smart Money', desc: 'Detecta patrones de acumulacion de ballenas. Entra en misma direccion esperando movimiento alcista posterior.', params: 'minWhaleCount: 2, minNetFlow: $10K, SL: -15%, TP: 35%' },
    { name: 'Smart Entry Mirror', cat: 'Smart Money', desc: 'Replica entradas de billeteras Smart Money verificadas. Con confirmacion multi-senal.', params: 'minSMWalletScore: 70, SL: -15%, TP: 40%, timeframe: 1h' },
    { name: 'Early Bird', cat: 'Smart Money', desc: 'Identifica tokens donde SM acaba de entrar. Rapido antes de que precio refleje nueva demanda.', params: 'maxHoursSinceSMEntry: 4, SL: -12%, TP: 35%' },
    { name: 'SM Exit Detector', cat: 'Smart Money', desc: 'Detecta cuando Smart Money sale. Sistema solo salida que genera alertas y puede abrir cortos.', params: 'minSMExiting: 2, SL: -8%, TP: 15%, mode: EXIT_ONLY' },
    { name: 'Momentum Breakout', cat: 'Technical', desc: 'Rupturas de niveles clave con confirmacion de volumen. Combina TA clasico con on-chain para filtrar falsas rupturas.', params: 'volumeMultiplier: 2x, rsiMax: 75, SL: -10%, TP: 30%' },
    { name: 'Mean Reversion', cat: 'Technical', desc: 'Opera retornos a la media tras sobre-reacciones. Cuando precio desvia significativamente de su media.', params: 'zScoreMin: -2, bollingerPercentBMax: 0.1, SL: -8%, TP: 20%' },
    { name: 'Trend Rider', cat: 'Technical', desc: 'Sigue tendencia predominante con trailing stop. Entra en pullbacks dentro de tendencia establecida.', params: 'smaCrossover: required, trailingStop: 8%, maxPullback: 5%' },
    { name: 'V-Shape Recovery', cat: 'Technical', desc: 'Detecta recuperaciones en V tras caidas bruscas. Venta masiva seguida de compra agresiva.', params: 'minDropPct: 15%, recoveryStartPct: 5%, SL: -10%, TP: 25%' },
    { name: 'Range Breakout', cat: 'Technical', desc: 'Rupturas de rangos laterales con volumen. Token consolida y rompe en direccion del breakout.', params: 'minRangeDuration: 24h, minBreakoutVol: 2x, SL: -8%, TP: 20%' },
    { name: 'Rug Pull Avoider', cat: 'Defensive', desc: 'Detecta senales de rug pull inminente y protege posiciones. Monitorea liquidez, holders, y patrones de creador.', params: 'mode: EXIT_ONLY, liquidityThreshold: dynamic' },
    { name: 'Liquidity Guardian', cat: 'Defensive', desc: 'Monitorea niveles de liquidez y protege contra drenaje. Cierra posiciones si liquidez cae bajo umbral.', params: 'minLiquidityPct: 70% of baseline, trailingStop: 5%' },
    { name: 'Stable Yield', cat: 'Defensive', desc: 'Busca retornos estables en tokens establecidos. Win rate alto, retornos moderados, baja volatilidad.', params: 'minMarketCap: $1M, minHolders: 500, SL: -5%, TP: 10%' },
    { name: 'Capital Preserver', cat: 'Defensive', desc: 'Maxima proteccion de capital. Solo opera en condiciones de alta certeza. Cash reserve elevado.', params: 'maxPositionPct: 2%, cashReserve: 40%, SL: -3%' },
    { name: 'Drawdown Limiter', cat: 'Defensive', desc: 'Limita el drawdown maximo del portfolio. Reduce posiciones conforme se acerca al limite.', params: 'maxDrawdown: 10%, positionScaleWithDD: true' },
    { name: 'MEV Shadow', cat: 'Bot Aware', desc: 'Opera a la sombra de bots MEV, siguiendo sus movimientos sin ser victimado. Analiza patrones de MEV.', params: 'mevTracking: active, SL: -8%, TP: 20%' },
    { name: 'Anti-Sniper Shield', cat: 'Bot Aware', desc: 'Protege contra bots snipers que operan contra usuarios retail. Detecta y evita tokens con alta actividad sniper.', params: 'maxSniperPct: 30%, SL: -5%, mode: HEDGE' },
    { name: 'Wash Trade Filter', cat: 'Bot Aware', desc: 'Filtra tokens con alta probabilidad de wash trading. Evita volumen artificial y metricas infladas.', params: 'maxWashTradeProb: 0.2, mode: EXIT_ONLY' },
    { name: 'Bot Swarm Predictor', cat: 'Bot Aware', desc: 'Predice cuando un enjambre de bots atacara un token. Permite posicionarse antes o protegerse.', params: 'swarmThreshold: HIGH, SL: -10%, TP: 25%' },
    { name: 'Fundamental Scanner', cat: 'Deep Analysis', desc: 'Analisis fundamental multi-capa: holders, desarrolladores, tokenomics, distribucion, y actividad on-chain.', params: 'minHolderGrowth: 1.2x, timeframe: 1d, SL: -12%' },
    { name: 'Holder Evolution', cat: 'Deep Analysis', desc: 'Rastrea la evolucion de holders a lo largo del tiempo. Detecta acumulacion y distribucion por patrones de holders.', params: 'holderTrendWindow: 7d, SL: -10%, TP: 25%' },
    { name: 'Cross-Chain Arbitrage', cat: 'Deep Analysis', desc: 'Detecta y explota diferencias de precio del mismo token en diferentes chains y DEXes.', params: 'minSpreadPct: 0.5%, maxHoldTime: 5min, SL: -1%' },
    { name: 'DEX Depth Analyzer', cat: 'Deep Analysis', desc: 'Analiza la profundidad del orderbook en DEXes para identificar soportes y resistencias basados en liquidez.', params: 'depthLevels: 10, SL: -8%, TP: 20%' },
    { name: 'Long-Term Accumulation', cat: 'Deep Analysis', desc: 'Acumulacion sistematica a largo plazo mediante DCA en tokens de alta calidad. Enfoque de inversion, no trading.', params: 'dcaInterval: weekly, SL: none, timeframe: 1w' },
    { name: 'Mempool Sniper', cat: 'Micro Structure', desc: 'Opera basandose en transacciones pendientes en el mempool. Detecta grandes swaps antes de ejecutarse.', params: 'maxLatencyMs: 100, SL: -5%, TP: 15%' },
    { name: 'Order Flow Imbalance', cat: 'Micro Structure', desc: 'Detecta desequilibrios en order flow que preceden movimientos de precio. Analiza presion compradora/vendedora.', params: 'imbalanceThreshold: 3:1, SL: -5%, TP: 12%' },
    { name: 'Regime Switcher', cat: 'Adaptive', desc: 'Cambia automaticamente entre estrategias optimas segun el regimen de mercado detectado. BULL, BEAR, SIDEWAYS.', params: 'regimeCheckInterval: 4h, autoSwitch: true' },
  ];

  return [
    heading1('Capitulo 8: Sistemas de Trading — Catalogo Completo'),
    para('Este capitulo presenta el catalogo completo de las 30 plantillas de sistemas de trading disponibles en CryptoQuant Terminal, organizadas por categoria con descripcion detallada y parametros recomendados.'),
    ...templates.map((t, i) => [
      heading3(`${i + 1}. ${t.name} [${t.cat}]`),
      para(t.desc),
      boldPara('Parametros recomendados: ', t.params),
      emptyLine(),
    ]).flat(),
  ];
}

function chapter9() {
  return [
    heading1('Capitulo 9: Motor de Backtesting — Metricas'),
    para('El motor de backtesting calcula un conjunto completo de metricas de rendimiento que permiten evaluar objetivamente la calidad de cada sistema de trading. Todas las metricas se calculan con formulas reales, sin valores aleatorios.'),
    heading2('Metricas de Rendimiento'),
    heading3('Sharpe Ratio'),
    para('Mide el rendimiento ajustado por riesgo. Formula: Sharpe = (mediaRetornos - tasaLibreRiesgo) / desviacionEstandar(retornos). Anualizado asumiendo 365 periodos/ano para crypto. Sharpe > 1 es bueno, > 2 es excelente. Penaliza tanto volatilidad positiva como negativa.'),
    heading3('Sortino Ratio'),
    para('Similar al Sharpe pero solo penaliza volatilidad negativa. Formula: Sortino = (mediaRetornos - tasaLibreRiesgo) / desviacionDownside. La desviacion downside solo considera retornos por debajo de la tasa libre de riesgo. Preferido al Sharpe porque no penaliza ganancias por encima de lo esperado.'),
    heading3('Calmar Ratio'),
    para('Relacion entre rendimiento anualizado y maximo drawdown. Formula: Calmar = retornoAnualizado / |maxDrawdownPct|. Tipicamente calculado en ventana de 3 anos. Calmar > 1 es aceptable, > 3 es excelente. Mide la eficiencia del retorno respecto al peor escenario.'),
    heading3('Max Drawdown'),
    para('La mayor caida desde un pico hasta un valle en la curva de equity. Se calcula recorriendo la curva y rastreando el pico maximo: drawdown = (pico - equityActual) / pico. Es la metrica de riesgo mas importante porque indica la peor perdida posible desde una maxima. Tambien se registra el punto de recuperacion.'),
    heading2('Metricas de Trading'),
    heading3('Profit Factor'),
    para('Ratio entre ganancias brutas y perdidas brutas. Formula: PF = gananciaBruta / |perdidaBruta|. PF > 1 indica rentabilidad, > 2 es excelente, > 3 es excepcional. Un PF de 2 significa que por cada dolar perdido se ganan dos.'),
    heading3('Expectancy'),
    para('Valor esperado por operacion. Formula: E = (winRate x avgWin) + ((1 - winRate) x avgLoss). Expectancy positiva significa que el sistema tiene ventaja estadistica. Si E = $50, se espera ganar $50 por operacion en promedio.'),
    heading3('Recovery Factor'),
    para('Eficiencia de recuperacion tras drawdowns. Formula: RF = beneficioNeto / |maxDrawdown|. RF > 1 significa que el beneficio neto supera el peor drawdown. RF alto indica que el sistema se recupera rapidamente de perdidas.'),
    heading3('Win Rate'),
    para('Porcentaje de operaciones ganadoras. Formula: WR = operacionesGanadoras / totalOperaciones. Win rate solo es significativo combinado con risk-reward ratio. Un sistema con 40% WR y R:R de 3:1 es rentable; uno con 70% WR y R:R de 0.5:1 puede no serlo.'),
    heading3('Alpha vs Benchmark'),
    para('Exceso de rendimiento sobre un benchmark de referencia. Formula: Alpha = retornoEstrategia - retornoBenchmark. Alpha positivo indica que el sistema genera valor mas alla del movimiento general del mercado. En crypto, el benchmark tipico es el retorno de BTC o un indice del sector.'),
    heading2('Metricas Anti-Overfitting'),
    heading3('Overfitting Score (0-1)'),
    para('Estimado comparando rendimiento de la primera mitad vs segunda mitad de operaciones. Degradacion grande de win rate o PnL promedio entre mitades sugiere sobreajuste a datos historicos. Score cercano a 0 indica robustez; cercano a 1 indica probable sobreajuste.'),
    heading3('Parameter Stability (0-1)'),
    para('Mide consistencia de retornos en 4 ventanas temporales. Se calcula el win rate en cada ventana y se mide la desviacion estandar. Baja desviacion = alta estabilidad = sistema robusto. Estabilidad > 0.8 es deseable.'),
    heading2('Tabla de Referencia Rapida'),
    makeTable(
      ['Metrica', 'Formula', 'Bueno', 'Excelente', 'Interpretacion'],
      [
        ['Sharpe', '(R - Rf) / sigma', '> 1.0', '> 2.0', 'Retorno ajustado por riesgo total'],
        ['Sortino', '(R - Rf) / sigmaDown', '> 1.5', '> 3.0', 'Retorno ajustado por riesgo negativo'],
        ['Calmar', 'Ranual / |MaxDD|', '> 1.0', '> 3.0', 'Retorno vs peor caida'],
        ['Profit Factor', 'Ganancia / |Perdida|', '> 1.5', '> 2.0', 'Eficiencia bruta del sistema'],
        ['Expectancy', 'WR x W + (1-WR) x L', '> $0', '> $50', 'Valor esperado por operacion'],
        ['Recovery Factor', 'PnL / |MaxDD|', '> 1.0', '> 3.0', 'Capacidad de recuperacion'],
        ['Win Rate', 'Wins / Total', '> 40%', '> 60%', 'Frecuencia de aciertos'],
        ['Alpha', 'R - Rbenchmark', '> 0%', '> 10%', 'Valor agregado vs mercado'],
      ],
      [14, 22, 12, 12, 30]
    ),
  ];
}

function chapter10() {
  return [
    heading1('Capitulo 10: Feedback Loop'),
    para('El Feedback Loop es el mecanismo central de mejora continua de CryptoQuant Terminal. Los resultados de backtesting no son solo reportes pasivos sino que retroalimentan activamente la base de datos para mejorar iterativamente las estrategias y el motor predictivo.'),
    heading2('Ciclo de Aprendizaje Big Data'),
    heading3('1. Generacion de Resultados'),
    para('Cada backtest genera un BacktestRun con metricas completas y un conjunto de BacktestOperations que documentan cada operacion simulada, incluyendo contexto de mercado, fase del token, y condiciones de entrada/salida.'),
    heading3('2. Almacenamiento y Comparacion'),
    para('Los resultados se almacenan en la base de datos y se comparan con ejecuciones anteriores del mismo sistema. Si un nuevo set de parametros produce mejor Sharpe, mejor win rate, o mejor PnL, los campos bestSharpe, bestWinRate, y bestPnlPct del TradingSystem se actualizan automaticamente.'),
    heading3('3. Auto-Optimizacion'),
    para('Los sistemas con autoOptimize = true ejecutan optimizaciones automaticas segun la frecuencia configurada (DAILY, WEEKLY, MONTHLY). El motor de optimizacion busca mejores parametros usando el metodo seleccionado (GRID, WALK_FORWARD, BAYESIAN, GENETIC) y actualiza la configuracion del sistema si los resultados out-of-sample superan los actuales.'),
    heading3('4. Retroalimentacion al Big Data Engine'),
    para('Las operaciones de backtest incluyen snapshots del contexto Big Data en el momento de cada operacion (tokenDnaSnapshot, traderComposition, bigDataContext). Esto permite:'),
    bulletPoint('Validar la precision de las senales predictivas comparando predicciones con resultados reales'),
    bulletPoint('Actualizar el historicalHitRate de las senales predictivas'),
    bulletPoint('Mejorar los modelos de deteccion de regimen, whale movement, y bot swarm'),
    bulletPoint('Identificar condiciones de mercado donde el sistema rinde mejor/peor (phaseResults, timeframeResults)'),
    heading3('5. Derivacion de Sistemas'),
    para('Los sistemas pueden derivar sistemas hijos (parentSystemId) con parametros ajustados. Si un sistema rinde bien en fase GROWTH pero mal en EARLY, se puede crear un derivado optimizado para GROWTH, manteniendo el padre como referencia.'),
    heading3('6. Cierre del Ciclo'),
    para('Los campos wasCorrect y actualOutcome del modelo PredictiveSignal permiten evaluar la precision de las predicciones del Big Data Engine. Esta evaluacion alimenta de vuelta al motor para ajustar pesos, umbrales, y modelos, cerrando el ciclo de aprendizaje continuo.'),
    heading2('Flujo Visual del Feedback Loop'),
    para('Datos On-Chain -> Big Data Engine (Predicciones) -> Trading Systems Lab (Senales) -> Backtesting Engine (Validacion) -> Resultados -> Base de Datos -> Mejora de Predicciones -> [Ciclo se repite]'),
    para('Este ciclo garantiza que la plataforma mejore continuamente con cada backtest ejecutado, cada senal validada, y cada operacion registrada. Cuantos mas datos se procesan, mas precisas se vuelven las predicciones, y mas rentables los sistemas de trading.'),
  ];
}

function chapter11() {
  const models = [
    { name: 'Token', fields: 'id, symbol, name, address, chain, priceUsd, volume24h, liquidity, marketCap, priceChange5m/15m/1h/24h, dexId, pairAddress, dex, pairUrl, holderCount, uniqueWallets24h, botActivityPct, smartMoneyPct, createdAt, updatedAt' },
    { name: 'TokenDNA', fields: 'id, tokenId, liquidityDNA, walletDNA, topologyDNA, riskScore, botActivityScore, smartMoneyScore, retailScore, whaleScore, washTradeProb, sniperPct, mevPct, copyBotPct, traderComposition, topWallets, createdAt' },
    { name: 'Trader', fields: 'id, address, chain, ensName, solName, primaryLabel, subLabels, labelConfidence, isBot, botType, botConfidence, botDetectionSignals, totalTrades, winRate, avgPnl, totalPnl, avgHoldTimeMin, sharpeRatio, profitFactor, smartMoneyScore, whaleScore, sniperScore, ...' },
    { name: 'TraderTransaction', fields: 'id, traderId, txHash, blockNumber, blockTime, chain, dex, action, tokenAddress, tokenSymbol, quoteToken, amountIn, amountOut, priceUsd, valueUsd, slippageBps, pnlUsd, isFrontrun, isSandwich, isWashTrade, isJustInTime, pairedTxHash, gasUsed, priorityFee, ...' },
    { name: 'WalletTokenHolding', fields: 'id, traderId, tokenAddress, tokenSymbol, chain, balance, valueUsd, avgEntryPrice, unrealizedPnl, unrealizedPnlPct, firstBuyAt, lastTradeAt, buyCount, sellCount, totalBoughtUsd, totalSoldUsd, updatedAt' },
    { name: 'TraderBehaviorPattern', fields: 'id, traderId, pattern, confidence, dataPoints, firstObserved, lastObserved, metadata' },
    { name: 'CrossChainWallet', fields: 'id, primaryWalletId, linkedWalletId, primaryChain, linkedChain, linkedAddress, linkType, linkConfidence, evidence, bridgeTxCount, totalBridgedUsd, createdAt' },
    { name: 'TraderLabelAssignment', fields: 'id, traderId, label, source, confidence, evidence, assignedAt, expiresAt' },
    { name: 'Signal', fields: 'id, type, tokenId, confidence, priceTarget, direction, description, metadata, createdAt' },
    { name: 'UserEvent', fields: 'id, eventType, tokenId, walletAddress, entryPrice, stopLoss, takeProfit, pnl, createdAt' },
    { name: 'PatternRule', fields: 'id, name, conditions, isActive, backtestResults, winRate, occurrences, createdAt' },
    { name: 'PredictiveSignal', fields: 'id, signalType, chain, tokenAddress, sector, prediction, confidence, timeframe, validUntil, evidence, historicalHitRate, dataPointsUsed, wasCorrect, actualOutcome, createdAt, updatedAt' },
    { name: 'TradingSystem', fields: 'id, name, description, category, icon, assetFilter, phaseConfig, entrySignal, executionConfig, exitSignal, bigDataContext, primaryTimeframe, confirmTimeframes, maxPositionPct, maxOpenPositions, stopLossPct, takeProfitPct, trailingStopPct, cashReservePct, allocationMethod, allocationConfig, isActive, isPaperTrading, version, parentSystemId, autoOptimize, optimizationMethod, optimizationFreq, totalBacktests, bestSharpe, bestWinRate, bestPnlPct, avgHoldTimeMin, createdAt, updatedAt' },
    { name: 'BacktestRun', fields: 'id, systemId, mode, periodStart, periodEnd, initialCapital, capitalAllocation, allocationMethod, finalCapital, totalPnl, totalPnlPct, annualizedReturn, benchmarkReturn, alpha, totalTrades, winTrades, lossTrades, winRate, avgWin, avgLoss, profitFactor, expectancy, maxDrawdown, maxDrawdownPct, sharpeRatio, sortinoRatio, calmarRatio, recoveryFactor, phaseResults, timeframeResults, operationTypeResults, allocationMethodResults, optimizationEnabled, optimizationMethod, bestParameters, inSampleScore, outOfSampleScore, walkForwardRatio, status, progress, startedAt, completedAt, errorLog, createdAt' },
    { name: 'BacktestOperation', fields: 'id, backtestId, systemId, tokenAddress, tokenSymbol, chain, tokenPhase, tokenAgeMinutes, marketConditions, tokenDnaSnapshot, traderComposition, bigDataContext, operationType, timeframe, entryPrice, entryTime, entryReason, exitPrice, exitTime, exitReason, quantity, positionSizeUsd, pnlUsd, pnlPct, holdTimeMin, maxFavorableExc, maxAdverseExc, capitalAllocPct, allocationMethodUsed, createdAt' },
  ];

  return [
    heading1('Capitulo 11: Modelos de Base de Datos'),
    para('Este capitulo presenta el esquema completo de Prisma para los 15 modelos de datos de CryptoQuant Terminal. Todos los modelos utilizan SQLite como motor de persistencia con Prisma ORM como capa de abstraccion.'),
    heading2('Esquema Prisma Completo'),
    para('El esquema utiliza las siguientes convenciones: IDs generados con cuid(), timestamps automaticos (createdAt, updatedAt), campos JSON para configuracion flexible, y relaciones tipadas entre modelos.'),
    ...models.map(m => [
      heading3(`Model: ${m.name}`),
      makeTable(
        ['Campo(s)'],
        [m.fields.split(', ').map(f => f).join('\n') ? [m.fields] : ['N/A']],
        [100]
      ),
      emptyLine(),
    ]).flat(),
    heading2('Relaciones entre Modelos'),
    bulletPoint('Token 1:1 TokenDNA — Cada token tiene un perfil DNA unico'),
    bulletPoint('Token 1:N Signal — Un token puede tener multiples senales'),
    bulletPoint('Trader 1:N TraderTransaction — Historial completo de transacciones'),
    bulletPoint('Trader 1:N WalletTokenHolding — Posiciones actuales'),
    bulletPoint('Trader 1:N TraderBehaviorPattern — Patrones de comportamiento'),
    bulletPoint('Trader 1:N CrossChainWallet — Vinculos cross-chain'),
    bulletPoint('Trader 1:N TraderLabelAssignment — Etiquetas asignadas'),
    bulletPoint('TradingSystem 1:N BacktestRun — Historial de backtests'),
    bulletPoint('TradingSystem 1:N BacktestOperation — Operaciones de backtest'),
    bulletPoint('TradingSystem ?->1 TradingSystem — Derivacion de sistemas (parentSystemId)'),
    bulletPoint('BacktestRun 1:N BacktestOperation — Operaciones de cada ejecucion'),
  ];
}

function chapter12() {
  const routes = [
    ['GET', '/api', 'Estado general de la API'],
    ['GET', '/api/dashboard/stats', 'Estadisticas del dashboard principal'],
    ['GET', '/api/tokens', 'Lista de tokens con filtros y paginacion'],
    ['GET', '/api/tokens/[id]', 'Detalle de un token especifico'],
    ['GET', '/api/signals', 'Lista de senales generadas'],
    ['GET', '/api/signals/[id]', 'Detalle de una senal especifica'],
    ['GET', '/api/predictive', 'Senales predictivas del Big Data Engine'],
    ['GET', '/api/traders', 'Lista de traders con filtros'],
    ['GET', '/api/traders/[id]', 'Perfil completo de un trader'],
    ['GET', '/api/traders/search', 'Busqueda de traders por criterios'],
    ['GET', '/api/traders/leaderboard', 'Ranking de traders por rendimiento'],
    ['GET', '/api/traders/bots', 'Lista de traders identificados como bots'],
    ['GET', '/api/wallets', 'Lista de wallets rastreadas'],
    ['GET', '/api/patterns', 'Reglas de patrones configuradas'],
    ['POST', '/api/patterns/[id]/backtest', 'Ejecutar backtest de un patron'],
    ['GET', '/api/trading-systems', 'Lista de sistemas de trading'],
    ['GET', '/api/trading-systems/templates', 'Lista de 30 plantillas predefinidas'],
    ['GET', '/api/trading-systems/[id]', 'Detalle de un sistema de trading'],
    ['POST', '/api/trading-systems/[id]/activate', 'Activar/desactivar un sistema'],
    ['POST', '/api/backtest', 'Crear nueva ejecucion de backtest'],
    ['GET', '/api/backtest/[id]', 'Resultado de una ejecucion de backtest'],
    ['POST', '/api/backtest/[id]/run', 'Ejecutar un backtest existente'],
    ['POST', '/api/capital-allocation', 'Calcular asignacion de capital'],
    ['GET', '/api/user-events', 'Eventos de usuario'],
    ['GET', '/api/user-events/heatmap', 'Datos de heatmap de actividad'],
    ['GET', '/api/market/stream', 'Stream WebSocket de datos de mercado'],
  ];

  return [
    heading1('Capitulo 12: API Routes'),
    para('La API REST de CryptoQuant Terminal esta construida sobre Next.js App Router con route handlers tipados. Todos los endpoints retornan JSON y siguen convenciones RESTful. A continuacion se listan los 26 endpoints disponibles organizados por dominio funcional.'),
    heading2('Endpoints de la API'),
    makeTable(
      ['Metodo', 'Ruta', 'Descripcion'],
      routes,
      [10, 40, 50]
    ),
    heading2('Convenciones'),
    bulletPoint('Todas las rutas estan prefijadas con /api'),
    bulletPoint('Los endpoints GET soportan query parameters para filtros y paginacion'),
    bulletPoint('Los endpoints POST aceptan JSON en el body de la request'),
    bulletPoint('Las respuestas siguen el formato: { success: boolean, data?: T, error?: string }'),
    bulletPoint('El stream de mercado utiliza WebSocket para datos en tiempo real'),
    bulletPoint('La autenticacion se gestiona via headers Authorization (JWT)'),
  ];
}

function chapter13() {
  return [
    heading1('Capitulo 13: Pipeline de Ingestion de Datos'),
    para('El pipeline de ingestion de datos es el componente que conecta CryptoQuant Terminal con las fuentes de datos on-chain y off-chain. Implementa clientes para 5 fuentes principales de datos, cada uno optimizado para un tipo especifico de informacion.'),
    heading2('DexScreener'),
    para('API multi-chain que proporciona datos de pares en DEXes. Incluye precios, volumenes, liquidez, market cap, y metadata de pares. Funcionalidades: busqueda de tokens por nombre/simbolo, obtencion de datos por chain y direccion, tokens trending, pares por DEX, y tokens boosted. Cobertura: Solana, Ethereum, Base, Arbitrum, BSC, y mas.'),
    heading2('Birdeye'),
    para('API de datos de mercado que proporciona feeds de precios, datos OHLCV, listas de tokens, historial de transacciones de wallet, y nuevos listados. Soporta multiples timeframes OHLCV (1m, 3m, 5m, 15m, 30m, 1H, 4H, 1D). Ideal para construir series temporales de precios y analizar patrones historicos.'),
    heading2('Jupiter'),
    para('Agregador de swaps en Solana. Proporciona cotizaciones de swap en tiempo real y lista de tokens verificados. Utilizado para: estimar slippage real en ejecuciones, obtener rutas de swap optimas, y acceder a la lista de tokens estrictamente verificados de Jupiter.'),
    heading2('Solana RPC'),
    para('Conexion directa al nodo Solana mainnet-beta. Metodos: getAccountInfo, getSignaturesForAddress, getTransaction, getSlot, y WebSocket para suscripciones en tiempo real. Proporciona datos a nivel de bloque y transaccion, incluyendo instrucciones parseadas, fees de prioridad, y logs.'),
    heading2('Ethereum RPC'),
    para('Conexion directa a nodos Ethereum. Metodos: eth_getTransactionCount, eth_getTransactionByHash, eth_getTransactionReceipt, eth_getBlockNumber, eth_getLogs. Complementado con Etherscan API para historial completo de transacciones. Utilizado para tracking cross-chain y analisis de wallets Ethereum.'),
    heading2('Orquestador del Pipeline'),
    para('La clase DataIngestionPipeline orquesta todos los clientes y proporciona metodos de alto nivel: syncTokenData (sincroniza tokens desde DexScreener + Birdeye), getWalletHistory (historial cross-chain), searchTokens (busqueda multi-fuente), y getNewListings (nuevos listados). El pipeline maneja rate limits, reintentos, y normalizacion de datos automaticamente.'),
  ];
}

function chapter14() {
  return [
    heading1('Capitulo 14: Deteccion de Bots'),
    para('El motor de deteccion de bots clasifica wallets como bots basandose en senales de comportamiento. Soporta la deteccion de 8 tipos de bots distintos, cada uno con su propio detector especializado.'),
    heading2('Las 8 Senales de Deteccion'),
    heading3('1. MEV Extractor (Peso: 0.35)'),
    para('Detecta patrones de extraccion de Maximum Extractable Value. Indicadores: priority fees altos (>$100), frontrun count > 5, MEV extraido > $500, y consistencia alta (>0.8). Los extractores MEV son los bots mas sofisticados y lucrativos del ecosistema.'),
    heading3('2. Sniper Bot (Peso: 0.30)'),
    para('Detecta sniping automatico al lanzamiento de tokens. Indicadores: entradas en bloque 0 (>3), avgBlockToTrade < 2, hold time muy corto (<30 min), y actividad 24/7. Los sniper bots entran en los primeros bloques de un token y venden rapidamente.'),
    heading3('3. Sandwich Bot (Peso: 0.30)'),
    para('Detecta ejecucion de ataques sandwich. Indicadores: sandwichCount > 5, frontruns + slippage alto (>100 bps), intervalos de trading consistentes sub-minuto. Los sandwich bots frontrun transacciones grandes y venden inmediatamente despues.'),
    heading3('4. Copy Trading Bot (Peso: 0.25)'),
    para('Detecta copia automatica de otras wallets. Indicadores: copyTradeScore > 0.5, mismo par operado frecuentemente (>50), consistencia moderada. Los copy bots replican operaciones de wallets objetivo con un delay consistente.'),
    heading3('5. Wash Trading Bot (Peso: 0.30)'),
    para('Detecta creacion de volumen artificial. Indicadores: washTradeScore > 0.4, selfTradeCount > 3, slippage anormalmente bajo (<5 bps), PnL cercano a cero. Los wash traders negocian consigo mismos para inflar metricas de volumen.'),
    heading3('6. Arbitrage Bot (Peso: 0.25)'),
    para('Detecta arbitraje cross-DEX o intra-bloque. Indicadores: multi-hop swaps > 20, hold time extremo (<1 min), win rate sospechosamente alto (>90%), bajo slippage. Los bots de arbitraje explotan diferencias de precio entre DEXes.'),
    heading3('7. JIT Liquidity Bot (Peso: 0.20)'),
    para('Detecta provision de liquidez Just-In-Time. Indicadores: JIT events > 5, MEV extraido con posiciones cortas, consistencia alta. Los bots JIT proveen liquidez justo antes de un swap grande y la retiran inmediatamente despues.'),
    heading3('8. Actividad 24/7 (Peso: 0.20)'),
    para('Detecta actividad no-stop indicativa de automatizacion. Indicadores: isActive247, actividad nocturna + consistencia > 0.6, distribucion uniforme de trading por hora (CV < 0.3). Los humanos tienen patrones de sueno; los bots no.'),
    heading2('Motor de Clasificacion'),
    para('El motor ejecuta los 8 detectores sobre cada wallet y produce una clasificacion:'),
    bulletPoint('Score ponderado = sum(valorSenal x peso) / sum(pesos)'),
    bulletPoint('isBot = true si score ponderado > 0.35'),
    bulletPoint('botType = tipo de la senal primaria con mayor (valor x peso)'),
    bulletPoint('Clasificacion secundaria = otras senales significativas (valor > 0.3)'),
    para('El resultado incluye razonamiento detallado con evidencia de cada detector que contribuyo a la clasificacion, permitiendo al usuario entender y validar la decision del motor.'),
  ];
}

function chapter15() {
  return [
    heading1('Capitulo 15: Perfil de Wallets'),
    para('El motor de perfilado de wallets construye perfiles de comportamiento comprehensivos para cada wallet/trader, calculando scores especializados y detectando patrones de comportamiento.'),
    heading2('Smart Money Score (0-100)'),
    para('Un wallet se considera "Smart Money" si consistentemente entra temprano, tiene win rate alto, sale a multiplicadores significativos, tiene retornos ajustados por riesgo fuertes, y NO es un bot. Componentes del score:'),
    makeTable(
      ['Componente', 'Puntos Max', 'Criterio'],
      [
        ['Win Rate', '25', '>70%=25, >60%=20, >50%=10, >40%=5'],
        ['Entry Timing', '25', 'avgEntryRank <10=25, <50=20, <200=10, <1000=5'],
        ['Risk-Adjusted Returns', '20', 'Sharpe >2=20, >1.5=15, >1=10, >0.5=5'],
        ['Exit Efficiency', '15', 'avgExitMultiplier >5x=15, >3x=12, >2x=8, >1.5x=4'],
        ['Profit Factor', '10', '>2=10, >1.5=7, >1.2=4, >1=2'],
        ['Consistency', '5', 'consistencyScore >0.7=5, >0.5=3, >0.3=1'],
      ],
      [25, 12, 53]
    ),
    para('Penalizaciones: washTradeScore > 0.5 = -30 puntos, copyTradeScore > 0.7 = -20 puntos, actividad 24/7 + intervalos <1min = -15 puntos.'),
    heading2('Whale Score (0-100)'),
    para('Un wallet es "Whale" si tiene grandes tenencias, hace operaciones individuales grandes, causa impacto significativo en precio, y mantiene posiciones concentradas. Componentes:'),
    makeTable(
      ['Componente', 'Puntos Max', 'Criterio'],
      [
        ['Total Holdings', '40', '>$10M=40, >$1M=30, >$500K=20, >$100K=10'],
        ['Avg Trade Size', '30', '>$100K=30, >$50K=22, >$10K=15, >$5K=8'],
        ['Profit Factor', '15', '>2=15, >1.5=10, >1=5'],
        ['Total PnL', '15', '>$1M=15, >$100K=10, >$10K=5'],
      ],
      [25, 12, 53]
    ),
    heading2('Sniper Score (0-100)'),
    para('Un wallet es "Sniper" si entra en tokens dentro de los primeros bloques, tiene avgEntryRank muy bajo, vende rapidamente, y puede estar asistido por bots. Componentes:'),
    makeTable(
      ['Componente', 'Puntos Max', 'Criterio'],
      [
        ['Avg Entry Rank', '35', '<5=35, <20=25, <50=15, <100=8'],
        ['Early Entry Count', '25', '>20=25, >10=18, >5=10, >2=5'],
        ['Short Hold Time', '20', '<5min=20, <30min=12, <2h=5'],
        ['24/7 Activity', '10', 'isActive247=10, avgTime <2min=5'],
        ['High Trade Volume', '10', '>500=10, >200=6, >50=3'],
      ],
      [25, 12, 53]
    ),
    heading2('Patrones de Comportamiento'),
    para('El motor detecta los siguientes patrones de comportamiento:'),
    bulletPoint('ACCUMULATOR — Acumula sistematicamente durante periodos extendidos (hold >24h, WR >50%, size >$1K)'),
    bulletPoint('DUMPER — Vende rapidamente con perdidas (hold <30min, WR <40%, trades >20)'),
    bulletPoint('SCALPER — Operaciones extremadamente cortas (hold <15min, trades >100)'),
    bulletPoint('SWING_TRADER — Operaciones de horas a dias (hold 1-72h, WR >45%)'),
    bulletPoint('DIAMOND_HANDS — Mantiene posiciones muy largo plazo (hold >3 dias)'),
    bulletPoint('MOMENTUM_RIDER — Sigue tendencias con entradas y salidas disciplinadas (PF>1.3, Sharpe>0.8)'),
    bulletPoint('CONTRARIAN — Compra en miedo, vende en codicia (WR>55%, PF>1.5, hold>2h)'),
    bulletPoint('WASH_TRADER — Probable creacion de volumen circular (washTradeScore>0.4)'),
    bulletPoint('COPY_CAT — Sigue operaciones de otros wallets (copyTradeScore>0.5)'),
    bulletPoint('MEV_EXTRACTOR — Extrae valor via frontrunning y sandwich (frontrunCount>5)'),
    bulletPoint('BRIDGE_HOPPER — Opera activamente en multiples chains via bridges'),
    bulletPoint('YIELD_FARMER — Principalmente farmea yield en protocolos DeFi'),
  ];
}

function chapter16() {
  return [
    heading1('Capitulo 16: Roadmap'),
    heading2('Estado Actual (V2)'),
    para('La version actual de CryptoQuant Terminal incluye las siguientes funcionalidades implementadas y operativas:'),
    heading3('Infraestructura Base'),
    bulletPoint('Aplicacion Next.js 16 con TypeScript y Tailwind CSS 4'),
    bulletPoint('Prisma ORM con SQLite + 15 modelos de datos completos'),
    bulletPoint('5 clientes de datos: DexScreener, Birdeye, Jupiter, Solana RPC, Ethereum RPC'),
    bulletPoint('26 endpoints API REST funcionales'),
    bulletPoint('Dashboard con visualizacion en tiempo real'),
    heading3('Motores de Analisis'),
    bulletPoint('Big Data Predictive Engine con 7 modulos predictivos'),
    bulletPoint('Bot Detection Engine con 8 detectores especializados'),
    bulletPoint('Wallet Profiler con Smart Money, Whale, y Sniper scoring'),
    bulletPoint('Data Ingestion Pipeline multi-fuente'),
    heading3('Trading Systems Lab'),
    bulletPoint('30 plantillas de sistema en 8 categorias'),
    bulletPoint('Arquitectura de 5 capas (Asset Filter, Phase Config, Entry, Execution, Exit)'),
    bulletPoint('7 fases de deteccion de token (GENESIS a LEGACY)'),
    bulletPoint('8 tipos de operacion soportados'),
    bulletPoint('Motor de asignacion de capital con 16 metodos'),
    heading3('Backtesting Engine'),
    bulletPoint('3 modos: Historical, Paper, Forward'),
    bulletPoint('Metricas completas: Sharpe, Sortino, Calmar, Max DD, Profit Factor, Expectancy, Alpha'),
    bulletPoint('Proteccion anti-overfitting (in-sample vs out-of-sample)'),
    bulletPoint('4 metodos de optimizacion: Grid, Walk-Forward, Bayesian, Genetic'),
    bulletPoint('Feedback loop para mejora continua'),
    heading2('Proximos Pasos (V3)'),
    heading3('Q3 2026 — Integracion Avanzada'),
    bulletPoint('Integracion con ClickHouse para analisis OLAP a escala completa'),
    bulletPoint('ClickHouse para series temporales de precios y metricas historicas'),
    bulletPoint('Optimizacion de queries con materialized views y agregaciones precalculadas'),
    bulletPoint('Soporte para >1M tokens rastreados simultaneamente'),
    heading3('Q4 2026 — Trading en Vivo'),
    bulletPoint('Ejecucion real via Jupiter y DEXes Solana'),
    bulletPoint('Gestion de claves privadas con encriptacion hardware'),
    bulletPoint('Sistema de alertas en tiempo real (Telegram, Discord, Email)'),
    bulletPoint('Paper trading automatizado con notificaciones'),
    heading3('Q1 2027 — ML Avanzado'),
    bulletPoint('Modelos de ML para prediccion de regimen mejorada'),
    bulletPoint('Deteccion de anomalias con autoencoders'),
    bulletPoint('Clasificacion de wallets con redes neuronales'),
    bulletPoint('Optimizacion bayesiana completa para parametros de sistema'),
    heading3('Q2 2027 — Multi-Exchange'),
    bulletPoint('Soporte para exchanges centralizados (Binance, Coinbase, OKX)'),
    bulletPoint('Arbitraje CEX-DEX automatizado'),
    bulletPoint('Gestion de riesgo cross-venue'),
    bulletPoint('API publica para desarrolladores terceros'),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({ text: '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', size: 20, color: C.gold, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ text: 'Fin del Documento', bold: true, italics: true, size: 24, color: C.gold, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'CryptoQuant Terminal — El Bloomberg del Retail', italics: true, size: 20, color: C.midGray, font: 'Calibri' }),
      ],
    }),
  ];
}

// ============================================================
// BUILD THE DOCUMENT
// ============================================================

async function main() {
  console.log('Generando documento CryptoQuant Terminal V2...');

  const sections = [
    ...coverPage(),
    // Table of Contents
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      children: [new TextRun({ text: 'Tabla de Contenidos', bold: true, size: 32, color: C.gold, font: 'Calibri' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.gold, space: 4 } },
    }),
    new TableOfContents('Tabla de Contenidos', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
    new Paragraph({ children: [new PageBreak()] }),
    ...chapter1(),
    ...chapter2(),
    ...chapter3(),
    ...chapter4(),
    ...chapter5(),
    ...chapter6(),
    ...chapter7(),
    ...chapter8(),
    ...chapter9(),
    ...chapter10(),
    ...chapter11(),
    ...chapter12(),
    ...chapter13(),
    ...chapter14(),
    ...chapter15(),
    ...chapter16(),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            size: 20,
            color: C.lightGray,
            font: 'Calibri',
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
        heading1: {
          run: {
            size: 32,
            bold: true,
            color: C.gold,
            font: 'Calibri',
          },
        },
        heading2: {
          run: {
            size: 26,
            bold: true,
            color: C.gold,
            font: 'Calibri',
          },
        },
        heading3: {
          run: {
            size: 22,
            bold: true,
            color: C.accentDark,
            font: 'Calibri',
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1),
          },
          size: {
            width: convertInchesToTwip(8.5),
            height: convertInchesToTwip(11),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: 'CryptoQuant Terminal — Analisis Arquitectonico V2', size: 14, color: C.midGray, font: 'Calibri', italics: true }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Confidencial — ', size: 14, color: C.midGray, font: 'Calibri' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 14, color: C.midGray, font: 'Calibri' }),
              ],
            }),
          ],
        }),
      },
      children: sections,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join('/home/z/my-project/download', 'Analisis_Arquitectonico_Plataforma_Crypto_V2.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Documento generado exitosamente: ${outputPath}`);
  console.log(`Tamano: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Error generando documento:', err);
  process.exit(1);
});
