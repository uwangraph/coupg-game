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

  // Status pemain untuk reaksi
  const imActor = $derived(pending?.actorId === gs.myId);
  const imBlocker = $derived(pending?.blocker?.playerId === gs.myId);
  const imTarget = $derived(pending?.targetId === gs.myId);
  const alreadyResponded = $derived(pending?.respondedPlayers.includes(gs.myId) ?? false);

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
    Duke: "#A855F7",
    Assassin: "#06B6D4",
    Captain: "#3B82F6",
    Ambassador: "#22C55E",
    Contessa: "#EF4444",
  };

  function avatarColor(i: number) {
    const colors = ["#4a90d9","#52c97a","#e05555","#9b6dff","#d4a843"];
    return colors[i % colors.length];
  }
  function initials(name: string) {
    return name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function copyRoomCode() {
    if (gs.roomCode) {
      navigator.clipboard.writeText(gs.roomCode);
    }
  }
</script>

<div class="layout">
  <!-- AREA UTAMA PERMAINAN -->
  <main>
    <!-- Status Turn & Fase Aktif -->
    <div class="status-bar" class:my-turn={isMyTurn}>
      <div class="status-content">
        <span class="pulse-icon" class:blue={isMyTurn} class:gray={!isMyTurn}></span>
        <span class="status-text">
          {#if isMyTurn}
            Sekarang <b>giliranmu!</b> Pilih opsi aksi di bawah.
          {:else}
            Menunggu langkah dari <b>{currentPlayer?.name}</b>...
          {/if}
        </span>
      </div>
      <div class="phase-badge">{phase.replace('_', ' ')}</div>
    </div>

    <!-- Area Kartu & Koin Player -->
    <div class="card my-influence-card">
      <div class="my-header">
        <div class="my-info">
          <span class="section-label">Aset Kamu</span>
          <h2 class="my-coins">
            <Icon name="Coins" size={22} class="icon-gold" /> {myCoins} <small>Koin</small>
          </h2>
        </div>
        {#if mustLose}
          <div class="lose-warning">
            <Icon name="Alert" size={14} /> Pilih 1 kartu untuk dibuang!
          </div>
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
                <Icon name={c.character} size={36} />
              </div>
              <div class="char-name">{c.character}</div>
              {#if !c.revealed && mustLose}
                <button class="lose-btn" onclick={() => game.loseInfluence(i)}>Korbankan</button>
              {/if}
              {#if c.revealed}
                <div class="dead-overlay">
                  <Icon name="Skull" size={28} class="mb-1" />
                  <span class="dead-text">Terbuka</span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- === ACTION DASHBOARD === -->
    {#if phase === "playing" && isMyTurn}
      <div class="card action-card">
        {#if pendingAction}
          <!-- Pemilihan Target -->
          <div class="target-selection">
            <div class="target-header">
              <button class="back-btn" onclick={cancelTarget}>
                <Icon name="ArrowLeft" size={14} /> Kembali
              </button>
              <span class="section-label">Pilih Target Aksi: {pendingAction}</span>
            </div>
            <div class="target-grid">
              {#each others.filter(p => p.influenceCount > 0) as p}
                <button
                  class="target-btn"
                  class:active={selectedTarget === p.id}
                  onclick={() => selectedTarget = p.id}
                >
                  <span class="t-name">{p.name}</span>
                  <span class="t-coins"><Icon name="Coins" size={12} /> {p.coins} Koin</span>
                </button>
              {/each}
            </div>
            <button class="btn btn-primary confirm-btn" disabled={!selectedTarget} onclick={confirmTarget}>
              <Icon name="Target" size={16} /> Eksekusi {pendingAction}
            </button>
          </div>
        {:else}
          <!-- Pilihan Menu Utama Aksi -->
          <span class="section-label">Pilih Langkah Strategis</span>
          
          <div class="action-sections">
            <!-- Kelompok Aksi Dasar -->
            <div class="action-group">
              <div class="group-title">Aksi Dasar (Aman)</div>
              <div class="action-grid basic-grid">
                <button class="action-btn-clean" style="--cc: var(--text-dim);" onclick={() => game.income()} disabled={myCoins >= 10}>
                  <div class="a-icon"><Icon name="Coins" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Income</span>
                    <span class="a-desc">+1 Koin</span>
                  </div>
                </button>
                <button class="action-btn-clean" style="--cc: var(--text-dim);" onclick={() => game.foreignAid()} disabled={myCoins >= 10}>
                  <div class="a-icon"><Icon name="Globe" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Foreign Aid</span>
                    <span class="a-desc">+2 Koin</span>
                  </div>
                </button>
                <button class="action-btn-clean coup-style" style="--cc: var(--accent-gold);" onclick={() => selectTarget("coup")} disabled={myCoins < 7}>
                  <div class="a-icon"><Icon name="Coup" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Coup d'État</span>
                    <span class="a-desc">Biaya 7 Koin (Pasti)</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Kelompok Klaim Peran / Bluff -->
            <div class="action-group">
              <div class="group-title">Aksi Karakter (Bisa Gertak / Bluff)</div>
              <div class="action-grid character-grid">
                <button class="action-btn-clean" style="--cc: {charColors.Duke};" onclick={() => game.tax()} disabled={myCoins >= 10}>
                  <div class="a-icon" style="color: {charColors.Duke};"><Icon name="Duke" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Tax <small>(Duke)</small></span>
                    <span class="a-desc">+3 Koin</span>
                  </div>
                </button>
                <button class="action-btn-clean" style="--cc: {charColors.Captain};" onclick={() => selectTarget("steal")} disabled={myCoins >= 10}>
                  <div class="a-icon" style="color: {charColors.Captain};"><Icon name="Captain" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Steal <small>(Captain)</small></span>
                    <span class="a-desc">Curi 2 Koin</span>
                  </div>
                </button>
                <button class="action-btn-clean" style="--cc: {charColors.Ambassador};" onclick={() => game.exchange()} disabled={myCoins >= 10}>
                  <div class="a-icon" style="color: {charColors.Ambassador};"><Icon name="Ambassador" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Exchange <small>(Ambassador)</small></span>
                    <span class="a-desc">Tukar Kartu</span>
                  </div>
                </button>
                <button class="action-btn-clean" style="--cc: {charColors.Assassin};" onclick={() => selectTarget("assassinate")} disabled={myCoins < 3 || myCoins >= 10}>
                  <div class="a-icon" style="color: {charColors.Assassin};"><Icon name="Assassin" size={18} /></div>
                  <div class="a-content">
                    <span class="a-title">Assassinate <small>(Assassin)</small></span>
                    <span class="a-desc">Biaya 3 Koin</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {#if myCoins >= 10}
            <div class="force-coup-banner">
              <Icon name="Alert" size={16} /> Dompet penuh! Kamu wajib Kudeta (Coup).
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- === REACTION BOARD === -->
    {#if (canChallenge || canBlockAction) && pending && !alreadyResponded}
      <div class="card reaction-card dynamic-glow">
        <div class="reaction-header">
          <span class="badge-alert"><Icon name="Zap" size={12} /> Respons Dibutuhkan</span>
        </div>
        
        {#if phase === "block_challenge" && pending.blocker}
          {@const blockerName = gs.players.find(p => p.id === pending.blocker!.playerId)?.name}
          <div class="reaction-content">
            <p class="react-msg">
              <b>{blockerName}</b> memblokir aksimu dengan mengklaim peran <b>{pending.blocker.claimedCharacter}</b>.
            </p>
            <div class="react-actions">
              <button class="btn btn-secondary" onclick={() => game.acceptBlock()}>
                <Icon name="Check" size={16} /> Izinkan
              </button>
              <button class="btn btn-danger" onclick={() => game.challengeBlock()}>
                <Icon name="Zap" size={16} /> Tantang Kebohongan!
              </button>
            </div>
          </div>
        {:else}
          {@const actorName = gs.players.find(p => p.id === pending.actorId)?.name}
          <div class="reaction-content">
            <p class="react-msg">
              <b>{actorName}</b> melakukan aksi <b>{pending.claimedCharacter ?? pending.type}</b>
              {#if imTarget}<span class="target-tag">Menargetkanmu!</span>{/if}
            </p>
            <div class="react-actions vertical-stack">
              <div class="primary-reacts">
                <button class="btn btn-secondary" onclick={() => game.pass()}>
                  <Icon name="Check" size={16} /> Biarkan Saja
                </button>
                {#if canChallenge && pending.claimedCharacter}
                  <button class="btn btn-danger" onclick={() => game.challenge()}>
                    <Icon name="Zap" size={16} /> Tantang Bluff!
                  </button>
                {/if}
              </div>
              
              {#if canBlockAction}
                <div class="block-options">
                  <div class="tiny-label">Atau klaim peran tameng untuk blokir:</div>
                  <div class="block-btns">
                    {#each (blockOptions[pending.type] ?? []) as ch}
                      <button class="btn btn-primary" onclick={() => game.block(ch)}>
                        <Icon name="Shield" size={16} /> Sebagai {ch}
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

    <!-- === EXCHANGE SELECTION === -->
    {#if phase === "exchange_select" && gs.loseInfluenceTarget === null}
      <div class="card exchange-card">
        <span class="section-label">Opsi Ambil Alih Deck (Pilih {aliveCount})</span>
        <div class="exchange-grid">
          {#each exchangeCards as ch, i}
            <button
              class="ex-card"
              class:picked={exchangeSelected.includes(i)}
              style="--cc:{charColors[ch]};"
              onclick={() => toggleExchange(i)}
            >
              <div class="ex-icon">
                <Icon name={ch} size={24} />
              </div>
              <div class="ex-name">{ch}</div>
              {#if exchangeSelected.includes(i)}
                <div class="ex-check">
                  <Icon name="Check" size={10} />
                </div>
              {/if}
            </button>
          {/each}
        </div>
        <button
          class="btn btn-gold confirm-ex-btn"
          disabled={exchangeSelected.length !== aliveCount}
          onclick={confirmExchange}
        >
          <Icon name="Check" size={16} /> Simpan Kartu Terpilih
        </button>
      </div>
    {/if}

    <!-- Indicator Tunggu Minimalis -->
    {#if phase === "playing" && !isMyTurn}
      <div class="waiting-card-subtle">
        <div class="waiting-box">
          <div class="loader-dots"><span></span><span></span><span></span></div>
          <p>Menunggu keputusan taktik dari <b>{currentPlayer?.name}</b>...</p>
        </div>
      </div>
    {:else if (phase === "challenge" || phase === "block" || phase === "block_challenge")}
      {#if alreadyResponded || imBlocker || (imActor && phase !== "block_challenge")}
        <div class="waiting-card-subtle">
          <div class="waiting-box">
            <div class="loader-dots"><span></span><span></span><span></span></div>
            <p>Menunggu tanggapan meja dari pemain lain...</p>
          </div>
        </div>
      {/if}
    {/if}
  </main>

  <!-- SIDEBAR INFORMASI MEJA & LOGS -->
  <aside>
    <div class="aside-header">
      <div class="room-code-group">
        <span class="room-label">Room Code</span>
        <div class="room-code-wrap" onclick={copyRoomCode} title="Klik untuk salin kode room">
          <span class="room-code">{gs.roomCode}</span>
          <Icon name="Copy" size={14} class="copy-icon" />
        </div>
      </div>
      <button class="btn-rules-small" onclick={() => game.showRules = true}>
        <Icon name="Rules" size={12} /> Aturan Main
      </button>
    </div>

    <!-- Panel Status Seluruh Pemain -->
    <div class="others-list">
      <div class="section-header">
        <span class="section-label">Kondisi Meja Pertandingan</span>
        <span class="player-count">{gs.players.length} Pemain</span>
      </div>
      <div class="players-stack">
        {#each gs.players as p, i}
          <div
            class="other-player"
            class:is-me={p.isMe}
            class:current={gs.players[gs.currentPlayerIndex]?.id === p.id}
            class:dead={p.influenceCount === 0}
            class:selectable={p.isMe ? false : (!!pendingAction && p.influenceCount > 0)}
            class:selected={selectedTarget === p.id}
            onclick={() => { if (!p.isMe && pendingAction && p.influenceCount > 0) selectedTarget = p.id; }}
          >
            <div class="av-wrap">
              <div 
                class="av" 
                style="background: {avatarColor(i)}18; color: {avatarColor(i)} ; border: 1px solid {avatarColor(i)}30;"
              >
                {initials(p.name)}
              </div>
            </div>
            
            <div class="pinfo">
              <div class="pname">
                {p.name} {p.isMe ? '(Anda)' : ''}
                {#if !p.connected}<span class="disc">DC</span>{/if}
              </div>
              <div class="pcoins">
                <Icon name="Coins" size={11} class="icon-gold" /> {p.coins} Koin
              </div>
            </div>

            <div class="cards-mini">
              {#each { length: p.influenceCount } as _}
                <div class="mini-card alive"></div>
              {/each}
              {#each p.revealedCards as ch}
                <div class="mini-card dead" style="border-color: {charColors[ch]}40; color: {charColors[ch]};" title={ch}>
                  <Icon name={ch} size={10} />
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Log Perjalanan Game -->
    <div class="log-box">
      <span class="section-label">Log Aktivitas Game</span>
      <div class="log-entries">
        {#each gs.log as entry}
          <div class="log-entry">{entry}</div>
        {/each}
      </div>
    </div>
  </aside>
</div>

<style>
  :global(:root) {
    --bg-card: #121214;
    --bg-input: #1a1a1e;
    --bg-elevated: #26262b;
    --border-subtle: #2d2d34;
    --text-main: #f4f4f7;
    --text-dim: #a1a1aa;
    --text-muted: #61616a;
    --accent-gold: #f59e0b;
    --accent-blue: #2563eb;
    --accent-red: #dc2626;
    --accent-green: #16a34a;
    --radius-md: 14px;
  }

  .layout { 
    display: flex; 
    gap: 1.25rem; 
    padding: 1rem; 
    max-width: 1200px; 
    margin: 0 auto; 
    font-family: system-ui, -apple-system, sans-serif;
    color: var(--text-main);
  }
  
  main { flex: 1; display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
  aside { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }

  /* Komponen Umum Card */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    position: relative;
  }
  
  .section-label { 
    font-size: 11px; 
    font-weight: 700; 
    text-transform: uppercase; 
    letter-spacing: 0.05em; 
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    display: block;
  }
  .icon-gold { color: var(--accent-gold); }

  /* ========================================== */
  /* GAYA BARU: CLEAN & MINIMALIS (TANPA GARIS) */
  /* ========================================== */
  
  /* Tombol Aksi Bersih */
  .action-btn-clean {
    display: flex; 
    align-items: center; 
    gap: 12px; 
    padding: 12px 16px; 
    background: var(--bg-input); 
    border: 1px solid var(--border-subtle); 
    border-radius: var(--radius-md);
    text-align: left; 
    cursor: pointer; 
    color: var(--text-main); 
    position: relative;
    overflow: hidden;
    transition: background 0.2s, transform 0.1s, border-color 0.2s, box-shadow 0.2s;
  }
  
  /* Efek feedback diganti dengan highlight border transparan bawaan variabel warna */
  .action-btn-clean:hover:not(:disabled) {
    background: var(--bg-elevated);
    border-color: var(--cc);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .action-btn-clean:disabled { opacity: 0.35; cursor: not-allowed; }

  .coup-style { 
    grid-column: span 2; 
    border: 1px dashed rgba(245, 158, 11, 0.3); 
    background: rgba(245, 158, 11, 0.02); 
  }
  .coup-style:hover:not(:disabled) { background: rgba(245, 158, 11, 0.05); border-color: var(--accent-gold); }

  .a-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .a-content { display: flex; flex-direction: column; min-width: 0; }
  .a-title { font-size: 13px; font-weight: 600; }
  .a-title small { font-size: 11px; color: var(--text-muted); font-weight: 400; }
  .a-desc { font-size: 11px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Kartu Pengaruh Utama (Atas) Tanpa Garis Atas */
  .influence-card {
    flex: 1; 
    height: 110px; 
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    background: linear-gradient(180deg, color-mix(in srgb, var(--cc) 8%, transparent) 0%, color-mix(in srgb, var(--cc) 3%, transparent) 100%);
    position: relative; 
    overflow: hidden;
    transition: all 0.2s ease;
  }

  /* Saat di-hover, border luar langsung berubah warna sesuai karakter */
  .influence-card:hover:not(.dead) { 
    transform: translateY(-2px); 
    border-color: var(--cc); 
    background: linear-gradient(180deg, color-mix(in srgb, var(--cc) 12%, transparent) 0%, color-mix(in srgb, var(--cc) 6%, transparent) 100%);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  }

  .influence-card.dead { opacity: 0.35; filter: grayscale(1); }
  
  .card-inner { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 0.5rem; }
  .char-icon { color: var(--cc); opacity: 0.85; }
  .char-name { font-size: 12px; font-weight: 700; color: var(--text-main); }
  .lose-btn { background: #fff; color: #000; border: none; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; cursor: pointer; }
  .dead-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--accent-red); }
  .dead-text { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }

  /* List Pemain Lain (Sidebar) Tanpa Garis Kiri */
  .other-player { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    padding: 10px 12px; 
    background: var(--bg-input); 
    border: 1px solid var(--border-subtle); 
    border-radius: 10px; 
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, background 0.2s;
  }

  /* Indikator giliran aktif sekarang murni menggunakan border emas halus */
  .other-player.current {
    border-color: var(--accent-gold);
    background: rgba(245, 158, 11, 0.03);
  }

  /* ========================================== */

  /* Game Status Bar */
  .status-bar { 
    display: flex; align-items: center; justify-content: space-between; 
    padding: 0.75rem 1rem; background: var(--bg-card); border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle); gap: 12px;
  }
  .status-bar.my-turn { border-color: rgba(37, 99, 235, 0.3); background: rgba(37, 99, 235, 0.04); }
  .status-content { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .status-text { font-size: 13px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pulse-icon { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .pulse-icon.blue { background: var(--accent-blue); box-shadow: 0 0 10px var(--accent-blue); animation: calmBlink 2s infinite ease-in-out; }
  .pulse-icon.gray { background: var(--text-muted); }
  @keyframes calmBlink { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  .phase-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--bg-input); padding: 4px 8px; border-radius: 6px; color: var(--text-dim); flex-shrink: 0; border: 1px solid var(--border-subtle); }

  /* Info Aset */
  .my-influence-card { display: flex; flex-direction: column; gap: 0.75rem; }
  .my-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem; }
  .my-coins { font-size: 20px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 4px; }
  .my-coins small { font-size: 12px; color: var(--text-dim); font-weight: 400; }
  .lose-warning { font-size: 11px; font-weight: 600; background: var(--accent-red); padding: 4px 10px; border-radius: 6px; display: flex; align-items: center; gap: 6px; }
  .my-cards { display: flex; gap: 0.75rem; }

  /* Action Grid System */
  .action-card { display: flex; flex-direction: column; gap: 0.75rem; }
  .action-sections { display: flex; flex-direction: column; gap: 1rem; }
  .action-group { display: flex; flex-direction: column; gap: 0.5rem; }
  .group-title { font-size: 11px; font-weight: 600; color: var(--text-muted); }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .force-coup-banner { text-align: center; font-weight: 600; font-size: 11px; padding: 8px; background: rgba(220, 38, 38, 0.15); border: 1px solid var(--accent-red); border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; }

  /* Target & Reactions Selection */
  .target-selection { display: flex; flex-direction: column; gap: 0.75rem; }
  .target-header { display: flex; align-items: center; gap: 10px; }
  .back-btn { background: none; border: none; color: var(--accent-blue); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
  .target-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .target-btn { display: flex; flex-direction: column; padding: 10px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; color: var(--text-main); }
  .target-btn.active { border-color: var(--accent-blue); background: rgba(37, 99, 235, 0.08); }
  .t-name { font-size: 12px; font-weight: 600; }
  .t-coins { font-size: 10px; color: var(--text-dim); display: flex; align-items: center; gap: 3px; margin-top: 2px; }
  
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; }
  .btn-primary { background: var(--accent-blue); color: #fff; }
  .btn-secondary { background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-subtle); }
  .btn-danger { background: var(--accent-red); color: #fff; }
  .btn-gold { background: var(--accent-gold); color: #000; }
  .confirm-btn { margin-top: 0.5rem; padding: 10px; }

  .reaction-card.dynamic-glow { border: 1px solid var(--accent-blue); box-shadow: 0 0 12px rgba(37, 99, 235, 0.1); }
  .badge-alert { font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--accent-blue); color: #fff; padding: 3px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; }
  .reaction-content { display: flex; flex-direction: column; gap: 0.75rem; }
  .react-msg { font-size: 13px; line-height: 1.4; margin: 0; }
  .target-tag { color: #fff; background: var(--accent-red); padding: 1px 4px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 4px; }
  .react-actions { display: flex; gap: 6px; }
  .vertical-stack { flex-direction: column; gap: 0.75rem; }
  .primary-reacts { display: flex; gap: 6px; }
  .primary-reacts .btn { flex: 1; }
  .block-options { border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 6px; }
  .tiny-label { font-size: 10px; color: var(--text-muted); font-weight: 600; }
  .block-btns { display: flex; gap: 6px; }
  .block-btns .btn { flex: 1; }

  /* Tukar Kartu */
  .exchange-card { border-color: var(--accent-green); }
  .exchange-grid { display: flex; gap: 6px; flex-wrap: wrap; margin: 0.5rem 0; }
  .ex-card { width: 75px; height: 95px; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; position: relative; color: var(--text-main); padding: 0; }
  .ex-card.picked { border-color: var(--cc); background: rgba(255,255,255,0.01); }
  .ex-name { font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
  .picked .ex-name { color: var(--cc); }
  .ex-icon { color: var(--text-muted); }
  .picked .ex-icon { color: var(--cc); }
  .ex-check { position: absolute; top: 4px; right: 4px; width: 14px; height: 14px; background: var(--cc); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }

  /* Loader */
  .waiting-card-subtle { background: rgba(18, 18, 20, 0.5); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; }
  .waiting-box { display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--text-dim); font-size: 12px; }
  .loader-dots { display: flex; gap: 3px; }
  .loader-dots span { width: 5px; height: 5px; background: var(--accent-blue); border-radius: 50%; animation: dotPulse 1.4s infinite ease-in-out; }
  .loader-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loader-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dotPulse { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }

  /* Aside / Table Info */
  .aside-header { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.6rem 0.75rem; border-radius: var(--radius-md); }
  .room-code-group { display: flex; flex-direction: column; }
  .room-label { font-size: 9px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
  .room-code-wrap { display: flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.2s; }
  .room-code-wrap:hover { opacity: 0.8; }
  .room-code { font-size: 15px; font-weight: 700; color: var(--accent-gold); }
  .copy-icon { color: var(--text-muted); transition: color 0.2s; }
  .room-code-wrap:hover .copy-icon { color: var(--text-dim); }
  .btn-rules-small { background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-dim); font-size: 11px; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }

  .others-list { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
  .player-count { font-size: 10px; background: var(--bg-input); padding: 2px 6px; border-radius: 4px; color: var(--text-dim); font-weight: 600; border: 1px solid var(--border-subtle); }
  .players-stack { display: flex; flex-direction: column; gap: 5px; }

  .other-player.dead { opacity: 0.3; filter: grayscale(1); }
  .other-player.selectable { cursor: pointer; border: 1px dashed var(--accent-blue); }
  .other-player.selected { background: rgba(37, 99, 235, 0.12); border-color: var(--accent-blue); }

  .av-wrap { position: relative; }
  .av { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  
  .pinfo { flex: 1; min-width: 0; }
  .pname { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pcoins { font-size: 10px; color: var(--text-dim); display: flex; align-items: center; gap: 2px; }
  .disc { font-size: 8px; background: var(--accent-red); color: #fff; padding: 1px 3px; border-radius: 3px; margin-left: 4px; font-weight: 700; }

  .cards-mini { display: flex; gap: 4px; align-items: center; }
  .mini-card { width: 10px; height: 16px; border-radius: 3px; transition: all 0.2s; }
  .mini-card.alive { background: #5b21b6; border: 1px solid #7c3aed; box-shadow: 0 0 4px rgba(124, 58, 237, 0.3); }
  .mini-card.dead { background: #16161a; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; color: var(--cc); }

  .log-box { background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 0.85rem; border-radius: var(--radius-md); display: flex; flex-direction: column; max-height: 180px; }
  .log-entries { overflow-y: auto; display: flex; flex-direction: column; gap: 2px; margin-top: 0.4rem; }
  .log-entry { font-size: 11px; color: var(--text-dim); line-height: 1.3; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.01); }

  /* ==================================================== */
  /* RESPONSIVE LAYOUT UNTUK HP (MOBILE COMFORT ENGINE)   */
  /* ==================================================== */
  @media (max-width: 768px) {
    .layout { 
      flex-direction: column; 
      padding: 0.5rem; 
      gap: 0.75rem; 
    }
    
    main { order: 1; gap: 0.75rem; }
    aside { width: 100%; order: 2; gap: 0.75rem; }

    .status-bar { padding: 0.6rem 0.75rem; }
    .status-text { font-size: 12px; }
    
    .my-influence-card { padding: 0.85rem; }
    .my-cards { gap: 0.5rem; }
    .influence-card { height: 95px; }
    .char-name { font-size: 11px; }

    .action-grid { 
      grid-template-columns: 1fr 1fr; 
      gap: 5px; 
    }
    .coup-style { grid-column: span 2; }
    .action-btn-clean { padding: 10px 12px; gap: 8px; }
    .a-title { font-size: 12px; }
    .a-desc { font-size: 10px; }

    /* Modifikasi Daftar Kondisi Meja HP: Mengalir Horizontal */
    .players-stack {
      flex-direction: row;
      overflow-x: auto;
      gap: 6px;
      padding: 2px 2px 6px 2px;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    
    .other-player {
      flex-shrink: 0;
      width: 145px;
      flex-direction: column;
      align-items: flex-start;
      padding: 10px 8px;
    }

    .av-wrap { margin-bottom: 4px; }
    .cards-mini { margin-top: 6px; width: 100%; justify-content: flex-start; }
    
    .log-box { max-height: 130px; }
  }
</style>