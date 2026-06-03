<script lang="ts">
  import Icon from "../lib/Icon.svelte";
  let { isOpen, onClose } = $props<{ isOpen: boolean, onClose: () => void }>();
</script>

{#if isOpen}
  <div class="modal-backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal card">
      <div class="modal-header">
        <div class="header-title">
          <Icon name="Rules" size={24} class="header-icon" />
          <h2>Panduan Permainan Coup</h2>
        </div>
        <button class="btn-close" onclick={onClose}>
          <Icon name="Close" size={16} />
        </button>
      </div>
      <div class="modal-body">
        <div class="rules-content">
          <section>
            <h3>Tujuan Permainan</h3>
            <p>Menjadi pemain terakhir yang masih memiliki <strong>pengaruh (influence)</strong>. Setiap pemain mulai dengan 2 kartu influence (tersembunyi). Kehilangan kedua kartu berarti gugur.</p>
          </section>

          <section>
            <h3>Daftar Karakter & Kemampuan</h3>
            <div class="table-wrap">
              <table class="rules-table">
                <thead>
                  <tr>
                    <th>Karakter</th>
                    <th>Kemampuan Utama</th>
                    <th>Diblokir oleh</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span class="c-duke">
                        <span class="icon-pill" style="background: var(--role-duke);"><Icon name="Duke" size={12} /></span>
                        Duke
                      </span>
                    </td>
                    <td>Ambil <strong>3 koin</strong> (Tax)</td>
                    <td>–</td>
                  </tr>
                  <tr>
                    <td>
                      <span class="c-assassin">
                        <span class="icon-pill" style="background: var(--role-assassin);"><Icon name="Assassin" size={12} /></span>
                        Assassin
                      </span>
                    </td>
                    <td>Bunuh influence lawan (biaya 3 koin)</td>
                    <td>Contessa</td>
                  </tr>
                  <tr>
                    <td>
                      <span class="c-captain">
                        <span class="icon-pill" style="background: var(--role-captain);"><Icon name="Captain" size={12} /></span>
                        Captain
                      </span>
                    </td>
                    <td>Curi <strong>2 koin</strong> dari lawan</td>
                    <td>Captain, Ambassador</td>
                  </tr>
                  <tr>
                    <td>
                      <span class="c-ambassador">
                        <span class="icon-pill" style="background: var(--role-ambassador);"><Icon name="Ambassador" size={12} /></span>
                        Ambassador
                      </span>
                    </td>
                    <td>Tukar kartu dengan deck</td>
                    <td>–</td>
                  </tr>
                  <tr>
                    <td>
                      <span class="c-contessa">
                        <span class="icon-pill" style="background: var(--role-contessa);"><Icon name="Contessa" size={12} /></span>
                        Contessa
                      </span>
                    </td>
                    <td>Blokir pembunuhan (Assassinate)</td>
                    <td>–</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3>Aturan Dasar</h3>
            <div class="rules-grid">
              <div class="rule-box">
                <h4>Setup</h4>
                <ul>
                  <li>Setiap pemain mendapat 2 kartu influence.</li>
                  <li>Setiap pemain mendapat 2 koin awal.</li>
                </ul>
              </div>
              <div class="rule-box">
                <h4>Giliran Pemain</h4>
                <p>Pilih satu aksi di giliranmu:</p>
                <ul>
                  <li><strong>Income</strong>: +1 koin.</li>
                  <li><strong>Foreign Aid</strong>: +2 koin (blokir by Duke).</li>
                  <li><strong>Coup</strong>: Bayar 7 koin, bunuh influence lawan.</li>
                  <li><strong>Aksi Karakter</strong>: Tax, Steal, Exchange, Assassinate.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3>Bluff dan Challenge</h3>
            <div class="accent-box">
              <p>Anda bisa mengklaim karakter apa pun (berbohong/bluff)! Lawan bisa menantang klaim Anda:</p>
              <ul>
                <li><strong>Jika Anda JUJUR:</strong> buka kartu bukti, kocok ke deck, ambil kartu baru. Lawan kehilangan 1 influence.</li>
                <li><strong>Jika Anda BLUFF:</strong> Anda ketahuan dan harus membuang 1 kartu influence.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>Block dan Challenge Block</h3>
            <p>Lawan dapat memblokir aksi tertentu jika mengklaim punya kartu yang tepat. Blokir ini juga bisa ditantang (challenge)!</p>
          </section>

          <section>
            <h3>Tips Strategi</h3>
            <div class="strategy-list">
              <div class="strat-item">
                <span class="strat-num">1</span>
                <p><strong>Bluff Duke</strong> di awal sering berhasil untuk mengumpulkan koin dengan cepat.</p>
              </div>
              <div class="strat-item">
                <span class="strat-num">2</span>
                <p>Jangan terlalu sering bluff, lawan akan mulai curiga dan melakukan challenge.</p>
              </div>
              <div class="strat-item">
                <span class="strat-num">3</span>
                <p>Perhatikan koin lawan — siapapun dengan 7+ koin adalah ancaman Coup.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary full" onclick={onClose}>Mengerti, Ayo Main!</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }

  .modal {
    max-width: 800px;
    max-height: 85vh;
    overflow: hidden;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    border: 1px solid var(--border-bright);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
  }
  
  .header-title { display: flex; align-items: center; gap: 12px; }
  .header-icon { margin-right: 4px; }
  .mr-2 { margin-right: 8px; }
  .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; }

  .btn-close {
    background: var(--bg-input);
    border: 1px solid var(--border-muted);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s;
  }
  .btn-close:hover { background: var(--accent-red-soft); color: var(--accent-red); border-color: var(--accent-red); }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    background: var(--bg-card);
  }

  .rules-content section { margin-bottom: 2.5rem; }
  .rules-content section:last-child { margin-bottom: 0; }

  .rules-content h3 {
    color: var(--text-main);
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rules-content h3::after { content: ''; flex: 1; height: 1px; background: var(--border-subtle); }

  .rules-content p, .rules-content li {
    line-height: 1.6;
    color: var(--text-dim);
    font-size: 14px;
  }

  .table-wrap { overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--border-muted); }
  .rules-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 14px;
  }
  .rules-table th, .rules-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
  .rules-table th { background: var(--bg-elevated); color: var(--text-main); font-weight: 700; font-size: 12px; text-transform: uppercase; }
  .rules-table tr:last-child td { border-bottom: none; }
  
  .c-duke, .c-assassin, .c-captain, .c-ambassador, .c-contessa { display: flex; align-items: center; gap: 8px; font-weight: 700; }
  .icon-pill { 
    width: 20px; height: 20px; border-radius: 6px; 
    display: flex; align-items: center; justify-content: center;
    color: #fff;
  }
  
  .c-duke { color: var(--role-duke); }
  .c-assassin { color: var(--role-assassin); }
  .c-captain { color: var(--role-captain); }
  .c-ambassador { color: var(--role-ambassador); }
  .c-contessa { color: var(--role-contessa); }

  .rules-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; }
  @media (max-width: 600px) { .rules-grid { grid-template-columns: 1fr; } }
  
  .rule-box { background: var(--bg-input); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); }
  .rule-box h4 { font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 10px; }
  .rule-box ul { padding-left: 1.25rem; margin: 0; }
  .rule-box li { margin-bottom: 6px; }

  .accent-box { 
    background: rgba(91, 162, 235, 0.05); 
    border-left: 4px solid var(--accent-blue); 
    padding: 1.25rem; 
    border-radius: 0 var(--radius-md) var(--radius-md) 0; 
  }
  .accent-box p { color: var(--text-main); font-weight: 600; margin-bottom: 12px; }

  .strategy-list { display: flex; flex-direction: column; gap: 12px; }
  .strat-item { display: flex; gap: 12px; align-items: flex-start; background: var(--bg-input); padding: 12px; border-radius: var(--radius-md); }
  .strat-num { 
    width: 24px; height: 24px; background: var(--accent-gold); color: #000; 
    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
    font-size: 12px; font-weight: 800; flex-shrink: 0;
  }

  .modal-footer { padding: 1.5rem 2rem; border-top: 1px solid var(--border-subtle); background: var(--bg-elevated); }
</style>
