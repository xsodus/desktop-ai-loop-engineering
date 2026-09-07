---
name: run-tree-of-savior-m-extreme-quests
description: Run the visible yellow main quest in Tree of Savior M Extreme on macOS using visual Computer Use until no yellow quest remains on the HUD. Use when the user wants to continue, resume, or complete TOS M Extreme quests; launch and session-entry steps are only setup or recovery for reaching the quest loop.
---

# Run Tree Of Savior M Extreme Quests

> Example only. Verify compliance with software Terms of Service before use.

## When To Use

Use this skill when the goal is to keep playing the visible yellow main quest in
`Tree of Savior M Extreme` until no yellow quest card remains on the HUD. Dim or
gray quest cards may remain and do not block completion. Launch, title
screen, barrack, and character-selection actions exist only to reach or recover
the active quest session.

The game may be installed as an iOS-on-Mac wrapper. Spotlight can surface the
app even when LaunchServices rejects path-based `open` commands against the
top-level container or nested `Wrapper/TOSM TH.app` bundle.

## Workflow

### Computer Use (Primary)

Use `mcp__cua_repl` for all game screenshots, clicks, and keyboard input.
Do not run the repository controller, `doctor`, `loop-observe`, shell-based UI
commands, OCR, or image samplers in the normal workflow. A user request for pure
Computer Use keeps the whole game loop on this interface. Use a different
controller only when the user explicitly requests it.

1. Select `Tree of Savior M Extreme` with `cua.getApp(...)`. Follow the tool's
   first-call documentation and reuse the resulting app binding throughout.
2. If the name does not resolve, call `cua.listApps()` and retry with the returned
   bundle identifier. If duplicate wrapper apps make it ambiguous, select the
   full path reported by the tool, preferring the running wrapper. Never hardcode
   a temporary wrapper path from a previous session.
3. Capture the game window with `game.getScreenshot()`. App selection can launch
   the app; a process entry alone does not prove the game window is ready.
4. Use screenshot coordinates for game controls because its accessibility tree
   may expose only the window and menu bar. Derive each target from the current
   screenshot; never reuse coordinates after resizing or a layout change.
5. After each state-changing input, refresh AX state and inspect a fresh game
   screenshot before deciding the next input. For this visually rendered game,
   suppress repeated AX text while still performing the required refresh:

   ```javascript
   await game.click([x, y]);
   await game.getAXState({ emit: false });
   await game.getScreenshot();
   ```

If Computer Use reports missing access or cannot capture/control the window,
report the concrete blocker. Do not claim the quest loop ran or switch silently
to another controller.

### Token-Efficient Observation

- Read this skill once. Reuse the app binding and discovered identity; do not
  repeatedly list apps or reload tool documentation.
- Emit one game-window screenshot per decision. Do not wrap auto-emitting
  screenshot APIs in `emitImage`, emit the same image twice, or request both
  `getAXStateAndScreenshot()` and a separate screenshot for the same state.
- Game visuals are authoritative. Suppress the uninformative AX tree using
  `emit: false`; if an actual accessible dialog needs element indices, emit a
  fresh tree before using those indices.
- Batch one chosen action plus its AX refresh and screenshot in one call.
  Never batch speculative clicks across unseen dialogue/reward states.
- During verified progress use the wait intervals below, then take one fresh
  screenshot. Avoid rapid unchanged screenshots. Near a destination or dialogue
  transition choose the shorter end; sustained travel/combat can use the longer
  end. Never wait when a reward is already visible.
- Verify the potion from the same HUD screenshot used to choose the next quest.
  Open its settings only when necessary. Inspect Fellow on initial entry and
  after recovery/map changes/reloads, rather than reopening it every quest.
- Keep only a compact working state: current quest/objective, verified progress,
  potion stack, fellow verification for the current session/map, auto-talk,
  and `empty_state_count`. Do not transcribe whole dialogue or chat logs.
- Give concise updates on meaningful progress, blockers, or roughly once per
  minute during sustained work. Do not narrate every screenshot or click.
- Token savings must not remove post-action visual verification, potion checks,
  reward handling, or any of the three final exhaustion observations. Do not
  infer success from an unchanged AX tree or hidden tracker.

### Title Screen

1. If the game opens on the title/server screen, keep the default server unless the user asked for a different one.
2. Click or tap the main title screen area to enter the game.
3. If the title screen returns after a timeout, repeat the same click-to-enter step before looking for deeper UI.

### Quest Loop

Use Computer Use window screenshots for visual decisions and its click/key APIs
for interaction. Maintain `empty_state_count` in the persistent session or working
state; no controller command is needed to record observations.

This is a persistent loop. Do not return control to the user after launching,
entering the game, accepting one reward, or starting one objective. Continue
capturing and acting until the explicit exhaustion check below succeeds.

1. If the app is not frontmost, select the game app and raise its window using the available Computer Use actions.
   A `TOSM TH` process with no window does not count as running: relaunch it.
1. If the game is on the barrack screen, click the visible `Start` button to enter the session.
1. On the character screen, select the available or previously used character, then activate the visible enter/start control.
1. Once in game, inspect the quest tracker and nearby objective markers.
1. Check whether fellows are deployed before running objectives. The circular
   portraits beside the skill bar do not prove that fellows occupy the active
   team. Open `Fellow` with the fourth icon in the top-right menu row and inspect
   the two team slots in the lower-right `จัดทีม` panel.
1. Fill both empty team slots when two safe fellows are available. Select the
   previously used, highest-level, or clearly recommended fellow, click `Join`,
   click the intended `+` team slot, then confirm `ร่วมทาง` in the notification.
   Joining deducts one point from that fellow's stamina; this is normal
   deployment, not a purchase. Repeat for the second slot and verify that both
   slots show fellow cards before closing the screen.
1. Do not treat the selected fellow's large center model or the bottom roster as
   deployed-state evidence. Do not click `Remove`, purchase, fuse, dismiss,
   delete, or upgrade fellows unless the user explicitly asks. If fewer than two
   fellows can be safely selected, deploy the available fellow and continue.
1. Before activating each new yellow main quest, inspect the first slot in the
   top row at the left edge of the skill bar. This is the configurable
   auto-potion slot. A potion marked with a Roman numeral I–VI and a positive
   quantity is the assigned stack; for example, `IV` with `131` means Potion IV
   is assigned with 131 remaining. Do not confuse the lower red-outlined
   utility slots with auto-potion slots.
1. Do not click the assigned potion merely to verify it: clicking the potion
   consumes one immediately. Preserve a visible existing assignment. Only open
   configuration when the first top-row slot is empty or its automatic-use
   state is ambiguous; then assign an available I–VI potion, confirm a positive
   quantity, and preserve the existing trigger threshold. If the threshold is
   unset, use the game's default or clearly recommended value. Do not buy
   potions or spend currency. Capture a fresh screenshot after any change and
   verify the first top-row slot before closing the controls.
1. Re-run the auto-potion check even if it passed for the previous quest.
   Re-check it after recovery, character reload, or any map/session transition.
   Do not activate the new quest until the check passes. Use potions already in
   inventory; do not buy potions or spend currency without explicit permission.
1. Treat the yellow quest card at the top of the HUD tracker as the required
   main quest. Dim or gray cards below it are not part of this skill's completion
   goal. A visible yellow quest card is not necessarily active, even when
   unrelated auto-combat is running. Click the yellow quest card to activate it,
   capture a fresh
   screenshot, and confirm that auto-path, dialogue, an objective marker, or
   another quest-specific state begins. If it does not activate, inspect a fresh screenshot and retry the visible
   yellow entry; do not activate a gray quest as a fallback.
1. When dialogue first appears, inspect the visible auto-talk control. If it is
   `None` or off, click its slider once and confirm it displays a timed interval
   such as `6 seconds`. Leave auto-talk enabled for the rest of the loop so
   dialogue pages advance without blocking.
1. Treat a normal quest-completion reward dialog as the highest-priority
    actionable state. Immediately click the teal `ตอบรับ` (Accept) button
    before waiting, relaunching, or interacting with the quest tracker. Do not
    click `ปฏิเสธ` (Decline). This permission applies only to ordinary quest
    rewards and does not authorize purchases or premium-currency choices.
1. Immediately after accepting a reward, capture a fresh screenshot. Before
    clicking the next visible yellow main quest, complete the auto-potion check
    again. Accepting a reward is never a stopping condition.
1. While dialogue with auto-talk is active, wait only 5 through 8 seconds,
    capture a fresh screenshot, and immediately accept any resulting `ตอบรับ`
    reward dialog. While verified quest auto-path, quest combat, loading, or an
    objective animation is visibly progressing, choose a new random wait from
    15 through 60 seconds, wait that duration, capture a fresh screenshot, and
    continue the loop. Do not repeatedly click the tracker while verified quest
    progress is active. Generic auto-combat without a quest-specific indicator
    does not count as verified quest progress.
1. If a yellow quest card is visible and no verified quest progress is active,
    first pass the auto-potion check, then click that yellow card. Do this even
    if the character is fighting nearby enemies. Capture a fresh screenshot
    after every click and verify that it starts a quest-specific state. Do not
    activate dim or gray quest cards merely to satisfy this skill.
1. Re-check for a fellow after session recovery, map changes, or character
    reloads. If the fellow disappears, repeat the fellow check before continuing
    quests.
1. Never infer exhaustion from a hidden tracker during combat, dialogue,
    loading, a reward dialog, a transition, or a cinematic.
1. Count a goal-complete state only when a fresh screenshot shows an idle,
    unobstructed in-game HUD with no yellow quest card. Dim or gray quest cards
    may remain. Require three goal-complete states, each separated by 5 seconds.
    Reset the count to zero whenever a yellow quest card or quest progress state
    appears.
1. Stop only after the third consecutive confirmed goal-complete state. Report
    that no yellow quest remains on the HUD.

Use this literal control structure; a status update never exits it:

```text
empty_state_count = 0
while empty_state_count < 3:
    capture and inspect a fresh game-window screenshot
    if idle, unobstructed, and no yellow quest card:
        increment empty_state_count
        if empty_state_count < 3: wait 5 seconds
    else:
        reset empty_state_count to zero
        handle the highest-priority state
```

Do not report completion unless three final screenshots visibly confirm that no
yellow quest card remains on the unobstructed HUD. Gray quest cards do not block
completion.

### Timeout Recovery

### Battery Saver Mode

The game can intentionally render a fully black game window while Battery Saver
mode is active. Treat this as an idle-display state, not a crash, disconnect,
loading failure, or quest-exhaustion state. Capture a fresh screenshot and
click/tap the game window once to wake it, then refresh AX state and capture a
new screenshot before resuming the quest loop. Do not count repeated black
Battery Saver screenshots as recovery failures, and do not relaunch the game
solely because of this display state.

If the session times out, disconnects, returns to title, or gets stuck on a loading/session screen:

1. If the game window is temporarily unavailable, reacquire the app through
   Computer Use using the discovery rules above. Capture a fresh screenshot and
   inspect the recovered state before counting a retry.
2. If the recovered state contains a `ตอบรับ` reward dialog, click it
   immediately and resume the quest loop. Do not classify the interruption as
   a repeated loading failure.
3. Otherwise return to the app-selection/start flow.
4. Touch/click to start the game.
5. Select the character again if prompted.
6. Resume the quest loop.

Recover transient failures and resume the loop. If three recovery attempts show
the same blocker with no progress, report that blocker without claiming quest
completion. Stop for user interruption or a required user action. Loading,
pre-game screens, and tool failures never count as quest exhaustion.

## Notes

- Use this workflow for the specific game, not as a generic app-launch pattern.
- Favor the exact app title when available, since it avoids ambiguity in Spotlight.
- A wrapper installation may contain the nested bundle at `Tree of Savior M Extreme.app/Wrapper/TOSM TH.app`; direct `open` can fail with `incorrect executable format`.
- Treat the visible game window title as the success check.
- Treat the title/server screen as a real pre-game state, not as launch failure.
- Treat the barrack screen as the handoff point into the session via `Start`.
- Keep a fellow/companion active when the UI provides a safe summon or deploy action.
- Treat a hidden or ambiguous tracker as non-terminal until the three-screenshot
  no-yellow-quest check succeeds. Do not invent an objective; capture again and
  continue the loop.
- Do not spend premium currency, delete items, change account settings, or make irreversible choices unless the user explicitly asks.
