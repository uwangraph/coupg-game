<script lang="ts">
  import { game } from "../lib/store.svelte";
  import Icon from "../lib/Icon.svelte";
  import type { Character, PlayerView } from "../../../worker/src/types";

  const gs = $derived(game.gameState!);
  const phase = $derived(gs.phase);
  const me = $derived(game.me!);
  const myCards = $derived(gs.myCards);
  const myCoins = $derived(gs.myCoins);
  const others = $derived(gs.players.filter((p) => !p.isMe));
  const currentPlayer = $derived(gs.players[gs.currentPlayerIndex]);
  const pending = $derived(gs.pendingAction);
  const isMyTurn = $derived(game.isMyTurn);

  // Target selection
  let selectedTarget = $state<string | null>(null);
  let pendingAction = $state<"coup" | "steal" | "assassinate" | null>(null);

  function selectTarget(action: "coup" | "steal" | "assassinate") {
    pendingAction = action;
    selectedTarget = null;
  }

  function confirmTarget() {
    if (!selectedTarget || !pendingAction) return;
    if (pendingAction === "coup") game.coup(selectedTarget);
    else if (pendingAction === "steal") game.steal(selectedTarget);
    else if (pendingAction === "assassinate") game.assassinate(selectedTarget);
    pendingAction = null;
    selectedTarget = null;
  }

  function cancelTarget() {
    pendingAction = null;
    selectedTarget = null;
  }

  // Exchange card selection
  let exchangeSelected = $state<number[]>([]);
  const exchangeCards = $derived(gs.exchangeCards ?? []);
  const aliveCount = $derived(myCards.filter((c) => !c.revealed).length);

  function toggleExchange(i: number) {
    if (exchangeSelected.includes(i)) {
      exchangeSelected = exchangeSelected.filter((x) => x !== i);
    } else if (exchangeSelected.length < aliveCount) {
      exchangeSelected = [...exchangeSelected, i];
    }
  }

  function confirmExchange() {
    game.exchangeSelect(exchangeSelected);
    exchangeSelected = [];
  }

  // Lose influence
  const mustLose = $derived(phase === "lose_influence" && gs.loseInfluenceTarget === gs.myId);

  // Block options based on pending action
  const blockOptions: Partial<Record<string, Character[]>> = {
    foreign_aid: ["Duke"],
    assassinate: ["Contessa"],
    steal: ["Captain", "Ambassador"],
  };

  // Am I the actor?
  const imActor = $derived(pending?.actorId === gs.myId);
  // Am I the blocker?
  const imBlocker = $derived(pending?.blocker?.playerId === gs.myId);
  // Am I the target?
  const imTarget = $derived(pending?.targetId === gs.myId);
  // Have I already responded?
  const alreadyResponded = $derived(pending?.respondedPlayers.includes(gs.myId) ?? false);

  // Who can react?
  const canChallenge = $derived(
    (phase === "challenge" && !imActor) ||
    (phase === "block_challenge" && !imBlocker)
  );

  const canBlockAction = $derived(
    (phase === "challenge" || phase === "block") && (
      (pending?.type === "foreign_aid" && !imActor) ||
      ((pending?.type === "steal" || pending?.type === "assassinate") && imTarget)
    )
  );

  const charColors: Record<Character, string> = {
    Duke: "var(--role-duke)",
    Assassin: "var(--role-assassin)",
    Captain: "var(--role-captain)",
    Ambassador: "var(--role-ambassador)",
    Contessa: "var(--role-contessa)",
  };

  function avatarColor(i: number) {
    const colors = ["#4a90d9","#52c97a","#e05555","#9b6dff","#d4a843"];
    return colors[i % colors.length];
  }
  function initials(name: string) {
    return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  }
</script>

<div class="layout">
  <!-- Sidebar: others -->
  <aside>
    <div class="aside-header">
      <div class="room-code-group">
        <span class="room-label">Room</span>
        <div class="room-code">{gs.roomCode}</div>
      </div>
      <button class="btn-rules-small" onclick={() => game.showRules = true} title="Lihat Aturan">
        <Icon name="Rules" size={14} class="mr-1" /> Rules
      </button>
    </div>

    <div class="others-list">
      <div class="section-header">
        <span class="section-label">Pemain Lain</span>
        <span class="player-count">{others.length}</span>
      </div>
      {#each gs.players as p, i}
        {#if !p.isMe}
          <div
            class="other-player"
            class:current={gs.players[gs.currentPlayerIndex]?.id === p.id}
            class:dead={p.influenceCount === 0}
            class:selectable={!!pendingAction && p.influenceCount > 0}
            class:selected={selectedTarget === p.id}
            onclick={() => { if (pendingAction && p.influenceCount > 0) selectedTarget = p.id; }}
          >
            <div class="av-wrap">
              <div class="av" style="background: {avatarColor(i)}22; color: {avatarColor(i)}; border: 1px solid {avatarColor(i)}44;">
                {initials(p.name)}
              </div>
              {#if gs.players[gs.currentPlayerIndex]?.id === p.id}
                <div class="turn-dot"></div>
              {/if}
            </div>
            <div class="pinfo">
              <div class="pname">
                {p.name}
                {#if !p.connected}<span class="disc">off</span>{/if}
              </div>
              <div class="pcoins">
                <Icon name="Coins" size={12} class="mr-1" /> {p.coins}
              </div>
            </div>
            <div class="cards-mini">
              {#each { length: p.influenceCount } as _}
                <div class="mini-card alive"></div>
              {/each}
              {#each p.revealedCards as ch}
                <div class="mini-card dead" style="--cc:{charColors[ch]};" title={ch}>
                  <Icon name={ch} size={10} />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <div class="log-box">
      <div class="section-label">Log Aktivitas</div>
      <div class="log-entries">
        {#each gs.log as entry}
          <div class="log-entry">{entry}</div>
        {/each}
      </div>
    </div>
  </aside>

  <!-- Main area -->
  <main>
    <!-- Turn indicator -->
    <div class="status-bar" class:my-turn={isMyTurn}>
      {#if isMyTurn}
        <div class="status-content">
          <span class="pulse-icon blue"></span>
          <span class="status-text">Sekarang giliranmu!</span>
        </div>
      {:else}
        <div class="status-content">
          <span class="pulse-icon gray"></span>
          <span class="status-text">Menunggu <b>{currentPlayer?.name}</b>...</span>
        </div>
      {/if}
      <div class="phase-badge">{phase.replace('_', ' ')}</div>
    </div>

    <!-- My cards -->
    <div class="card my-influence-card">
      <div class="my-header">
        <div class="my-info">
          <span class="section-label">Pengaruhmu</span>
          <h2 class="my-coins"><Icon name="Coins" size={28} class="mr-2" /> {myCoins} <small>koin</small></h2>
        </div>
        {#if mustLose}
          <div class="lose-warning"><Icon name="Alert" size={16} class="mr-2" /> Pilih 1 kartu untuk dibuang!</div>
        {/if}
      </div>
      
      <div class="my-cards">
        {#each myCards as c, i}
          <div 
            class="influence-card" 
            class:dead={c.revealed} 
            class:must-lose={mustLose && !c.revealed}
            style="--cc:{charColors[c.character]};"
          >
            <div class="card-inner">
              <div class="char-icon">
                <Icon name={c.character} size={48} />
              </div>
              <div class="char-name">{c.character}</div>
              {#if !c.revealed && mustLose}
                <button class="lose-btn" onclick={() => game.loseInfluence(i)}>Pilih Ini</button>
              {/if}
              {#if c.revealed}
                <div class="dead-overlay">
                  <Icon name="Skull" size={40} class="mb-2" style="color: var(--accent-red);" />
                  <span class="dead-text">Terbuka</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- === ACTION PHASE === -->
    {#if phase === "playing" && isMyTurn}
      <div class="card action-card">
        <div class="section-label">Pilih Aksi Strategis</div>
        {#if pendingAction}
          <div class="target-selection">
            <div class="target-header">
              <button class="back-btn" onclick={cancelTarget}>
                <Icon name="ArrowLeft" size={14} class="mr-1" /> Kembali
              </button>
              <p>Pilih target <b>{pendingAction}</b>:</p>
            </div>
            <div class="target-grid">
              {#each others.filter(p => p.influenceCount > 0) as p}
                <button
                  class="target-btn"
                  class:active={selectedTarget === p.id}
                  onclick={() => selectedTarget = p.id}
                >
                  <span class="t-name">{p.name}</span>
                  <span class="t-coins"><Icon name="Coins" size={12} class="mr-1" /> {p.coins}</span>
                </button>
              {/each}
            </div>
            <button class="btn btn-primary full confirm-btn" disabled={!selectedTarget} onclick={confirmTarget}>
              <Icon name="Target" size={18} class="mr-2" /> Luncurkan Aksi
            </button>
          </div>
        {:else}
          <div class="action-grid">
            <button class="action-btn" onclick={() => game.income()} disabled={myCoins >= 10}>
              <div class="a-icon"><Icon name="Coins" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Income</div>
                <div class="a-desc">+1 koin</div>
              </div>
            </button>
            <button class="action-btn" onclick={() => game.foreignAid()} disabled={myCoins >= 10}>
              <div class="a-icon"><Icon name="Globe" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Foreign Aid</div>
                <div class="a-desc">+2 koin <small>(bisa diblok)</small></div>
              </div>
            </button>
            <button class="action-btn gold" onclick={() => game.tax()} disabled={myCoins >= 10}>
              <div class="a-icon"><Icon name="Duke" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Tax (Duke)</div>
                <div class="a-desc">+3 koin</div>
              </div>
            </button>
            <button class="action-btn blue" onclick={() => selectTarget("steal")} disabled={myCoins >= 10}>
              <div class="a-icon"><Icon name="Captain" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Steal (Captain)</div>
                <div class="a-desc">Curi 2 koin</div>
              </div>
            </button>
            <button class="action-btn green" onclick={() => game.exchange()} disabled={myCoins >= 10}>
              <div class="a-icon"><Icon name="Ambassador" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Exchange</div>
                <div class="a-desc">Tukar kartu</div>
              </div>
            </button>
            <button class="action-btn red" onclick={() => selectTarget("assassinate")} disabled={myCoins < 3 || myCoins >= 10}>
              <div class="a-icon"><Icon name="Assassin" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Assassinate</div>
                <div class="a-desc">Biaya 3 koin</div>
              </div>
            </button>
            <button class="action-btn coup" onclick={() => selectTarget("coup")} disabled={myCoins < 7}>
              <div class="a-icon"><Icon name="Coup" size={24} /></div>
              <div class="a-content">
                <div class="a-title">Coup d'État</div>
                <div class="a-desc">Biaya 7 koin <small>(Wajib jika ≥10)</small></div>
              </div>
            </button>
          </div>
          {#if myCoins >= 10}
            <div class="force-coup-banner">
              <Icon name="Alert" size={16} class="mr-2" /> Kamu wajib melakukan Coup karena memiliki 10+ koin!
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- === REACTION PHASE === -->
    {#if (canChallenge || canBlockAction) && pending && !alreadyResponded}
      <div class="card reaction-card pulse-blue">
        <div class="reaction-header">
          <span class="badge badge-blue"><Icon name="Zap" size={12} class="mr-1" /> Reaksi Dibutuhkan</span>
        </div>
        
        {#if phase === "block_challenge" && pending.blocker}
          {@const blockerName = gs.players.find(p => p.id === pending.blocker!.playerId)?.name}
          <div class="reaction-content">
            <p class="react-msg">
              <b>{blockerName}</b> memblokir aksimu dengan klaim <b>{pending.blocker.claimedCharacter}</b>.
              Apakah kamu percaya?
            </p>
            <div class="react-actions">
              <button class="btn full" onclick={() => game.acceptBlock()}>
                <Icon name="Check" size={16} class="mr-2" /> Biarkan
              </button>
              <button class="btn btn-danger full" onclick={() => game.challengeBlock()}>
                <Icon name="Zap" size={16} class="mr-2" /> Tantang Blok!
              </button>
            </div>
          </div>
        {:else}
          {@const actorName = gs.players.find(p => p.id === pending.actorId)?.name}
          <div class="reaction-content">
            <p class="react-msg">
              <b>{actorName}</b> melakukan <b>{pending.claimedCharacter ?? pending.type}</b>
              {#if imTarget}<span class="target-tag">kepadamu!</span>{/if}
            </p>
            <div class="react-actions vertical">
              <div class="primary-reacts">
                <button class="btn full" onclick={() => game.pass()}>
                  <Icon name="Check" size={16} class="mr-2" /> Biarkan Saja
                </button>
                {#if canChallenge && pending.claimedCharacter}
                  <button class="btn btn-danger full" onclick={() => game.challenge()}>
                    <Icon name="Zap" size={16} class="mr-2" /> Tantang Bluff!
                  </button>
                {/if}
              </div>
              {#if canBlockAction}
                <div class="block-options">
                  <div class="tiny-label">Atau blokir dengan:</div>
                  <div class="block-btns">
                    {#each (blockOptions[pending.type] ?? []) as ch}
                      <button class="btn btn-primary full" onclick={() => game.block(ch)}>
                        <Icon name="Shield" size={16} class="mr-2" /> {ch}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- === EXCHANGE SELECT === -->
    {#if phase === "exchange_select" && gs.loseInfluenceTarget === null}
      <div class="card exchange-card">
        <div class="section-label">Pilih {aliveCount} kartu untuk disimpan</div>
        <div class="exchange-grid">
          {#each exchangeCards as ch, i}
            <button
              class="ex-card"
              class:picked={exchangeSelected.includes(i)}
              style="--cc:{charColors[ch]};"
              onclick={() => toggleExchange(i)}
            >
              <div class="ex-icon">
                <Icon name={ch} size={32} />
              </div>
              <div class="ex-name">{ch}</div>
              {#if exchangeSelected.includes(i)}
                <div class="ex-check">
                  <Icon name="Check" size={14} />
                </div>
              {/if}
            </button>
          {/each}
        </div>
        <button
          class="btn btn-gold full confirm-ex-btn"
          disabled={exchangeSelected.length !== aliveCount}
          onclick={confirmExchange}
        >
          <Icon name="Check" size={18} class="mr-2" /> Konfirmasi Pilihan Kartu
        </button>
    </div>
    {/if}

    <!-- Waiting indicator -->
    {#if phase === "playing" && !isMyTurn}
      <div class="waiting-box">
        <div class="loader-dots"><span></span><span></span><span></span></div>
        <p>Menunggu strategi <b>{currentPlayer?.name}</b>...</p>
      </div>
    {:else if (phase === "challenge" || phase === "block" || phase === "block_challenge")}
      {#if alreadyResponded || imBlocker || (imActor && phase !== "block_challenge")}
        <div class="waiting-box">
          <div class="loader-dots"><span></span><span></span><span></span></div>
          <p>Menunggu respon pemain lain...</p>
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .layout { display: flex; gap: 1.5rem; min-height: 100vh; padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
  aside { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }
  main { flex: 1; display: flex; flex-direction: column; gap: 1rem; min-width: 0; }

  .aside-header { 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 1rem; background: var(--bg-card); border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }
  .room-code-group { display: flex; flex-direction: column; }
  .room-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
  .room-code { font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: var(--accent-gold); }
  
  .btn-rules-small {
    background: var(--bg-input); border: 1px solid var(--border-muted);
    color: var(--text-dim); font-size: 11px; font-weight: 700; padding: 6px 12px;
    border-radius: 8px; display: flex; align-items: center; gap: 4px;
  }

  .others-list { 
    background: var(--bg-card); border-radius: var(--radius-md); padding: 1rem; 
    border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 10px;
  }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .section-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
  .player-count { font-size: 11px; font-weight: 800; background: var(--bg-input); padding: 2px 8px; border-radius: 6px; color: var(--text-dim); }

  .other-player {
    display: flex; align-items: center; gap: 10px;
    padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);
    background: var(--bg-input); transition: all 0.2s;
  }
  .other-player.current { border-color: var(--accent-gold-soft); background: rgba(226, 180, 77, 0.03); box-shadow: 0 0 15px rgba(226, 180, 77, 0.1); }
  .other-player.dead { opacity: 0.3; filter: grayscale(1); }
  .other-player.selectable { cursor: pointer; border-color: var(--accent-blue); border-style: dashed; }
  .other-player.selectable:hover { background: var(--accent-blue-soft); }
  .other-player.selected { background: var(--accent-blue); border-color: #fff; }
  .other-player.selected .pname, .other-player.selected .pcoins { color: #fff; }

  .av-wrap { position: relative; }
  .av { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
  .turn-dot { position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: var(--accent-gold); border: 2px solid var(--bg-input); border-radius: 50%; box-shadow: 0 0 10px var(--accent-gold); }

  .pinfo { flex: 1; min-width: 0; }
  .pname { font-size: 14px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pcoins { font-size: 12px; color: var(--text-dim); font-weight: 500; display: flex; align-items: center; }
  .disc { font-size: 9px; color: var(--accent-red); margin-left: 4px; font-weight: 800; text-transform: uppercase; }

  .cards-mini { display: flex; gap: 4px; }
  .mini-card { width: 10px; height: 16px; border-radius: 2px; }
  .mini-card.alive { background: var(--accent-purple); opacity: 0.6; }
  .mini-card.dead { background: var(--bg-card); border: 1px solid var(--border-muted); display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--cc); }

  .log-box { 
    background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); 
    padding: 1rem; margin-top: auto; flex: 1; display: flex; flex-direction: column; max-height: 400px;
  }
  .log-entries { overflow-y: auto; flex: 1; padding-right: 4px; }
  .log-entry { font-size: 12px; color: var(--text-dim); padding: 6px 0; border-bottom: 1px solid var(--border-subtle); line-height: 1.4; }
  .log-entry:last-child { border-bottom: none; }

  /* Main Area */
  .status-bar { 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 12px 1.25rem; background: var(--bg-card); border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }
  .status-bar.my-turn { border-color: var(--accent-blue-soft); background: rgba(91, 162, 235, 0.05); }
  .status-content { display: flex; align-items: center; gap: 10px; }
  .pulse-icon { width: 8px; height: 8px; border-radius: 50%; }
  .pulse-icon.blue { background: var(--accent-blue); box-shadow: 0 0 10px var(--accent-blue); animation: pulse 2s infinite; }
  .pulse-icon.gray { background: var(--text-muted); }
  @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.5; } }
  .status-text { font-size: 14px; font-weight: 600; color: var(--text-main); }
  .phase-badge { font-size: 10px; font-weight: 800; text-transform: uppercase; background: var(--bg-input); padding: 4px 10px; border-radius: 6px; color: var(--text-muted); }

  .my-influence-card { padding: 1.5rem; }
  .my-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
  .my-coins { font-size: 28px; font-weight: 800; color: var(--accent-gold); line-height: 1; margin-top: 4px; display: flex; align-items: center; }
  .my-coins small { font-size: 14px; font-weight: 600; color: var(--text-dim); margin-left: 4px; }
  .lose-warning { font-size: 13px; font-weight: 700; color: #fff; background: var(--role-contessa); padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; }

  .my-cards { display: flex; gap: 1rem; }
  .influence-card {
    flex: 1; height: 180px; border-radius: 16px; perspective: 1000px;
    border: 2px solid var(--cc); background: color-mix(in srgb, var(--cc) 8%, var(--bg-input));
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative; overflow: hidden;
  }
  .influence-card:hover:not(.dead) { transform: translateY(-8px); box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 20px color-mix(in srgb, var(--cc) 30%, transparent); }
  .influence-card.dead { border-color: var(--border-muted); background: var(--bg-elevated); opacity: 0.5; }
  .influence-card.must-lose { animation: shake 0.5s infinite; border-color: var(--accent-red); box-shadow: 0 0 15px var(--accent-red-soft); }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

  .card-inner { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 1rem; }
  .char-icon { color: var(--cc); filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
  .char-name { font-size: 16px; font-weight: 800; color: var(--cc); text-transform: uppercase; letter-spacing: 0.05em; }
  .lose-btn { margin-top: 10px; background: #fff; color: var(--accent-red); padding: 6px 16px; border-radius: 8px; font-size: 12px; font-weight: 800; }
  
  .dead-overlay { 
    position: absolute; inset: 0; background: rgba(0,0,0,0.7); 
    display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: grayscale(1) blur(2px);
  }
  .mb-2 { margin-bottom: 8px; }
  .dead-text { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #fff; letter-spacing: 0.1em; }

  /* Actions */
  .action-card, .exchange-card, .reaction-card { 
    padding: 1.5rem; 
    min-height: 340px; 
  }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 1.25rem; }
  .action-btn {
    display: flex; align-items: center; gap: 12px; padding: 14px; 
    background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
    transition: all 0.2s; text-align: left;
  }
  .action-btn:hover:not(:disabled) { background: var(--bg-elevated); border-color: var(--border-bright); transform: translateY(-2px); }
  .action-btn.gold { border-color: rgba(168, 85, 247, 0.2); background: rgba(168, 85, 247, 0.05); }
  .action-btn.blue { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.05); }
  .action-btn.green { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.05); }
  .action-btn.red { border-color: rgba(6, 182, 212, 0.2); background: rgba(6, 182, 212, 0.05); }
  .action-btn.coup { grid-column: span 2; border-color: var(--accent-purple-soft); background: rgba(168, 130, 255, 0.05); }
  
  .a-icon { 
    width: 40px; 
    height: 40px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    background: var(--bg-card); 
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    color: #fff;
    flex-shrink: 0;
  }
  .action-btn.gold .a-icon { background: var(--role-duke); }
  .action-btn.blue .a-icon { background: var(--role-captain); }
  .action-btn.green .a-icon { background: var(--role-ambassador); }
  .action-btn.red .a-icon { background: var(--role-assassin); }
  .action-btn.coup .a-icon { background: var(--accent-purple); }
  
  .a-content { display: flex; flex-direction: column; gap: 2px; }
  .a-title { font-size: 14px; font-weight: 700; color: #fff; }
  .a-desc { font-size: 11px; color: var(--text-dim); font-weight: 500; }
  
  .force-coup-banner { margin-top: 1rem; text-align: center; color: #fff; font-weight: 700; font-size: 13px; padding: 10px; background: var(--role-contessa); border-radius: 8px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; }

  /* Target Selection */
  .target-selection { display: flex; flex-direction: column; gap: 1.25rem; }
  .target-header { display: flex; align-items: center; gap: 1rem; }
  .back-btn { background: transparent; color: var(--accent-blue); font-size: 13px; font-weight: 700; display: flex; align-items: center; }
  .target-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .target-btn { 
    display: flex; flex-direction: column; gap: 4px; padding: 12px; 
    background: var(--bg-input); border: 1px solid var(--border-muted); border-radius: var(--radius-md);
  }
  .target-btn.active { background: var(--accent-blue); border-color: #fff; }
  .target-btn.active .t-name, .target-btn.active .t-coins { color: #fff; }
  .t-name { font-size: 14px; font-weight: 700; }
  .t-coins { font-size: 11px; color: var(--text-dim); display: flex; align-items: center; }
  .confirm-btn { padding: 14px; display: flex; align-items: center; justify-content: center; }

  /* Reactions */
  .reaction-card { padding: 1.5rem; border-color: var(--accent-blue); border-width: 2px; }
  .pulse-blue { box-shadow: 0 0 20px rgba(91, 162, 235, 0.2); animation: card-pulse 2s infinite; }
  @keyframes card-pulse { 0% { box-shadow: 0 0 10px rgba(91, 162, 235, 0.1); } 50% { box-shadow: 0 0 25px rgba(91, 162, 235, 0.3); } 100% { box-shadow: 0 0 10px rgba(91, 162, 235, 0.1); } }
  .reaction-header { margin-bottom: 12px; }
  .reaction-content { margin-top: 1rem; }
  .react-msg { font-size: 15px; color: var(--text-main); line-height: 1.6; margin-bottom: 1.25rem; }
  .target-tag { color: var(--accent-red); font-weight: 800; background: var(--accent-red-soft); padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
  .react-actions { display: flex; gap: 10px; }
  .react-actions.vertical { flex-direction: column; gap: 1.5rem; }
  .primary-reacts { display: flex; gap: 10px; }
  .block-options { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 1rem; }
  .tiny-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
  .block-btns { display: flex; gap: 10px; }

  /* Exchange */
  .exchange-card { padding: 1.5rem; border-color: var(--accent-green); }
  .exchange-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 1.25rem; }
  .ex-card {
    width: 90px; height: 130px; border-radius: 12px;
    border: 2px solid var(--border-muted); background: var(--bg-input);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.2s; position: relative;
    padding: 0;
  }
  .ex-card.picked { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 12%, var(--bg-input)); transform: scale(1.05); }
  .ex-icon { color: var(--cc); }
  .ex-name { font-size: 11px; font-weight: 800; color: var(--text-dim); text-transform: uppercase; }
  .picked .ex-name { color: var(--cc); }
  .ex-check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; background: var(--cc); border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; }

  .waiting-box { 
    display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 2rem; 
    color: var(--text-dim); text-align: center; min-height: 340px;
  }
  .loader-dots { display: flex; gap: 4px; }
  .loader-dots span { width: 6px; height: 6px; background: var(--accent-blue); border-radius: 50%; animation: dot-pulse 1.4s infinite; }
  .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loader-dots span:nth-child(3) { animation-delay: 0.4s; }

  @media (max-width: 850px) {
    .layout { flex-direction: column; padding: 1rem; }
    aside { width: 100%; order: 2; }
    main { order: 1; }
    .my-cards { overflow-x: auto; padding-bottom: 8px; }
    .influence-card { min-width: 140px; }
  }
</style>
