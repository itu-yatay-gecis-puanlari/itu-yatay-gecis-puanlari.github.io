let capData = null;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('cap-data.json');
    capData = await response.json();

    // Footer tarihini güncelle
    document.getElementById('footerDate').textContent = capData.meta.guncelleme_tarihi;

    // Tabloyu render et
    renderPrograms();
  } catch (error) {
    console.error('Veri yüklenemedi:', error);
    document.getElementById('results-container').innerHTML =
      '<p class="error">Veriler yüklenirken bir hata oluştu.</p>';
  }
});

// Programları render et
function renderPrograms() {
  if (!capData) return;

  const container = document.getElementById('results-container');
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const yilSayisi = document.getElementById('yilSayisi').value;
  const yariyilFilter = document.getElementById('yariyilFilter').value;

  // Gösterilecek dönemleri belirle
  let donemler = [...capData.meta.donemler];
  if (yilSayisi !== 'all') {
    donemler = donemler.slice(0, parseInt(yilSayisi));
  }

  // Programları fakülteye göre grupla
  const fakulteler = {};
  for (const [programAdi, programData] of Object.entries(capData.programlar)) {
    // Arama filtresi
    if (searchTerm && !programAdi.toLowerCase().includes(searchTerm)) {
      continue;
    }

    const fakulte = programData.fakulte || 'Diğer';
    if (!fakulteler[fakulte]) {
      fakulteler[fakulte] = [];
    }
    fakulteler[fakulte].push({ ad: programAdi, ...programData });
  }

  // HTML oluştur
  let html = '';

  // Fakülte sıralama
  const fakulteListesi = Object.keys(fakulteler).sort();

  for (const fakulte of fakulteListesi) {
    const programlar = fakulteler[fakulte].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

    html += `
      <div class="fakulte-group">
        <h3 class="fakulte-baslik">${fakulte}</h3>
        <div class="table-wrapper">
          <table class="programs-table">
            <thead>
              <tr>
                <th>Bölüm</th>
                <th>Dönem</th>
                <th>Yarıyıl</th>
                <th>Kontenjan</th>
                <th>Yerleşen</th>
                <th>Tavan</th>
                <th>Taban</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const program of programlar) {
      const rows = collectProgramRows(program, donemler, yariyilFilter);

      if (rows.length === 0) continue;

      // İlk satır program adı ile
      html += `
        <tr class="program-header-row">
          <td class="program-cell" rowspan="${rows.length}">
            <div class="program-name">${program.ad}</div>
          </td>
          ${rows[0]}
        </tr>
      `;

      // Diğer satırlar
      for (let i = 1; i < rows.length; i++) {
        html += `<tr>${rows[i]}</tr>`;
      }
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  if (!html) {
    html = '<p class="no-results">Arama kriterlerine uygun sonuç bulunamadı.</p>';
  }

  container.innerHTML = html;
}

// Program için satırları topla
function collectProgramRows(program, donemler, yariyilFilter) {
  const rows = [];

  for (const donem of donemler) {
    const donemData = program.istatistikler[donem];
    if (!donemData) continue;

    const yariyillar = yariyilFilter === 'all'
      ? ['3.Yarıyıl', '5.Yarıyıl']
      : [yariyilFilter];

    for (const yariyil of yariyillar) {
      const data = donemData[yariyil];
      if (!data) continue;

      // Array ise (özel kontenjanlar) - her birini ayrı göster
      if (Array.isArray(data)) {
        for (const item of data) {
          rows.push(createRowHtml(donem, yariyil, item));
        }
      } else {
        rows.push(createRowHtml(donem, yariyil, data));
      }
    }
  }

  return rows;
}

// Satır HTML'i oluştur
function createRowHtml(donem, yariyil, data) {
  const kontenjan = data.kontenjan !== null ? data.kontenjan : '-';
  const yerlesen = data.yerlesen || 0;
  const tavan = formatGPA(data.tavan);
  const taban = formatGPA(data.taban);

  // GNO rengini belirle
  const tavanClass = getGPAClass(data.tavan);
  const tabanClass = getGPAClass(data.taban);

  // Açıklama varsa tooltip olarak göster
  const aciklamaAttr = data.aciklama ? `title="${data.aciklama}"` : '';
  const aciklamaIcon = data.aciklama ? ' <span class="aciklama-icon" ' + aciklamaAttr + '>*</span>' : '';

  return `
    <td>${donem}</td>
    <td>${yariyil.replace('.Yarıyıl', '. Yarıyıl')}${aciklamaIcon}</td>
    <td>${kontenjan}</td>
    <td>${yerlesen}</td>
    <td class="${tavanClass}">${tavan}</td>
    <td class="${tabanClass}">${taban}</td>
  `;
}

// GPA formatla
function formatGPA(value) {
  if (value === null || value === undefined) return '-';
  return value.toFixed(2);
}

// GPA için CSS sınıfı
function getGPAClass(value) {
  if (value === null || value === undefined) return 'gno-neutral';
  if (value >= 3.5) return 'gno-high';
  if (value >= 3.0) return 'gno-medium';
  return 'gno-low';
}

// Arama filtresi
function filterPrograms() {
  renderPrograms();
}

// Modal fonksiyonları
function openModal(modalId) {
  document.getElementById(modalId).style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Modal dışına tıklandığında kapat
window.onclick = function (event) {
  if (event.target.classList.contains('modal')) {
    event.target.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
};

// ESC tuşu ile modal kapatma
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
  }
});
