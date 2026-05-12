# CryptoQuant Terminal - Plan de Expansion Mejorado

> Sintetizado y mejorado a partir del documento original de 12 fases.
> Organizado en 5 bloques logicos para implementacion agil.
> Cada bloque es independiente y desplegable por separado.

---

## BLOQUE 1: DATOS + PATRONES (Prioridad INMEDIATA)

### 1.1 Expansion de Datos

| Componente | Estado | Meta | Mejora |
|---|---|---|---|
| Tokens (CoinGecko) | 1,250 | 5,000+ | Priorizar por volumen y nuevos listings. Aumentar paginas de 12 a 20+ |
| DexScreener enriched | 90 | 2,000+ | Batch size adaptativo + reintentos con backoff |
| Smart Money Wallets | 10 | 500+ | 8 arquetipos: whale, degen, sniper, early_investor, mev_bot, nft_whale, airdrop_farmer, bridging_whale. Cada uno con score de confianza 0-1 |
| TokenDNA (danger tokens) | 0 | 2,000+ | Incluir: honeypot, tax oculta, owner con mint, liquidez bloqueada |
| Recent Events | 50 | 1,000+ | Anadir: liquidity_lock, ownership_renounced, blacklist_added, rug_pull_detected, smart_money_move |

### 1.2 Candlestick Pattern Scanner (30+ patrones, multi-timeframe)

**Patrones a implementar:**
doji, hammer, inverted_hammer, engulfing_bull, engulfing_bear, morning_star, evening_star, three_white_soldiers, three_black_crows, piercing_line, dark_cloud_cover, harami_bull, harami_bear, tweezers_top, tweezers_bottom, spinning_top, marubozu_bull, marubozu_bear, shooting_star, hanging_man, rising_three_methods, falling_three_methods, abandoned_baby_bull, abandoned_baby_bear, tri_star_bull, tri_star_bear, belt_hold_bull, belt_hold_bear, counterattack_bull, counterattack_bear

**Timeframes:** 1m, 5m, 10m, 15m, 30m, 1h, 4h, 1d

**Mejora clave:** Deteccion en streaming con ventanas deslizantes, no batch. Paralelizar ingesta con workers.

---

## BLOQUE 2: INTELIGENCIA PREDICTIVA

### 2.1 Behavioral Prediction Engine (Bayesiano)

**8 arquetipos x 6 fases de mercado:**
- Arquetipos: whale, degen, sniper, early_investor, mev_bot, nft_whale, airdrop_farmer, bridging_whale
- Fases: accumulation, markup, distribution, markdown, consolidation, breakout
- Modelo: `P(behavior | archetype, phase, market_conditions)`
- Prior no informativo para tokens nuevos, luego actualizar con datos reales

### 2.2 Cross-Correlation Engine

- `P(outcome | trader_type + pattern + phase + liquidity + volume)`
- Matriz de correlacion entre senales y resultados historicos
- Guardar matrices actualizadas para acceso rapido

### 2.3 Auto-Record Observations

Cada ciclo del pipeline graba automaticamente:
- timestamp, token, signals_detected, market_state, prediction_made
- Tabla `Observation` en Prisma schema
- Indexar por `(token, pattern_hash, timestamp)` para evitar duplicados

### 2.4 Deep Analysis + LLM (z-ai-web-dev-sdk)

- LLM para razonamiento estructurado y resumenes narrativos
- **NUNCA para tomar decisiones de trading** - solo para resumir
- Cache de resultados por contexto (mismo token + mismas senales)
- 3 modos diferenciados:
  - **QUICK**: Solo rule-based, 3 factores, 1-2 frases
  - **STANDARD**: Rule-based + LLM hybrid, 6 factores, analisis de patron + comportamiento
  - **DEEP**: LLM completo, 12 factores, escenarios bull/base/bear, entry/exit conditions

---

## BLOQUE 3: ESTRATEGIA Y VALIDACION

### 3.1 Strategy Selection Engine

**Entrada:** signals + patterns + behavioral prediction + cross-correlation

**Salida por estrategia:**
- Sistema (spot / futures / scalp / swing)
- Direccion (long/short)
- Entry price, stop loss, take profit (basado en ATR o soporte/resistencia)
- Position size (riesgo fijo: 1-2% del portfolio)
- Regla de filtro: si confianza < 0.6, NO generar prediccion

### 3.2 AI Strategy Optimizer (NUEVO - Panel F5 mejorado)

**Capital & Setup:**
- Input de capital total (ej: $10,000)
- Modo: "Distribuir en varias estrategias" o "Enfocar en la mejor"
- Si distribuir: dividir capital en N estrategias (2-10)
- Filtros: token age (nuevo/medio/viejo), timeframe (1m a 4h), riesgo (conservador/moderado/agresivo)

**Loop de Optimizacion:**
1. AI Scan: usa Brain + DNA + Signals para buscar oportunidades
2. Genera configuraciones de estrategia variando: timeframe, token age, risk, entry/exit
3. Ejecuta backtests automaticamente para cada configuracion
4. Ranking de resultados por: Sharpe, PnL, Win Rate, Profit Factor, Drawdown
5. Guarda las mejores estrategias
6. One-click: activar sistema en paper/live

**Panel de resultados:**
- Tabla ordenable con todas las estrategias testeadas
- Filtros: por timeframe, token age, riesgo
- Cards con metricas clave: PnL, Sharpe, Win Rate, Drawdown, Profit Factor
- Boton "Deploy" para activar sistema
- Boton "Re-test" para revalidar con datos actuales

### 3.3 Prediction Storage + Validation

Tabla `Prediction` con campos:
- token, direction, entry_price, target_price, stop_loss
- confidence, created_at, resolved_at, outcome
- Validacion automatica cada 4h (o al timeframe del patron)

---

## BLOQUE 4: PAPER TRADING Y EVALUACION

### 4.1 Paper Trading Autonomo

- Ejecucion simulada con ordenes limite/market
- Comisiones realistas (0.1% por trade)
- Slippage modelado segun liquidez del token
- Stop loss dinamico (trailing stop opcional)
- Tracking: P&L, win rate, Sharpe ratio, max drawdown
- **Mejora:** Backtest historico ANTES del paper trading

### 4.2 Evaluacion en Ventanas de 4h

- Comparar precio de salida (TP/SL) vs precio real a las 4h
- Calcular accuracy por tipo de senal, arquetipo, patron
- Visualizar en terminal con metricas claras

---

## BLOQUE 5: APRENDIZAJE CONTINUO

### 5.1 Actualizacion Bayesiana

Cada 4h, tras evaluar predicciones:
```
P(outcome | pattern, archetype, phase) = (aciertos + alpha) / (total + alpha + beta)
```
- Factor de olvido exponencial (mas peso a resultados recientes)
- Guardar matrices actualizadas

### 5.2 Bucle Continuo: Test -> Eval -> Improve -> Re-test

Automatizado con scheduler:
1. Ejecutar pipeline con datos nuevos
2. Evaluar precision vs predicciones pasadas
3. Si accuracy global baja >5% vs rolling window de 7 dias:
   - Ajustar hiperparametros (umbral de confianza, pesos de senales)
   - Re-ejecutar backtest con nuevo modelo
4. Guardar version del modelo

### 5.3 Filtros Macro (Mejora anadida)

- **BTC dominancia:** Si sube >2% en 1h, reducir exposicion en alts
- **Fear & Greed:** Extremos como filtro de riesgo
- **Sentimiento social:** Integrar con peso bajo (10%) al inicio

---

## Carencias Detectadas y Mejoras Propuestas

| Carencia | Propuesta |
|---|---|
| Sin manejo de riesgo macro (BTC dom, fear&greed) | Anadir filtro macro: si BTC dom sube >2%/1h, reducir exposicion alts |
| 30 patrones x 6 TF puede ser lento | Precalcular patrones con ventanas deslizantes, no batch |
| Falsos positivos en smart money (wallets simuladas) | Usar clustering de transacciones reales para calibrar |
| Sin analisis de sentimiento social | Integrar API de sentimiento con peso bajo (10%) |
| LLM puede alucinar | Usar SOLO para resumir, NUNCA para decisiones de trading |
| F5 y F6 desconectados | Unificar en AI Strategy Optimizer (F5) |
| Backtesting manual y complejo | Loop automatico con ranking y deploy en 1 click |

---

## Resumen Ejecutivo para Implementacion

```
[BLOQUE 1] DATA + PATTERNS   -> 5000 tokens, 2000 liquidez, 500 wallets, 30 patrones en 8 TF
[BLOQUE 2] BAYES + LLM       -> prediccion conductual + razon estructurada (LLM solo resume)
[BLOQUE 3] STRATEGY + RANKING -> long/short, stops dinamicos, AI optimizer, confianza >0.6
[BLOQUE 4] PAPER + EVAL       -> slippage, comisiones, accuracy cada 4h
[BLOQUE 5] LEARN LOOP         -> actualizacion bayesiana diaria, auto-ajuste de parametros
```

### Orden de Implementacion Sugerido

1. **SEMANA 1:** B1.1 (expansion datos) + B1.2 (pattern scanner mejorado)
2. **SEMANA 2:** B2.1 (bayesiano) + B2.3 (auto-record observations)  
3. **SEMANA 3:** B3.1 (strategy engine) + B3.2 (AI optimizer panel)
4. **SEMANA 4:** B3.3 (predictions) + B4.1 (paper trading mejorado)
5. **SEMANA 5:** B5.1 (bayesian update) + B5.2 (learn loop) + B5.3 (filtros macro)

---

*Documento generado para CryptoQuant Terminal - Lista para que cualquier IA retome el contexto*
