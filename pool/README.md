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
- **Rivals with personalities:** 12 characters, each with a portrait drawn in code, a playing style, a
  skill level and their own lines. They greet you, gloat, sulk, taunt and react to your shots in speech
  bubbles, with faces that change expression and cartoon voice blips (switchable).
- **World Tour:** four knockout tournaments (Corner Pocket Cup, Kingsley Club Open, Neon Nights 9-Ball,
  Grand Championship). Eight players, quarter-final to final, entry fee and prize money, a live bracket
  with the other matches played out, and trophies. Winning an event opens the next venue. The final boss
  is The Queen.
- **VS screen** before every match, with both portraits and the rival's opening line.
- **Your player:** pick a name and build your character in the locker (skin, hair, facial hair,
  headwear, glasses, outfit, colours, background). Some items cost credits; some are tour trophies only.
- **Credits and progression:** credits for wins, tour prizes, trick shots, achievements, level-ups and a
  7-day daily bonus. XP and levels with ranks from Rookie to Legend.
- **Cues:** six cues with different aim, spin and power, each upgradable to ★3 per stat.
- **Quick chat:** send a line ("Nice shot!", "Is that all you've got?") and your rival answers in character.
- **Quick play:** 8-ball, 9-ball or straight pool against a random rival at four levels, or two players.
- **Trick shots, tutorial, replays, stats and 26 achievements, shot clock, accessibility options.**

## Code layout
- `core.js`: table geometry, physics, rules for each game type and the computer player (no DOM; testable in Node)
- `render.js`: rooms, table, balls, cue and HUD, all drawn on the canvas
- `audio.js`: synthesised table sounds and character voice blips
- `people.js`: portrait renderer, the cast of rivals and their lines, speech bubbles
- `meta.js`: World Tour, VS screen, levels, daily bonus, cue upgrades, locker, quick chat
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
