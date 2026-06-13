# Capsule Tasks

[中文](README.md) | [English](README.en.md)

![Capsule Tasks hero](docs/assets/hero.png)

Capsule Tasks is a clean local desktop task app. It is not trying to become a heavy project-management system. Its job is simpler: when you open the app, you should immediately see what is worth moving forward today.

The app includes a cartoon companion named Samguo. Samguo gives lightweight feedback based on your task state: welcoming, focusing, reminding, and celebrating completion. It adds warmth without getting in the way of your workflow.

## Preview

![Product preview](docs/assets/product-preview.png)

![Samguo feature](docs/assets/samguo-feature.png)

## Who It Is For

- People who want a desktop task app with local data storage.
- People who want today, overdue, pinned, and high-priority tasks to surface first.
- People who enjoy calm productivity tools with a small amount of cartoon personality.
- People who do not want a simple task app to turn into a complex project-management system.

## Features

- **Today-first view**: overdue, today, pinned, high-priority, and upcoming tasks naturally rise to the top.
- **Local data**: tasks and settings are stored locally with `electron-store`.
- **Samguo feedback**: the companion card changes copy and color based on empty, overdue, today, and completed states.
- **Completion stamp**: completed tasks receive a small "已收纳" sticker-style stamp.
- **Undo delete**: deleted tasks can be restored from the toast action.
- **Smart input**: supports `今天`, `明天`, `周末`, `高`, `中`, `低`, `#tag`, and `project:name`.
- **Reminders and tray**: due reminders, tray presence, quick open, and quick add.
- **Import, export, and backups**: JSON import/export, automatic backups, and restore from backup.
- **Chinese-first UI**: interface copy, empty states, settings, and feedback are written in Chinese.

## Design Direction

Capsule Tasks is intentionally not a "do everything" app. The core path should stay clear:

```text
Open the app -> See what matters today -> Add quickly -> Complete and collect
```

Less frequent tools are kept in side panels or settings so the main surface can stay focused on today's tasks.

## Quick Start

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run start
```

Build a Windows installer:

```bash
npm run dist
```

Build output is generated in the `release/` directory.

## Tech Stack

- Electron
- JavaScript / HTML / CSS
- electron-store
- electron-builder

## Project Structure

```text
src/
  main.js                    Electron main process, storage, tray, notifications, IPC
  preload.js                 Secure bridge exposing window.capsule
  tray-icon.png              Windows tray icon
  renderer/
    index.html               UI structure
    styles.css               Visual style and animations
    renderer.js              Renderer state and interactions
    assets/                  Samguo and empty-state illustrations
scripts/
  patch-win-icon.js          Windows executable icon patch script
docs/
  assets/                    README preview images
```

## Version

Current version: `1.1.0`

See [CHANGELOG.md](CHANGELOG.md) for more details.

## License

[ISC](LICENSE)
