import { type Plankton } from "@/classes/plankton";
import { type Player } from "@/classes/player";

export type NicknameRequest = {
  nickname: string;
};

export type PlayerResponse = {
  myInfo: Player;
  playerList: Player[];
};

export type ValidateRespone = {
  isSuccess: boolean;
  msg: string;
  nowExp?: number;
};

export type PlayerCrashRequest = {
  playerAId: number;
  playerBId: number;
};

export type PlayerAttack = Pick<
  Player,
  "playerId" | "health" | "totalExp" | "nowExp" | "centerX" | "centerY" | "isGameOver" | "power"
>;
export type PlayerAttackResponse = PlayerAttack & { socketId: string };
export type PlayerGameOver = Pick<Player, "playerId" | "planktonCount" | "microplasticCount" | "playerCount" | "totalExp"> &
  GameOverData;

export type GameOverData = {
  playerNickname: string;
  attackerNickname: string;
  attackerSpeciesId: number;
  message: string;
};

export type GameStartData = {
  planktonList: Plankton[];
} & PlayerResponse;

export type PlanktonEatResponse = {
  isSuccess: boolean;
  planktonCount: number;
  microplasticCount: number;
  playerStatusInfo?: PlayerStatusInfo;
  msg: string;
};

export type Species = {
  speciesId: number;
  name: string;
  imgUrl: string;
  width: number;
  height: number;
  power: number;
  health: number;
  evolutionSet: Set<number>;
  tierCode: number;
};

export type Tier = {
  tierCode: number;
  requirementExp: number;
};

export type ChatMessageSendResponse = {
  playerId: number;
  msg: string;
};

export type ChatMessageReceiveRequest = {
  speciesname: string;
  nickname: string;
  timeStamp: number;
} & ChatMessageSendResponse;

export type EvolveRequest = {
  speciesId: number;
  playerId: number;
  nowExp: number;
};

export type RankInfo = {
  playerId: number;
  nickname: string;
  speciesname: string;
  totalExp: number;
};

export type ItemInfo = {
  heal: number;
  damage: number;
  exp: number;
};

export type itemRequest = {
  playerId: number;
  itemId: number;
  itemType: number;
};

export type itemSyncResponse = {
  itemId: number;
  isActive: boolean;
};

export type PlayerStatusInfo = {
  playerId: number;
  health: number;
  nowExp: number;
  centerX: number;
  centerY: number;
  isGameOver: boolean;
};

export type AttackedPlayerResponse = {
  playerId: number; // 공격 받은 사람
  damage: number;
};
export type KillLog = {
  msg: string;
  type: string;
  timeStamp: number;
};

export type RandomEventResult = {
  isSuccess: boolean;
  msg: string;
  maxHealth: number;
  nowHealth: number;
  power: number;
  exp: number;
  speed: number;
  cooldown: number;
};

export type Matched<X> = {
  on: () => Matched<X>;
  otherwise: () => X;
};

export type Matcher<X, Y> = {
  on: (pred: (x: X) => boolean, fn: (x: X) => Y) => Matcher<X, Y>;
  otherwise: (fn: (x: X) => Y) => Y;
};
