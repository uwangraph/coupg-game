<script lang="ts">
  import { game } from "./lib/store.svelte";
  import Lobby from "./routes/Lobby.svelte";
  import Waiting from "./routes/Waiting.svelte";
  import Game from "./routes/Game.svelte";
  import GameOver from "./routes/GameOver.svelte";

  const phase = $derived(game.gameState?.phase ?? null);
  const inGame = $derived(phase && phase !== "lobby");
  const gameOver = $derived(phase === "game_over");
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
