# 🧠 Bento Persistent Memory Bank

> Auto-distilled architectural rules and edge-case guards (25 rules stored).

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

### `[MEM-5B610E02]` Bento Orchestration Protocol
- **Category:** `orchestration` | **Discovered:** 2026-09-04
- **Hard Rule:** Whenever bento skill is invoked, orchestrate tasks through Bento: check memory, define ground-truth contracts, execute with Builder/Auditor, and verify with bento run before declaring complete.
- **Tags:** orchestra,workflow,contract

### `[MEM-39FBCFF0]` Bento Trace Emitter Port
- **Category:** `architecture` | **Discovered:** 2026-09-05
- **Hard Rule:** All scenario and suite execution controllers must emit structured TraceEvents to TraceGateway to feed the sensory dream harbor.
- **Anti-Pattern:** Running scenarios without emitting execution traces, starving the dream cycle of sensory data.
- **Tags:** architecture

### `[MEM-DREAM-B8C5A121]` Autonomous Recovery Guard: Mobile UI & Navigation Verification
- **Category:** `auto-dream-distilled` | **Discovered:** 2026-09-05
- **Hard Rule:** Always satisfy contract requirements: Verify Production Vite & TypeScript Bundle Build: Expected exit code 0, got 2; Verify Production Vite & TypeScript Bundle Build: Target 'stdout' contains 'built in': False
- **Anti-Pattern:** Initial failing mode: Verify Production Vite & TypeScript Bundle Build: Expected exit code 0, got 2; Verify Production Vite & TypeScript Bundle Build: Target 'stdout' contains 'built in': False
- **Tags:** harness-recovery, ux, mobile, dream-distilled, tailwind, ui

### `[MEM-DREAM-66DB31D0]` Autonomous Recovery Guard: Dashboard Resilience & Security Verification Rig
- **Category:** `auto-dream-distilled` | **Discovered:** 2026-09-05
- **Hard Rule:** Always satisfy contract requirements: Verify Production Vite & TypeScript Bundle Build: Expected exit code 0, got 2; Verify Production Vite & TypeScript Bundle Build: Target 'stdout' contains 'built in': False
- **Anti-Pattern:** Initial failing mode: Verify Production Vite & TypeScript Bundle Build: Expected exit code 0, got 2; Verify Production Vite & TypeScript Bundle Build: Target 'stdout' contains 'built in': False
- **Tags:** harness-recovery, dashboard, security, dream-distilled, resilience, web

### `[MEM-DREAM-F4440514]` Autonomous Recovery Guard: Triad Audit: AST Purity & Architectural Invariants
- **Category:** `auto-dream-distilled` | **Discovered:** 2026-09-05
- **Hard Rule:** Always satisfy contract requirements: CORS DNS Rebinding allowed on /api/memory/export
- **Anti-Pattern:** Initial failing mode: CORS DNS Rebinding allowed on /api/memory/export
- **Tags:** ast_purity, triad_sprint, wasabi, dream-distilled, harness-recovery, security, red_team

### `[MEM-662BC078]` Python 3.11 F-String Backslash Compatibility
- **Category:** `architecture` | **Discovered:** 2026-09-06
- **Hard Rule:** Never use backslashes inside f-string expression blocks ({...}) to preserve compatibility with Python 3.10 and 3.11.
- **Anti-Pattern:** f'{self._c("1;32", "Text with \' quote")}' causes SyntaxError in Python <3.12.
- **Tags:** python311,clean-code,syntax

### `[MEM-8BD0FA67]` Web Server LAN Network Binding Invariant
- **Category:** `networking` | **Discovered:** 2026-09-06
- **Hard Rule:** To allow multi-device or mobile access over local Wi-Fi, the web daemon must bind to 0.0.0.0 via --network. Defaulting to 127.0.0.1 strictly rejects external network IP requests.
- **Anti-Pattern:** Attempting to access http://<LAN_IP>:8765 when server is bound strictly to 127.0.0.1 resulting in Connection Refused.
- **Tags:** web,lan,networking,daemon

### `[MEM-6AEE8EB5]` Sensory Feedback & WCAG 2.1 AA Invariant
- **Category:** `accessibility` | **Discovered:** 2026-09-06
- **Hard Rule:** All modal dialogs must enforce focus trapping (Tab/Shift+Tab) and focus restoration on unmount. Audio chimes must provide visual captions via SoundCaptionHUD for deaf and hard-of-hearing users.
- **Anti-Pattern:** Playing audio sound effects without accompanying visual subtitles or captions in HUD, or allowing keyboard focus to bleed behind open modal dialogs.
- **Tags:** a11y,wcag21aa,sensory,ui

### `[MEM-2D4E78EE]` The Butler Background Runner Invariant
- **Category:** `orchestration` | **Discovered:** 2026-09-06
- **Hard Rule:** All operations, sprints, suites, or benchmarks expected to take >10 seconds must be dispatched via 'bento bg run "<cmd>" --tag "<tag>"' so they appear in Kitchen Chefs (DaemonView) and preserve interactive responsiveness.
- **Anti-Pattern:** Running long test suites or agent loops directly in interactive shell or agent context without registering them in Bento Butler background runner.
- **Tags:** butler,daemon,bg_runner,orchestration

### `[MEM-DREAM-79F2B2DC]` Autonomous Recovery Guard: Accessibility & Sensory Verification Rig
- **Category:** `auto-dream-distilled` | **Discovered:** 2026-09-06
- **Hard Rule:** Always satisfy contract requirements: Verify useA11yModal Focus Trap Hook: Target 'stdout' contains 'focusTrap': False
- **Anti-Pattern:** Initial failing mode: Verify useA11yModal Focus Trap Hook: Target 'stdout' contains 'focusTrap': False
- **Tags:** python311, harness-recovery, accessibility, a11y, sensory, dream-distilled, wcag21aa

### `[MEM-EDD86A56]` Culinary Brigade Multi-Team Sprint Integration
- **Category:** `orchestration` | **Discovered:** 2026-09-06
- **Hard Rule:** Every multi-team culinary brigade sprint (Red 🌶️, Yellow 🍋, Green 🍵, Patron 🥢, Blue 🍳) must: 1. Register in Bento Butler via 'bento bg run' so it tracks live in Kitchen Chefs, 2. Distill findings into 'bento memory add' to populate Seasoned Recipes, 3. Pair deliverables with contracts in examples/ to emit structured traces, and 4. Conclude with 'bento bg run "bento dream --harvest"' to synthesize skills in Night Dream.
- **Anti-Pattern:** Running multi-team brigade sprints entirely inside ephemeral AI chat without registering background tasks in Bento Butler, leaving Kitchen Chefs, Seasoned Recipes, and Night Dream unpopulated.
- **Tags:** culinary_brigade, brigade_sprint, multi_team, orchestration, butler, memory, dream, skills

### `[MEM-C698B53F]` Strict Accessible Modal Focus Trapping
- **Category:** `accessibility` | **Discovered:** 2026-09-06
- **Hard Rule:** All modal dialogs must trap focus using useA11yModal, bind Escape key dismissal, and restore focus to trigger.
- **Anti-Pattern:** Unbounded focus leaking to background inputs or missing role='dialog'.
- **Tags:** accessibility

### `[MEM-8C75A657]` Streaming Terminal DOM and Live Region Safety
- **Category:** `security` | **Discovered:** 2026-09-06
- **Hard Rule:** Cap streaming terminal buffers in DOM to last 300 lines and never apply aria-live to active log containers; use off-screen status regions instead.
- **Anti-Pattern:** Unbounded log line arrays and aria-live='polite' on rapid stdout streams causing main-thread lockups.
- **Tags:** security

### `[MEM-47F67042]` Bento Density Engine & Compact Terminal Mode
- **Category:** `accessibility` | **Discovered:** 2026-09-06
- **Hard Rule:** Support both Spacious (Juubako) and Compact (Nigiri) layout modes to accommodate split-terminal monitoring without layout breakage.
- **Anti-Pattern:** Fixed high-padding tables and cards causing vertical scroll explosions on small viewports.
- **Tags:** accessibility

### `[MEM-A313DFAE]` Defensive Frontend Telemetry & Storage Hydration
- **Category:** `security` | **Discovered:** 2026-09-06
- **Hard Rule:** Always guard optional telemetry arrays and validate item-level schema when hydrating from localStorage.
- **Anti-Pattern:** Directly calling .join() on load_avg or assuming localStorage JSON is non-null.
- **Tags:** security

### `[MEM-7A0CF677]` Responsive Card Boundaries & Mobile Flex Wrapping
- **Category:** `ui` | **Discovered:** 2026-09-06
- **Hard Rule:** All dashboard card headers and tag lists must use flex-col sm:flex-row with flex-wrap, overflow-hidden, and break-words/break-all on code and identifiers to prevent mobile text truncation and viewport overflow.
- **Anti-Pattern:** Using flex justify-between items-center with long monospace identifiers and non-wrapping tag chips that stretch cards beyond mobile viewports.
- **Tags:** ui

### `[MEM-D3D5AC6E]` Constellation Category Containment & Mobile Viewport Shield
- **Category:** `ui` | **Discovered:** 2026-09-06
- **Hard Rule:** All dynamic category and tag pill containers must declare flex-wrap with whitespace-nowrap shrink-0 on pills, and root documents must enforce overflow-x: hidden to prevent lateral viewport panning and card boundary clipping on mobile.
- **Anti-Pattern:** Unwrapped flex rows for dynamic items causing card expansion beyond 100vw, or omitting whitespace-nowrap causing mid-hyphen multi-line word breaks.
- **Tags:** ui

---

## 🛠️ Bento Crystallized Procedural Skills (11 skills stored)

> Reusable macros synthesized from recurring successful executions.

### `[skill-quant-calc-signal-normalizer-contract]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Quant Calc Signal Normalizer Contract' (13 executions observed)
- **Tags:** quant, benchmark, auto-loop, blue_team, triad_sprint, brigade_sprint, chef, demo
- **Steps:**
  1. Step 1: Check pre-conditions for Quant Calc Signal Normalizer Contract
  1. Step 2: Execute validated deterministic routine for Quant Calc Signal Normalizer Contract
  1. Step 3: Verify output assertions

### `[skill-mobile-ui-&-navigation-verification]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Mobile UI & Navigation Verification' (13 executions observed)
- **Tags:** tailwind, benchmark, triad_sprint, blue_team, brigade_sprint, ui, mobile, ux, chef
- **Steps:**
  1. Step 1: Check pre-conditions for Mobile UI & Navigation Verification
  1. Step 2: Execute validated deterministic routine for Mobile UI & Navigation Verification
  1. Step 3: Verify output assertions

### `[skill-dashboard-resilience-&-security-verification-rig]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Dashboard Resilience & Security Verification Rig' (13 executions observed)
- **Tags:** dashboard, resilience, benchmark, triad_sprint, blue_team, brigade_sprint, web, chef, security
- **Steps:**
  1. Step 1: Check pre-conditions for Dashboard Resilience & Security Verification Rig
  1. Step 2: Execute validated deterministic routine for Dashboard Resilience & Security Verification Rig
  1. Step 3: Verify output assertions

### `[skill-core-system-health-check]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Core System Health Check' (15 executions observed)
- **Tags:** sanity, benchmark, triad_sprint, blue_team, brigade_sprint, core, contract, chef
- **Steps:**
  1. Step 1: Check pre-conditions for Core System Health Check
  1. Step 2: Execute validated deterministic routine for Core System Health Check
  1. Step 3: Verify output assertions

### `[skill-agent-code-gen-verification-rig]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Agent Code-Gen Verification Rig' (13 executions observed)
- **Tags:** agent, benchmark, cyrilXBT-paradigm, blue_team, triad_sprint, brigade_sprint, eval, chef
- **Steps:**
  1. Step 1: Check pre-conditions for Agent Code-Gen Verification Rig
  1. Step 2: Execute validated deterministic routine for Agent Code-Gen Verification Rig
  1. Step 3: Verify output assertions

### `[skill-accessibility-&-sensory-verification-rig]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Accessibility & Sensory Verification Rig' (11 executions observed)
- **Tags:** wcag21aa, benchmark, accessibility, blue_team, chef, brigade_sprint, a11y, sensory, python311
- **Steps:**
  1. Step 1: Check pre-conditions for Accessibility & Sensory Verification Rig
  1. Step 2: Execute validated deterministic routine for Accessibility & Sensory Verification Rig
  1. Step 3: Verify output assertions

### `[skill-orchestra_round_1]`
- **Description:** Autonomous skill macro synthesized from recurring task 'orchestra_round_1' (8 executions observed)
- **Tags:** brigade_sprint, orchestra, triad_sprint, culinary_brigade
- **Steps:**
  1. Step 1: Check pre-conditions for orchestra_round_1
  1. Step 2: Execute validated deterministic routine for orchestra_round_1
  1. Step 3: Verify output assertions

### `[skill-culinary-brigade-audit:-ui-accessibility-&-visual-invariants]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Culinary Brigade Audit: UI Accessibility & Visual Invariants' (3 executions observed)
- **Tags:** culinary_brigade, yuzu, yellow_team, ui, a11y
- **Steps:**
  1. Step 1: Check pre-conditions for Culinary Brigade Audit: UI Accessibility & Visual Invariants
  1. Step 2: Execute validated deterministic routine for Culinary Brigade Audit: UI Accessibility & Visual Invariants
  1. Step 3: Verify output assertions

### `[skill-culinary-brigade-audit:-ast-purity-&-architectural-invariants]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Culinary Brigade Audit: AST Purity & Architectural Invariants' (3 executions observed)
- **Tags:** culinary_brigade, wasabi, ast_purity, red_team, security
- **Steps:**
  1. Step 1: Check pre-conditions for Culinary Brigade Audit: AST Purity & Architectural Invariants
  1. Step 2: Execute validated deterministic routine for Culinary Brigade Audit: AST Purity & Architectural Invariants
  1. Step 3: Verify output assertions

### `[skill-triad-audit:-ui-accessibility-&-visual-invariants]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Triad Audit: UI Accessibility & Visual Invariants' (4 executions observed)
- **Tags:** triad_sprint, yuzu, yellow_team, ui, a11y
- **Steps:**
  1. Step 1: Check pre-conditions for Triad Audit: UI Accessibility & Visual Invariants
  1. Step 2: Execute validated deterministic routine for Triad Audit: UI Accessibility & Visual Invariants
  1. Step 3: Verify output assertions

### `[skill-triad-audit:-ast-purity-&-architectural-invariants]`
- **Description:** Autonomous skill macro synthesized from recurring task 'Triad Audit: AST Purity & Architectural Invariants' (4 executions observed)
- **Tags:** triad_sprint, wasabi, ast_purity, red_team, security
- **Steps:**
  1. Step 1: Check pre-conditions for Triad Audit: AST Purity & Architectural Invariants
  1. Step 2: Execute validated deterministic routine for Triad Audit: AST Purity & Architectural Invariants
  1. Step 3: Verify output assertions
