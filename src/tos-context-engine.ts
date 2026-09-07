import type { TosClickPreset } from "./tos-presets.ts";

export type NormalizedRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TosUiState =
  | "yellow-quest-visible"
  | "quest-accept-visible"
  | "quest-action-visible"
  | "transitioning"
  | "idle"
  | "unknown";

export type TosFrame = {
  path: string;
  capturedAt: number;
};

export type TosDetection = {
  state: TosUiState;
  confidence: number;
  source: string;
  region?: NormalizedRegion;
};

export interface TosRoiDetector {
  readonly name: string;
  readonly state: Exclude<TosUiState, "unknown">;
  readonly region: NormalizedRegion;
  detect(frame: TosFrame): Promise<number>;
}

export type RgbPixel = {
  red: number;
  green: number;
  blue: number;
};

export interface TosRegionSampler {
  sample(frame: TosFrame, region: NormalizedRegion): Promise<RgbPixel[]>;
}

export type ColorRatioDetectorOptions = {
  name: string;
  state: Exclude<TosUiState, "unknown">;
  region: NormalizedRegion;
  target: RgbPixel;
  tolerance: number;
  fullConfidenceRatio?: number;
  sampler: TosRegionSampler;
};

export interface TosAiFallback {
  classify(frame: TosFrame): Promise<{
    state: TosUiState;
    confidence: number;
  }>;
}

export type TosContextDecision =
  | {
      kind: "click";
      state: TosUiState;
      preset: TosClickPreset;
      confidence: number;
      source: string;
    }
  | {
      kind: "wait";
      state: TosUiState;
      confidence: number;
      source: string;
    };

export type TosContextEngineOptions = {
  minimumConfidence?: number;
  aiFallback?: TosAiFallback;
};

const PRESET_FOR_STATE: Partial<Record<TosUiState, TosClickPreset>> = {
  "yellow-quest-visible": "yellow-quest",
  "quest-accept-visible": "quest-accept",
  "quest-action-visible": "quest-action",
};

export function createColorRatioDetector(
  options: ColorRatioDetectorOptions,
): TosRoiDetector {
  assertRgb(options.target, "target");
  if (!Number.isFinite(options.tolerance) || options.tolerance < 0) {
    throw new RangeError("tolerance must be a non-negative number.");
  }
  const fullConfidenceRatio = options.fullConfidenceRatio ?? 1;
  if (
    !Number.isFinite(fullConfidenceRatio) ||
    fullConfidenceRatio <= 0 ||
    fullConfidenceRatio > 1
  ) {
    throw new RangeError("fullConfidenceRatio must be greater than 0 and at most 1.");
  }

  return {
    name: options.name,
    state: options.state,
    region: options.region,
    async detect(frame) {
      const pixels = await options.sampler.sample(frame, options.region);
      if (pixels.length === 0) {
        return 0;
      }

      let matches = 0;
      for (const pixel of pixels) {
        assertRgb(pixel, "sampled pixel");
        const distance = Math.hypot(
          pixel.red - options.target.red,
          pixel.green - options.target.green,
          pixel.blue - options.target.blue,
        );
        if (distance <= options.tolerance) {
          matches += 1;
        }
      }
      return Math.min(1, matches / pixels.length / fullConfidenceRatio);
    },
  };
}

export class TosContextEngine {
  private readonly detectors: TosRoiDetector[];
  private readonly minimumConfidence: number;
  private readonly aiFallback?: TosAiFallback;

  constructor(
    detectors: TosRoiDetector[],
    options: TosContextEngineOptions = {},
  ) {
    this.detectors = detectors;
    this.minimumConfidence = options.minimumConfidence ?? 0.8;
    this.aiFallback = options.aiFallback;
    assertConfidence(this.minimumConfidence, "minimumConfidence");
  }

  async decide(frame: TosFrame): Promise<TosContextDecision> {
    const detections = await Promise.all(
      this.detectors.map(async (detector): Promise<TosDetection> => {
        const confidence = await detector.detect(frame);
        assertConfidence(confidence, `${detector.name} confidence`);
        return {
          state: detector.state,
          confidence,
          source: detector.name,
          region: detector.region,
        };
      }),
    );
    const best = detections.sort(
      (left, right) => right.confidence - left.confidence,
    )[0];

    if (best && best.confidence >= this.minimumConfidence) {
      return decisionFor(best);
    }

    if (this.aiFallback) {
      const fallback = await this.aiFallback.classify(frame);
      assertConfidence(fallback.confidence, "AI fallback confidence");
      return decisionFor({
        ...fallback,
        source: "ai-fallback",
      });
    }

    return {
      kind: "wait",
      state: "unknown",
      confidence: best?.confidence ?? 0,
      source: best?.source ?? "no-detector",
    };
  }
}

function decisionFor(detection: TosDetection): TosContextDecision {
  const preset = PRESET_FOR_STATE[detection.state];
  if (preset) {
    return {
      kind: "click",
      state: detection.state,
      preset,
      confidence: detection.confidence,
      source: detection.source,
    };
  }

  return {
    kind: "wait",
    state: detection.state,
    confidence: detection.confidence,
    source: detection.source,
  };
}

function assertConfidence(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be between 0 and 1.`);
  }
}

function assertRgb(pixel: RgbPixel, label: string): void {
  for (const [channel, value] of Object.entries(pixel)) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new RangeError(`${label} ${channel} must be an integer between 0 and 255.`);
    }
  }
}
