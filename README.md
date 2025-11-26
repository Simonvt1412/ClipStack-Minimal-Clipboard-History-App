# ClipStack

Minimal Electron + TypeScript clipboard history app.

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
cd "clipstack"
npm install
npm run build
npm start
```

- `npm run build` compiles TypeScript and copies static assets into `dist/`.
- `npm start` launches Electron using the compiled `dist` files.

## Usage

- Run `npm start` to launch ClipStack.
- The window should open showing:
  - App title
  - Search bar
  - Empty list ("No entries yet") if you haven't copied anything.
- Copy text in any application (e.g., Notepad); within ~0.5 seconds it appears in the list.
- For each entry you can:
  - **Copy**: copies the entry back to the clipboard.
  - **Pin / Unpin**: pins important entries to the top of the list.
  - **Delete**: removes an entry from the database.
- The **search bar** filters by content (substring match).
- The **Clear** button clears all history.
- Global hotkey **Ctrl + Shift + H** toggles the window visibility.

Clipboard data is stored in a SQLite database file under Electron's `userData` directory (per user and app).

## Packaging for Windows

To build a distributable installer using `electron-builder`:

```powershell
cd "clipstack"
npm run build
npm run dist
```

After `npm run dist`, the installer `.exe` will be placed under the `dist/` folder. Run it to install ClipStack like a normal Windows app.

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
