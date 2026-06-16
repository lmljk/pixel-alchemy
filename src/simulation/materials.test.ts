import { describe, expect, it } from "vitest";
import {
  DRAWABLE_MATERIALS,
  Material,
  getMaterialDefinition,
} from "./materials";

describe("material catalog", () => {
  it("keeps the eleven drawable materials in a stable order", () => {
    expect(Material.Steam).toBe(9);
    expect(Material.Lava).toBe(10);
    expect(Material.Acid).toBe(11);
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
      Material.Steam,
      Material.Lava,
      Material.Acid,
    ]);
    expect(
      new Set(DRAWABLE_MATERIALS.map(({ material }) => material)).size,
    ).toBe(11);
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
    expect(getMaterialDefinition(Material.Steam).flammable).toBe(false);
    expect(getMaterialDefinition(Material.Lava).flammable).toBe(false);
    expect(getMaterialDefinition(Material.Acid).flammable).toBe(false);
  });

  it("falls back to the empty definition for unknown values", () => {
    expect(getMaterialDefinition(255 as Material).material).toBe(
      Material.Empty,
    );
  });
});
