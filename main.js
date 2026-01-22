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
const reviewLinkInput = document.getElementById('review-link');
const comentariosTextarea = document.getElementById('comentarios');
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
        const key = `${rowIndex}-${groupIdx}-${subIdx}`;
        const savedValue = checkboxData[key] || 'No';

        // Crear contenedor para radio buttons
        const radioGroup = document.createElement('div');
        radioGroup.className = 'radio-group';

        const options = ['No', 'Sí', 'No Aplica'];
        options.forEach((option) => {
          const label = document.createElement('label');
          label.className = 'radio-label';

          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = `metric-${key}`;
          radio.value = option;
          radio.checked = option === savedValue;
          radio.dataset.key = key;

          const span = document.createElement('span');
          span.textContent = option;

          label.appendChild(radio);
          label.appendChild(span);
          radioGroup.appendChild(label);
        });

        td.appendChild(radioGroup);
        tr.appendChild(td);
      });
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableContainer.appendChild(table);
};

// Obtener estado de radio buttons
const getCheckboxData = () => {
  const data = {};
  const radios = tableContainer.querySelectorAll('input[type="radio"]:checked');
  radios.forEach((radio) => {
    if (radio.dataset.key) {
      data[radio.dataset.key] = radio.value;
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
        <button class="btn-export" data-id="${test.id}" title="Exportar">📥</button>
        <button class="btn-delete" data-id="${test.id}" title="Eliminar">🗑️</button>
      </div>
    `;
    savedTestsList.appendChild(item);
  });

  // Event listeners para cargar/exportar/eliminar
  savedTestsList.querySelectorAll('.btn-load').forEach((btn) => {
    btn.addEventListener('click', () => loadTest(btn.dataset.id));
  });
  savedTestsList.querySelectorAll('.btn-export').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tests = getStoredTests();
      const test = tests.find((t) => t.id === btn.dataset.id);
      if (test) exportTestData(test);
    });
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
    review_link: reviewLinkInput.value.trim(),
    comentarios: comentariosTextarea.value.trim(),
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
  reviewLinkInput.value = test.review_link || '';
  comentariosTextarea.value = test.comentarios || '';
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
// EXPORTACIÓN
// ============================================

const exportCurrentTest = () => {
  try {
    // Verificar que ExcelJS esté disponible
    if (typeof ExcelJS === 'undefined') {
      alert('Error: La librería ExcelJS no se ha cargado correctamente. Por favor, recarga la página.');
      console.error('ExcelJS is not defined');
      return;
    }

    const experimentName = experimentInput.value.trim();
    if (!experimentName) {
      alert('Introduce un nombre de experimento antes de exportar');
      return;
    }

    const variantCount = getVariantCount();
    const deviceMode = deviceSelect.value.trim();
    const metrics = parseMetrics(metricsTextarea.value);
    const radioData = getCheckboxData();

    exportTestData({
      experiment_name: experimentName,
      variant_count: variantCount,
      device_mode: deviceMode,
      review_link: reviewLinkInput.value.trim(),
      comentarios: comentariosTextarea.value.trim(),
      metrics: metrics,
      checkbox_data: radioData,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error al exportar:', error);
    alert('Error al exportar el test: ' + error.message);
  }
};

const exportTestData = async (testData) => {
  try {
    const groups = buildGroupLabels(testData.variant_count);
    const subColumns = resolveDeviceColumns(testData.device_mode);
    const metrics = testData.metrics.length ? testData.metrics : ['Métrica 1'];

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(testData.experiment_name.substring(0, 31)); // Max 31 chars para nombre de hoja

    // Configurar ancho de columnas
    worksheet.getColumn(1).width = 25; // Columna de métricas
    for (let i = 2; i <= groups.length * subColumns.length + 1; i++) {
      worksheet.getColumn(i).width = 15;
    }

    // FILA 1: Encabezados de grupos (CONTROL, VARIANTE 1, etc.)
    const headerRow1 = worksheet.getRow(1);
    headerRow1.height = 25;

    // Primera celda: "MÉTRICAS"
    const metricsCell = worksheet.getCell(1, 1);
    metricsCell.value = 'MÉTRICAS';
    metricsCell.font = { bold: true, size: 12, color: { argb: 'FF12100C' } };
    metricsCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9CA0D' } // Amarillo
    };
    metricsCell.alignment = { vertical: 'middle', horizontal: 'center' };
    metricsCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Combinar celda de MÉTRICAS verticalmente (filas 1 y 2)
    worksheet.mergeCells(1, 1, 2, 1);

    // Encabezados de grupos
    let colIndex = 2;
    groups.forEach((group) => {
      const startCol = colIndex;
      const endCol = colIndex + subColumns.length - 1;

      // Combinar celdas para el grupo
      if (subColumns.length > 1) {
        worksheet.mergeCells(1, startCol, 1, endCol);
      }

      const groupCell = worksheet.getCell(1, startCol);
      groupCell.value = group;
      groupCell.font = { bold: true, size: 11, color: { argb: 'FF12100C' } };
      groupCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9CA0D' } // Amarillo
      };
      groupCell.alignment = { vertical: 'middle', horizontal: 'center' };
      groupCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // Aplicar bordes a todas las celdas combinadas
      for (let c = startCol; c <= endCol; c++) {
        const cell = worksheet.getCell(1, c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }

      colIndex = endCol + 1;
    });

    // FILA 2: Subencabezados (DESKTOP, MOBILE)
    const headerRow2 = worksheet.getRow(2);
    headerRow2.height = 20;

    colIndex = 2;
    groups.forEach(() => {
      subColumns.forEach((sub) => {
        const subCell = worksheet.getCell(2, colIndex);
        subCell.value = sub;
        subCell.font = { bold: true, size: 10, color: { argb: 'FF12100C' } };
        subCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAD232' } // Amarillo más claro
        };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        subCell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        colIndex++;
      });
    });

    // FILAS DE DATOS: Métricas
    metrics.forEach((metric, rowIndex) => {
      const excelRowIndex = rowIndex + 3; // Empezar en fila 3
      const dataRow = worksheet.getRow(excelRowIndex);
      dataRow.height = 18;

      // Columna de métrica
      const metricCell = worksheet.getCell(excelRowIndex, 1);
      metricCell.value = metric || `Métrica ${rowIndex + 1}`;
      metricCell.font = { bold: true, size: 10 };
      metricCell.alignment = { vertical: 'middle', horizontal: 'left' };
      metricCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // Valores de radio buttons
      colIndex = 2;
      groups.forEach((group, groupIdx) => {
        subColumns.forEach((sub, subIdx) => {
          const key = `${rowIndex}-${groupIdx}-${subIdx}`;
          const value = testData.checkbox_data[key] || 'No';

          const valueCell = worksheet.getCell(excelRowIndex, colIndex);
          valueCell.value = value;
          valueCell.font = { size: 10 };
          valueCell.alignment = { vertical: 'middle', horizontal: 'center' };

          // Color según el valor
          if (value === 'Sí') {
            valueCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD4EDDA' } // Verde claro
            };
            valueCell.font = { size: 10, color: { argb: 'FF155724' } };
          } else if (value === 'No Aplica') {
            valueCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' } // Gris claro
            };
            valueCell.font = { size: 10, color: { argb: 'FF6C757D' } };
          } else {
            // "No" - sin color de fondo especial
            valueCell.font = { size: 10, color: { argb: 'FF000000' } };
          }

          valueCell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };

          colIndex++;
        });
      });
    });

    // METADATOS (al final)
    const metadataStartRow = metrics.length + 4;

    // Línea separadora
    const separatorRow = worksheet.getRow(metadataStartRow);
    const separatorCell = worksheet.getCell(metadataStartRow, 1);
    separatorCell.value = '---';
    separatorCell.font = { bold: true };

    // Experimento
    const expRow = worksheet.getRow(metadataStartRow + 1);
    expRow.getCell(1).value = 'Experimento:';
    expRow.getCell(1).font = { bold: true };
    expRow.getCell(2).value = testData.experiment_name;

    // Fecha
    const dateRow = worksheet.getRow(metadataStartRow + 2);
    dateRow.getCell(1).value = 'Fecha:';
    dateRow.getCell(1).font = { bold: true };
    dateRow.getCell(2).value = new Date(testData.created_at).toLocaleDateString('es-ES');

    // Dispositivos
    const deviceRow = worksheet.getRow(metadataStartRow + 3);
    deviceRow.getCell(1).value = 'Dispositivos:';
    deviceRow.getCell(1).font = { bold: true };
    deviceRow.getCell(2).value = testData.device_mode;

    // Variantes
    const variantRow = worksheet.getRow(metadataStartRow + 4);
    variantRow.getCell(1).value = 'Variantes:';
    variantRow.getCell(1).font = { bold: true };
    variantRow.getCell(2).value = testData.variant_count;

    // Hipervínculo de revisión
    const reviewLinkRow = worksheet.getRow(metadataStartRow + 5);
    reviewLinkRow.getCell(1).value = 'Hipervínculo de revisión:';
    reviewLinkRow.getCell(1).font = { bold: true };
    if (testData.review_link) {
      reviewLinkRow.getCell(2).value = {
        text: testData.review_link,
        hyperlink: testData.review_link
      };
      reviewLinkRow.getCell(2).font = { color: { argb: 'FF0000FF' }, underline: true };
    } else {
      reviewLinkRow.getCell(2).value = '-';
    }

    // Comentarios
    const comentariosRow = worksheet.getRow(metadataStartRow + 6);
    comentariosRow.getCell(1).value = 'Comentarios:';
    comentariosRow.getCell(1).font = { bold: true };
    comentariosRow.getCell(2).value = testData.comentarios || '-';
    // Permitir que el texto se ajuste en la celda
    comentariosRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };

    // Generar archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fileName = `${testData.experiment_name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Exportación exitosa:', fileName);
    alert('✅ Test exportado correctamente como: ' + fileName);
  } catch (error) {
    console.error('Error en exportTestData:', error);
    alert('❌ Error al exportar el test: ' + error.message);
    throw error;
  }
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
const exportBtn = document.getElementById('export-btn');
exportBtn?.addEventListener('click', exportCurrentTest);

// Cargar datos iniciales
document.addEventListener('DOMContentLoaded', () => {
  loadTests();
});
