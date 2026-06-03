<script lang="ts">
  import { game } from "../lib/store.svelte";
  import Icon from "../lib/Icon.svelte";

  let name = $state("");
  let code = $state("");
  let customCode = $state("");
  let password = $state("");
  let joinPassword = $state("");
  let tab = $state<"createPublic" | "createPrivate" | "join">("createPublic");
  let loading = $state(false);
  let localError = $state("");

  let selectedRole = $state<string | null>(null);
  const roleDetails: Record<string, string> = {
    "Duke": "Kekuatan utama Duke adalah ekonomi. Selain mengambil 3 koin sekaligus (Tax), Duke sangat vital untuk memblokir 'Foreign Aid' dari pemain mana pun, mencegah mereka mengumpulkan koin dengan cepat.",
    "Assassin": "Aksi pembunuhan Assassin sangat mematikan karena hanya memakan 3 koin (dibandingkan Coup yang 7 koin). Namun, Assassin berisiko tinggi karena bisa diblokir oleh Contessa atau digagalkan lewat tantangan (challenge).",
    "Captain": "Captain adalah raja kontrol koin. Mencuri 2 koin tidak hanya menambah pundi-pundi Anda tapi juga melemahkan lawan. Captain juga memiliki pertahanan yang baik karena bisa memblokir aksi pencurian dari Captain lain atau Ambassador.",
    "Ambassador": "Ambassador memberikan fleksibilitas tinggi. Dengan menukar kartu, Anda bisa membuang kartu yang sudah dicurigai lawan atau mencari kombinasi karakter yang lebih kuat. Ambassador juga handal dalam memblokir aksi pencurian.",
    "Contessa": "Contessa adalah karakter murni bertahan. Keberadaannya sangat ditakuti oleh Assassin karena dia satu-satunya yang bisa memblokir pembunuhan. Memiliki Contessa (atau mengaku memilikinya) adalah kunci bertahan hidup dari serangan mendadak.",
    "Coup": "Coup adalah aksi paling absolut dalam permainan. Dengan membayar 7 koin, Anda bisa menghancurkan 1 influence lawan secara instan. Aksi ini tidak bisa diblokir oleh siapa pun dan tidak bisa ditantang (challenge)."
  };

  // Baca room code dari URL pathname saat component mount
  $effect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const potentialCode = pathParts[pathParts.length - 1];
      if (potentialCode && potentialCode.length >= 4) {
        code = potentialCode.toUpperCase();
        tab = "join";
      }
    }
  });

  async function createPublicRoom() {
    if (!name.trim()) { localError = "Masukkan nama kamu"; return; }
    loading = true;
    localError = "";
    try {
      const isProd = !location.host.includes("localhost");
      const apiBase = isProd ? "https://coup-game-worker.uwangraph.workers.dev" : "";
      const res = await fetch(`${apiBase}/rooms`, {
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

  async function createPrivateRoom() {
    if (!name.trim()) { localError = "Masukkan nama kamu"; return; }
    if (!password.trim()) { localError = "Masukkan password untuk room private"; return; }
    if (customCode.trim()) {
      if (customCode.trim().length < 4) { 
        localError = "Kode room custom minimal 4 karakter";
        return;
      }
      if (customCode.trim().length > 10) { 
        localError = "Kode room custom maksimal 10 karakter";
        return;
      }
    }
    loading = true;
    localError = "";
    try {
      const isProd = !location.host.includes("localhost");
      const apiBase = isProd ? "https://coup-game-worker.uwangraph.workers.dev" : "";
      const reqBody: any = { isPrivate: true, password };
      if (customCode.trim()) {
        reqBody.code = customCode.trim();
      }
      const res = await fetch(`${apiBase}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("Kode room sudah dipakai");
        }
        throw new Error("Gagal membuat room");
      }
      const data = await res.json();
      game.connect(data.code, name.trim(), password);
    } catch (e) {
      localError = (e as Error).message || "Gagal membuat room";
    } finally {
      loading = false;
    }
  }

  function joinRoom() {
    if (!name.trim()) { localError = "Masukkan nama kamu"; return; }
    if (!code.trim() || code.trim().length < 4) { localError = "Masukkan kode room (4 karakter)"; return; }
    localError = "";
    game.connect(code.trim(), name.trim(), joinPassword);
  }
</script>

<div class="wrap">
  <div class="hero">
    <div class="crown-wrap">
      <div class="crown" style="color: var(--accent-gold);"><Icon name="Crown" size={56} /></div>
      <div class="crown-glow"></div>
    </div>
    <h1>Coup Online</h1>
    <p class="sub">Game tipu daya & bluff multiplayer — 2 hingga 6 pemain</p>
  </div>

  <div class="card box main-card">
    <div class="tabs">
      <button class="tab" class:active={tab === "createPublic"} onclick={() => tab = "createPublic"}>
        Room Umum
      </button>
      <button class="tab" class:active={tab === "createPrivate"} onclick={() => tab = "createPrivate"}>
        Room Private
      </button>
      <button class="tab" class:active={tab === "join"} onclick={() => tab = "join"}>
        Gabung
      </button>
    </div>

    <div class="form-section">
      <label class="field-label">Nama kamu</label>
      <input class="input" placeholder="Nama pemain..." bind:value={name} maxlength={20} />

      {#if tab === "createPrivate"}
        <div class="field-group">
          <label class="field-label">Kode Room Custom (opsional)</label>
          <input
            class="input"
            placeholder="Misal: MAINBERS, UJIAN"
            bind:value={customCode}
            maxlength={10}
            style="text-transform:uppercase;letter-spacing:0.08em;"
          />
        </div>
        <div class="field-group">
          <label class="field-label">Password Room</label>
          <input class="input" type="password" placeholder="Password untuk room private..." bind:value={password} maxlength={50} />
        </div>
      {/if}

      {#if tab === "join"}
        <div class="field-group">
          <label class="field-label">Kode room</label>
          <input
            class="input"
            placeholder="KODE"
            bind:value={code}
            maxlength={20}
            style="text-transform:uppercase;letter-spacing:0.12em;font-size:18px;font-weight:700;"
          />
        </div>
        <div class="field-group">
          <label class="field-label">Password (jika room private)</label>
          <input class="input" type="password" placeholder="Password room..." bind:value={joinPassword} maxlength={50} />
        </div>
      {/if}
    </div>

    {#if localError}
      <div class="err-box">
        <div class="err-icon"><Icon name="Alert" size={18} /></div>
        <p class="err">{localError}</p>
      </div>
    {/if}

    <button
      class="btn btn-primary full main-btn"
      onclick={
        tab === "createPublic"
          ? createPublicRoom
          : tab === "createPrivate"
          ? createPrivateRoom
          : joinRoom
      }
      disabled={loading}
    >
      {#if loading}
        <span class="loader"></span>
      {:else}
        {#if tab === "join"}
          <Icon name="ArrowRight" size={18} class="mr-2" /> Gabung Sekarang
        {:else}
          <Icon name="Sparkles" size={18} class="mr-2" /> Buat Room Baru
        {/if}
      {/if}
    </button>
  </div>

  <div class="rules card info-card">
    <div class="info-header">
      <div class="info-title">
        <div class="info-icon" style="color: var(--accent-blue);"><Icon name="Rules" size={20} /></div>
        <h3>Cara bermain</h3>
      </div>
      <button class="btn-rules-alt" onclick={() => game.showRules = true}>
        Lihat Detail
      </button>
    </div>
    <div class="rule-grid">
      {#each [
        { id: "Duke", desc: "Tax (+3 koin), blok Foreign Aid" },
        { id: "Assassin", desc: "Bunuh (3 koin), blok Contessa" },
        { id: "Captain", desc: "Curi 2, blokir pencurian" },
        { id: "Ambassador", desc: "Tukar kartu, blokir pencurian" },
        { id: "Contessa", desc: "Blokir aksi Assassinate" },
        { id: "Coup", desc: "Bayar 7, paksa musuh buang kartu", highlight: true }
      ] as role}
        <button 
          class="rule-item" 
          class:highlight={role.highlight}
          class:active={selectedRole === role.id}
          onclick={() => selectedRole = selectedRole === role.id ? null : role.id}
          title={`Klik untuk detail ${role.id}`}
        >
          <div class="ico-wrap">
            <Icon name={role.id as any} size={24} />
          </div>
          <div class="rule-content">
            <div class="rule-name">{role.id}</div>
            <div class="rule-desc">{role.desc}</div>
            {#if selectedRole === role.id}
              <div class="rule-detail-body">
                {roleDetails[role.id]}
              </div>
            {/if}
          </div>
          <div class="expand-icon" class:rotated={selectedRole === role.id}>↓</div>
        </button>
      {/each}
    </div>
    <div class="info-footer">
      <p>Setiap aksi bisa ditantang! Jika ketahuan berbohong, kamu kehilangan pengaruh.</p>
    </div>
  </div>
</div>

<style>
  .wrap {
    max-width: 520px;
    margin: 0 auto;
    padding: 3rem 1.5rem 5rem;
    width: 100%;
  }
  .hero {
    text-align: center;
    margin-bottom: 3rem;
  }
  .crown-wrap {
    position: relative;
    display: inline-block;
    margin-bottom: 1rem;
  }
  .crown { 
    font-size: 56px; 
    position: relative; 
    z-index: 2;
    filter: drop-shadow(0 0 10px rgba(226, 180, 77, 0.4));
  }
  .crown-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    background: radial-gradient(circle, rgba(226, 180, 77, 0.2) 0%, transparent 70%);
    z-index: 1;
  }
  h1 { 
    font-size: 36px; 
    font-weight: 800; 
    letter-spacing: -0.02em;
    background: linear-gradient(to bottom, #fff, #a1a1b5);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .sub { color: var(--text-dim); font-size: 15px; margin-top: 8px; font-weight: 500; }
  
  .main-card {
    margin-bottom: 1.5rem;
    padding: 2rem;
    border: 1px solid var(--border-bright);
    box-shadow: var(--shadow-lg);
  }
  
  .tabs { 
    display: flex; 
    gap: 8px; 
    margin-bottom: 2rem; 
    background: var(--bg-input); 
    padding: 6px; 
    border-radius: var(--radius-md); 
  }
  .tab {
    flex: 1; 
    padding: 10px; 
    border-radius: var(--radius-sm); 
    font-size: 13px; 
    font-weight: 600;
    background: transparent; 
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .tab span { font-size: 14px; opacity: 0.7; }
  .tab.active { 
    background: var(--bg-card); 
    color: var(--text-main); 
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-muted);
  }
  
  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .field-label { 
    display: block; 
    font-size: 12px; 
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted); 
  }
  
  .full { width: 100%; }
  
  .main-btn {
    margin-top: 2rem;
    padding: 14px;
    font-size: 16px;
    letter-spacing: 0.01em;
  }

  .err-box {
    margin-top: 1.25rem;
    padding: 12px;
    background: var(--accent-red-soft);
    border: 1px solid rgba(235, 97, 97, 0.2);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .err-icon { font-size: 16px; }
  .err { color: var(--accent-red); font-size: 13px; font-weight: 500; }
  
  .info-card {
    padding: 1.5rem;
    background: rgba(22, 22, 34, 0.5);
  }
  .info-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .info-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .info-icon { font-size: 18px; }
  h3 { font-size: 15px; color: var(--text-main); font-weight: 700; }
  
  .btn-rules-alt {
    background: transparent;
    color: var(--accent-blue);
    font-size: 13px;
    font-weight: 600;
    padding: 4px 0;
    border-bottom: 1px solid transparent;
  }
  .btn-rules-alt:hover {
    border-bottom-color: var(--accent-blue);
  }

  .rule-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
    gap: 12px; 
    margin-bottom: 1.5rem; 
  }
  
  .rule-item { 
    display: flex; 
    gap: 12px; 
    align-items: flex-start; 
    background: var(--bg-input);
    padding: 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    width: 100%;
    position: relative;
  }
  .rule-item:hover {
    border-color: var(--border-muted);
    background: var(--bg-elevated);
  }
  .rule-item.active {
    border-color: var(--accent-blue);
    background: rgba(91, 162, 235, 0.05);
    transform: none;
    box-shadow: 0 0 20px rgba(91, 162, 235, 0.1);
  }
  .rule-item.highlight {
    border-color: var(--accent-red-soft);
    background: linear-gradient(135deg, var(--bg-input) 0%, rgba(235, 97, 97, 0.03) 100%);
  }
  .rule-item.highlight.active {
    border-color: var(--accent-red);
    background: var(--accent-red-soft);
  }
  
  .rule-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .rule-name {
    font-size: 15px;
    font-weight: 800;
    color: #fff;
  }
  .rule-desc { 
    color: var(--text-dim); 
    font-size: 11px; 
    line-height: 1.4;
    font-weight: 600;
  }
  .rule-detail-body {
    margin-top: 10px;
    font-size: 12.5px;
    line-height: 1.6;
    color: #fff;
    padding-top: 10px;
    border-top: 1px solid var(--border-subtle);
    animation: fadeInDown 0.3s ease-out;
    font-weight: 400;
  }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .expand-icon {
    font-size: 14px;
    color: var(--text-muted);
    opacity: 0.5;
    transition: transform 0.3s;
    margin-top: 2px;
  }
  .expand-icon.rotated {
    transform: rotate(180deg);
    color: var(--accent-blue);
    opacity: 1;
  }

  .ico-wrap { 
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-card);
    border-radius: 10px;
    color: #fff;
    flex-shrink: 0;
    border: 1px solid var(--border-subtle);
    transition: all 0.2s;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  
  /* Character specific colors for active items */
  .rule-item[title*="Duke"].active { border-color: var(--role-duke); background: rgba(168, 85, 247, 0.05); }
  .rule-item[title*="Duke"].active .ico-wrap { background: var(--role-duke); border-color: var(--role-duke); }

  .rule-item[title*="Assassin"].active { border-color: var(--role-assassin); background: rgba(6, 182, 212, 0.05); }
  .rule-item[title*="Assassin"].active .ico-wrap { background: var(--role-assassin); border-color: var(--role-assassin); }

  .rule-item[title*="Captain"].active { border-color: var(--role-captain); background: rgba(59, 130, 246, 0.05); }
  .rule-item[title*="Captain"].active .ico-wrap { background: var(--role-captain); border-color: var(--role-captain); }

  .rule-item[title*="Ambassador"].active { border-color: var(--role-ambassador); background: rgba(34, 197, 94, 0.05); }
  .rule-item[title*="Ambassador"].active .ico-wrap { background: var(--role-ambassador); border-color: var(--role-ambassador); }

  .rule-item[title*="Contessa"].active { border-color: var(--role-contessa); background: rgba(239, 68, 68, 0.05); }
  .rule-item[title*="Contessa"].active .ico-wrap { background: var(--role-contessa); border-color: var(--role-contessa); }

  .highlight .ico-wrap {
    color: var(--accent-red);
  }
  
  .info-footer { 
    font-size: 12px; 
    color: var(--text-muted); 
    border-top: 1px solid var(--border-subtle); 
    padding-top: 1rem;
    line-height: 1.5;
  }

  .loader {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
