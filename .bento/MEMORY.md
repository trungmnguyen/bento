# 🧠 Bento Persistent Memory Bank

> Auto-distilled architectural rules and edge-case guards (10 rules stored).

### `[MEM-50790948]` Clean Architecture Port Rule
- **Category:** `architecture` | **Discovered:** 2026-09-01
- **Hard Rule:** Never import I/O directly in domain layer
- **Tags:** architecture

### `[MEM-RSI-RANGE]` John Hayden RSI 80/40 & 60/20 Range Rules
- **Category:** `quant-rsi-regime` | **Discovered:** 2026-09-03
- **Hard Rule:** Bull Trend: RSI ranges 80/40 (finds support at 40 US, resistance at 80 UR; Avg Gain > Avg Loss). Bear Trend: RSI ranges 60/20 (finds resistance at 60 DS, support at 20 DR; Avg Loss > Avg Gain). Equilibrium midline is 50 MD. Violation of 40 in an uptrend or 60 in a downtrend signals the regime is in jeopardy from longer timeframe capital.
- **Anti-Pattern:** Treating RSI > 70 as an automatic short or < 30 as an automatic long. In strong bull markets, RSI routinely travels into 70-80 and respects 40 support; shorting based on retail overbought assumptions leads to severe losses.
- **Tags:** quant, rsi, indicator, trend, regime, trading

### `[MEM-RSI-MDRP]` Momentum Discrepancy Reversal Points (MDRP)
- **Category:** `quant-rsi-mdrp` | **Discovered:** 2026-09-03
- **Hard Rule:** Bullish MDRP: In an uptrend, RSI dips BELOW a prior RSI trough, but price remains HIGHER than the prior price trough (signals pullback exhaustion and impending rally continuation). Bearish MDRP: In a downtrend, RSI rallies ABOVE a prior RSI peak, but price remains LOWER than the prior price peak. Calculate upside/downside price objectives by projecting reference swing distance from the intervening close.
- **Anti-Pattern:** Mistaking an MDRP for a trend reversal. Counter-trend momentum overextension in an established trend is a high-probability continuation signal for the higher timeframe.
- **Tags:** quant, rsi, mdrp, divergence, continuation, trading

### `[MEM-RSI-STUDY]` RSI Dual Moving Average Crossover Formula
- **Category:** `quant-rsi-formula` | **Discovered:** 2026-09-03
- **Hard Rule:** Calculate RSI(14), Fast EMA(9) of RSI, and Slow WMA(45) of RSI. BuyForm trigger: rsi[1] < ema[1] and rsi[1] < wma[1] and rsi > ema and rsi > wma. SellForm trigger: rsi[1] > ema[1] and rsi[1] > wma[1] and rsi < ema and rsi < wma. Slow WMA(45) serves as dynamic support/resistance for RSI pullbacks.
- **Anti-Pattern:** Entering crossovers when the moving averages are misaligned with price trend or failing to confirm with price EMAs.
- **Tags:** quant, rsi, thinkscript, pinescript, indicator, crossover

### `[MEM-TREND-RIBBON]` Multi-Timeframe Trend Ribbon & 6-Chart Alignment
- **Category:** `quant-trend-ribbon` | **Discovered:** 2026-09-03
- **Hard Rule:** Momentum Band: EMA 8 & EMA 21 (Yellow). Structural Band: SMA 50 & SMA 200 (Blue, secular line in the sand). Confirmed Uptrend: Yellow Band stacked above Blue Band. Top-Down Alignment: Macro (4H/1H) establishes compass; Intermediate (30m/15m) confirms structure; Granular (5m/3m) executes timing. Never take short trades when 4H/Daily trend ribbon is expanding upwards.
- **Anti-Pattern:** Counter-trend scalping on 1m/3m against expanding 1H/4H trend ribbons. Micro noise is invalidated by macro institutional capital.
- **Tags:** quant, trend, ribbon, timeframe, moving-averages, trading

### `[MEM-FIB-TRIM]` Fibonacci Entry & Multi-Tier EMA Trimming Execution
- **Category:** `quant-execution` | **Discovered:** 2026-09-03
- **Hard Rule:** Enter long on pullbacks to Fib 38.2% (strong), 50% (medium), or 61.8% (Golden Pocket) confluence near EMA 21. Stop-loss: tight 2-3 points below entry Fib. Scaled Trimming: Exit 1/4 when price crosses below EMA 8; exit 1/2 when price crosses below EMA 21; exit final 1/4 when price crosses below SMA 50. In established trend, reasonable long entry is the Fib level right above EMA 21.
- **Anti-Pattern:** Chasing green candles with FOMO at highs without waiting for a Fibonacci pullback, or holding full position through EMA 8/21 breakdown without trimming.
- **Tags:** quant, fibonacci, execution, trimming, stop-loss, risk-management

### `[MEM-TRAPS-MAGNET]` 80/20 Traps & Choppy Market Magnet Scalps
- **Category:** `quant-setups` | **Discovered:** 2026-09-03
- **Hard Rule:** Bull Trap Pattern: 0. RSI hits 80 at local high -> 1. Price pulls back on Fib -> 2. RSI makes multiple lows under RSI EMA 9 -> 3. Price bounces to previous high for trap resolution. Magnet Chop Scalp: When RSI hovers near 50 and EMAs compress flat, WMA 45 acts as a gravitational magnet. If RSI extends far from WMA 45, enter on crossover back over EMA 9 targeting the exact touch of WMA 45. Exit immediately upon touching WMA 45.
- **Anti-Pattern:** Expecting trend continuation in a sideways market where RSI hovers at 50; failing to take profit at WMA 45 in chop results in immediate mean-reversion reversal.
- **Tags:** quant, rsi, traps, magnet, scalp, chop, mean-reversion

### `[MEM-PSYCH-RULES]` Mark Douglas Probability Axioms & Consistency Protocol
- **Category:** `psychology` | **Discovered:** 2026-09-03
- **Hard Rule:** Embrace the 5 Fundamental Truths: 1. Anything can happen. 2. You don't need to know what happens next to make money. 3. There is a random distribution between wins and losses for any edge. 4. An edge is only a higher probability of one thing over another. 5. Every moment in the market is unique. Execute the 7 Principles of Consistency: objectively identify edges, predefine risk on EVERY trade, accept risk completely, act without hesitation, pay yourself as market makes money available, monitor error susceptibility, and never violate rules.
- **Anti-Pattern:** Moving stop losses, revenge trading, or hesitating to enter a valid signal due to memory of past losses. Demanding the market conform to one's beliefs instead of making uncommitted probability assessments.
- **Tags:** psychology, discipline, risk-management, probability, trading

### `[MEM-5B610E02]` Bento-Harness Orchestration Protocol
- **Category:** `orchestration` | **Discovered:** 2026-09-04
- **Hard Rule:** Whenever bento-harness skill is invoked, orchestrate tasks through Bento: check memory, define ground-truth contracts, execute with Builder/Auditor, and verify with bento run before declaring complete.
- **Tags:** orchestra,workflow,contract

### `[MEM-39FBCFF0]` Bento Trace Emitter Port
- **Category:** `architecture` | **Discovered:** 2026-09-05
- **Hard Rule:** All scenario and suite execution controllers must emit structured TraceEvents to TraceGateway to feed the sensory dream harbor.
- **Anti-Pattern:** Running scenarios without emitting execution traces, starving the dream cycle of sensory data.
- **Tags:** architecture
