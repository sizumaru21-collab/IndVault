# VAULTNOTES

A minimalist, pitch-black notes workspace built with HTML, CSS, and JavaScript.

> **Security notice:** This version is a local notes app with a PIN-gated interface. The PIN is **not encryption**. Notes are stored in browser `localStorage` and may be readable to someone with access to the browser profile or developer tools. Do not store passwords, recovery codes, financial details, or other highly sensitive information here.

## What this safety patch changes

- Removes the fake fingerprint scan that previously unlocked the app without checking identity.
- Prevents the Enter key from bypassing the PIN.
- Removes the PIN reveal after a failed attempt.
- Disables Firebase cloud writes because the previous implementation uploaded readable notes and treated a shared passphrase as if it were authentication.
- Clears previously saved Firebase configuration and sync passphrase from this browser. **This does not delete notes already uploaded to a Firebase project.**
- Updates app metadata and documents the real security limits.

## Files

Keep these three files together in the repository root:

- `index.html` — app interface and logic
- `manifest.json` — installable-app metadata
- `README.md` — project documentation

## Deploy with GitHub Pages

1. Back up your current repository and export your notes as a JSON backup from the app before replacing files.
2. Upload the three files above to the root of your GitHub repository, replacing the old versions.
3. In GitHub, open **Settings → Pages**.
4. Set **Build and deployment** to **Deploy from a branch**, choose your main branch and `/(root)`, then save.
5. Open the Pages URL shown by GitHub. Use that exact URL; the repository name determines the path.

## Local use and backups

- Open `index.html` in a modern browser. Some browser features work more reliably when served from GitHub Pages or another HTTPS origin.
- Notes are saved in the current browser profile. Clearing site data, changing browsers, or using a different device will not move notes automatically.
- Use the app's JSON export regularly and keep a backup somewhere separate from this browser.
- If the app already contains notes, export them **before** replacing the file. The code patch does not intentionally clear the `notes_app_data` notes key.

## Cloud sync status

Cloud sync is intentionally disabled in this build. The previous approach uploaded note contents as readable Firestore data, used a passphrase only as a document identifier, and did not implement proper user authentication or end-to-end encryption. Do not re-enable it by adding permissive Firestore rules. A secure implementation needs authenticated users, restrictive Firestore Security Rules, encryption before upload, key recovery design, and conflict resolution.

## PWA / offline status

`manifest.json` supplies installation metadata; it does **not** by itself make the app work offline. This project still loads Tailwind CSS and fonts from external CDNs, so full offline operation is not guaranteed. A service worker and locally bundled assets would be needed for a reliable offline-first PWA.

## Tech stack

- HTML5 and vanilla JavaScript
- Tailwind CSS via CDN
- Google Fonts (Inter and JetBrains Mono)
- Browser `localStorage` for local persistence
- Web Audio API for interface sounds

This is not zero-dependency and the interface PIN should not be described as secure vault encryption.

## License

Add a `LICENSE` file containing the full MIT License text if you intend to distribute this project under MIT. A README statement alone is not a substitute for the license file.
