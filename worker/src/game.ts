import type {
  ActionType,
  Card,
  Character,
  GamePhase,
  GameState,
  PendingAction,
  Player,
} from "./types";

// ============================================================
// Constants
// ============================================================

const CHARACTERS: Character[] = [
  "Duke",
  "Assassin",
  "Captain",
  "Ambassador",
  "Contessa",
];

const BLOCKABLE_BY: Partial<Record<ActionType, Character[]>> = {
  foreign_aid: ["Duke"],
  assassinate: ["Contessa"],
  steal: ["Captain", "Ambassador"],
};

const REQUIRES_CHARACTER: Partial<Record<ActionType, Character>> = {
  tax: "Duke",
  assassinate: "Assassin",
  steal: "Captain",
  exchange: "Ambassador",
};

// ============================================================
// Deck helpers
// ============================================================

export function buildDeck(): Character[] {
  const deck: Character[] = [];
  for (const c of CHARACTERS) {
    deck.push(c, c, c); // 3 copies each = 15 cards
  }
  return shuffle(deck);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// Initial state
// ============================================================

export function createInitialState(roomCode: string): GameState {
  return {
    roomCode,
    phase: "lobby",
    players: [],
    deck: [],
    currentPlayerIndex: 0,
    pendingAction: null,
    loseInfluenceTarget: null,
    exchangeCards: null,
    winner: null,
    log: [],
    createdAt: Date.now(),
  };
}

// ============================================================
// Game helpers
// ============================================================

export function aliveInfluence(p: Player): number {
  return p.cards.filter((c) => !c.revealed).length;
}

export function isAlive(p: Player): boolean {
  return aliveInfluence(p) > 0;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

function nextAliveIndex(state: GameState, from: number): number {
  const n = state.players.length;
  for (let i = 1; i < n; i++) {
    const idx = (from + i) % n;
    if (isAlive(state.players[idx])) return idx;
  }
  return from;
}

function addLog(state: GameState, msg: string) {
  state.log = [msg, ...state.log].slice(0, 50);
}

function checkWinner(state: GameState): void {
  const alive = state.players.filter(isAlive);
  if (alive.length === 1) {
    state.winner = alive[0].id;
    state.phase = "game_over";
    addLog(state, `🏆 ${alive[0].name} menang!`);
  }
}

function drawCard(state: GameState): Character {
  if (state.deck.length === 0) state.deck = buildDeck();
  return state.deck.pop()!;
}

function returnCard(state: GameState, char: Character) {
  state.deck.unshift(char);
  state.deck = shuffle(state.deck);
}

// ============================================================
// Game actions
// ============================================================

export function startGame(state: GameState): GameState {
  if (state.players.length < 2) throw new Error("Butuh minimal 2 pemain");
  if (state.phase !== "lobby") throw new Error("Game sudah dimulai");

  state.deck = buildDeck();
  for (const p of state.players) {
    p.coins = 2;
    p.cards = [
      { character: drawCard(state), revealed: false },
      { character: drawCard(state), revealed: false },
    ];
  }
  state.phase = "playing";
  state.currentPlayerIndex = 0;
  addLog(state, "🎲 Game dimulai!");
  return state;
}

export function resetGame(state: GameState): GameState {
  if (state.phase !== "game_over") throw new Error("Game belum selesai");

  state.phase = "lobby";
  state.winner = null;
  state.pendingAction = null;
  state.loseInfluenceTarget = null;
  state.exchangeCards = null;
  state.log = ["🔄 Rematch dimulai!"];
  
  for (const p of state.players) {
    p.coins = 0;
    p.cards = [];
  }
  
  return state;
}

// ============================================================
// Handle player action (first move of a turn)
// ============================================================

export function handleAction(
  state: GameState,
  actorId: string,
  action: ActionType,
  targetId?: string
): GameState {
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) throw new Error("Pemain tidak ditemukan");
  if (currentPlayer(state).id !== actorId) throw new Error("Bukan giliran kamu");
  if (state.phase !== "playing") throw new Error("Tidak dalam fase aksi");

  // Coup — instant, no challenge possible
  if (action === "coup") {
    if (actor.coins < 7) throw new Error("Butuh 7 koin untuk coup");
    if (!targetId) throw new Error("Pilih target");
    actor.coins -= 7;
    const target = state.players.find((p) => p.id === targetId)!;
    addLog(state, `💥 ${actor.name} melakukan Coup pada ${target.name}`);
    state.loseInfluenceTarget = targetId;
    state.pendingAction = null;
    state.phase = "lose_influence";
    return state;
  }

  // Forced coup if 10+ coins
  if (actor.coins >= 10 && action !== "coup") {
    throw new Error("Wajib melakukan Coup karena kamu memiliki 10+ koin");
  }

  // Income — instant
  if (action === "income") {
    actor.coins += 1;
    addLog(state, `💰 ${actor.name} mengambil Income (+1 koin)`);
    advanceTurn(state);
    return state;
  }

  // All other actions go to pending (challengeable / blockable)
  const pending: PendingAction = {
    type: action,
    actorId,
    targetId,
    claimedCharacter: REQUIRES_CHARACTER[action],
    respondedPlayers: [],
  };
  state.pendingAction = pending;

  const actionNames: Record<ActionType, string> = {
    income: "Income",
    foreign_aid: "Foreign Aid",
    coup: "Coup",
    tax: "Tax (Duke)",
    assassinate: "Assassinate (Assassin)",
    steal: "Steal (Captain)",
    exchange: "Exchange (Ambassador)",
  };

  const targetName = targetId
    ? state.players.find((p) => p.id === targetId)?.name
    : null;

  addLog(
    state,
    `▶ ${actor.name} menggunakan ${actionNames[action]}${targetName ? ` pada ${targetName}` : ""}`
  );

  if (action === "foreign_aid") {
    state.phase = "block";
  } else {
    state.phase = "challenge"; // others can challenge or pass
  }
  return state;
}

// ============================================================
// Challenge the pending action
// ============================================================

export function handleChallenge(state: GameState, challengerId: string): GameState {
  const pending = state.pendingAction;
  if (!pending) throw new Error("Tidak ada aksi yang bisa ditantang");
  if (state.phase !== "challenge" && state.phase !== "block_challenge")
    throw new Error("Tidak dalam fase tantang");

  const challenger = state.players.find((p) => p.id === challengerId)!;

  if (state.phase === "block_challenge") {
    // Challenging the blocker
    const blocker = state.players.find((p) => p.id === pending.blocker!.playerId)!;
    const claimed = pending.blocker!.claimedCharacter;
    const hasCard = blocker.cards.some(
      (c) => !c.revealed && c.character === claimed
    );

    if (hasCard) {
      // Blocker wins challenge — challenger loses influence
      addLog(state, `✅ ${blocker.name} membuktikan ${claimed}! ${challenger.name} kalah influence`);
      // Replace blocker's revealed card
      const cardIdx = blocker.cards.findIndex((c) => !c.revealed && c.character === claimed);
      returnCard(state, blocker.cards[cardIdx].character);
      blocker.cards[cardIdx].character = drawCard(state);
      state.loseInfluenceTarget = challengerId;
      state.phase = "lose_influence";
      // after that, action is blocked successfully → turn advances
      state.pendingAction = { ...pending, blocker: { ...pending.blocker!, playerId: "BLOCK_WON" } };
    } else {
      // Blocker loses challenge — blocker loses influence, original action resolves
      addLog(state, `❌ ${blocker.name} berbohong tentang ${claimed}! Aksi dilanjutkan`);
      state.loseInfluenceTarget = blocker.id;
      state.phase = "lose_influence";
    }
    return state;
  }

  // Challenging the actor
  const actor = state.players.find((p) => p.id === pending.actorId)!;
  const claimed = pending.claimedCharacter!;
  const hasCard = actor.cards.some((c) => !c.revealed && c.character === claimed);

  if (hasCard) {
    // Actor wins — challenger loses influence, actor replaces card
    addLog(state, `✅ ${actor.name} membuktikan ${claimed}! ${challenger.name} kalah influence`);
    const cardIdx = actor.cards.findIndex((c) => !c.revealed && c.character === claimed);
    returnCard(state, actor.cards[cardIdx].character);
    actor.cards[cardIdx].character = drawCard(state);
    state.loseInfluenceTarget = challengerId;
    state.phase = "lose_influence";
  } else {
    // Actor loses — actor loses influence, action cancelled
    addLog(state, `❌ ${actor.name} berbohong tentang ${claimed}! Aksi dibatalkan`);
    state.loseInfluenceTarget = actor.id;
    state.pendingAction = null;
    state.phase = "lose_influence";
  }
  return state;
}

// ============================================================
// Pass (no challenge / no block)
// ============================================================

export function handlePass(state: GameState, playerId: string): GameState {
  const pending = state.pendingAction;
  if (!pending) throw new Error("Tidak ada aksi");

  if (!pending.respondedPlayers.includes(playerId)) {
    pending.respondedPlayers.push(playerId);
  }

  const actor = state.players.find((p) => p.id === pending.actorId)!;
  const eligibleResponders = state.players.filter(
    (p) => p.id !== pending.actorId && isAlive(p)
  );

  const allPassed = eligibleResponders.every((p) =>
    pending.respondedPlayers.includes(p.id)
  );

  if (!allPassed) return state; // still waiting

  if (state.phase === "block") {
    // Everyone passed on blocking — action resolves
    resolveAction(state, pending);
    return state;
  }

  if (state.phase === "challenge") {
    // No one challenged — move to block phase (if blockable)
    const blockable = BLOCKABLE_BY[pending.type];
    if (blockable && blockable.length > 0) {
      pending.respondedPlayers = [];
      state.phase = "block";
      addLog(state, `🛡️ Tidak ada tantangan. Apakah ada yang ingin memblok?`);
    } else {
      resolveAction(state, pending);
    }
    return state;
  }

  if (state.phase === "block_challenge") {
    // Everyone accepted the block
    addLog(state, `🛡️ Blok diterima — aksi dibatalkan`);
    state.pendingAction = null;
    advanceTurn(state);
  }

  return state;
}

// ============================================================
// Block
// ============================================================

export function handleBlock(
  state: GameState,
  blockerId: string,
  character: Character
): GameState {
  const pending = state.pendingAction;
  if (!pending) throw new Error("Tidak ada aksi yang bisa diblok");
  if (state.phase !== "block") throw new Error("Tidak dalam fase blok");

  const blocker = state.players.find((p) => p.id === blockerId)!;
  const actor = state.players.find((p) => p.id === pending.actorId)!;

  addLog(state, `🛡️ ${blocker.name} memblok ${actor.name} dengan klaim ${character}`);
  pending.blocker = { playerId: blockerId, claimedCharacter: character };
  pending.respondedPlayers = [];
  state.phase = "block_challenge";
  return state;
}

// ============================================================
// Lose influence
// ============================================================

export function handleLoseInfluence(
  state: GameState,
  playerId: string,
  cardIndex: number
): GameState {
  if (state.phase !== "lose_influence") throw new Error("Tidak dalam fase kehilangan influence");
  if (state.loseInfluenceTarget !== playerId) throw new Error("Bukan kamu yang harus kehilangan influence");

  const player = state.players.find((p) => p.id === playerId)!;
  const card = player.cards[cardIndex];
  if (!card || card.revealed) throw new Error("Kartu tidak valid");

  card.revealed = true;
  addLog(state, `💀 ${player.name} kehilangan ${card.character}`);

  state.loseInfluenceTarget = null;
  checkWinner(state);
  if (state.phase === "game_over") return state;

  // Decide what happens next
  const pending = state.pendingAction;
  if (pending) {
    if (pending.blocker?.playerId === "BLOCK_WON") {
      // Block was proven — action cancelled, advance turn
      state.pendingAction = null;
      advanceTurn(state);
    } else if (pending.claimedCharacter && !pending.blocker) {
      // Challenge on the actor's claim
      if (state.loseInfluenceTarget === null && playerId === pending.actorId) {
        // Actor lost the challenge (they lied) → action cancelled
        state.pendingAction = null;
        advanceTurn(state);
      } else {
        // Challenger lost → resolve the original action
        resolveAction(state, pending);
      }
    } else {
      // Blocker lost challenge → resolve original action
      resolveAction(state, pending);
    }
  } else {
    advanceTurn(state);
  }

  return state;
}

// ============================================================
// Exchange select
// ============================================================

export function handleExchangeSelect(
  state: GameState,
  playerId: string,
  keepIndexes: number[]
): GameState {
  if (state.phase !== "exchange_select") throw new Error("Tidak dalam fase exchange");
  const actor = state.players.find((p) => p.id === playerId)!;
  if (!state.exchangeCards) throw new Error("Tidak ada kartu exchange");

  // exchangeCards contains actor's alive cards + 2 drawn cards
  const allCards = state.exchangeCards;
  const alive = actor.cards.filter((c) => !c.revealed).length;
  if (keepIndexes.length !== alive) throw new Error("Pilih kartu yang tepat");

  const kept = keepIndexes.map((i) => allCards[i]);
  const returned = allCards.filter((_, i) => !keepIndexes.includes(i));

  // Replace actor's alive cards
  let ki = 0;
  for (const card of actor.cards) {
    if (!card.revealed) {
      card.character = kept[ki++];
    }
  }
  for (const c of returned) returnCard(state, c);
  state.exchangeCards = null;
  addLog(state, `🔄 ${actor.name} selesai exchange kartu`);
  advanceTurn(state);
  return state;
}

// ============================================================
// Resolve action
// ============================================================

function resolveAction(state: GameState, pending: PendingAction) {
  const actor = state.players.find((p) => p.id === pending.actorId)!;
  const target = pending.targetId
    ? state.players.find((p) => p.id === pending.targetId)!
    : null;

  switch (pending.type) {
    case "foreign_aid":
      actor.coins += 2;
      addLog(state, `🏦 ${actor.name} mendapat Foreign Aid (+2 koin)`);
      break;

    case "tax":
      actor.coins += 3;
      addLog(state, `🎩 ${actor.name} mengumpulkan Tax (+3 koin)`);
      break;

    case "assassinate":
      if (!target) break;
      actor.coins -= 3;
      addLog(state, `🗡️ ${actor.name} mengassassinate ${target.name}`);
      state.pendingAction = null;
      state.loseInfluenceTarget = target.id;
      state.phase = "lose_influence";
      return;

    case "steal":
      if (!target) break;
      const stolen = Math.min(target.coins, 2);
      target.coins -= stolen;
      actor.coins += stolen;
      addLog(state, `⚓ ${actor.name} mencuri ${stolen} koin dari ${target.name}`);
      break;

    case "exchange": {
      const alive = actor.cards.filter((c) => !c.revealed).map((c) => c.character);
      const drawn = [drawCard(state), drawCard(state)];
      state.exchangeCards = [...alive, ...drawn];
      state.pendingAction = null;
      state.phase = "exchange_select";
      addLog(state, `🔄 ${actor.name} memilih kartu untuk exchange`);
      return;
    }
  }

  state.pendingAction = null;
  advanceTurn(state);
}

// ============================================================
// Turn management
// ============================================================

function advanceTurn(state: GameState) {
  state.phase = "playing";
  state.pendingAction = null;
  state.currentPlayerIndex = nextAliveIndex(state, state.currentPlayerIndex);
  checkWinner(state);
  if (state.phase !== "game_over") {
    const cp = currentPlayer(state);
    addLog(state, `🎯 Giliran ${cp.name}`);
  }
}
