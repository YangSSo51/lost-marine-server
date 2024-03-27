import { type Species } from "@/types";

export const SPECIES_ASSET: Map<number, Species> = new Map<number, Species>([
  [
    1,
    {
      speciesId: 1,
      name: "니모",
      imgUrl: "imgurl/1/1_nemo", // img경로/레벨/개체id_개체명
      width: 62,
      height: 30,
      power: 10,
      health: 100,
      evolutionSet: new Set([3, 4]),
      tierCode: 1
    }
  ],
  [
    2,
    {
      speciesId: 2,
      name: "고등어",
      imgUrl: "imgurl/1/2_mackerel",
      width: 64,
      height: 40,
      power: 10,
      health: 100,
      evolutionSet: new Set([3, 4]),
      tierCode: 1
    }
  ],
  [
    3,
    {
      speciesId: 3,
      name: "개복치",
      imgUrl: "imgurl/2/3_sunfish",
      width: 192,
      height: 192,
      power: 10,
      health: 100,
      evolutionSet: new Set([5]),
      tierCode: 2
    }
  ]
]);

export const TIER_ASSET: Map<number, number> = new Map<number, number>([
  [1, 0],
  [2, 5]
]);
