import "reflect-metadata";
import Container, { Service } from "typedi";
import { Player } from "@/classes/player";
import {
  type PlayerCrashRequest,
  type ValidateRespone,
  type PlayerResponse,
  type PlayerAttackResponse,
  type Species,
  type NicknameRequest,
  type PlayerGameOver
} from "@/types";
import { MapService } from "./map";
// import { type Position } from "@/classes/position";
import { type Area } from "@/classes/area";
import { createBuilder } from "@/util/builder";
// import { SPECIES_ASSET, TIER_ASSET } from "@/constants/asset";
import { validateCanCrushArea } from "@/util/crushValid";
import { isAttacking } from "@/util/attack";
import { evolutionHandler } from "@/util/evolutionHandler";
import { SPECIES_ASSET } from "@/constants/asset";
import { typeEnsure } from "@/util/assert";
import { getSuccessMessage } from "@/message/message-handler";
import {
  deletePlayer,
  existPlayer,
  getPlayer,
  getPlayerList,
  setPlayer,
  updatePlayer,
  zADDPlayer,
  zREMPlayer
} from "@/repository/redis";
import {
  evolvePlayer,
  playerToArea,
  toPlayerAttackResponse,
  updateAttackerPlayerCount,
  updateDefenderInfo,
  updatePlayerInfo
} from "@/feat/player";
import { logger } from "@/util/winston";
// import _ from "lodash";
@Service()
export class PlayerService {
  count: number;

  constructor() {
    this.count = 0;
  }

  /**
   * 플레이어 초기화
   * @date 3/6/2024 - 11:30:22 AM
   *
   * @param {Player} player
   * @param {string} socketId
   * @returns {PlayerResponse}
   */
  initPlayer(player: Player, socketId: string): Player {
    const mapService = Container.get<MapService>(MapService);
    const spawnArea: Area = mapService.getSpawnableArea(0);
    const nickname = player.nickname;
    const speciesInfo: Species | undefined = SPECIES_ASSET.get(player.speciesId);
    if (speciesInfo === undefined) throw new Error("Invalid Player Infomation");
    const myInfo: Player = createBuilder(Player)
      .setPlayerId(++this.count)
      .setNickname(nickname)
      .setCenterX(spawnArea.centerX)
      .setCenterY(spawnArea.centerY)
      .setSocketId(socketId)
      .setSpeciesId(player.speciesId)
      .setWidth(speciesInfo.width)
      .setHeight(speciesInfo.height)
      .build();
    logger.info("플레이어 생성 : " + myInfo.playerId + ", " + myInfo.nickname);

    return myInfo;
  }

  /**
   * 닉네임 검증 로직
   * @date 3/6/2024 - 5:52:27 PM
   *
   * @param {string} nickname
   * @returns {boolean}
   */
  async validateNickName(request: NicknameRequest): Promise<ValidateRespone> {
    const nickname: string = request.nickname;
    const regexp: RegExp = /^[ㄱ-ㅎㅏ-ㅣ가-힣A-Za-z0-9]{2,12}$/;
    let isSuccess: boolean = regexp.test(nickname);

    // 닉네임 중복 검사
    if (isSuccess) {
      const playerMap = await getPlayerList();
      playerMap.forEach((player) => {
        if (player.nickname === nickname) {
          isSuccess = false;
          throw new Error("DUPLICATE_ERROR");
        }
      });
    }
    return { isSuccess, msg: "" };
  }

  /**
   * 진화 가능한지 아닌지 확인합니다.
   * 각각의 rule을 돌며 모든 검증이 완료된 경우에만, isSuccess: true를 반환합니다.
   * @date 3/13/2024 - 3:40:15 PM
   * @author 박연서
   *
   * @param {number} targetSpeciesId
   * @param {Player} player
   * @returns {ValidateRespone}
   */
  validateEvolution(targetSpeciesId: number, player: Player): ValidateRespone {
    for (const rule of evolutionHandler.rules) {
      if (!rule.match(targetSpeciesId, player)) {
        rule.action(targetSpeciesId, player);
      }
    }
    return {
      isSuccess: true,
      msg: getSuccessMessage("EVOLUTION_VALIDATE_SUCCESS")
    };
  }

  async playerEvolution(targetSpeciesId: number, player: Player): Promise<void> {
    const targetSpecies: Species = typeEnsure(SPECIES_ASSET.get(targetSpeciesId), "CANNOT_FIND_TIER");

    evolvePlayer(player, targetSpecies);
    await updatePlayer(player);
  }

  /**
   * playerList를 배열로 변환하여 반환해줌
   * @date 3/6/2024 - 4:53:52 PM
   *
   * @returns {Player[]}
   */
  async getPlayerList(): Promise<Player[]> {
    const playerMap = await getPlayerList();
    return playerMap;
  }

  /**
   * 플레이어 추가
   * @date 3/6/2024 - 4:54:22 PM
   *
   * @param {Player} player
   * @param {string} socketId
   * @returns {PlayerResponse}
   */
  async addPlayer(player: Player, socketId: string): Promise<PlayerResponse | null> {
    try {
      const myInfo = this.initPlayer(player, socketId);
      const result: PlayerResponse = { myInfo, playerList: [] };

      await setPlayer(myInfo.playerId, myInfo);

      const playerMap = await getPlayerList();
      result.playerList = playerMap;

      return result;
    } catch (error) {
      logger.error("플레이어 추가 실패 : " + error);
      return null;
    }
  }

  /**
   * 플레이어 정보 업데이트(위치, 상태)
   * @date 3/7/2024 - 11:02:47 AM
   *
   * @param {Player} player
   * @returns {Player[]}
   */
  async updatePlayerInfo(player: Player): Promise<Player[]> {
    const playerId = player.playerId;
    // 플레이어 존재하는 경우에만
    if (await existPlayer(playerId)) {
      try {
        const item: Player | null = await getPlayer(playerId);
        if (item !== null) {
          updatePlayerInfo(item, player);
          await updatePlayer(item);
        }
      } catch {
        throw new Error("PLAYER_NOT_FOUND");
      }
      return await this.getPlayerList();
    }
    return [];
  }

  /** Description placeholder
   * TODO: 성공 가능 여부 유효성 검증 필요
   * @date 3/8/2024 - 10:51:45 AM
   * @author 양소영
   *
   * @param {PlayerCrashRequest} data
   */
  async isCrashValidate(request: PlayerCrashRequest): Promise<void> {
    // 플레이어 두 명이 충돌 가능 영역에 있는지 검증
    const firstPlayer: Player = typeEnsure(await getPlayer(request.playerAId), "ATTACK_PLAYER_NO_EXIST_ERROR");
    const secondPlayer: Player = typeEnsure(await getPlayer(request.playerBId), "ATTACK_PLAYER_NO_EXIST_ERROR");

    if (!validateCanCrushArea(playerToArea(firstPlayer), playerToArea(secondPlayer))) {
      throw new Error("ATTACK_PLAYER_NO_COLLISION_AREA");
    }
  }

  /**
   * 플레이어 간 공격 처리
   * @date 3/8/2024 - 11:20:37 AM
   * @author 양소영
   *
   * @param {PlayerCrashRequest} data
   * @returns {Player[]}
   */
  async attackPlayer(request: PlayerCrashRequest): Promise<PlayerAttackResponse[] | undefined> {
    const playerA: Player = typeEnsure(await getPlayer(request.playerAId), "CANNOT_FIND_PLAYER");
    const playerB: Player = typeEnsure(await getPlayer(request.playerBId), "CANNOT_FIND_PLAYER");

    const areaA: Area = playerToArea(playerA);
    const areaB: Area = playerToArea(playerB);

    if (isAttacking(areaA, areaB)) {
      updateDefenderInfo(playerB, playerA);

      await updatePlayer(playerA);
      await updatePlayer(playerB);

      return [toPlayerAttackResponse(playerA), toPlayerAttackResponse(playerB)];
    }
  }

  /**
   * 게임 오버인 경우의 반환값 생성
   * @date 3/13/2024 - 3:28:46 PM
   * @author 양소영
   *
   * @param {PlayerAttackResponse} player
   * @returns {plyaerGameOverResponse}
   */
  async getGameOver(
    playerList: PlayerAttackResponse[]
  ): Promise<{ playerGameOver: PlayerGameOver; playerAttackResponse: PlayerAttackResponse }> {
    const attackPlayer: Player = typeEnsure(await getPlayer(playerList[0].playerId), "CANNOT_FIND_PLAYER");
    const gameoverPlayer: Player = typeEnsure(await getPlayer(playerList[1].playerId), "CANNOT_FIND_PLAYER");

    updateAttackerPlayerCount(attackPlayer, gameoverPlayer);

    await updatePlayer(attackPlayer);
    await zADDPlayer(attackPlayer.playerId, attackPlayer.totalExp);

    const response = {
      playerGameOver: {
        playerId: gameoverPlayer.playerId,
        playerNickname: gameoverPlayer.nickname,
        attackerNickname: attackPlayer.nickname,
        attackerSpeciesId: attackPlayer.speciesId,
        message: "당신은 " + attackPlayer.nickname + "에게 먹혔습니다",
        planktonCount: gameoverPlayer.planktonCount,
        microplasticCount: gameoverPlayer.microplasticCount,
        playerCount: gameoverPlayer.playerCount,
        totalExp: gameoverPlayer.totalExp
      },
      playerAttackResponse: toPlayerAttackResponse(attackPlayer)
    };

    logger.info("플레이어 업데이트 : " + JSON.stringify(response));
    return response;
  }

  /**
   * 플랑크톤 먹은 경우 먹은 갯수 갱신
   * @date 3/8/2024 - 9:33:23 AM
   * @author 양소영
   *
   * @param {number} playerId
   * @param {number} planktonId
   */
  async eatPlankton(playerId: number, isPlankton: boolean): Promise<Player> {
    const player: Player = typeEnsure(await getPlayer(playerId), "CANNOT_FIND_PLAYER");

    if (player !== undefined) {
      if (isPlankton) {
        player.planktonCount++;
        player.nowExp++;
        player.totalExp++;
      } else {
        player.microplasticCount++;
      }
      await updatePlayer(player);
    }
    return player;
  }

  /**
   * 플레이어 아이디로 삭제
   * @date 3/7/2024 - 9:13:23 AM
   *
   * @param {number} playerId
   */
  async deletePlayerByPlayerId(playerId: number): Promise<void> {
    try {
      await deletePlayer(playerId);
      await zREMPlayer(playerId);
    } catch (error) {
      throw new Error("PLAYER_NOT_FOUND");
    }
  }

  /**
   * 소켓 아이디로 삭제
   * @date 3/7/2024 - 9:14:10 AM
   *
   * @param {string} socketId
   * @returns {number}
   */
  async deletePlayerBySocketId(socketId: string): Promise<number> {
    let playerId: number = -1;

    const playerMap = await getPlayerList();

    playerMap.forEach((player) => {
      if (player?.socketId === socketId) {
        playerId = player.playerId;
        void this.deletePlayerByPlayerId(player.playerId);
      }
    });

    return playerId;
  }
}
