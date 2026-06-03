<script lang="ts">
  import { game } from "../lib/store.svelte";
  import Icon from "../lib/Icon.svelte";

  const gs = $derived(game.gameState);
  const players = $derived(gs?.players ?? []);
  const isHost = $derived(players[0]?.isMe ?? false);
  const isCreator = $derived(gs?.isCreator ?? false);
  const canStart = $derived(isHost && players.length >= 2);

  function copyCode() {
    if (gs?.roomCode) navigator.clipboard.writeText(gs.roomCode);
  }

  // Avatar helper functions
  const BG = ["#1a2a4a","#1a3830","#3a1a2a","#2a1a3a","#1a3020","#3a2a10"];
  const FG = ["#4a90d9","#52c97a","#e05555","#9b6dff","#52c97a","#d4a843"];
  function avatarBg(i: number) { return BG[i % BG.length]; }
  function avatarFg(i: number) { return FG[i % FG.length]; }
  function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
  }
</script>

<div class="wrap">
  <div class="header-card card">
    <div class="header-main">
      <div class="room-info">
        <div class="label">Kode Room</div>
        <div class="code-wrap" onclick={copyCode} title="Klik untuk salin">
          <span class="code">{gs?.roomCode ?? "…"}</span>
          <span class="copy-icon">📋</span>
          {#if gs?.isPrivate}<span class="badge badge-purple" style="margin-left:8px;">Private</span>{/if}
        </div>
      </div>
      <div class="status-badge">
        <span class="badge badge-green">
          <span class="dot-live"></span>
          {players.length}/6 Pemain
        </span>
      </div>
    </div>
    
    <button class="btn btn-rules-waiting" onclick={() => game.showRules = true}>
      📖 Baca Aturan Permainan
    </button>
  </div>

  <div class="card player-list-card">
    <div class="section-header">
      <span class="section-label">Pemain di room</span>
      <span class="pulse-icon"></span>
    </div>
    <div class="players-grid">
      {#each players as p, i}
        <div class="player-row" class:is-me={p.isMe}>
          <div class="avatar-wrap">
            <div class="avatar" style="background: {avatarBg(i)}22; color: {avatarFg(i)}; border-color: {avatarFg(i)}44;">
              {initials(p.name)}
            </div>
            {#if p.connected}
              <div class="online-indicator"></div>
            {/if}
          </div>
          <div class="player-info">
            <div class="player-name">
              {p.name}
              <div class="tags">
                {#if i === 0}<span class="tag tag-host">Host</span>{/if}
                {#if p.isMe}<span class="tag tag-you">Kamu</span>{/if}
              </div>
            </div>
          </div>
          {#if isCreator && !p.isMe}
            <button class="kick-btn" onclick={() => {
              if (confirm(`Kamu yakin ingin kick ${p.name}?`)) {
                game.kick(p.id);
              }
            }} title="Kick pemain">
              ✕
            </button>
          {/if}
        </div>
      {/each}

      {#each { length: Math.max(0, 2 - players.length) } as _}
        <div class="player-row empty">
          <div class="avatar empty-av">?</div>
          <div class="player-info">
            <div class="waiting-text-small">Menunggu pemain...</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="hint-card">
    <span class="hint-icon">💡</span>
    <p class="hint">
      Bagikan kode room ke teman-temanmu. Game bisa dimulai dengan minimal 2 pemain.
    </p>
  </div>

  <div class="actions">
    {#if isHost}
      <button class="btn btn-gold full start-btn" disabled={!canStart} onclick={() => game.startGame()}>
        <Icon name={canStart ? "Plus" : "User"} size={20} class="mr-2" />
        {canStart ? "Mulai Permainan" : `Butuh ${2 - players.length} pemain lagi`}
      </button>
    {:else}
      <div class="waiting-host-card">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>Menunggu host memulai game...</p>
      </div>
    {/if}

    <div class="secondary-actions">
      <button class="btn btn-outline full" onclick={() => game.leave()}>
        <Icon name="LogOut" size={16} class="mr-2" /> Keluar Room
      </button>
      {#if isCreator}
        <button class="btn btn-danger-soft full" onclick={() => {
          if (confirm("Apakah kamu yakin ingin menghapus room ini?")) {
            game.deleteRoom();
          }
        }}>
          <Icon name="Trash" size={16} class="mr-2" /> Hapus Room
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .wrap { max-width: 520px; margin: 0 auto; padding: 2.5rem 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
  
  .header-card { padding: 1.5rem; }
  .header-main { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
  .label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .code-wrap { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    cursor: pointer; 
    transition: opacity 0.2s;
  }
  .code-wrap:hover { opacity: 0.8; }
  .code { font-size: 32px; font-weight: 800; letter-spacing: 0.05em; color: var(--accent-gold); line-height: 1; }
  .copy-icon { font-size: 18px; opacity: 0.5; }
  
  .btn-rules-waiting {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border-muted);
    color: var(--text-dim);
    font-size: 13px;
    font-weight: 600;
    padding: 10px;
    border-radius: var(--radius-md);
  }
  .btn-rules-waiting:hover {
    background: var(--bg-card);
    color: var(--text-main);
    border-color: var(--border-bright);
  }

  .player-list-card { padding: 1.5rem; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
  .section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
  .pulse-icon { width: 8px; height: 8px; background: var(--accent-green); border-radius: 50%; box-shadow: 0 0 10px var(--accent-green); opacity: 0.6; }

  .players-grid { display: flex; flex-direction: column; gap: 8px; }
  .player-row { 
    display: flex; 
    align-items: center; 
    gap: 12px; 
    padding: 12px; 
    background: var(--bg-input);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    transition: all 0.2s;
  }
  .player-row.is-me { border-color: var(--accent-blue-soft); background: rgba(91, 162, 235, 0.05); }
  .player-row.empty { opacity: 0.4; border-style: dashed; border-color: var(--border-muted); }
  
  .avatar-wrap { position: relative; }
  .avatar { 
    width: 44px; height: 44px; border-radius: 12px; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 15px; font-weight: 700; flex-shrink: 0;
    border: 1px solid transparent;
  }
  .online-indicator {
    position: absolute; bottom: -2px; right: -2px;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--accent-green); border: 3px solid var(--bg-card);
  }
  .empty-av { background: var(--bg-card); color: var(--text-muted); border: 1px dashed var(--border-bright); }

  .player-info { flex: 1; min-width: 0; }
  .player-name { 
    font-size: 15px; font-weight: 600; color: var(--text-main);
    display: flex; flex-direction: column; gap: 2px;
  }
  .tags { display: flex; gap: 4px; }
  .tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
  .tag-host { background: var(--accent-gold-soft); color: var(--accent-gold); }
  .tag-you { background: var(--accent-blue-soft); color: var(--accent-blue); }

  .kick-btn { 
    width: 28px; height: 28px; border-radius: 8px;
    background: var(--accent-red-soft); color: var(--accent-red); 
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700;
  }
  .kick-btn:hover { background: var(--accent-red); color: #fff; }

  .hint-card { 
    display: flex; gap: 12px; padding: 1rem 1.25rem; 
    background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-md);
    align-items: center;
  }
  .hint-icon { font-size: 20px; }
  .hint { font-size: 13px; color: var(--text-dim); line-height: 1.5; }

  .actions { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
  .start-btn { padding: 16px; font-size: 16px; box-shadow: 0 4px 15px rgba(226, 180, 77, 0.2); }
  
  .waiting-host-card {
    background: var(--bg-card); padding: 1.5rem; border-radius: var(--radius-lg);
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    border: 1px solid var(--border-subtle);
  }
  .waiting-host-card p { font-size: 14px; color: var(--text-dim); font-weight: 500; }

  .loading-dots { display: flex; gap: 4px; }
  .loading-dots span {
    width: 6px; height: 6px; background: var(--accent-blue); border-radius: 50%;
    animation: dot-pulse 1.4s infinite ease-in-out;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.1); opacity: 1; } }

  .secondary-actions { display: flex; gap: 10px; }
  .btn-outline { background: transparent; border: 1px solid var(--border-muted); color: var(--text-dim); }
  .btn-outline:hover { background: var(--bg-input); color: var(--text-main); }
  .btn-danger-soft { background: var(--accent-red-soft); color: var(--accent-red); border: 1px solid transparent; }
  .btn-danger-soft:hover { background: var(--accent-red); color: #fff; }
</style>
