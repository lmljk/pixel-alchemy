import { Material } from "../simulation/materials";
import type { SimulationSnapshot } from "../simulation/Simulation";

const FORMAT_VERSION = 2;
const HEADER_BYTES = 10;
const RUN_BYTES = 3;
const MAX_GRID_SIZE = 160;
const MAX_RUN_LENGTH = 0xffff;
const MAX_RANDOM_STATE = 0xffffffff;
const SHARE_PREFIX = "#share=";

export type SharedState = SimulationSnapshot & {
  randomState: number;
};

export type ParsedShareHash =
  | { kind: "none" }
  | { kind: "valid"; state: SharedState }
  | { kind: "invalid" };

export function encodeShareState(state: SharedState): string {
  validateDimensions(state.width, state.height);
  validateRandomState(state.randomState);
  if (state.cells.length !== state.width * state.height) {
    throw new Error("Grid length does not match its dimensions");
  }
  if (typeof state.scanLeftToRight !== "boolean") {
    throw new Error("Scan direction must be a boolean");
  }

  const runs: Array<readonly [Material, number]> = [];
  let runMaterial = validateMaterial(state.cells[0]);
  let runLength = 0;

  for (const cell of state.cells) {
    const material = validateMaterial(cell);
    if (material === runMaterial && runLength < MAX_RUN_LENGTH) {
      runLength += 1;
      continue;
    }

    runs.push([runMaterial, runLength]);
    runMaterial = material;
    runLength = 1;
  }
  runs.push([runMaterial, runLength]);

  const bytes = new Uint8Array(HEADER_BYTES + runs.length * RUN_BYTES);
  const view = new DataView(bytes.buffer);
  bytes[0] = FORMAT_VERSION;
  view.setUint16(1, state.width);
  view.setUint16(3, state.height);
  view.setUint32(5, state.randomState);
  bytes[9] = state.scanLeftToRight ? 1 : 0;

  let offset = HEADER_BYTES;
  for (const [material, length] of runs) {
    bytes[offset] = material;
    view.setUint16(offset + 1, length);
    offset += RUN_BYTES;
  }

  return bytesToBase64Url(bytes);
}

export function decodeShareState(payload: string): SharedState {
  const bytes = base64UrlToBytes(payload);
  if (
    bytes.length < HEADER_BYTES + RUN_BYTES ||
    (bytes.length - HEADER_BYTES) % RUN_BYTES !== 0
  ) {
    throw new Error("Share payload has an invalid length");
  }

  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
  if (bytes[0] !== FORMAT_VERSION) {
    throw new Error("Unsupported share format");
  }

  const width = view.getUint16(1);
  const height = view.getUint16(3);
  validateDimensions(width, height);

  const flags = bytes[9];
  if ((flags & ~1) !== 0) {
    throw new Error("Share payload contains unknown flags");
  }

  const cells = new Uint8Array(width * height);
  let cellOffset = 0;

  for (
    let byteOffset = HEADER_BYTES;
    byteOffset < bytes.length;
    byteOffset += RUN_BYTES
  ) {
    const material = validateMaterial(bytes[byteOffset]);
    const runLength = view.getUint16(byteOffset + 1);
    if (runLength === 0) {
      throw new Error("Share payload contains an empty run");
    }
    if (cellOffset + runLength > cells.length) {
      throw new Error("Share payload contains too many cells");
    }

    cells.fill(material, cellOffset, cellOffset + runLength);
    cellOffset += runLength;
  }

  if (cellOffset !== cells.length) {
    throw new Error("Share payload does not fill the grid");
  }

  return {
    width,
    height,
    cells,
    randomState: view.getUint32(5),
    scanLeftToRight: (flags & 1) === 1,
  };
}

export function parseShareHash(hash: string): ParsedShareHash {
  if (!hash.startsWith(SHARE_PREFIX)) {
    return { kind: "none" };
  }

  try {
    return {
      kind: "valid",
      state: decodeShareState(hash.slice(SHARE_PREFIX.length)),
    };
  } catch {
    return { kind: "invalid" };
  }
}

export function buildShareUrl(href: string, payload: string): string {
  const url = new URL(href);
  url.hash = `${SHARE_PREFIX}${payload}`;
  return url.toString();
}

function validateDimensions(width: number, height: number): void {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    width > MAX_GRID_SIZE ||
    height < 1 ||
    height > MAX_GRID_SIZE
  ) {
    throw new Error("Grid dimensions are outside the supported range");
  }
}

function validateRandomState(randomState: number): void {
  if (
    !Number.isInteger(randomState) ||
    randomState < 0 ||
    randomState > MAX_RANDOM_STATE
  ) {
    throw new Error("Random state must be an unsigned 32-bit integer");
  }
}

function validateMaterial(material: number): Material {
  if (
    !Number.isInteger(material) ||
    material < Material.Empty ||
    material > Material.Acid
  ) {
    throw new Error(`Unknown material: ${material}`);
  }
  return material as Material;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(payload: string): Uint8Array {
  if (
    payload.length === 0 ||
    payload.length % 4 === 1 ||
    !/^[A-Za-z0-9_-]+$/.test(payload)
  ) {
    throw new Error("Share payload is not valid base64url");
  }

  const padded = payload
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Share payload is not valid base64url");
  }

  return Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  );
}
