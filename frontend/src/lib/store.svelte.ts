import type { ClientMessage, GameStateView, ServerMessage } from "../../../worker/src/types";

// ============================================================
// Reactive WebSocket state — Svelte 5 runes-compatible
// ============================================================

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

class GameStore {
  // Reactive state
  status = $state<ConnectionStatus>("disconnected");
  gameState = $state<GameStateView | null>(null);
  error = $state<string | null>(null);
  roomCode = $state<string | null>(null);
  myName = $state<string>("");

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  // ----------------------------------------------------------
  // Connect / disconnect
  // ----------------------------------------------------------

  connect(code: string, name: string) {
    this.disconnect();
    this.roomCode = code.toUpperCase();
    this.myName = name;
    this.reconnectAttempts = 0;
    this._openSocket();
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.status = "disconnected";
    this.gameState = null;
  }

  private _openSocket() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/rooms/${this.roomCode}/ws`;

    this.status = "connecting";
    this.error = null;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.status = "connected";
      this.reconnectAttempts = 0;
      this.send({ type: "join", name: this.myName });
    };

    ws.onmessage = (ev) => {
      try {
        const msg: ServerMessage = JSON.parse(ev.data);
        if (msg.type === "state") {
          this.gameState = msg.state;
          this.error = null;
        } else if (msg.type === "error") {
          this.error = msg.message;
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (this.status !== "disconnected") {
        this._scheduleReconnect();
      }
    };

    ws.onerror = () => {
      this.status = "error";
      this._scheduleReconnect();
    };
  }

  private _scheduleReconnect() {
    if (this.reconnectAttempts >= 5) {
      this.status = "error";
      this.error = "Koneksi terputus. Muat ulang halaman.";
      return;
    }
    this.status = "connecting";
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this._openSocket();
    }, delay);
  }

  // ----------------------------------------------------------
  // Send helpers
  // ----------------------------------------------------------

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  startGame() { this.send({ type: "start_game" }); }
  income() { this.send({ type: "action", action: "income" }); }
  foreignAid() { this.send({ type: "action", action: "foreign_aid" }); }
  tax() { this.send({ type: "action", action: "tax" }); }
  exchange() { this.send({ type: "action", action: "exchange" }); }
  coup(targetId: string) { this.send({ type: "action", action: "coup", targetId }); }
  steal(targetId: string) { this.send({ type: "action", action: "steal", targetId }); }
  assassinate(targetId: string) { this.send({ type: "action", action: "assassinate", targetId }); }
  challenge() { this.send({ type: "challenge" }); }
  pass() { this.send({ type: "pass" }); }
  block(character: import("../../../worker/src/types").Character) { this.send({ type: "block", character }); }
  challengeBlock() { this.send({ type: "challenge_block" }); }
  acceptBlock() { this.send({ type: "accept_block" }); }
  loseInfluence(cardIndex: number) { this.send({ type: "lose_influence", cardIndex }); }
  exchangeSelect(cardIndexes: number[]) { this.send({ type: "exchange_select", cardIndexes }); }

  // ----------------------------------------------------------
  // Derived helpers
  // ----------------------------------------------------------

  get me() {
    return this.gameState?.players.find((p) => p.isMe) ?? null;
  }

  get isMyTurn() {
    const gs = this.gameState;
    if (!gs) return false;
    return gs.players[gs.currentPlayerIndex]?.isMe ?? false;
  }

  get canAct() {
    return this.isMyTurn && this.gameState?.phase === "playing";
  }
}

export const game = new GameStore();
