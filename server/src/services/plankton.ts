import { Plankton } from "@/classes/plankton";
import RBush, { type BBox } from "rbush";
import { createBuilder } from "@/util/builder";
import { Inject, Service, Container } from "typedi";
import "reflect-metadata";
import { PlayerService } from "./player";
import { type PlanktonEatResponse } from "@/types";
import { type Area } from "@/classes/area";
import { MapService } from "./map";
import g from "@/types/global";
import { typeEnsure } from "@/util/assert";
import { logger } from "@/util/winston";
import { generatePlanktonSpawnProbability } from "@/util/random";
import { convertTPlayerStatusInfo } from "@/feat/player";

@Service()
export class PlanktonService {
  @Inject("planktonCnt")
  planktonCnt: number;

  idCounter: number;
  eatedPlanktonCnt: number; // 잡아 먹힌 플랑크톤의 개수
  mapPlanktonCnt: number;
  /**
   * Creates an instance of PlanktonService.
   * @date 3/7/2024 - 1:26:17 PM
   * @author 박연서
   *
   * @constructor
   * @private
   */
  constructor() {
    g.planktonTree = new RBush();
    this.idCounter = 1;
    g.planktonList = new Map();
    this.eatedPlanktonCnt = 0;
    this.mapPlanktonCnt = this.planktonCnt;
  }

  /**
   * 초기 플랑크톤을 생성합니다.
   * @date 3/7/2024 - 1:49:29 PM
   * @author 박연서
   */
  initPlankton(): void {
    g.planktonTree?.clear();
    g.planktonList?.clear();
    this.idCounter = 1;
    this.eatedPlanktonCnt = 0;
    this.mapPlanktonCnt = this.planktonCnt;
    const mapService = Container.get<MapService>(MapService);

    for (let i = 0; i < this.planktonCnt; i++) {
      const spawnArea: Area = mapService.getSpawnableArea(1);
      const isPlankton: boolean = generatePlanktonSpawnProbability();
      const plankton: Plankton = createBuilder(Plankton)
        .setCenterX(spawnArea.centerX)
        .setCenterY(spawnArea.centerY)
        .setPlanktonId(this.idCounter)
        .setIsPlankton(isPlankton)
        .build();

      g.planktonList?.set(this.idCounter, plankton);
      g.planktonTree?.insert(plankton.makeTplanktonType());
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
  async eatedPlankton(planktonId: number, playerId: number): Promise<PlanktonEatResponse> {
    if (g.planktonList != null && Boolean(g.planktonList.has(planktonId))) {
      const planktonInfo: Plankton = typeEnsure(g.planktonList.get(planktonId));
      g.planktonList?.delete(planktonId);
      const targetItems: BBox[] = g.planktonTree.search(planktonInfo.makeTplanktonType());
      let target: BBox = {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
      };
      if (targetItems.length > 0) {
        target = targetItems[0];
      }
      g.planktonTree?.remove(target);

      const playerService = Container.get<PlayerService>(PlayerService);
      try {
        const player = await playerService.eatPlankton(playerId, planktonInfo.isPlankton);
        this.eatedPlanktonCnt++;
        this.mapPlanktonCnt--;
        const result: PlanktonEatResponse = {
          isSuccess: true,
          planktonCount: player.planktonCount,
          microplasticCount: player.microplasticCount,
          playerStatusInfo: convertTPlayerStatusInfo(player),
          msg: "섭취에 성공했습니다."
        };
        return result;
      } catch (error) {
        logger.error("플랑크톤 섭취 에러 : " + error);
      }
    }

    return { isSuccess: false, planktonCount: 0, microplasticCount: 0, msg: "섭취에 실패했습니다." };
  }

  /**
   * 플랑크톤을 재생성합니다.
   * @date 3/7/2024 - 1:25:38 PM
   * @author 박연서
   *
   * @returns {Plankton[]} 스폰 된 플랑크톤 배열
   */
  async spawnPlankton(): Promise<Plankton[]> {
    const responedPlankton: Plankton[] = [];
    const mapService = Container.get<MapService>(MapService);
    for (let i = this.eatedPlanktonCnt; i > 0; i--) {
      if (this.mapPlanktonCnt >= this.planktonCnt) {
        break;
      }
      const spawnArea: Area = mapService.getSpawnableArea(1);
      const isPlankton: boolean = generatePlanktonSpawnProbability();
      const plankton: Plankton = createBuilder(Plankton)
        .setCenterX(spawnArea.centerX)
        .setCenterY(spawnArea.centerY)
        .setPlanktonId(this.idCounter)
        .setIsPlankton(isPlankton)
        .build();

      g.planktonList?.set(this.idCounter, plankton);
      g.planktonTree?.insert(plankton.makeTplanktonType());
      this.idCounter++;
      responedPlankton.push(plankton);
      this.mapPlanktonCnt++;
    }

    this.eatedPlanktonCnt = 0;
    return responedPlankton;
  }
}
