// ============================================================
// COUP GAME — Shared Types
// ============================================================

export type Character =
  | "Duke"
  | "Assassin"
  | "Captain"
  | "Ambassador"
  | "Contessa";

export type ActionType =
  | "income"
  | "foreign_aid"
  | "coup"
  | "tax"
  | "assassinate"
  | "steal"
  | "exchange";

export type GamePhase =
  | "lobby"
  | "playing"
  | "challenge"
  | "block"
  | "block_challenge"
  | "lose_influence"
  | "exchange_select"
  | "game_over";

export interface Card {
  character: Character;
  revealed: boolean;
}

export interface Player {
  id: string;
  name: string;
  coins: number;
  cards: Card[];
  connected: boolean;
}

export interface PendingAction {
  type: ActionType;
  actorId: string;
  targetId?: string;
  claimedCharacter?: Character;
  // Who has responded (passed/challenged/blocked)
  respondedPlayers: string[];
  blocker?: { playerId: string; claimedCharacter: Character };
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  deck: Character[];
  currentPlayerIndex: number;
  pendingAction: PendingAction | null;
  loseInfluenceTarget: string | null; // player who must lose a card
  exchangeCards: Character[] | null;  // temp cards for exchange
  winner: string | null;
  log: string[];
  createdAt: number;
}

// ============================================================
// WebSocket Messages — Client → Server
// ============================================================

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start_game" }
  | { type: "action"; action: ActionType; targetId?: string }
  | { type: "challenge" }
  | { type: "pass" }              // accept / do not challenge
  | { type: "block"; character: Character }
  | { type: "challenge_block" }
  | { type: "accept_block" }
  | { type: "lose_influence"; cardIndex: number }
  | { type: "exchange_select"; cardIndexes: number[] }
  | { type: "rematch" };

// ============================================================
// WebSocket Messages — Server → Client
// ============================================================

export type ServerMessage =
  | { type: "state"; state: GameStateView }
  | { type: "error"; message: string }
  | { type: "ping" };

/** Sanitised view — hides other players' unrevealed cards */
export interface GameStateView {
  roomCode: string;
  phase: GamePhase;
  myId: string;
  players: PlayerView[];
  currentPlayerIndex: number;
  pendingAction: PendingAction | null;
  loseInfluenceTarget: string | null;
  exchangeCards: Character[] | null;
  myCards: Card[];
  myCoins: number;
  winner: string | null;
  log: string[];
}

export interface PlayerView {
  id: string;
  name: string;
  coins: number;
  influenceCount: number;        // how many cards left (unrevealed)
  revealedCards: Character[];    // cards that have been flipped face-up
  connected: boolean;
  isMe: boolean;
}
