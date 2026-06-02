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
  resetGame,
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
  private gameState: GameState | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.state.blockConcurrencyWhile(async () => {
      this.gameState = await this.state.storage.get<GameState>("gameState") ?? null;
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
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

    if (url.pathname === "/initialize") {
        try {
          const code = url.searchParams.get("code") || this.getRoomCode();
          const isPrivate = url.searchParams.get("isPrivate") === "true";
          const password = url.searchParams.get("password") || null;
          
          if (!this.gameState) {
            this.gameState = createInitialState(code, isPrivate, password);
            await this.state.storage.put("gameState", this.gameState);
            return new Response("Initialized");
          }

          const now = Date.now();
          const isExpired = this.gameState.isDeleted || (now - this.gameState.roomCreatedAt) > ONE_MONTH_MS;
          const isLobbyEmpty = this.gameState.phase === "lobby" && this.gameState.players.length === 0;

          if (isExpired || isLobbyEmpty) {
            // Boleh re-init
            this.gameState = createInitialState(code, isPrivate, password);
            await this.state.storage.put("gameState", this.gameState);
            return new Response("Initialized");
          }

          // Jika room sudah aktif (phase bukan lobby atau masih ada player di lobby) → error!
          return new Response("Room code already in use", { status: 409 });
        } catch (err: any) {
          return new Response("Error: " + err.message, { status: 500 });
        }
      }

    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const name = url.searchParams.get("name");
      const password = url.searchParams.get("password") || null;
      if (!name || !this.gameState) {
        return new Response("Nama atau Room tidak valid", { status: 400 });
      }

      // Check if room is expired or deleted
      const now = Date.now();
      if (this.gameState.isDeleted || (now - this.gameState.roomCreatedAt) > ONE_MONTH_MS) {
        return new Response("Room tidak ditemukan atau sudah kadaluarsa", { status: 404 });
      }

      // Check password for private rooms
      if (this.gameState.isPrivate && this.gameState.password && this.gameState.password !== password) {
        return new Response("Password salah", { status: 401 });
      }

      let playerId: string;
      // Try to find a player with the same name (even if still connected - for refresh case)
      let player = this.gameState.players.find((p) => p.name === name);

      if (player) {
        playerId = player.id;
        // If player was still connected, close the old socket first
        const allSockets = this.state.getWebSockets();
        for (const ws of allSockets) {
          const tags = this.state.getTags(ws);
          if (tags[0] === playerId) {
            ws.close(1000, "New connection from same user");
          }
        }
        player.connected = true;
      } else {
        // No player found, create new one
        if (this.gameState.phase !== "lobby") {
          return new Response("Game sudah berjalan", { status: 403 });
        }
        if (this.gameState.players.length >= 6) {
          return new Response("Room penuh", { status: 403 });
        }
        playerId = crypto.randomUUID();
        // If first player, set as creator
        if (this.gameState.players.length === 0) {
          this.gameState.creatorId = playerId;
        }
        this.gameState.players.push({
          id: playerId,
          name: name.slice(0, 20),
          coins: 0,
          cards: [],
          connected: true,
        });
      }
      
      await this.saveAndBroadcast();

      const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
      this.state.acceptWebSocket(server, [playerId]); 
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

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const tags = this.state.getTags(ws);
    const playerId = tags[0]; 

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

  async webSocketClose(ws: WebSocket) {
    const tags = this.state.getTags(ws);
    const playerId = tags[0];
    if (playerId && this.gameState) {
      const player = this.gameState.players.find((p) => p.id === playerId);
      if (player) {
        const activeSockets = this.state.getWebSockets(playerId);
        if (activeSockets.length === 0) {
          player.connected = false;
          await this.saveAndBroadcast();
        }
      }
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
      await this.saveAndBroadcast();
      return;
    }

    if (!playerId) {
      this.send(ws, { type: "error", message: "Bergabunglah terlebih dahulu" });
      return;
    }

    if (!this.gameState) return;

    switch (msg.type) {
      case "leave":
        // Remove player from the room entirely
        this.gameState.players = this.gameState.players.filter(p => p.id !== playerId);
        // Close any of their WebSockets
        const theirSockets = this.state.getWebSockets(playerId);
        for (const sock of theirSockets) {
          sock.close(4003, "left_room");
        }
        break;
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
      case "rematch":
        this.gameState = resetGame(this.gameState);
        break;
      case "delete_room":
        // Only creator can delete the room
        if (this.gameState.creatorId === playerId) {
          this.gameState.isDeleted = true;
          // Close all WebSocket connections with custom reason "room_deleted"
          const allSockets = this.state.getWebSockets();
          for (const ws of allSockets) {
            ws.close(4001, "room_deleted");
          }
        } else {
          this.send(ws, { type: "error", message: "Hanya pembuat room yang bisa menghapusnya" });
          return;
        }
        break;
      case "kick":
        // Only creator can kick
        if (this.gameState.creatorId !== playerId) {
          this.send(ws, { type: "error", message: "Hanya pembuat room yang bisa kick" });
          return;
        }
        // Cannot kick yourself
        if (msg.targetId === playerId) {
          this.send(ws, { type: "error", message: "Tidak bisa kick dirimu sendiri" });
          return;
        }
        // Find target socket and close it with reason "kicked"
        const allSockets = this.state.getWebSockets();
        for (const sock of allSockets) {
          const tags = this.state.getTags(sock);
          const sockPlayerId = tags[0];
          if (sockPlayerId === msg.targetId) {
            sock.close(4002, "kicked");
          }
        }
        // Remove player from gameState
        this.gameState.players = this.gameState.players.filter(p => p.id !== msg.targetId);
        break;
    }

    await this.saveAndBroadcast();
  }

  private async saveAndBroadcast() {
    if (!this.gameState) return;
    await this.state.storage.put("gameState", this.gameState);
    
    const allSockets = this.state.getWebSockets();
    for (const ws of allSockets) {
      try {
        const tags = this.state.getTags(ws);
        const playerId = tags[0];
        if (playerId) {
          const view = this.buildView(playerId);
          this.send(ws, { type: "state", state: view });
        }
      } catch { /* ignore */ }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch { /* ignore */ }
  }

  private buildView(playerId: string): GameStateView {
    if (!this.gameState) throw new Error("No game state");
    const me = this.gameState.players.find((p) => p.id === playerId)!;
    const players: PlayerView[] = this.gameState.players.map((p) => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      influenceCount: p.cards.filter((c) => !c.revealed).length,
      revealedCards: p.cards.filter((c) => c.revealed).map((c) => c.character),
      connected: p.connected,
      isMe: p.id === playerId,
      isCreator: p.id === this.gameState.creatorId,
    }));

    return {
      roomCode: this.gameState.roomCode,
      phase: this.gameState.phase,
      myId: playerId,
      players,
      currentPlayerIndex: this.gameState.currentPlayerIndex,
      pendingAction: this.gameState.pendingAction,
      loseInfluenceTarget: this.gameState.loseInfluenceTarget,
      exchangeCards: this.gameState.phase === "exchange_select" 
        && me 
        && this.gameState.players[this.gameState.currentPlayerIndex]?.id === playerId
        ? this.gameState.exchangeCards
        : null,
      myCards: me ? me.cards : [],
      myCoins: me ? me.coins : 0,
      winner: this.gameState.winner,
      log: this.gameState.log,
      // Add if current player is creator
      isCreator: playerId === this.gameState.creatorId,
      isPrivate: this.gameState.isPrivate,
    };
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    if (!this.gameState) return;
    const tags = this.state.getTags(ws);
    const playerId = tags[0];
    if (!playerId) return;
    // Skip jika ditutup karena kick atau room deleted (sudah ditangani di message handler)
    if (reason === "kicked" || reason === "room_deleted") return;
    // Tandai player sebagai disconnected
    const player = this.gameState.players.find(p => p.id === playerId);
    if (player) {
      player.connected = false;
      await this.saveAndBroadcast();
    }
  }
}

// ============================================================
// Worker entry — HTTP router
// ============================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders() });
      }

      if (url.pathname === "/rooms" && request.method === "POST") {
        let code: string;
        let isPrivate = false;
        let password: string | null = null;
        try {
          const body = await request.json() as { code?: string; isPrivate?: boolean; password?: string };
          code = body?.code ? body.code.toUpperCase().slice(0, 10) : generateCode();
          isPrivate = !!body?.isPrivate;
          password = isPrivate && body?.password ? body.password : null;
        } catch {
          code = generateCode();
        }
        
        const id = env.GAME_ROOM.idFromName(code);
        const stub = env.GAME_ROOM.get(id);
        await stub.fetch(new Request(`http://game/initialize?code=${code}&isPrivate=${isPrivate}&password=${encodeURIComponent(password || "")}`));

        return new Response(JSON.stringify({ code }), {
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const stateMatch = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,10})\/state$/);
      if (stateMatch) {
        const id = env.GAME_ROOM.idFromName(stateMatch[1]);
        const stub = env.GAME_ROOM.get(id);
        const resp = await stub.fetch(new Request("https://internal/state"));
        return new Response(await resp.text(), {
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const wsMatch = url.pathname.match(/^\/rooms\/([A-Z0-9]{4,10})\/ws$/);
      if (wsMatch) {
        const id = env.GAME_ROOM.idFromName(wsMatch[1]);
        const stub = env.GAME_ROOM.get(id);
        return stub.fetch(
          new Request(request.url.replace(url.pathname, "/ws"), request)
        );
      }

      return new Response("Path not found: " + url.pathname, { status: 404 });
    } catch (err: any) {
      return new Response("Worker Internal Error: " + err.message, { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

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
