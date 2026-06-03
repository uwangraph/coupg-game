<script lang="ts">
  import { game } from "../lib/store.svelte";
  import Icon from "../lib/Icon.svelte";

  const gs = $derived(game.gameState!);
  const winner = $derived(gs.players.find((p) => p.id === gs.winner));
  const iWon = $derived(winner?.isMe ?? false);
</script>

<div class="wrap">
  <div class="hero card" class:win={iWon}>
    <div class="crown-wrap">
      <div class="crown">{iWon ? "👑" : "💀"}</div>
      <div class="glow"></div>
    </div>
    <h1>{iWon ? "Kamu Menang!" : `${winner?.name ?? "?"} Menang!`}</h1>
    <p class="sub">{iWon ? "Bluffmu tak tertandingi!" : "Kamu kalah kali ini..."}</p>
  </div>

  <div class="card results">
    <div class="section-label">Hasil akhir</div>
    <div class="players-list">
      {#each gs.players as p}
        <div class="result-row" class:winner={p.id === gs.winner}>
          <div class="p-main">
            <span class="rank-icon">
              <Icon name={p.id === gs.winner ? "Crown" : "Skull"} size={20} />
            </span>
            <div class="p-details">
              <span class="pname">{p.name}{p.isMe ? " (kamu)" : ""}</span>
              <span class="pcoins">
                <Icon name="Coins" size={12} class="mr-1" />
                {p.coins} koin tersisa
              </span>
            </div>
          </div>
          <div class="cards-row">
            {#each p.revealedCards as ch}
              <span class="chip" title={ch}>{ch}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="log-card card">
    <div class="section-label">Log permainan</div>
    <div class="log-entries">
      {#each gs.log as entry}
        <div class="log-entry">{entry}</div>
      {/each}
    </div>
  </div>

  <button class="btn btn-rules-waiting" onclick={() => game.showRules = true}>
    <Icon name="Rules" size={16} class="mr-2" /> Baca Aturan Permainan
  </button>

  <div class="actions">
    <button class="btn btn-gold full rematch-btn" onclick={() => game.rematch()}>
      <Icon name="Refresh" size={18} class="mr-2" /> Main Lagi (Rematch)
    </button>
    <button class="btn btn-outline full" onclick={() => game.disconnect()}>
      <Icon name="LogOut" size={18} class="mr-2" /> Kembali ke Lobby
    </button>
  </div>

</div>

<style>
  .wrap { max-width: 520px; margin: 0 auto; padding: 3rem 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
  
  .hero { text-align: center; padding: 2.5rem 1.5rem; }
  .hero.win { border-color: var(--accent-gold-soft); background: radial-gradient(circle at 50% 0%, var(--accent-gold-soft), var(--bg-card)); }
  
  .crown-wrap { position: relative; margin-bottom: 1.5rem; }
  .crown { font-size: 64px; position: relative; z-index: 2; filter: drop-shadow(0 0 15px rgba(226, 180, 77, 0.4)); }
  .glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100px; height: 100px; background: radial-gradient(circle, var(--accent-gold-soft), transparent 70%); }
  
  h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; }
  .sub { color: var(--text-dim); font-size: 16px; font-weight: 500; }

  .results { padding: 1.5rem; }
  .section-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 1.25rem; }
  
  .players-list { display: flex; flex-direction: column; gap: 10px; }
  .result-row { 
    display: flex; flex-direction: column; gap: 10px; padding: 12px; 
    background: var(--bg-input); border-radius: var(--radius-md); 
    border: 1px solid var(--border-subtle);
  }
  .result-row.winner { border-color: var(--accent-gold-soft); background: rgba(226, 180, 77, 0.05); }
  
  .p-main { display: flex; align-items: center; gap: 12px; }
  .rank-icon { font-size: 20px; }
  .p-details { display: flex; flex-direction: column; }
  .pname { font-size: 15px; font-weight: 700; color: var(--text-main); }
  .pcoins { font-size: 12px; color: var(--text-dim); }

  .cards-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { 
    font-size: 11px; font-weight: 700; color: var(--text-dim);
    background: var(--bg-card); border: 1px solid var(--border-muted); 
    padding: 3px 10px; border-radius: 6px; 
  }
  .winner .chip { border-color: var(--accent-gold-soft); color: var(--accent-gold); }

  .log-card { padding: 1.5rem; }
  .log-entries { max-height: 200px; overflow-y: auto; padding-right: 8px; }
  .log-entry { 
    font-size: 13px; color: var(--text-dim); padding: 8px 0; 
    border-bottom: 1px solid var(--border-subtle); line-height: 1.5; 
  }
  .log-entry:last-child { border-bottom: none; }

  .btn-rules-waiting {
    background: var(--bg-input); border: 1px solid var(--border-muted);
    color: var(--text-dim); font-size: 13px; font-weight: 600; padding: 12px;
    border-radius: var(--radius-md);
  }

  .actions { display: flex; gap: 12px; }
  .rematch-btn { padding: 14px; box-shadow: 0 4px 15px rgba(226, 180, 77, 0.2); }
  .btn-outline { background: transparent; border: 1px solid var(--border-muted); color: var(--text-dim); }
  .btn-outline:hover { background: var(--bg-input); border-color: var(--border-bright); color: var(--text-main); }

  @media (max-width: 480px) {
    .actions { flex-direction: column; }
  }
</style>
