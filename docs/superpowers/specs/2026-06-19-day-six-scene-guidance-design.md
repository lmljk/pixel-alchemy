# Day Six Scene Guidance Design

## Goal

Make the existing example scenes easier to understand without expanding the simulation rules. After a user loads a scene, the app should explain what to watch and nudge them toward single-step playback.

## Recommended Approach

Use the existing `EXAMPLE_SCENES` data as the source of truth and add a short `description` field to each scene. This keeps scene labels, IDs, setup logic, and user-facing guidance together.

Alternatives considered:

- Add a separate help panel with hard-coded copy in `App`. This is fast but duplicates scene knowledge outside the scene module.
- Add a tutorial modal. This has more visual polish, but it is too heavy for the day-six scope.
- Recommended: add scene metadata and a small inline status card. It is testable, low risk, and improves the demo immediately.

## Behavior

- Each scene keeps its current button label and gains one concise description:
  - `熔岩遇水`: `熔岩遇水会变成石头，并冒出蒸汽。`
  - `酸液腐蚀`: `酸液会咬掉墙和石头，自己也一起消失。`
  - `植物生长`: `植物吸收水后会向周围扩散。`
  - `油火反应`: `火会点燃油，火焰向上漂。`
- Before a scene is selected, the app should not show a scene status card.
- After a scene is selected, the app pauses the simulation as it does today and shows:
  - `当前示例：<label>`
  - the selected scene description
  - `建议：点“单步”慢慢观察反应。`
- Clearing the canvas should hide the current scene status card, because the active example is no longer on screen.
- Manual drawing and changing materials do not need to hide the card; the card is just guidance for the last loaded scene.

## Architecture

- Extend `ExampleScene` in `src/simulation/exampleScenes.ts` with `description`.
- Keep `applyExampleScene` unchanged except for any local cleanup needed by the type update.
- Store `activeSceneId` in `App`.
- Derive `activeScene` from `EXAMPLE_SCENES` in `App`.
- Render the guidance card near the canvas so it visually belongs to the scene, not to the toolbar.
- Reset `activeSceneId` when the user clicks `清空`.

## Testing

- `exampleScenes.test.ts` verifies the stable scene descriptions.
- `App.test.tsx` verifies no status card appears before selection, clicking `熔岩遇水` shows the correct guidance, and clearing hides it.
- Run full `npm test` and `npm run build`.

## Out Of Scope

- New materials or reactions.
- Multi-step tutorial overlays.
- Saving active scene metadata into share URLs.
