import assert from "node:assert/strict";
import test from "node:test";
import {
  TosContextEngine,
  createColorRatioDetector,
  type TosAiFallback,
  type TosFrame,
  type TosRoiDetector,
  type TosUiState,
} from "../src/tos-context-engine.ts";

const frame: TosFrame = {
  path: "/tmp/tos-frame.png",
  capturedAt: 1,
};

function detector(
  name: string,
  state: Exclude<TosUiState, "unknown">,
  confidence: number,
): TosRoiDetector {
  return {
    name,
    state,
    region: { x: 0, y: 0, width: 0.25, height: 0.25 },
    async detect() {
      return confidence;
    },
  };
}

test("uses the highest-confidence ROI detector without calling AI", async () => {
  let aiCalls = 0;
  const aiFallback: TosAiFallback = {
    async classify() {
      aiCalls += 1;
      return { state: "quest-action-visible", confidence: 0.99 };
    },
  };
  const engine = new TosContextEngine(
    [
      detector("yellow-quest-roi", "yellow-quest-visible", 0.91),
      detector("accept-button-roi", "quest-accept-visible", 0.84),
    ],
    { aiFallback },
  );

  const decision = await engine.decide(frame);

  assert.deepEqual(decision, {
    kind: "click",
    state: "yellow-quest-visible",
    preset: "yellow-quest",
    confidence: 0.91,
    source: "yellow-quest-roi",
  });
  assert.equal(aiCalls, 0);
});

test("calls AI only when every ROI detector is below the threshold", async () => {
  let aiCalls = 0;
  const engine = new TosContextEngine(
    [detector("accept-button-roi", "quest-accept-visible", 0.62)],
    {
      minimumConfidence: 0.8,
      aiFallback: {
        async classify() {
          aiCalls += 1;
          return { state: "quest-action-visible", confidence: 0.93 };
        },
      },
    },
  );

  const decision = await engine.decide(frame);

  assert.equal(aiCalls, 1);
  assert.deepEqual(decision, {
    kind: "click",
    state: "quest-action-visible",
    preset: "quest-action",
    confidence: 0.93,
    source: "ai-fallback",
  });
});

test("does not click when the classified state has no safe preset", async () => {
  const engine = new TosContextEngine(
    [detector("transition-roi", "transitioning", 0.95)],
  );

  assert.deepEqual(await engine.decide(frame), {
    kind: "wait",
    state: "transitioning",
    confidence: 0.95,
    source: "transition-roi",
  });
});

test("waits instead of guessing when confidence is low and AI is absent", async () => {
  const engine = new TosContextEngine(
    [detector("yellow-quest-roi", "yellow-quest-visible", 0.45)],
  );

  assert.deepEqual(await engine.decide(frame), {
    kind: "wait",
    state: "unknown",
    confidence: 0.45,
    source: "yellow-quest-roi",
  });
});

test("rejects invalid detector confidence", async () => {
  const engine = new TosContextEngine(
    [detector("broken", "yellow-quest-visible", 1.2)],
  );

  await assert.rejects(engine.decide(frame), /must be between 0 and 1/);
});

test("color detector scores the matching pixel ratio inside its ROI", async () => {
  const region = { x: 0.05, y: 0.1, width: 0.2, height: 0.15 };
  const seenRegions: typeof region[] = [];
  const colorDetector = createColorRatioDetector({
    name: "yellow-quest-color",
    state: "yellow-quest-visible",
    region,
    target: { red: 245, green: 200, blue: 40 },
    tolerance: 20,
    sampler: {
      async sample(_frame, sampledRegion) {
        seenRegions.push(sampledRegion);
        return [
          { red: 245, green: 200, blue: 40 },
          { red: 250, green: 195, blue: 42 },
          { red: 30, green: 30, blue: 30 },
          { red: 20, green: 20, blue: 20 },
        ];
      },
    },
  });

  assert.equal(await colorDetector.detect(frame), 0.5);
  assert.deepEqual(seenRegions, [region]);
});

test("color detector returns zero for an empty ROI sample", async () => {
  const colorDetector = createColorRatioDetector({
    name: "empty",
    state: "yellow-quest-visible",
    region: { x: 0, y: 0, width: 0.1, height: 0.1 },
    target: { red: 255, green: 200, blue: 0 },
    tolerance: 10,
    sampler: {
      async sample() {
        return [];
      },
    },
  });

  assert.equal(await colorDetector.detect(frame), 0);
});
