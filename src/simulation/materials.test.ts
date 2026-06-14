import { describe, expect, it } from "vitest";
import {
  DRAWABLE_MATERIALS,
  Material,
  getMaterialDefinition,
} from "./materials";

describe("material catalog", () => {
  it("keeps the eight drawable materials in a stable order", () => {
    expect(
      DRAWABLE_MATERIALS.map(({ material }) => material),
    ).toEqual([
      Material.Sand,
      Material.Water,
      Material.Wall,
      Material.Stone,
      Material.Wood,
      Material.Oil,
      Material.Fire,
      Material.Plant,
    ]);
    expect(
      new Set(DRAWABLE_MATERIALS.map(({ material }) => material)).size,
    ).toBe(8);
  });

  it("defines labels and colors for every drawable material", () => {
    expect(
      DRAWABLE_MATERIALS.every(
        ({ label, colors }) => label.length > 0 && colors.length > 0,
      ),
    ).toBe(true);
  });

  it("marks only the intended materials as flammable", () => {
    expect(getMaterialDefinition(Material.Wood).flammable).toBe(true);
    expect(getMaterialDefinition(Material.Oil).flammable).toBe(true);
    expect(getMaterialDefinition(Material.Plant).flammable).toBe(true);
    expect(getMaterialDefinition(Material.Wall).flammable).toBe(false);
  });

  it("falls back to the empty definition for unknown values", () => {
    expect(getMaterialDefinition(255 as Material).material).toBe(
      Material.Empty,
    );
  });
});
