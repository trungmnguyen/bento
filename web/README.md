# 🍱 Bento Web Monitor Dashboard

The **Bento Web Monitor** is a real-time, responsive telemetry web dashboard built with React 19, TypeScript, Vite, and Tailwind CSS. It connects directly to Bento's Python HTTP server (`bento ui`) to provide a visual control room for autonomous harness operations.

---

## 🍱 The 4 Compartments (Tabs)

The dashboard is organized around Bento's joyful culinary metaphor, mapping directly to core Harness Engineering subsystems:

| Compartment (Tab) | Culinary Persona | Engineering Subsystem | Core Purpose |
| :--- | :--- | :--- | :--- |
| **🍳 Kitchen Chefs** | Head Chef's Stove | **Butler Daemon Runner (`bento bg`)** | Tracks detached background processes, displays live PID/runtime, streams terminal logs, and launches background tasks without blocking interactive workflows. |
| **🍙 Seasoned Recipes** | Secret Recipe Book | **Lifelong Memory Bank (`bento memory`)** | Visualizes active domain axioms, Clean Architecture guardrails, and negative anti-patterns stored in `.bento/memory/` to prevent regressions. |
| **🍵 Night Dream & Tea** | Nightly Tea & Reflection | **Level 5 Autonomous Dreaming (`bento dream`)** | Ingests execution traces (`.bento/traces/`), displays crystallized skill macros, and triggers overnight memory consolidation. |
| **🍱 Tasting Battery** | Bento Tasting Flights | **Deterministic Verification (`bento run` / `bento suite`)** | Displays scenario contracts (`scenario.json`), assertions, and provides a one-click *"Taste All Contracts 🥢"* quality gate with live pass rates. |

---

## 🚀 Launching the Dashboard

### 1. Local Access (Desktop)
```bash
bento ui
```
Opens your browser to `http://localhost:8765`.

### 2. Mobile / LAN Access
To view the monitor from your phone or tablet on the same Wi-Fi network:
```bash
bento ui --network --no-browser --port 8765
```
Access via `http://<your-lan-ip>:8765` (e.g. `http://192.168.1.100:8765`).

---

## 📱 Mobile UI/UX Design Standards

The web interface conforms to modern mobile design conventions (Linear, Vercel, Apple Human Interface Guidelines):
- **Scrollable Segmented Control:** Single-line horizontal scroll (`overflow-x-auto scrollbar-none whitespace-nowrap`) preventing multi-line text wrapping on small screens.
- **Elevated Segmented Pills:** Active tabs feature high-contrast elevated cards with signature culinary theme glows (`tamago-glow`, `bento-glow`, `matcha-glow`).
- **Touch-Optimized Targets:** Minimum 42px touch heights (`min-h-[42px] touch-manipulation`) conforming to WCAG standards.
- **Dynamic Badge Counts:** Displays idle task counts or live simmering pulse indicators (`simmering`).

---

## 🛠️ Frontend Development & Building

```bash
cd web

# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Compile TypeScript and build production bundle into dist/
npm run build
```

The production assets in `web/dist/` are automatically served by Bento's built-in, zero-dependency Python HTTP server (`bento.frameworks.web_server`).
