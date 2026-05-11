<script lang="ts">
  import { game } from "../lib/store.svelte";
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

  const canBlock = $derived(
    phase === "block" &&
    pending &&
    !me.isMe ||
    false
  );

  // Am I the actor?
  const imActor = $derived(pending?.actorId === gs.myId);
  // Am I the target?
  const imTarget = $derived(pending?.targetId === gs.myId);
  // Have I already responded?
  const alreadyResponded = $derived(pending?.respondedPlayers.includes(gs.myId) ?? false);

  const charColors: Record<Character, string> = {
    Duke: "var(--gold)",
    Assassin: "var(--red)",
    Captain: "var(--blue)",
    Ambassador: "var(--green)",
    Contessa: "#e07050",
  };
  const charEmoji: Record<Character, string> = {
    Duke: "🎩",
    Assassin: "🗡️",
    Captain: "⚓",
    Ambassador: "🌿",
    Contessa: "🛡️",
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
    <div class="room-code">{gs.roomCode}</div>
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
          <div class="av" style="background: {avatarColor(i)}22; color: {avatarColor(i)};">
            {initials(p.name)}
          </div>
          <div class="pinfo">
            <div class="pname">
              {p.name}
              {#if !p.connected}<span class="disc">(offline)</span>{/if}
            </div>
            <div class="pcoins">💰 {p.coins} koin</div>
          </div>
          <div class="cards-mini">
            {#each { length: p.influenceCount } as _}
              <div class="mini-card alive"></div>
            {/each}
            {#each p.revealedCards as ch}
              <div class="mini-card dead" style="--cc:{charColors[ch]};" title={ch}>{charEmoji[ch]}</div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}

    <div class="log-box">
      <div class="section-label">Log</div>
      {#each gs.log as entry}
        <div class="log-entry">{entry}</div>
      {/each}
    </div>
  </aside>

  <!-- Main area -->
  <main>
    <!-- Turn indicator -->
    <div class="turn-bar">
      <span class="dot-live"></span>
      {isMyTurn ? "Giliranmu!" : `Giliran ${currentPlayer?.name ?? "…"}`}
      <span class="badge badge-blue" style="margin-left:auto;">{phase}</span>
    </div>

    <!-- My cards -->
    <div class="card my-cards-box">
      <div class="section-label">Kartumu · 💰 {myCoins} koin</div>
      <div class="my-cards">
        {#each myCards as c, i}
          {#if !c.revealed}
            <div class="influence-card" style="--cc:{charColors[c.character]};">
              <div class="char-emoji">{charEmoji[c.character]}</div>
              <div class="char-name">{c.character}</div>
              {#if mustLose}
                <button class="lose-btn" onclick={() => game.loseInfluence(i)}>Buang</button>
              {/if}
            </div>
          {:else}
            <div class="influence-card dead">
              <div class="char-emoji" style="opacity:0.4;">{charEmoji[c.character]}</div>
              <div class="char-name" style="opacity:0.4;">{c.character}</div>
              <div class="dead-label">✕ Mati</div>
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- === ACTION PHASE === -->
    {#if phase === "playing" && isMyTurn}
      <div class="card action-box">
        <div class="section-label">Pilih aksi</div>
        {#if pendingAction}
          <div class="target-prompt">
            <p>Pilih target untuk <b>{pendingAction}</b>:</p>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
              {#each others.filter(p => p.influenceCount > 0) as p}
                <button
                  class="btn"
                  class:btn-primary={selectedTarget === p.id}
                  onclick={() => selectedTarget = p.id}
                >{p.name}</button>
              {/each}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px;">
              <button class="btn btn-primary" disabled={!selectedTarget} onclick={confirmTarget}>Konfirmasi</button>
              <button class="btn" onclick={cancelTarget}>Batal</button>
            </div>
          </div>
        {:else}
          <div class="action-grid">
            <button class="action-btn" onclick={() => game.income()}>
              <span class="a-emoji">💰</span>
              <span class="a-name">Income</span>
              <span class="a-desc">+1 koin</span>
            </button>
            <button class="action-btn" onclick={() => game.foreignAid()}>
              <span class="a-emoji">🏦</span>
              <span class="a-name">Foreign Aid</span>
              <span class="a-desc">+2 koin (bisa diblok)</span>
            </button>
            <button class="action-btn gold" onclick={() => game.tax()} disabled={myCoins >= 10}>
              <span class="a-emoji">🎩</span>
              <span class="a-name">Tax</span>
              <span class="a-desc">Duke — +3 koin</span>
            </button>
            <button class="action-btn blue" onclick={() => selectTarget("steal")} disabled={myCoins >= 10}>
              <span class="a-emoji">⚓</span>
              <span class="a-name">Steal</span>
              <span class="a-desc">Captain — curi 2 koin</span>
            </button>
            <button class="action-btn" onclick={() => game.exchange()} disabled={myCoins >= 10}>
              <span class="a-emoji">🌿</span>
              <span class="a-name">Exchange</span>
              <span class="a-desc">Ambassador — tukar kartu</span>
            </button>
            <button class="action-btn red" onclick={() => selectTarget("assassinate")} disabled={myCoins < 3 || myCoins >= 10}>
              <span class="a-emoji">🗡️</span>
              <span class="a-name">Assassinate</span>
              <span class="a-desc">Assassin — bayar 3 koin</span>
            </button>
            <button class="action-btn coup" onclick={() => selectTarget("coup")} disabled={myCoins < 7}>
              <span class="a-emoji">💥</span>
              <span class="a-name">Coup</span>
              <span class="a-desc">Bayar 7 koin (wajib jika ≥10)</span>
            </button>
          </div>
          {#if myCoins >= 10}
            <p class="must-coup">Kamu wajib melakukan Coup karena memiliki ≥10 koin!</p>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- === CHALLENGE PHASE === -->
    {#if (phase === "challenge" || phase === "block_challenge") && pending && !imActor && !alreadyResponded}
      <div class="card reaction-box">
        <div class="section-label">{phase === "block_challenge" ? "Blok sedang ditantang" : "Respon Aksi"}</div>
        {#if phase === "block_challenge" && pending.blocker}
          <p class="react-desc">
            <b>{gs.players.find(p => p.id === pending.blocker!.playerId)?.name}</b>
            memblok dengan klaim <b>{pending.blocker.claimedCharacter}</b>.
            Apakah kamu percaya?
          </p>
          <div class="react-btns">
            <button class="btn" onclick={() => game.acceptBlock()}>✓ Percaya</button>
            <button class="btn btn-danger" onclick={() => game.challengeBlock()}>⚡ Tantang Blok!</button>
          </div>
        {:else}
          <p class="react-desc">
            <b>{gs.players.find(p => p.id === pending.actorId)?.name}</b>
            menggunakan
            <b>{pending.claimedCharacter ?? pending.type}</b>
            {pending.targetId === gs.myId ? "(kamu jadi target!)" : ""}.
            Apakah kamu percaya?
          </p>
          <div class="react-btns">
            <button class="btn" onclick={() => game.pass()}>✓ Percaya</button>
            {#if pending.claimedCharacter}
              <button class="btn btn-danger" onclick={() => game.challenge()}>⚡ Tantang!</button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- === BLOCK PHASE === -->
    {#if phase === "block" && pending && !imActor && !alreadyResponded}
      <div class="card reaction-box">
        <div class="section-label">Blok?</div>
        <p class="react-desc">
          <b>{gs.players.find(p => p.id === pending.actorId)?.name}</b>
          menggunakan <b>{pending.type}</b>.
          Apakah kamu ingin memblok?
        </p>
        <div class="react-btns" style="flex-wrap:wrap;">
          <button class="btn" onclick={() => game.pass()}>Lewati</button>
          {#each (blockOptions[pending.type] ?? []) as ch}
            <button class="btn btn-primary" onclick={() => game.block(ch)}>
              🛡️ Blok dengan {ch}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- === EXCHANGE SELECT === -->
    {#if phase === "exchange_select" && gs.loseInfluenceTarget === null}
      <div class="card reaction-box">
        <div class="section-label">Pilih {aliveCount} kartu untuk disimpan</div>
        <div class="exchange-grid">
          {#each exchangeCards as ch, i}
            <button
              class="exchange-card"
              class:picked={exchangeSelected.includes(i)}
              style="--cc:{charColors[ch]};"
              onclick={() => toggleExchange(i)}
            >
              <span>{charEmoji[ch]}</span>
              <span>{ch}</span>
            </button>
          {/each}
        </div>
        <button
          class="btn btn-gold"
          style="margin-top:12px;width:100%;"
          disabled={exchangeSelected.length !== aliveCount}
          onclick={confirmExchange}
        >
          Konfirmasi Pilihan
        </button>
      </div>
    {/if}

    <!-- Waiting indicator -->
    {#if !isMyTurn && phase === "playing"}
      <div class="waiting">⏳ Menunggu {currentPlayer?.name ?? "…"} bermain…</div>
    {/if}
    {#if isMyTurn && (phase === "challenge" || phase === "block" || phase === "block_challenge")}
      <div class="waiting">⏳ Menunggu respons pemain lain…</div>
    {/if}
  </main>
</div>

<style>
  .layout { display: flex; gap: 1rem; min-height: 100vh; padding: 1rem; max-width: 1100px; margin: 0 auto; }
  aside { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
  main { flex: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }

  .room-code { font-size: 20px; font-weight: 700; letter-spacing: 0.1em; color: var(--gold); padding: 4px 0 12px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }

  .other-player {
    display: flex; align-items: center; gap: 8px;
    padding: 8px; border-radius: var(--radius); border: 1px solid var(--border);
    background: var(--bg2); transition: all 0.15s;
  }
  .other-player.current { border-color: var(--gold); }
  .other-player.dead { opacity: 0.35; }
  .other-player.selectable { cursor: pointer; border-color: var(--blue-bg); }
  .other-player.selectable:hover { border-color: var(--blue); background: var(--blue-bg); }
  .other-player.selected { border-color: var(--blue); background: var(--blue-bg); }

  .av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .pinfo { flex: 1; min-width: 0; }
  .pname { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pcoins { font-size: 11px; color: var(--text2); }
  .disc { font-size: 10px; color: var(--red); }
  .cards-mini { display: flex; gap: 3px; flex-shrink: 0; }
  .mini-card { width: 14px; height: 20px; border-radius: 3px; }
  .mini-card.alive { background: var(--purple); }
  .mini-card.dead { background: var(--bg3); border: 1px solid var(--border2); display: flex; align-items: center; justify-content: center; font-size: 9px; }

  .log-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px; margin-top: auto; max-height: 280px; overflow-y: auto; }
  .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); margin-bottom: 8px; }
  .log-entry { font-size: 11px; color: var(--text2); padding: 3px 0; border-bottom: 1px solid var(--border); line-height: 1.4; }
  .log-entry:last-child { border-bottom: none; }

  .turn-bar { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; padding: 10px 0; }

  .my-cards-box { }
  .my-cards { display: flex; gap: 12px; margin-top: 10px; }
  .influence-card {
    width: 100px; height: 140px; border-radius: 10px;
    border: 2px solid var(--cc, var(--border2));
    background: color-mix(in srgb, var(--cc, #fff) 10%, var(--bg3));
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    position: relative;
  }
  .influence-card.dead { border-color: var(--border); opacity: 0.4; }
  .char-emoji { font-size: 32px; }
  .char-name { font-size: 13px; font-weight: 600; color: var(--cc, var(--text)); }
  .dead-label { font-size: 11px; color: var(--red); font-weight: 700; }
  .lose-btn {
    position: absolute; bottom: 8px;
    background: var(--red); color: #fff; border: none;
    padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
    cursor: pointer;
  }

  .action-box { }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .action-btn {
    display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
    padding: 10px 12px; border-radius: var(--radius);
    border: 1px solid var(--border2); background: var(--bg3); cursor: pointer;
    transition: all 0.15s; text-align: left;
  }
  .action-btn:hover:not(:disabled) { background: rgba(255,255,255,0.06); }
  .action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .action-btn.gold { border-color: var(--gold); background: var(--gold-bg); }
  .action-btn.blue { border-color: var(--blue); background: var(--blue-bg); }
  .action-btn.red { border-color: var(--red); background: var(--red-bg); }
  .action-btn.coup { border-color: #c070ff; background: rgba(192,112,255,0.1); grid-column: span 2; }
  .a-emoji { font-size: 20px; }
  .a-name { font-size: 13px; font-weight: 600; }
  .a-desc { font-size: 11px; color: var(--text2); }
  .must-coup { color: var(--red); font-size: 13px; margin-top: 10px; text-align: center; font-weight: 500; }

  .reaction-box { border-color: var(--blue); }
  .react-desc { font-size: 14px; line-height: 1.6; color: var(--text2); }
  .react-btns { display: flex; gap: 8px; margin-top: 12px; }

  .exchange-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
  .exchange-card {
    width: 80px; height: 110px; border-radius: 8px;
    border: 2px solid var(--border2); background: var(--bg3);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    color: var(--cc, var(--text));
  }
  .exchange-card span:first-child { font-size: 24px; }
  .exchange-card.picked { border-color: var(--cc, var(--blue)); background: color-mix(in srgb, var(--cc, #fff) 15%, var(--bg3)); }

  .target-prompt { }
  .waiting { text-align: center; color: var(--text2); padding: 20px; font-size: 14px; }

  @media (max-width: 680px) {
    .layout { flex-direction: column; }
    aside { width: 100%; }
  }
</style>
