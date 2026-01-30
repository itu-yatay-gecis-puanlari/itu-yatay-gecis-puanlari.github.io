let capData = null;
let selectedYariyilFilter = 'all';

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('cap-data.json');
    capData = await response.json();

    // Footer tarihini güncelle
    document.getElementById('footerDate').textContent = capData.meta.guncelleme_tarihi;

    // Yıl sayısı seçeneklerini dinamik oluştur
    populateYilSecenekleri();

    // Tabloyu render et
    renderPrograms();
  } catch (error) {
    console.error('Veri yüklenemedi:', error);
    document.getElementById('results-container').innerHTML =
      '<p class="error">Veriler yüklenirken bir hata oluştu.</p>';
  }
});

function populateYilSecenekleri() {
  const select = document.getElementById('yilSayisi');
  const totalYears = capData.meta.donemler.length;

  let html = '';
  for (let i = 1; i <= totalYears; i++) {
    const selected = i === 3 ? 'selected' : '';
    html += `<option value="${i}" ${selected}>Son ${i} Yıl</option>`;
  }
  html += `<option value="all">Tüm Yıllar</option>`;

  select.innerHTML = html;
}

function filterByYariyil(selectElement) {
  selectedYariyilFilter = selectElement.value;
  renderPrograms();
}

// Programları render et
function renderPrograms() {
  if (!capData) return;

  const container = document.getElementById('results-container');
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  const yilSayisi = document.getElementById('yilSayisi').value;

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
                <th>
                  Yarıyıl
                  <select onchange="filterByYariyil(this)" style="margin-left: 5px; padding: 2px; font-size: 0.9em;">
                    <option value="all" ${selectedYariyilFilter === 'all' ? 'selected' : ''}>Tümü</option>
                    <option value="3.Yarıyıl" ${selectedYariyilFilter === '3.Yarıyıl' ? 'selected' : ''}>3. Yarıyıl</option>
                    <option value="5.Yarıyıl" ${selectedYariyilFilter === '5.Yarıyıl' ? 'selected' : ''}>5. Yarıyıl</option>
                  </select>
                </th>
                <th>Kontenjan</th>
                <th>Yerleşen</th>
                <th>Tavan</th>
                <th>Taban</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const program of programlar) {
      // Yıllara göre gruplanmış satırları topla
      const groupedRows = collectGroupedRows(program, donemler);

      if (Object.keys(groupedRows).length === 0) continue;

      let isFirstYear = true;
      let totalProgramRows = 0;
      Object.values(groupedRows).forEach(rows => totalProgramRows += rows.length);

      for (const [yilLabel, rows] of Object.entries(groupedRows)) {

        rows.forEach((rowHtml, index) => {
          html += '<tr>';

          // Program hücresi sadece en başta (rowspan ile)
          if (isFirstYear && index === 0) {
            html += `
              <td class="program-cell" rowspan="${totalProgramRows}">
                <div class="program-name">${program.ad}</div>
              </td>
            `;
            isFirstYear = false;
          }

          // Dönem hücresi her yılın başında (rowspan ile)
          if (index === 0) {
            html += `<td rowspan="${rows.length}">${yilLabel}</td>`;
          }

          html += rowHtml;
          html += '</tr>';
        });
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

// Yıllara göre gruplanmış satırları oluştur
function collectGroupedRows(program, donemler) {
  const grouped = {};

  for (const donem of donemler) {
    const donemData = program.istatistikler[donem];
    if (!donemData) continue;

    // Filtreleme
    const yariyillar = selectedYariyilFilter === 'all'
      ? ['3.Yarıyıl', '5.Yarıyıl']
      : [selectedYariyilFilter];

    const yearRows = [];

    for (const yariyil of yariyillar) {
      const data = donemData[yariyil];
      if (!data) continue;

      if (Array.isArray(data)) {
        for (const item of data) {
          yearRows.push(createRowHtml(yariyil, item));
        }
      } else {
        yearRows.push(createRowHtml(yariyil, data));
      }
    }

    if (yearRows.length > 0) {
      grouped[donem] = yearRows;
    }
  }

  return grouped;
}

// Satır HTML'i (Sadece veri hücreleri)
function createRowHtml(yariyil, data) {
  const kontenjan = data.kontenjan !== null ? data.kontenjan : '-';
  const yerlesen = data.yerlesen || 0;
  const tavan = formatGPA(data.tavan);
  const taban = formatGPA(data.taban);

  const tavanClass = getGPAClass(data.tavan);
  const tabanClass = getGPAClass(data.taban);

  const aciklamaAttr = data.aciklama ? `title="${data.aciklama}"` : '';
  const aciklamaIcon = data.aciklama ? ' <span class="aciklama-icon" ' + aciklamaAttr + '>*</span>' : '';

  return `
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
  if (value >= 3.75) return 'gno-high'; // Kırmızı (3.75 - 4.00)
  if (value >= 3.50) return 'gno-medium'; // Turuncu (3.50 - 3.75)
  return ''; // Normal text rengi
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
