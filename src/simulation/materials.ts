export enum Material {
  Empty = 0,
  Sand = 1,
  Water = 2,
  Wall = 3,
  Stone = 4,
  Wood = 5,
  Oil = 6,
  Fire = 7,
  Plant = 8,
}

export type MaterialCategory =
  | "empty"
  | "powder"
  | "liquid"
  | "solid"
  | "reaction";

export type MaterialColor = readonly [number, number, number];

export type MaterialDefinition = {
  material: Material;
  label: string;
  cssName: string;
  category: MaterialCategory;
  flammable: boolean;
  colors: readonly MaterialColor[];
};

const EMPTY_DEFINITION: MaterialDefinition = {
  material: Material.Empty,
  label: "橡皮",
  cssName: "empty",
  category: "empty",
  flammable: false,
  colors: [[0, 0, 0]],
};

export const DRAWABLE_MATERIALS: readonly MaterialDefinition[] = [
  {
    material: Material.Sand,
    label: "沙子",
    cssName: "sand",
    category: "powder",
    flammable: false,
    colors: [
      [207, 145, 59],
      [217, 157, 70],
      [191, 125, 46],
    ],
  },
  {
    material: Material.Water,
    label: "水",
    cssName: "water",
    category: "liquid",
    flammable: false,
    colors: [
      [62, 132, 168],
      [74, 149, 186],
      [48, 112, 151],
    ],
  },
  {
    material: Material.Wall,
    label: "墙",
    cssName: "wall",
    category: "solid",
    flammable: false,
    colors: [
      [91, 79, 68],
      [105, 91, 77],
    ],
  },
  {
    material: Material.Stone,
    label: "石头",
    cssName: "stone",
    category: "solid",
    flammable: false,
    colors: [
      [121, 126, 128],
      [143, 146, 145],
      [101, 107, 110],
    ],
  },
  {
    material: Material.Wood,
    label: "木头",
    cssName: "wood",
    category: "solid",
    flammable: true,
    colors: [
      [139, 91, 52],
      [157, 105, 61],
      [119, 75, 43],
    ],
  },
  {
    material: Material.Oil,
    label: "油",
    cssName: "oil",
    category: "liquid",
    flammable: true,
    colors: [
      [151, 119, 38],
      [171, 137, 47],
      [126, 96, 28],
    ],
  },
  {
    material: Material.Fire,
    label: "火",
    cssName: "fire",
    category: "reaction",
    flammable: false,
    colors: [
      [228, 74, 35],
      [242, 112, 33],
      [249, 158, 47],
    ],
  },
  {
    material: Material.Plant,
    label: "植物",
    cssName: "plant",
    category: "solid",
    flammable: true,
    colors: [
      [63, 126, 62],
      [77, 145, 72],
      [49, 105, 51],
    ],
  },
] as const;

const MATERIAL_DEFINITIONS = new Map<Material, MaterialDefinition>([
  [Material.Empty, EMPTY_DEFINITION],
  ...DRAWABLE_MATERIALS.map(
    (definition) =>
      [definition.material, definition] as const,
  ),
]);

export function getMaterialDefinition(
  material: Material,
): MaterialDefinition {
  return MATERIAL_DEFINITIONS.get(material) ?? EMPTY_DEFINITION;
}
