<script lang="ts">
  import { game } from "../lib/store.svelte";

  const gs = $derived(game.gameState!);
  const winner = $derived(gs.players.find((p) => p.id === gs.winner));
  const iWon = $derived(winner?.isMe ?? false);
</script>

<div class="wrap">
  <div class="crown">{iWon ? "👑" : "💀"}</div>
  <h1>{iWon ? "Kamu Menang!" : `${winner?.name ?? "?"} Menang!`}</h1>
  <p class="sub">{iWon ? "Bluffmu tak tertandingi!" : "Kamu kalah kali ini..."}</p>

  <div class="card results">
    <div class="section-label">Hasil akhir</div>
    {#each gs.players as p}
      <div class="result-row" class:winner={p.id === gs.winner}>
        <span class="rank-icon">{p.id === gs.winner ? "👑" : "💀"}</span>
        <span class="pname">{p.name}{p.isMe ? " (kamu)" : ""}</span>
        <span class="pcoins">💰 {p.coins}</span>
        <div class="cards-row">
          {#each p.revealedCards as ch}
            <span class="chip">{ch}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="log card">
    <div class="section-label">Log permainan</div>
    {#each gs.log as entry}
      <div class="log-entry">{entry}</div>
    {/each}
  </div>

  <button class="btn btn-gold full" onclick={() => game.disconnect()}>
    Kembali ke Lobby
  </button>
</div>

<style>
  .wrap { max-width: 480px; margin: 0 auto; padding: 3rem 1rem; text-align: center; }
  .crown { font-size: 64px; margin-bottom: 12px; }
  h1 { font-size: 28px; font-weight: 700; }
  .sub { color: var(--text2); margin-top: 6px; margin-bottom: 2rem; }
  .results { text-align: left; margin-bottom: 1rem; }
  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); margin-bottom: 10px; }
  .result-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .result-row:last-child { border-bottom: none; }
  .result-row.winner { color: var(--gold); }
  .rank-icon { font-size: 18px; }
  .pname { flex: 1; font-size: 14px; font-weight: 500; }
  .pcoins { font-size: 13px; color: var(--text2); }
  .cards-row { display: flex; gap: 4px; flex-wrap: wrap; }
  .chip { font-size: 11px; background: var(--bg3); border: 1px solid var(--border2); padding: 2px 8px; border-radius: 999px; }
  .log { text-align: left; margin-bottom: 1.5rem; max-height: 220px; overflow-y: auto; }
  .log-entry { font-size: 12px; color: var(--text2); padding: 3px 0; border-bottom: 1px solid var(--border); }
  .log-entry:last-child { border-bottom: none; }
  .full { width: 100%; margin-top: 0; }
</style>
