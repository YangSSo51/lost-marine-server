import { Plankton } from "@/classes/plankton";
import RBush from "rbush";
import { createBuilder } from "@/util/builder";
import { Inject, Service, Container } from "typedi";
import "reflect-metadata";
import { PlayerService } from "./player";
import { type PlanktonEatResponse } from "@/types";
import { type Position } from "@/classes/position";
import { MapService } from "./map";

@Service()
export class PlanktonService {
  @Inject("width")
  width: number;

  @Inject("height")
  height: number;

  @Inject("planktonCnt")
  planktonCnt: number;

  idCounter: number;
  eatedPlanktonCnt: number; // 잡아 먹힌 플랑크톤의 개수

  /**
   * Creates an instance of PlanktonService.
   * @date 3/7/2024 - 1:26:17 PM
   * @author 박연서
   *
   * @constructor
   * @private
   */
  constructor() {
    global.planktonTree = new RBush();
    this.idCounter = 1;
    global.planktonList = new Map();
    this.eatedPlanktonCnt = 0;
  }

  /**
   * 초기 플랑크톤을 생성합니다.
   * @date 3/7/2024 - 1:49:29 PM
   * @author 박연서
   */
  initPlankton(): void {
    global.planktonTree?.clear();
    global.planktonList?.clear();
    this.idCounter = 1;
    this.eatedPlanktonCnt = 0;

    const mapService = Container.get<MapService>(MapService);

    for (let i = 0; i < this.planktonCnt; i++) {
      const position: Position = mapService.getSpawnablePosition(1);
      const plankton: Plankton = createBuilder(Plankton)
        .setCenterX(position.x)
        .setCenterY(position.y)
        .setPlanktonId(this.idCounter)
        .build();

      global.planktonList?.set(this.idCounter, plankton);
      global.planktonTree?.insert(plankton.makeTplanktonType());
      this.idCounter++;
    }
  }

  /**
   * 플랑크톤을 잡아먹습니다.
   * 잡아먹힌 플랑크톤은 planktonList와 planktonTree에서 삭제됩니다.
   * @date 3/7/2024 - 1:25:51 PM
   * @author 박연서
   *
   * @param {number} planktonId 잡아먹힌 플랑크톤 id
   * @returns {number}
   */
  eatedPlankton(planktonId: number, playerId: number): PlanktonEatResponse {
    if (global.planktonList != null && Boolean(global.planktonList.has(planktonId))) {
      const planktonInfo: Plankton = global.planktonList.get(planktonId);
      global.planktonList?.delete(planktonId);
      global.planktonTree?.remove(planktonInfo.makeTplanktonType());
      this.eatedPlanktonCnt++;

      const playerService = Container.get<PlayerService>(PlayerService);
      const player = playerService.eatPlankton(playerId);
      const result: PlanktonEatResponse = {
        isSuccess: true,
        player
      };

      return result;
    }

    return { isSuccess: false };
  }

  /**
   * 플랑크톤을 재생성합니다.
   * @date 3/7/2024 - 1:25:38 PM
   * @author 박연서
   *
   * @returns {Plankton[]} 스폰 된 플랑크톤 배열
   */
  spawnPlankton(): Plankton[] {
    const responedPlankton: Plankton[] = [];
    const mapService = Container.get<MapService>(MapService);

    for (let i = this.eatedPlanktonCnt; i > 0; i--) {
      const position: Position = mapService.getSpawnablePosition(1);
      const plankton: Plankton = createBuilder(Plankton)
        .setCenterX(position.x)
        .setCenterY(position.y)
        .setPlanktonId(this.idCounter)
        .build();

      global.planktonList?.set(this.idCounter, plankton);
      global.planktonTree?.insert(plankton.makeTplanktonType());
      this.idCounter++;
      responedPlankton.push(plankton);
    }

    this.eatedPlanktonCnt = 0;
    return responedPlankton;
  }
}
