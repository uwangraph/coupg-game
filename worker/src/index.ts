import type {
  Card,
  Character,
  ClientMessage,
  GameState,
  GameStateView,
  Player,
  PlayerView,
  ServerMessage,
} from "./types";
import {
  aliveInfluence,
  createInitialState,
  handleAction,
  handleBlock,
  handleChallenge,
  handleExchangeSelect,
  handleLoseInfluence,
  handlePass,
  isAlive,
  startGame,
} from "./game";

interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

// ============================================================
// Durable Object
// ============================================================

export class GameRoom implements DurableObject {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, string> = new Map(); // ws → playerId
  private gameState!: GameState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      const saved = await this.state.storage.get<GameState>("gameState");
      this.gameState = saved ?? createInitialState(this.getRoomCode());
    });
  }

  private getRoomCode(): string {
    return this.state.id.toString().slice(0, 6).toUpperCase();
  }

  // ----------------------------------------------------------
  // HTTP entrypoint
  // ----------------------------------------------------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
      this.handleWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/state") {
      return Response.json(this.gameState);
    }

    return new Response("Not found", { status: 404 });
  }

  // ----------------------------------------------------------
  // WebSocket lifecycle
  // ----------------------------------------------------------

  private handleWebSocket(ws: WebSocket) {
    this.state.acceptWebSocket(ws);
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const playerId = this.sessions.get(ws);
    let msg: ClientMessage;

    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      this.send(ws, { type: "error", message: "JSON tidak valid" });
      return;
    }

    try {
      await this.handleMessage(ws, playerId, msg);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      this.send(ws, { type: "error", message });
    }
  }

  async webSocketOpen(ws: WebSocket) {
    // Player ID will be assigned on "join" message
  }

  async webSocketClose(ws: WebSocket) {
    const playerId = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (playerId) {
      const player = this.gameState.players.find((p) => p.id === playerId);
      if (player) player.connected = false;
      await this.saveAndBroadcast();
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.webSocketClose(ws);
  }

  // ----------------------------------------------------------
  // Message handler
  // ----------------------------------------------------------

  private async handleMessage(
    ws: WebSocket,
    playerId: string | undefined,
    msg: ClientMessage
  ) {
    if (msg.type === "join") {
      await this.handleJoin(ws, msg.name);
      return;
    }

    if (!playerId) {
      this.send(ws, { type: "error", message: "Bergabunglah terlebih dahulu" });
      return;
    }

    switch (msg.type) {
      case "start_game":
        this.gameState = startGame(this.gameState);
        break;

      case "action":
        this.gameState = handleAction(this.gameState, playerId, msg.action, msg.targetId);
        break;

      case "challenge":
        this.gameState = handleChallenge(this.gameState, playerId);
        break;

      case "pass":
        this.gameState = handlePass(this.gameState, playerId);
        break;

      case "block":
        this.gameState = handleBlock(this.gameState, playerId, msg.character);
        break;

      case "challenge_block":
        // Reuse challenge handler — context is block_challenge phase
        this.gameState = handleChallenge(this.gameState, playerId);
        break;

      case "accept_block":
        this.gameState = handlePass(this.gameState, playerId);
        break;

      case "lose_influence":
        this.gameState = handleLoseInfluence(this.gameState, playerId, msg.cardIndex);
        break;

      case "exchange_select":
        this.gameState = handleExchangeSelect(this.gameState, playerId, msg.cardIndexes);
        break;
    }

    await this.saveAndBroadcast();
  }

  // ----------------------------------------------------------
  // Join
  // ----------------------------------------------------------

  private async handleJoin(ws: WebSocket, name: string) {
    if (this.gameState.phase !== "lobby") {
      // Reconnect existing player
      const existing = this.gameState.players.find((p) => p.name === name);
      if (existing) {
        existing.connected = true;
        this.sessions.set(ws, existing.id);
        await this.saveAndBroadcast();
        return;
      }
      this.send(ws, { type: "error", message: "Game sudah berjalan" });
      return;
    }

    if (this.gameState.players.length >= 6) {
      this.send(ws, { type: "error", message: "Room sudah penuh" });
      return;
    }

    const playerId = crypto.randomUUID();
    const player: Player = {
      id: playerId,
      name: name.slice(0, 20),
      coins: 0,
      cards: [],
      connected: true,
    };

    this.gameState.players.push(player);
    this.sessions.set(ws, playerId);
    await this.saveAndBroadcast();
  }

  // ----------------------------------------------------------
  // Broadcast
  // ----------------------------------------------------------

  private async saveAndBroadcast() {
    await this.state.storage.put("gameState", this.gameState);
    for (const [ws, playerId] of this.sessions.entries()) {
      try {
        const view = this.buildView(playerId);
        this.send(ws, { type: "state", state: view });
      } catch {
        // ignore closed sockets
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  // ----------------------------------------------------------
  // Build personalised state view
  // ----------------------------------------------------------

  private buildView(playerId: string): import("./types").GameStateView {
    const me = this.gameState.players.find((p) => p.id === playerId)!;
    const players: PlayerView[] = this.gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      influenceCount: p.cards.filter((c) => !c.revealed).length,
      revealedCards: p.cards.filter((c) => c.revealed).map((c) => c.character),
      connected: p.connected,
      isMe: p.id === playerId,
    }));

    return {
      roomCode: this.gameState.roomCode,
      phase: this.gameState.phase,
      myId: playerId,
      players,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      pendingAction: this.gameState.pendingAction,
      loseInfluenceTarget: this.gameState.loseInfluenceTarget,
      exchangeCards: this.gameState.phase === "exchange_select" && me
        ? this.gameState.exchangeCards
        : null,
      myCards: me ? me.cards : [],
      myCoins: me ? me.coins : 0,
      winner: this.gameState.winner,
      log: this.gameState.log,
    };
  }
}

// ============================================================
// Worker entry — HTTP router
// ============================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    // POST /rooms — create or get room
    if (url.pathname === "/rooms" && request.method === "POST") {
      const body = await request.json<{ code?: string }>();
      const code = body.code
        ? body.code.toUpperCase().slice(0, 6)
        : generateCode();
      const id = env.GAME_ROOM.idFromName(code);
      return new Response(JSON.stringify({ code }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    // GET /rooms/:code/state
    const stateMatch = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,6})\/state$/);
    if (stateMatch) {
      const id = env.GAME_ROOM.idFromName(stateMatch[1]);
      const stub = env.GAME_ROOM.get(id);
      const resp = await stub.fetch(new Request("https://internal/state"));
      return new Response(await resp.text(), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    // WebSocket upgrade — /rooms/:code/ws
    const wsMatch = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,6})\/ws$/);
    if (wsMatch) {
      const id = env.GAME_ROOM.idFromName(wsMatch[1]);
      const stub = env.GAME_ROOM.get(id);
      return stub.fetch(
        new Request(request.url.replace(url.pathname, "/ws"), request)
      );
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// ============================================================
// Helpers
// ============================================================

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
