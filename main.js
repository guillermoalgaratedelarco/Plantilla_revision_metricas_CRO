// ============================================
// LOCALSTORAGE - Persistencia en el navegador
// ============================================

const STORAGE_KEY = 'cro_tests';

const getStoredTests = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveStoredTests = (tests) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const experimentInput = document.getElementById('experimento');
const variantDecreaseBtn = document.getElementById('variant-decrease');
const variantIncreaseBtn = document.getElementById('variant-increase');
const variantDisplay = document.getElementById('variant-count');
const deviceSelect = document.getElementById('dispositivo');
const metricsTextarea = document.getElementById('metricas');
const generateBtn = document.getElementById('generate-btn');
const saveBtn = document.getElementById('save-btn');
const tableTitle = document.querySelector('.table-title h3');
const tableContainer = document.getElementById('table-container');
const savedTestsList = document.getElementById('saved-tests-list');

const MIN_VARIANTS = 1;
const MAX_VARIANTS = 12;

let currentTestId = null;

// ============================================
// UTILIDADES
// ============================================

const getVariantCount = () => {
  const current = parseInt(variantDisplay.textContent, 10);
  return Number.isNaN(current) ? MIN_VARIANTS : Math.max(MIN_VARIANTS, current);
};

const setVariantCount = (value) => {
  const clamped = Math.min(MAX_VARIANTS, Math.max(MIN_VARIANTS, value));
  variantDisplay.textContent = clamped;
};

const parseMetrics = (text) => {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const updateTitle = (experimentName) => {
  const label = experimentName ? `Exp: ${experimentName}` : 'Exp: (sin nombre)';
  tableTitle.textContent = label;
};

const buildGroupLabels = (variantCount) => {
  const labels = ['CONTROL'];
  for (let i = 1; i <= variantCount; i += 1) {
    labels.push(`VARIANTE ${i}`);
  }
  return labels;
};

const resolveDeviceColumns = (selection) => {
  const lower = selection.toLowerCase();
  const hasDesktop = lower.includes('desktop');
  const hasMobile = lower.includes('mobile');

  if (hasDesktop && hasMobile) return ['DESKTOP', 'MOBILE'];
  if (hasDesktop) return ['DESKTOP'];
  return ['MOBILE'];
};

// ============================================
// CONSTRUCCIÓN DE TABLA
// ============================================

const buildTable = ({ variantCount, deviceMode, metrics, checkboxData = {} }) => {
  const groups = buildGroupLabels(variantCount);
  const subColumns = resolveDeviceColumns(deviceMode);
  const metricRows = metrics.length ? metrics : [''];

  tableContainer.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'table';
  table.id = 'metrics-table';

  const thead = document.createElement('thead');
  const topRow = document.createElement('tr');

  const metricsHeader = document.createElement('th');
  metricsHeader.rowSpan = 2;
  metricsHeader.className = 'metrics-col';
  metricsHeader.textContent = 'MÉTRICAS';
  topRow.appendChild(metricsHeader);

  groups.forEach((label) => {
    const th = document.createElement('th');
    th.colSpan = subColumns.length;
    th.textContent = label;
    topRow.appendChild(th);
  });

  const subRow = document.createElement('tr');
  groups.forEach(() => {
    subColumns.forEach((sub) => {
      const th = document.createElement('th');
      th.textContent = sub;
      subRow.appendChild(th);
    });
  });

  thead.appendChild(topRow);
  thead.appendChild(subRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  metricRows.forEach((metric, rowIndex) => {
    const tr = document.createElement('tr');

    const metricCell = document.createElement('td');
    metricCell.className = 'metric-label';
    metricCell.textContent = metric || `Métrica ${rowIndex + 1}`;
    tr.appendChild(metricCell);

    groups.forEach((group, groupIdx) => {
      subColumns.forEach((sub, subIdx) => {
        const td = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        const key = `${rowIndex}-${groupIdx}-${subIdx}`;
        checkbox.checked = checkboxData[key] || false;
        checkbox.dataset.key = key;
        td.appendChild(checkbox);
        tr.appendChild(td);
      });
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
};

// Obtener estado de checkboxes
const getCheckboxData = () => {
  const data = {};
  const checkboxes = tableContainer.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    if (cb.dataset.key) {
      data[cb.dataset.key] = cb.checked;
    }
  });
  return data;
};

// ============================================
// GESTIÓN DE TESTS (localStorage)
// ============================================

const loadTests = () => {
  if (!savedTestsList) return;
  
  const tests = getStoredTests();
  savedTestsList.innerHTML = '';
  
  if (tests.length === 0) {
    savedTestsList.innerHTML = '<p class="no-tests">No hay tests guardados</p>';
    return;
  }
  
  // Ordenar por fecha (más recientes primero)
  tests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  tests.forEach((test) => {
    const item = document.createElement('div');
    item.className = 'test-item';
    item.innerHTML = `
      <div class="test-info">
        <strong>${test.experiment_name}</strong>
        <small>${new Date(test.created_at).toLocaleDateString('es-ES')}</small>
      </div>
      <div class="test-actions">
        <button class="btn-load" data-id="${test.id}" title="Cargar">📂</button>
        <button class="btn-delete" data-id="${test.id}" title="Eliminar">🗑️</button>
      </div>
    `;
    savedTestsList.appendChild(item);
  });

  // Event listeners para cargar/eliminar
  savedTestsList.querySelectorAll('.btn-load').forEach((btn) => {
    btn.addEventListener('click', () => loadTest(btn.dataset.id));
  });
  savedTestsList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteTest(btn.dataset.id));
  });
};

const saveTest = () => {
  const experimentName = experimentInput.value.trim();
  if (!experimentName) {
    alert('Introduce un nombre de experimento');
    return;
  }

  const tests = getStoredTests();
  const now = new Date().toISOString();
  
  const testData = {
    experiment_name: experimentName,
    variant_count: getVariantCount(),
    device_mode: deviceSelect.value.trim(),
    metrics: parseMetrics(metricsTextarea.value),
    checkbox_data: getCheckboxData(),
    updated_at: now,
  };

  if (currentTestId) {
    // Actualizar test existente
    const index = tests.findIndex((t) => t.id === currentTestId);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...testData };
      saveStoredTests(tests);
      alert('Test actualizado correctamente');
    }
  } else {
    // Crear nuevo test
    const newTest = {
      id: generateId(),
      created_at: now,
      ...testData,
    };
    tests.push(newTest);
    saveStoredTests(tests);
    currentTestId = newTest.id;
    alert('Test guardado correctamente');
  }
  
  loadTests();
};

const loadTest = (id) => {
  const tests = getStoredTests();
  const test = tests.find((t) => t.id === id);
  
  if (!test) {
    alert('Test no encontrado');
    return;
  }
  
  currentTestId = test.id;
  experimentInput.value = test.experiment_name;
  setVariantCount(test.variant_count);
  deviceSelect.value = test.device_mode;
  metricsTextarea.value = test.metrics.join('\n');
  
  updateTitle(test.experiment_name);
  buildTable({
    variantCount: test.variant_count,
    deviceMode: test.device_mode,
    metrics: test.metrics,
    checkboxData: test.checkbox_data,
  });
};

const deleteTest = (id) => {
  if (!confirm('¿Eliminar este test?')) return;
  
  const tests = getStoredTests();
  const filtered = tests.filter((t) => t.id !== id);
  saveStoredTests(filtered);
  
  if (currentTestId === id) {
    currentTestId = null;
  }
  
  loadTests();
};

// ============================================
// EVENT LISTENERS
// ============================================

variantDecreaseBtn?.addEventListener('click', () => {
  setVariantCount(getVariantCount() - 1);
});

variantIncreaseBtn?.addEventListener('click', () => {
  setVariantCount(getVariantCount() + 1);
});

const handleGenerate = () => {
  const experimentName = experimentInput.value.trim();
  const variantCount = getVariantCount();
  const deviceMode = deviceSelect.value.trim();
  const metrics = parseMetrics(metricsTextarea.value);

  currentTestId = null; // Nuevo test, no actualización
  updateTitle(experimentName);
  buildTable({ variantCount, deviceMode, metrics });
};

generateBtn?.addEventListener('click', handleGenerate);
saveBtn?.addEventListener('click', saveTest);

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', () => {
  loadTests();
});
