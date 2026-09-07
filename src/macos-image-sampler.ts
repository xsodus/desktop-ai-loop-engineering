import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import {
  type NormalizedRegion,
  type RgbPixel,
  type TosFrame,
  type TosRegionSampler,
} from "./tos-context-engine.ts";

const execFileAsync = promisify(execFile);

const SAMPLE_IMAGE_SOURCE = `
import CoreGraphics
import Foundation
import ImageIO

struct Pixel: Codable {
  let red: Int
  let green: Int
  let blue: Int
}

let args = CommandLine.arguments
guard args.count == 7,
      let regionX = Double(args[2]),
      let regionY = Double(args[3]),
      let regionWidth = Double(args[4]),
      let regionHeight = Double(args[5]),
      let maximumSamples = Int(args[6]) else {
  fatalError("Expected image path, normalized region, and maximum samples")
}

let url = URL(fileURLWithPath: args[1]) as CFURL
guard let source = CGImageSourceCreateWithURL(url, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fatalError("Could not read image")
}

let width = image.width
let height = image.height
let bytesPerRow = width * 4
var bytes = [UInt8](repeating: 0, count: bytesPerRow * height)
guard let context = CGContext(
  data: &bytes,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: bytesPerRow,
  space: CGColorSpaceCreateDeviceRGB(),
  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
  fatalError("Could not create image context")
}

context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

let startX = max(0, min(width - 1, Int(regionX * Double(width))))
let startY = max(0, min(height - 1, Int(regionY * Double(height))))
let endX = max(startX + 1, min(width, Int((regionX + regionWidth) * Double(width))))
let endY = max(startY + 1, min(height, Int((regionY + regionHeight) * Double(height))))
let pixelCount = (endX - startX) * (endY - startY)
let stride = max(1, Int(ceil(sqrt(Double(pixelCount) / Double(maximumSamples)))))
var pixels: [Pixel] = []

for y in Swift.stride(from: startY, to: endY, by: stride) {
  for x in Swift.stride(from: startX, to: endX, by: stride) {
    let offset = y * bytesPerRow + x * 4
    pixels.append(Pixel(
      red: Int(bytes[offset]),
      green: Int(bytes[offset + 1]),
      blue: Int(bytes[offset + 2])
    ))
  }
}

let output = try JSONEncoder().encode(pixels)
print(String(data: output, encoding: .utf8)!)
`;

export type MacImageSamplerOptions = {
  maximumSamples?: number;
  commandTimeoutMs?: number;
};

export class MacImageSampler implements TosRegionSampler {
  private readonly maximumSamples: number;
  private readonly commandTimeoutMs: number;

  constructor(options: MacImageSamplerOptions = {}) {
    this.maximumSamples = options.maximumSamples ?? 400;
    this.commandTimeoutMs = options.commandTimeoutMs ?? 15_000;
  }

  async sample(frame: TosFrame, region: NormalizedRegion): Promise<RgbPixel[]> {
    const moduleCachePath = `${tmpdir()}/desktop-loop-engineering-swift-module-cache`;
    await mkdir(moduleCachePath, { recursive: true });
    const { stdout } = await execFileAsync(
      "/usr/bin/swift",
      [
        "-e",
        SAMPLE_IMAGE_SOURCE,
        frame.path,
        String(region.x),
        String(region.y),
        String(region.width),
        String(region.height),
        String(this.maximumSamples),
      ],
      {
        env: {
          ...process.env,
          CLANG_MODULE_CACHE_PATH: moduleCachePath,
        },
        timeout: this.commandTimeoutMs,
      },
    );
    return JSON.parse(stdout) as RgbPixel[];
  }
}
