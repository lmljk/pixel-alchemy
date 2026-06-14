import { describe, expect, it } from "vitest";
import { Material } from "../simulation/materials";
import { SeededRandom } from "../simulation/SeededRandom";
import { Simulation } from "../simulation/Simulation";
import {
  buildShareUrl,
  decodeShareState,
  encodeShareState,
  parseShareHash,
  type SharedState,
} from "./shareState";

const validState: SharedState = {
  width: 2,
  height: 2,
  cells: new Uint8Array(4).fill(Material.Sand),
  randomState: 123,
  scanLeftToRight: true,
};

function payloadBytes(payload: string): Uint8Array {
  const padded = payload
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) =>
    character.charCodeAt(0),
  );
}

function bytesPayload(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function mutatePayload(
  payload: string,
  mutation: (bytes: Uint8Array) => void,
): string {
  const bytes = payloadBytes(payload);
  mutation(bytes);
  return bytesPayload(bytes);
}

describe("shareState", () => {
  it("round trips mixed cells, random state, and scan direction", () => {
    const state: SharedState = {
      width: 3,
      height: 2,
      cells: new Uint8Array([
        Material.Sand,
        Material.Sand,
        Material.Water,
        Material.Empty,
        Material.Fire,
        Material.Fire,
      ]),
      randomState: 0xfedcba98,
      scanLeftToRight: false,
    };

    expect(decodeShareState(encodeShareState(state))).toEqual(state);
  });

  it("round trips an empty grid and compresses repeated cells", () => {
    const state: SharedState = {
      width: 160,
      height: 160,
      cells: new Uint8Array(160 * 160),
      randomState: 0,
      scanLeftToRight: true,
    };
    const payload = encodeShareState(state);

    expect(decodeShareState(payload)).toEqual(state);
    expect(payload.length).toBeLessThan(40);
  });

  it("emits URL-safe base64 without padding", () => {
    expect(encodeShareState(validState)).not.toMatch(/[+/=]/);
  });

  it("rejects malformed binary payloads", () => {
    const validPayload = encodeShareState(validState);
    const malformed = [
      mutatePayload(validPayload, (bytes) => {
        bytes[0] = 2;
      }),
      bytesPayload(payloadBytes(validPayload).slice(0, -1)),
      mutatePayload(validPayload, (bytes) => {
        bytes[9] = 2;
      }),
      mutatePayload(validPayload, (bytes) => {
        bytes[10] = 255;
      }),
      mutatePayload(validPayload, (bytes) => {
        bytes[11] = 0;
        bytes[12] = 0;
      }),
      mutatePayload(validPayload, (bytes) => {
        bytes[11] = 0;
        bytes[12] = 3;
      }),
    ];

    for (const payload of malformed) {
      expect(() => decodeShareState(payload)).toThrow();
    }
  });

  it.each([
    ["invalid alphabet", "broken!"],
    ["invalid base64 length", "a"],
    ["empty payload", ""],
  ])("rejects %s", (_name, payload) => {
    expect(() => decodeShareState(payload)).toThrow();
  });

  it("rejects dimensions outside the supported range", () => {
    const validPayload = encodeShareState(validState);
    const zeroWidth = mutatePayload(validPayload, (bytes) => {
      bytes[1] = 0;
      bytes[2] = 0;
    });
    const excessiveHeight = mutatePayload(validPayload, (bytes) => {
      bytes[3] = 0;
      bytes[4] = 161;
    });

    expect(() => decodeShareState(zeroWidth)).toThrow();
    expect(() => decodeShareState(excessiveHeight)).toThrow();
  });

  it("validates states before encoding", () => {
    expect(() =>
      encodeShareState({
        ...validState,
        cells: new Uint8Array(3),
      }),
    ).toThrow("Grid length does not match its dimensions");
    expect(() =>
      encodeShareState({
        ...validState,
        cells: new Uint8Array([
          Material.Empty,
          Material.Sand,
          Material.Water,
          255,
        ]),
      }),
    ).toThrow("Unknown material");
  });

  it("distinguishes absent, valid, and invalid share hashes", () => {
    const payload = encodeShareState(validState);

    expect(parseShareHash("")).toEqual({ kind: "none" });
    expect(parseShareHash("#other=value")).toEqual({ kind: "none" });
    expect(parseShareHash("#share=broken!")).toEqual({ kind: "invalid" });
    expect(parseShareHash(`#share=${payload}`)).toEqual({
      kind: "valid",
      state: validState,
    });
  });

  it("builds a share URL without changing the source URL", () => {
    const href = "https://example.com/sandbox?mode=demo#old";

    expect(buildShareUrl(href, "abc_123")).toBe(
      "https://example.com/sandbox?mode=demo#share=abc_123",
    );
    expect(href).toBe("https://example.com/sandbox?mode=demo#old");
  });

  it("preserves the future simulation trajectory after restoration", () => {
    const sourceRandom = new SeededRandom(987654321);
    const source = new Simulation(5, 5, sourceRandom.next);
    source.paintCircle(2, 1, 0, Material.Sand);
    source.paintCircle(1, 2, 0, Material.Water);
    source.paintCircle(3, 2, 0, Material.Oil);
    source.paintCircle(2, 3, 0, Material.Wood);
    source.step();

    const state: SharedState = {
      ...source.createSnapshot(),
      randomState: sourceRandom.getState(),
    };
    const decoded = decodeShareState(encodeShareState(state));
    const firstRandom = new SeededRandom(decoded.randomState);
    const secondRandom = new SeededRandom(decoded.randomState);
    const first = Simulation.fromSnapshot(decoded, firstRandom.next);
    const second = Simulation.fromSnapshot(decoded, secondRandom.next);

    for (let step = 0; step < 20; step += 1) {
      first.step();
      second.step();
    }

    expect(first.createSnapshot()).toEqual(second.createSnapshot());
    expect(firstRandom.getState()).toBe(secondRandom.getState());
  });
});
