import { Creature } from "@/classes/creature";
import { type Species } from "@/types";

export class Player extends Creature {
  [x: string]: any;
  direction: number = 2;
  health: number = 100;
  type: number = 1;
  power: number = 10;
  status: number = 1;
  playerId: number = 0;
  nickname: string = "";
  planktonCount: number = 0;
  microplasticCount: number = 0;
  playerCount: number = 0;
  stopTime: number = 0;
  level: number = 0;
  point: number = 0;
  socketId: string = "";
  isFlipX: boolean = false;
  isGameOver: boolean = false;
  speciesId: number = 0;

  evolvePlayer(this: Player, targetSpecies: Species): void {
    this.speciesId = targetSpecies.speciesId;
    this.power = targetSpecies.power;
    this.width = targetSpecies.width;
    this.height = targetSpecies.height;
    this.health = targetSpecies.health;
  }
}
