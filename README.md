# ClipStack

Minimal Electron + TypeScript clipboard history app by Simon Van Tomme.

## Features

- Electron desktop app (Windows-focused) written in TypeScript
- Polls the system clipboard every 500 ms
- Stores clipboard text to a local SQLite database via `better-sqlite3`
- Each entry has: `id`, `content`, `timestamp`, `pinned`
- UI:
  - Search bar
  - Scrollable list of entries
  - Per-entry actions: Copy / Pin–Unpin / Delete
  - Clear-all button
- Global hotkey: `Ctrl + Shift + H` toggles the main window
- Optional tray icon with Show/Hide and Quit
- Packaged with `electron-builder` for Windows

## Requirements

- Node.js (LTS recommended)
- npm
- Windows 10 or later (project is configured/tested for Windows)

## Getting Started

From the project root:

```powershell
## ClipStack – Minimal Clipboard History for Windows

ClipStack is a small Electron app that keeps a searchable history of your clipboard (text + images) with pinning, pause, and configurable history size.

> **Status:** This project is feature-complete and not actively updated anymore.

### Features

- Text and image clipboard history
- Pinned entries that are never auto-deleted
- Pause / resume tracking with a single button
- Configurable max history size with an optional "Uncapped" mode
- Search bar to filter history
- Clean dark UI tuned for a small always-on window

### Getting Started

Install dependencies:

```powershell
npm install
```

Run the app in development:

```powershell
npm start
```

Build the compiled app (for packaging / release):

```powershell
npm run build
```

Create a Windows installer (requires electron-builder):

```powershell
npm run dist
```

Built files are output to the `dist/` folder.

### Getting the Installer

- If you're cloning this repo:
  - Build locally with `npm run build` and `npm run dist`, then run the generated `.exe` from the `dist/` folder.
- If you're just a user:
  - Download the latest `.exe` from the GitHub **Releases** page for this repo.

Note: the `dist/` folder is ignored in git so large binaries are not stored in the repository; they are either built locally or attached to Releases.

### Folder Structure

- `src/main.ts` – Electron main process (window, tray, clipboard, DB wiring)
- `src/preload.ts` – Safe bridge between main and renderer
- `src/renderer/app.ts` – UI logic, rendering entries and handling user actions
- `src/database.ts` – SQLite schema, history storage, and max history settings
- `src/index.html` / `src/style.css` – UI layout and styling

### Notes

- The app stores history in a local SQLite database under your user data folder.
- The max history cap (or uncapped mode) is persisted between runs.
- This repo is ready to push to GitHub; `node_modules`, build artifacts, and local configs are ignored via `.gitignore`.
Clipboard data is stored in a SQLite database file under Electron's `userData` directory (per user and app).

## Packaging for Windows

To build a distributable installer using `electron-builder`:

```powershell
npm run build
npm run dist
```

After `npm run dist`, the installer `.exe` will be placed under the `dist/` folder. Run it to install ClipStack like a normal Windows app.

## Auto-updates (via GitHub Releases)

ClipStack can self-update when installed from a packaged build:

1. Create a personal access token on GitHub with `repo` scope and store it safely (e.g. in a password manager).
2. When you want to publish a new version:
   - Bump the `version` field in `package.json`.
   - In PowerShell, from the project root:

     ```powershell
     $env:GH_TOKEN = "YOUR_GITHUB_TOKEN_HERE"
     npm run build
     npm run dist
     ```

   - `electron-builder` will publish artifacts to the `ClipStack-Minimal-Clipboard-History-App` GitHub repository.
3. Installed copies of ClipStack will check GitHub Releases for updates on startup and download/apply them automatically.

## Project Structure

- `package.json` – scripts and dependencies
- `tsconfig.json` – TypeScript configuration
- `src/`
  - `main.ts` – Electron main process, window creation, clipboard polling, tray, IPC
  - `preload.ts` – Exposes a safe `window.clipstack` API to the renderer
  - `database.ts` – SQLite (better-sqlite3) access layer
  - `index.html` – Renderer HTML shell
  - `style.css` – UI styles
  - `renderer/app.ts` – Renderer logic and DOM updates

## Development Notes

- The app uses `better-sqlite3` for synchronous, file-based SQLite access.
- IPC channels are defined in `main.ts` and exposed to the renderer via `preload.ts`.
- Renderer code is plain browser JavaScript (no bundler), compiled from TypeScript.

## License

This project is licensed under the MIT License. See `LICENSE` for details.