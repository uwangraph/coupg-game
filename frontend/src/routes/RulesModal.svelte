<script lang="ts">
  export let isOpen: boolean;
  export let onClose: () => void;
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click|self={onClose}>
    <div class="modal">
      <div class="modal-header">
        <h2>Panduan Permainan Coup</h2>
        <button class="btn-close" on:click={onClose}>×</button>
      </div>
      <div class="modal-body">
        <div class="rules-content">
          <h3>Tujuan Permainan</h3>
          <p>Menjadi pemain terakhir yang masih memiliki <strong>pengaruh (influence)</strong>. Setiap pemain mulai dengan 2 kartu influence (tersembunyi). Kehilangan kedua kartu berarti gugur.</p>

          <h3>Daftar Karakter & Kemampuan</h3>
          <table class="rules-table">
            <thead>
              <tr>
                <th>Karakter</th>
                <th>Kemampuan</th>
                <th>Diblokir oleh</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Duke</td>
                <td>Ambil 3 koin (bukan 1)</td>
                <td>–</td>
              </tr>
              <tr>
                <td>Assassin</td>
                <td>Bunuh influence lawan (biaya 3 koin)</td>
                <td>Contessa</td>
              </tr>
              <tr>
                <td>Captain</td>
                <td>Curi 2 koin dari lawan</td>
                <td>Captain, Ambassador</td>
              </tr>
              <tr>
                <td>Ambassador</td>
                <td>Ambil 2 kartu dari deck, tukar dengan punya sendiri</td>
                <td>–</td>
              </tr>
              <tr>
                <td>Contessa</td>
                <td>Blokir pembunuhan</td>
                <td>–</td>
              </tr>
            </tbody>
          </table>

          <h3>Aturan Dasar</h3>
          <h4>Setup</h4>
          <ul>
            <li>Setiap pemain mendapat 2 kartu influence (rahasia)</li>
            <li>Setiap pemain mendapat 2 koin</li>
          </ul>

          <h4>Giliran Pemain</h4>
          <p>Di giliran Anda, lakukan <strong>satu</strong> aksi berikut:</p>
          <ul>
            <li><strong>Income</strong> – Ambil 1 koin (tidak bisa diblokir)</li>
            <li><strong>Foreign Aid</strong> – Ambil 2 koin (bisa diblokir oleh Duke)</li>
            <li><strong>Coup</strong> – Bayar 7 koin, langsung bunuh 1 influence lawan (tidak bisa diblokir)</li>
            <li><strong>Gunakan karakter</strong> (pilih salah satu: Tax, Steal, Exchange, Assassinate)</li>
          </ul>

          <h3>Bluff dan Challenge</h3>
          <p>Anda bisa mengklaim karakter apa pun (berbohong/bluff)! Lawan bisa menantang klaim Anda:</p>
          <ul>
            <li>Jika Anda <strong>memang punya karakter</strong>: buka kartu, lawan yang challenge kehilangan influence</li>
            <li>Jika Anda <strong>berbohong</strong>: Anda kehilangan influence</li>
          </ul>

          <h3>Ringkasan Aksi</h3>
          <table class="rules-table">
            <thead>
              <tr>
                <th>Aksi</th>
                <th>Biaya</th>
                <th>Hasil</th>
                <th>Diblokir oleh</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Income</td>
                <td>0</td>
                <td>+1 koin</td>
                <td>Tidak ada</td>
              </tr>
              <tr>
                <td>Foreign Aid</td>
                <td>0</td>
                <td>+2 koin</td>
                <td>Duke</td>
              </tr>
              <tr>
                <td>Coup</td>
                <td>7</td>
                <td>Bunuh 1 influence</td>
                <td>Tidak ada</td>
              </tr>
              <tr>
                <td>Tax (Duke)</td>
                <td>0</td>
                <td>+3 koin</td>
                <td>–</td>
              </tr>
              <tr>
                <td>Assassinate</td>
                <td>3</td>
                <td>Bunuh 1 influence</td>
                <td>Contessa</td>
              </tr>
              <tr>
                <td>Steal (Captain)</td>
                <td>0</td>
                <td>Curi 2 koin</td>
                <td>Captain, Ambassador</td>
              </tr>
              <tr>
                <td>Exchange (Ambassador)</td>
                <td>0</td>
                <td>Tukar kartu</td>
                <td>–</td>
              </tr>
            </tbody>
          </table>
        </div>
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
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    box-sizing: border-box;
  }

  .modal {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    width: 100%;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    gap: 16px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .btn-close {
    background: none;
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text);
    transition: background 0.2s;
  }

  .btn-close:hover {
    background: var(--accent-hover);
  }

  .rules-content {
    color: var(--text-muted);
  }

  .rules-content h3 {
    color: var(--text);
    font-size: 1.1rem;
    margin: 20px 0 8px 0;
  }

  .rules-content h4 {
    color: var(--text);
    font-size: 1rem;
    margin: 16px 0 8px 0;
  }

  .rules-content p, .rules-content li {
    line-height: 1.6;
    margin: 8px 0;
  }

  .rules-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }

  .rules-table th, .rules-table td {
    padding: 8px 12px;
    border: 1px solid var(--border);
    text-align: left;
    font-size: 0.9rem;
  }

  .rules-table th {
    background: var(--bg);
    color: var(--text);
  }
</style>
