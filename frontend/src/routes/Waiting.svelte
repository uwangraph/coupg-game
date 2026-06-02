<script lang="ts">
  import { game } from "../lib/store.svelte";

  const gs = $derived(game.gameState);
  const players = $derived(gs?.players ?? []);
  const isHost = $derived(players[0]?.isMe ?? false);
  const isCreator = $derived(gs?.isCreator ?? false);
  const canStart = $derived(isHost && players.length >= 2);

  function copyCode() {
    if (gs?.roomCode) navigator.clipboard.writeText(gs.roomCode);
  }
</script>

<div class="wrap">
  <div class="header">
    <div>
      <div class="label">Kode Room</div>
      <div class="code" onclick={copyCode} title="Klik untuk salin">
        {gs?.roomCode ?? "…"} 📋
        {#if gs?.isPrivate}<span class="badge badge-purple" style="margin-left:8px;">Private</span>{/if}
      </div>
    </div>
    <span class="badge badge-green">
      <span class="dot-live"></span>
      {players.length}/6 pemain
    </span>
  </div>

  <div class="card">
    <div class="section-label">Pemain di room</div>
    {#each players as p, i}
      <div class="player-row">
        <div class="avatar" style="background: {avatarBg(i)}; color: {avatarFg(i)};">
          {initials(p.name)}
        </div>
        <div class="player-name">
          {p.name}
          {#if i === 0}<span class="host-tag">Host</span>{/if}
          {#if p.isMe}<span class="you-tag">Kamu</span>{/if}
          {#if p.isCreator}<span class="creator-tag">Pembuat</span>{/if}
        </div>
        <div class="dot" class:online={p.connected}></div>
        {#if isCreator && !p.isMe}
          <button class="kick-btn" onclick={() => {
            if (confirm(`Kamu yakin ingin kick ${p.name}?`)) {
              game.kick(p.id);
            }
          }}>
            👋
          </button>
        {/if}
      </div>
    {/each}

    {#each { length: Math.max(0, 2 - players.length) } as _}
      <div class="player-row empty">
        <div class="avatar empty-av">?</div>
        <div style="color:var(--text3);font-size:13px;">Menunggu pemain...</div>
      </div>
    {/each}
  </div>

  <div class="hint">
    Bagikan kode room ke teman-temanmu. Game bisa dimulai dengan minimal 2 pemain. Room akan hilang setelah 1 bulan.
  </div>

  {#if isHost}
    <button class="btn btn-gold full" disabled={!canStart} onclick={() => game.startGame()}>
      {canStart ? "▶ Mulai Game" : `Butuh ${2 - players.length} pemain lagi`}
    </button>
  {:else}
    <div class="waiting-text">Menunggu host memulai game...</div>
  {/if}

  <div style="display: flex; gap:8px; margin-top:8px;">
    <button class="btn full" onclick={() => game.disconnect()}>
      Keluar
    </button>
    {#if isCreator}
      <button class="btn btn-danger full" onclick={() => {
        if (confirm("Apakah kamu yakin ingin menghapus room ini?")) {
          game.deleteRoom();
        }
      }}>
        🗑️ Hapus Room
      </button>
    {/if}
  </div>
</div>

<script context="module" lang="ts">
  const BG = ["#1a2a4a","#1a3830","#3a1a2a","#2a1a3a","#1a3020","#3a2a10"];
  const FG = ["#4a90d9","#52c97a","#e05555","#9b6dff","#52c97a","#d4a843"];
  function avatarBg(i: number) { return BG[i % BG.length]; }
  function avatarFg(i: number) { return FG[i % FG.length]; }
  function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  }
</script>

<style>
  .wrap { max-width: 480px; margin: 0 auto; padding: 2rem 1rem; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; }
  .label { font-size: 12px; color: var(--text2); margin-bottom: 4px; }
  .code { font-size: 28px; font-weight: 700; letter-spacing: 0.1em; cursor: pointer; color: var(--gold); }
  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); margin-bottom: 12px; }
  .player-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .player-row:last-child { border-bottom: none; }
  .player-row.empty { opacity: 0.4; }
  .avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; }
  .empty-av { background: var(--bg3); color: var(--text3); }
  .player-name { flex: 1; font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .host-tag, .you-tag, .creator-tag { font-size: 10px; padding: 2px 7px; border-radius: 999px; font-weight: 500; }
  .host-tag { background: var(--gold-bg); color: var(--gold); }
  .you-tag { background: var(--blue-bg); color: var(--blue); }
  .creator-tag { background: var(--gold-bg); color: var(--gold); }
  .kick-btn { 
    background: var(--red-bg); 
    color: var(--red); 
    border: 1px solid var(--red); 
    border-radius: 6px; 
    padding: 4px 8px; 
    font-size: 12px; 
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .kick-btn:hover { opacity: 0.8; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border2); }
  .dot.online { background: var(--green); }
  .hint { font-size: 13px; color: var(--text3); text-align: center; margin: 1rem 0; }
  .full { width: 100%; }
  .waiting-text { text-align: center; color: var(--text2); font-size: 14px; padding: 12px 0; }
</style>
