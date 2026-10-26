# IndVault security notes

## Current starter scope
- Browser Web Crypto AES-GCM encrypts each note before it is written to IndexedDB or Firestore.
- PBKDF2-HMAC-SHA-256 with 600,000 iterations derives an AES-256 key from the vault password. This is a browser-native, portable baseline, not a claim that this is the strongest possible password KDF. A later reviewed Argon2id implementation may be evaluated.
- Each encryption operation uses a fresh 96-bit random IV generated with `crypto.getRandomValues`.
- Firebase account password is separate from the vault password.
- Firestore rules scope access to the signed-in user's UID.

## Known limitations — do not skip
- This starter has not received an independent audit or penetration test.
- No formal recovery-key workflow exists. Losing the vault password can mean permanent loss of the encrypted data.
- Sync is deliberately manual and basic. Simultaneous edits and offline conflict resolution are not yet production-grade.
- A compromised browser, malicious extension, XSS, compromised deployment, or keylogger can capture plaintext while the vault is unlocked.
- Browser JavaScript cannot guarantee secure memory erasure.
- Account metadata, note IDs, ciphertext sizes, and timestamps may be visible to the service.
- This implementation does not include a native Android app, Android Keystore, BiometricPrompt, passkeys, or verified device biometrics.
- Exported encrypted backups are useful only if you remember the vault password. Never export plaintext backups for sensitive material.
- Firebase config in a browser is not a secret; Firestore rules and Authentication are essential. Never use `allow read, write: if true`.
- Do not connect the old plaintext vault to this app or automatically import its old storage. Migrate only after making a private backup and reviewing the migration plan.

## Release gate
Do not use real high-risk secrets until:
1. Firebase rules are deployed and tested with two separate accounts.
2. Wrong vault passwords fail to decrypt data.
3. The browser's IndexedDB and Firestore contain ciphertext only, not note titles/body.
4. Backup/restore, data loss, conflict, offline and quota cases are tested.
5. A security reviewer inspects the actual deployed code, dependencies, rules, and key handling.
