# Clubhouse 8-Ball

An original, ad-free, fully offline 8-ball pool game. No network calls, no
accounts, no tracking. All graphics are drawn in code (`game.js`), so there are
no third-party assets.

## Play on Android

**Option A: install the APK.** The GitHub Actions workflow
`Build 8-Ball APK` builds `clubhouse-8ball.apk` on every push that touches
`pool/` and attaches it to the **8ball-latest** release. Open that release on
your phone, download the APK and allow "install unknown apps" when asked. The
APK has no INTERNET permission, so it cannot show ads.

**Option B: install it as a web app.** Once this folder is served (for example
via GitHub Pages at `/pool/`), open it in Chrome on Android and choose
**Add to Home screen**. It then runs full-screen and offline.

## Controls
- **Aim:** touch or drag anywhere on the table. **Fine aim:** drag the wheel on the right.
- **Shoot:** pull the power bar on the left down, then let go.
- **Spin:** tap the cue ball icon (top right) and pick a contact point.
- **Ball in hand:** drag the cue ball.
- **On the 8-ball:** tap a pocket to call it before shooting.

## Rules (standard 8-ball)
- Break from behind the head string. Potting the 8 on the break respots it.
- The table stays open after the break; the first legal pot assigns solids or stripes.
- You keep shooting while you legally pot your own group.
- **Fouls** give the opponent ball in hand anywhere: scratching, hitting nothing,
  hitting the wrong group (or the 8) first, or no ball reaching a cushion after contact.
- You **win** by potting the 8 in the called pocket after clearing your group.
  You **lose** if you pot the 8 early, into the wrong pocket, or on a foul.

## Modes
vs Computer (Easy / Medium / Hard), 2 players pass and play, and Practice.

## Files
- `pool/`: the game (HTML, JS, PWA manifest, service worker, icons)
- `pool-android/`: a minimal WebView wrapper that bundles `pool/` into an APK
- `.github/workflows/pool-android.yml`: CI that builds the APK
