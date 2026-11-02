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

## What's in the game
- **Career:** three pool halls (The Corner Pocket, Kingsley Club, Grand Championship), three opponents each.
  Every opponent has a skill level and a playing style (shot-maker, safety player, bank specialist,
  all-rounder). Halls 2 and 3 are races to 2 and 3 frames. Clearing a hall opens the next room.
- **Quick play:** 8-ball, 9-ball or straight pool (race to 25) against the computer at four skill levels and
  four styles, or two players on one phone.
- **Trick shots:** 12 set-up puzzles (combinations, banks, kicks, two-in-one, position play), unlocked in order.
  Every puzzle was checked for solutions by a brute-force search on the real physics.
- **Tutorial:** a five-step guided lesson: aim, power, fine aim, backspin and ball in hand.
- **Coins and shop:** coins come only from playing (wins, career prize money, trick shots, achievements).
  They buy cues with real differences (aim-guide length, spin, power), cloths and rooms. No real money.
- **Stats and achievements:** win rate, longest run, bank shots and more; 25 achievements with coin rewards.
- **Replays:** great shots offer a slow-motion replay, and every result screen can replay the last shot.
- **Physics:** follow and draw, side spin off the cushions, swerve, cut-induced throw, pocket rattles.
- **Settings:** sound, vibration, aim-guide length, shot clock
  (off, 30 s, 15 s), large ball numbers for colour-blind players, left-handed controls.
- Portrait and landscape layouts; the Android back button opens the pause menu.

## Code layout
- `core.js`: table geometry, physics, rules for each game type and the computer player (no DOM; testable in Node)
- `render.js`: rooms, table, balls, cue and HUD, all drawn on the canvas
- `audio.js`: synthesised sound, room ambience and crowd
- `game.js`: game flow, career, trick shots, tutorial, shop, stats, replays, input and menus

## Publishing on Google Play
1. Create a Google Play developer account (one-time $25 fee) at https://play.google.com/console.
2. Create an upload key once, on any computer with Java installed:
   `keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
   Keep `upload.jks` and its passwords safe; you need them for every update.
3. In GitHub, go to **Settings → Secrets and variables → Actions** and add:
   - `ANDROID_KEYSTORE_BASE64`: the output of `base64 -w0 upload.jks`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`
4. Run the **Build 8-Ball APK** workflow. It then also produces `clubhouse-8ball.aab`
   (in the run's artifacts). Upload that file in Play Console.
5. Use `store/listing.md` for the store text and `store/*.png` for the graphics.
   The privacy policy is `pool/privacy.html` (hosted by GitHub Pages once merged to main).

Every build gets a higher version code automatically, so new uploads are accepted as updates.

## Files
- `pool/`: the game (HTML, JS, PWA manifest, service worker, icons)
- `pool-android/`: a minimal WebView wrapper that bundles `pool/` into an APK
- `.github/workflows/pool-android.yml`: CI that builds the APK (and the signed bundle)
- `store/`: Play Store listing text, icon, feature graphic and screenshots
