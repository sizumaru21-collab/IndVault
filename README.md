# IndVault

A pitch-black, zero-dependency minimalist vault & notes workspace built for speed, privacy, biometric security, and free real-time multi-device cloud sync.

[](https://sizumaru21-collab.github.io/IndVault/)

> 🔗 **Live Web App**: [https://sizumaru21-collab.github.io/VAULTNOTES/](https://sizumaru21-collab.github.io/IndVault/)

## Highlights

- **Pitch-Black Aesthetics**: Engineered with true blacks (`#000000`) and deep zinc surfaces (`#09090b` / `#121214`) to eliminate visual noise and reduce OLED battery drain.
- **Real-Time Multi-Device Sync (100% Free Forever)**: Instantaneous WebSocket (`onSnapshot`) synchronization between phone and laptop powered by Google Firebase Firestore (Spark Plan) alongside zero-latency `localStorage` offline persistence.
- **Biometric & PIN Lock Screen**: Simulated optical in-screen fingerprint sensor with pulse wave scanning animations, WebAuthn platform biometric authentication (Touch ID / Face ID), and 4-digit PIN fallback.
- **Synthesized Audio Haptics**: Native Web Audio API tone synthesis with zero external audio assets—dynamic oscillator ticks (140 Hz → 70 Hz), two-tone harmonic unlock chords (587.33 Hz / 880 Hz), and error buzz tones.
- **Three Switchable Layouts**:
  - **Keep Grid**: Fluid masonry-style note cards with pinned sections.
  - **Clean List**: Dense, distraction-free stream view for rapid scanning.
  - **Apple Split**: Dual-pane editor with live title/body text binding and real-time word counter.
- **Data Mobility**: Instant one-click individual Markdown (`.md`) export, full workspace JSON backups, and lossless JSON restores.
- **PWA & Lightweight APK Ready**: Includes `manifest.json` for full-screen mobile installation on iOS/Android or packaging into a ~2 MB native Android `.apk` via PWABuilder.

## Quick Start (Deploy in 30 Seconds)

1. Upload `index.html`, `manifest.json`, and `README.md` to the root of your GitHub repository.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
4. Click **Save**. Your workspace will be live at `https://sizumaru21-collab.github.io/IndVault/`.

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘ + N` / `Ctrl + N` | Expand quick note composer |
| `Esc` | Clear search / close active modal |
| `0` – `9` | Enter passcode digits on lock screen |
| `Backspace` | Delete last passcode digit |
| `Enter` | Trigger biometric scan authentication |

## Tech Stack

- **Markup & Logic**: HTML5 + Vanilla ECMAScript (ES6+)
- **Styling**: Tailwind CSS (via CDN) + Inter & JetBrains Mono typography
- **Audio Engine**: Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
- **Storage & Sync**: Browser `localStorage` + Firebase Firestore Compat SDK (`10.12.0`)

## License

MIT © [sizumaru21-collab](https://www.google.com/search?q=https://github.com/sizumaru21-collab)
