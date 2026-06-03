<script lang="ts">
  import { game } from "./lib/store.svelte";
  import Lobby from "./routes/Lobby.svelte";
  import Waiting from "./routes/Waiting.svelte";
  import Game from "./routes/Game.svelte";
  import GameOver from "./routes/GameOver.svelte";
  import RulesModal from "./routes/RulesModal.svelte";

  const phase = $derived(game.gameState?.phase ?? null);
  const inGame = $derived(phase && phase !== "lobby");
  const gameOver = $derived(phase === "game_over");

  // Auto connect ketika mount jika ada data di localStorage
  {
    const saved = localStorage.getItem("coup-room");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.code && data.name) {
          game.connect(data.code, data.name, data.password || "");
        }
      } catch {
        localStorage.removeItem("coup-room");
      }
    }
  }

  // Tutup WebSocket ketika tab ditutup (tetap simpan data agar bisa reconnect nanti)
  window.addEventListener("beforeunload", () => {
    if (game.ws) {
      game.ws.close();
    }
  });
  window.addEventListener("pagehide", () => {
    if (game.ws) {
      game.ws.close();
    }
  });
</script>

<main>
  {#if game.status === "disconnected"}
    <Lobby />
  {:else if gameOver}
    <GameOver />
  {:else if inGame}
    <Game />
  {:else}
    <Waiting />
  {/if}

  {#if game.error}
    <div class="error-toast">{game.error}</div>
  {/if}

  <RulesModal isOpen={game.showRules} onClose={() => game.showRules = false} />
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .error-toast {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: var(--red-bg);
    color: var(--red);
    border: 1px solid var(--red);
    border-radius: var(--radius);
    padding: 10px 20px;
    font-size: 14px;
    z-index: 999;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
</style>
