<script lang="ts">
  import { game } from "../lib/store.svelte";

  let name = $state("");
  let code = $state("");
  let tab = $state<"create" | "join">("create");
  let loading = $state(false);
  let localError = $state("");

  async function createRoom() {
    if (!name.trim()) { localError = "Masukkan nama kamu"; return; }
    loading = true;
    localError = "";
    try {
      const res = await fetch("/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      game.connect(data.code, name.trim());
    } catch {
      localError = "Gagal membuat room";
    } finally {
      loading = false;
    }
  }

  function joinRoom() {
    if (!name.trim()) { localError = "Masukkan nama kamu"; return; }
    if (!code.trim() || code.trim().length < 4) { localError = "Masukkan kode room (4 karakter)"; return; }
    localError = "";
    game.connect(code.trim(), name.trim());
  }
</script>

<div class="wrap">
  <div class="hero">
    <div class="crown">👑</div>
    <h1>Coup Online</h1>
    <p class="sub">Game tipu daya &amp; bluff multiplayer — 2 hingga 6 pemain</p>
  </div>

  <div class="card box">
    <div class="tabs">
      <button class="tab" class:active={tab === "create"} onclick={() => tab = "create"}>Buat Room</button>
      <button class="tab" class:active={tab === "join"} onclick={() => tab = "join"}>Gabung Room</button>
    </div>

    <label class="field-label">Nama kamu</label>
    <input class="input" placeholder="Nama pemain..." bind:value={name} maxlength={20} />

    {#if tab === "join"}
      <label class="field-label" style="margin-top:12px;">Kode room</label>
      <input
        class="input"
        placeholder="4 huruf kode room..."
        bind:value={code}
        maxlength={6}
        style="text-transform:uppercase;letter-spacing:0.12em;font-size:18px;"
      />
    {/if}

    {#if localError}
      <p class="err">{localError}</p>
    {/if}

    <button
      class="btn btn-primary full"
      style="margin-top:16px;"
      onclick={tab === "create" ? createRoom : joinRoom}
      disabled={loading}
    >
      {loading ? "Membuat..." : tab === "create" ? "✦ Buat Room" : "→ Gabung"}
    </button>
  </div>

  <div class="rules card">
    <h3>Cara main</h3>
    <div class="rule-grid">
      <div class="rule"><span class="ico">🎩</span><b>Duke</b> — Tax (+3 koin), blok Foreign Aid</div>
      <div class="rule"><span class="ico">🗡️</span><b>Assassin</b> — Bunuh target (bayar 3), blok Contessa</div>
      <div class="rule"><span class="ico">⚓</span><b>Captain</b> — Curi 2 koin, blok pencurian</div>
      <div class="rule"><span class="ico">🌿</span><b>Ambassador</b> — Tukar kartu, blok pencurian</div>
      <div class="rule"><span class="ico">🛡️</span><b>Contessa</b> — Blok Assassinate</div>
      <div class="rule"><span class="ico">💥</span><b>Coup</b> — Bayar 7, paksa musuh buang kartu</div>
    </div>
    <p class="note">Setiap aksi bisa ditantang! Jika ketahuan berbohong, kamu kehilangan influence.</p>
  </div>
</div>

<style>
  .wrap {
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
    width: 100%;
  }
  .hero {
    text-align: center;
    margin-bottom: 2rem;
  }
  .crown { font-size: 48px; margin-bottom: 8px; }
  h1 { font-size: 32px; font-weight: 600; }
  .sub { color: var(--text2); font-size: 14px; margin-top: 6px; }
  .box { margin-bottom: 1rem; }
  .tabs { display: flex; gap: 6px; margin-bottom: 1.25rem; background: var(--bg3); padding: 4px; border-radius: var(--radius); }
  .tab {
    flex: 1; padding: 8px; border-radius: 8px; font-size: 14px; font-weight: 500;
    background: transparent; color: var(--text2);
  }
  .tab.active { background: var(--bg2); color: var(--text); border: 1px solid var(--border2); }
  .field-label { display: block; font-size: 12px; color: var(--text2); margin-bottom: 6px; margin-top: 4px; }
  .full { width: 100%; }
  .err { color: var(--red); font-size: 13px; margin-top: 8px; }
  .rules { }
  h3 { font-size: 14px; color: var(--text2); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .rule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
  .rule { font-size: 13px; color: var(--text2); display: flex; gap: 6px; align-items: flex-start; }
  .ico { font-size: 16px; flex-shrink: 0; }
  b { color: var(--text); font-weight: 500; }
  .note { font-size: 12px; color: var(--text3); border-top: 1px solid var(--border); padding-top: 10px; }
</style>
