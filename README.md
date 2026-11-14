# CineMind Main Frontend

Cross-platform CineMind AI frontend: web editor, Tauri desktop shell, and Flutter mobile application, with shared timeline, render graph, and media analysis packages.

The backend is maintained separately. Video and audio source media stay on the user's device.

## Web

Requires Node.js 20 or newer.

```sh
npm install
npm run dev:web
```

## Desktop

```sh
npm run dev --workspace @cinemind/desktop
```

## Mobile

Open `apps/mobile` with Flutter tooling.
