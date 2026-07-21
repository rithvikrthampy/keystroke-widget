# Keystroke Tracker

A sci‑fi themed **desktop keyboard activity widget** for Windows. It tracks your global keyboard strokes in the background, displays your counts in real-time, keeps a 7-day historical graph, and shows statistics like your daily typing average.

Built with [Tauri 2](https://tauri.app/) (Rust + web frontend), so it's tiny, fast, runs as a native Windows app, and monitors keystrokes globally without blocking focus.

## Features

- ⌨️ **Real-time keystroke tracking** globally across all applications.
- 📊 **7-Day historical activity chart** rendered in a glowing neon bar graph.
- ⚡ **Live speed tracker** showing active typing speed (Keys/Second).
- 🎯 **Daily goal compliance** progress bar tracking performance against daily goal.
- 🎨 **Four neon themes** — Cyber Cyan, Solar Orange, Bio Green, Neon Pink.
- 📌 **Always‑on‑top** toggle to keep the widget above other windows.
- 🚀 **Autostart on boot** so the tracker is ready every time you log in.
- 🪟 **Frameless & draggable** — grab the header to move it anywhere.
- 💾 **Settings persist** locally between launches.
- 🧹 **Data purge button** inside settings to completely wipe historical records.

## Build from source

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org/) 18+
- Windows build tools for Tauri — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)

### Run in development

```bash
npm install
npm run tauri dev
```

### Build the installers

```bash
npm run tauri build
```

## Tech stack

- **[Tauri 2](https://tauri.app/)** — native shell & Rust backend
- **Rust** — global input hooking (`rdev` crate) and autostart via Windows registry
- **Vanilla HTML / CSS / JavaScript** — custom SVG charts and cyberpunk aesthetics

## License

Released under the [MIT License](LICENSE).
