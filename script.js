// script.js
class OperatorScoringApp {
  constructor() {
    this.statsData = {};
    this.currentRecheckData = null;
    this.currentOperator = '';
    this.isLoading = false;
    this.performanceMetrics = {
      lastLoadTime: 0,
      averageLoadTime: 0,
      loadCount: 0
    };

    this.init();
  }

  init() {
    console.log('Initializing Operator Scoring App...');

    // Установка дат по умолчанию
    this.setDefaultDates();

    // Заполнение выпадающих списков
    this.populateOperatorSelects();

    // Загрузка данных
    this.refreshData();
    this.loadViolationStats();

    // Настройка обработчиков событий
    this.setupEventListeners();
  }

  setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').valueAsDate = startDate;
    document.getElementById('endDate').valueAsDate = endDate;
    document.getElementById('violationStartDate').valueAsDate = startDate;
    document.getElementById('violationEndDate').valueAsDate = endDate;
  }

  populateOperatorSelects() {
    const selects = [
      'violationOperator',
      'manualOperatorSelect',
      'periodOperatorSelect',
      'recheckOperator'
    ];

    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      select.innerHTML = selectId === 'violationOperator' ?
        '<option value="">Все операторы</option>' :
        '<option value="">Выберите оператора</option>';

      CONFIG.OPERATORS.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator;
        option.textContent = operator;
        select.appendChild(option);
      });
    });

    // Заполнение клиник
    const clinicSelect = document.getElementById('violationClinic');
    clinicSelect.innerHTML = '<option value="">Все клиники</option>';

    CONFIG.CLINICS.forEach(clinic => {
      const option = document.createElement('option');
      option.value = clinic;
      option.textContent = clinic;
      clinicSelect.appendChild(option);
    });
  }

  setupEventListeners() {
    // Автообновление каждые 5 минут
    setInterval(() => this.refreshData(), 300000);
  }

  async callGoogleScript(functionName, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('method', functionName);

    // Добавляем параметры в URL
    Object.keys(params).forEach(key => {
      url.searchParams.set(key, params[key]);
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling Google Script:', error);
      throw error;
    }
  }

  async refreshData() {
    if (this.isLoading) return;

    this.isLoading = true;
    const startTime = performance.now();

    this.updateUIState('loading', true);
    this.hideError();

    try {
      const data = await this.callGoogleScript('getStatsData');
      const loadTime = performance.now() - startTime;

      this.updatePerformanceMetrics(loadTime);
      this.updateUI(data);
      this.isLoading = false;
      this.updateUIState('loading', false);

    } catch (error) {
      this.showError(error);
      this.isLoading = false;
      this.updateUIState('loading', false);
    }
  }

  updateUIState(state, isLoading) {
    const refreshBtn = document.getElementById('refreshBtn');
    const loader = document.getElementById('loaderStats');

    if (isLoading) {
      refreshBtn.disabled = true;
      loader.style.display = 'block';
      document.body.classList.add('loading');
    } else {
      refreshBtn.disabled = false;
      loader.style.display = 'none';
      document.body.classList.remove('loading');
    }
  }

  updatePerformanceMetrics(loadTime) {
    this.performanceMetrics.lastLoadTime = loadTime;
    this.performanceMetrics.loadCount++;
    this.performanceMetrics.averageLoadTime =
      (this.performanceMetrics.averageLoadTime * (this.performanceMetrics.loadCount - 1) + loadTime) /
      this.performanceMetrics.loadCount;

    document.getElementById('performanceInfo').textContent =
      `Время загрузки: ${loadTime.toFixed(0)}мс | Среднее: ${this.performanceMetrics.averageLoadTime.toFixed(0)}мс`;
  }

  updateUI(data) {
    console.log('Updating UI with data:', data);
    this.statsData = data;

    const currentStats = data.current || {};
    this.updateSummaryStats(currentStats, data.todaysPoints || {});
    this.updateMainTable(currentStats, data.todaysPoints || {});
    this.updateTopOperators(data.top || []);
    this.updateLastUpdateTime();

    // Обновляем детальную статистику по листам
    if (data.detailed) {
      this.renderSheetStats('z');
      this.renderSheetStats('diagnostics');
      this.renderSheetStats('coordinators');
      this.renderSheetStats('secondary');
    }
  }

  updateSummaryStats(currentStats, todaysPoints) {
    const currentTotal = currentStats.total || currentStats;
    const currentErrors = currentStats.errors || {};
    const currentPerfect = currentStats.perfect || {};

    let totalFixations = 0;
    let operatorsWithActivity = 0;
    let bestOperator = '-';
    let maxCount = 0;

    CONFIG.OPERATORS.forEach(operator => {
      const fixations = currentTotal[operator] || 0;
      const points = todaysPoints[operator] || 0;
      const total = fixations + points;

      totalFixations += fixations;

      if (fixations > 0 || points > 0) {
        operatorsWithActivity++;
      }

      if (total > maxCount) {
        maxCount = total;
        bestOperator = operator;
      }
    });

    document.getElementById('totalToday').textContent = totalFixations;
    document.getElementById('totalOperators').textContent = operatorsWithActivity;
    document.getElementById('bestOperator').textContent = maxCount > 0 ?
      `${bestOperator} (${maxCount})` : '-';
  }

  updateMainTable(currentStats, todaysPoints) {
    const table = document.getElementById('statsTable').querySelector('tbody');
    table.innerHTML = '';

    const currentTotal = currentStats.total || currentStats;
    const currentErrors = currentStats.errors || {};
    const currentPerfect = currentStats.perfect || {};

    const operatorsData = CONFIG.OPERATORS.map(operator => ({
      operator,
      fixations: currentTotal[operator] || 0,
      points: todaysPoints[operator] || 0,
      errors: currentErrors[operator] || 0,
      perfect: currentPerfect[operator] || 0,
      total: (currentTotal[operator] || 0) + (todaysPoints[operator] || 0)
    })).sort((a, b) => b.total - a.total);

    operatorsData.forEach(data => {
      const row = document.createElement('tr');
      if (data.total === 0) {
        row.style.opacity = '0.6';
        row.style.backgroundColor = '#f9f9f9';
      }

      row.innerHTML = `
                <td>${this.escapeHtml(data.operator)}</td>
                <td><strong>${data.total}</strong></td>
                <td>${data.errors}</td>
                <td>${data.perfect}</td>
                <td>${data.points.toFixed(1)}</td>
            `;
      table.appendChild(row);
    });
  }

  updateTopOperators(topData) {
    const container = document.getElementById('topOperatorsList');
    container.innerHTML = '';

    if (topData.length > 0) {
      const topDiv = document.createElement('div');
      topDiv.style.background = '#f8f9fa';
      topDiv.style.padding = '20px';
      topDiv.style.borderRadius = '8px';

      topData.forEach((item, index) => {
        const totalPoints = this.statsData.points?.[item.operator] || 0;
        const fixationsCount = item.count - totalPoints;

        const topItem = document.createElement('div');
        topItem.className = 'top-item';
        topItem.innerHTML = `
                    <div class="rank">${index + 1}</div>
                    <div>${this.escapeHtml(item.operator)}</div>
                    <div><strong>${item.count}</strong> (${fixationsCount} фиксаций + ${totalPoints.toFixed(1)} баллов)</div>
                `;
        topDiv.appendChild(topItem);
      });

      container.appendChild(topDiv);
    } else {
      container.innerHTML = '<p style="text-align:center;">Нет данных для топа</p>';
    }
  }

  updateLastUpdateTime() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent =
      `Последнее обновление: ${now.toLocaleTimeString()}`;
  }

  renderSheetStats(sheetId) {
    if (!this.statsData.detailed) return;

    let tableId, data;

    switch(sheetId) {
      case 'z':
        tableId = 'zStatsTable';
        data = this.statsData.detailed.bySheet.z;
        break;
      case 'diagnostics':
        tableId = 'diagnosticsStatsTable';
        data = this.statsData.detailed.bySheet['диагностика'];
        break;
      case 'coordinators':
        tableId = 'coordinatorsStatsTable';
        data = this.statsData.detailed.bySheet['координаторы'];
        break;
      case 'secondary':
        tableId = 'secondaryStatsTable';
        data = this.statsData.detailed.bySheet['вторичка'];
        break;
      default:
        return;
    }

    this.renderSheetTable(tableId, data);
  }

  renderSheetTable(tableId, data) {
    const table = document.getElementById(tableId).querySelector('tbody');
    table.innerHTML = '';

    const operatorsData = CONFIG.OPERATORS.map(operator => ({
      operator,
      total: (data && data.total && data.total[operator]) || 0,
      errors: (data && data.errors && data.errors[operator]) || 0,
      perfect: (data && data.perfect && data.perfect[operator]) || 0
    })).sort((a, b) => b.total - a.total);

    operatorsData.forEach(data => {
      const row = document.createElement('tr');
      if (data.total === 0) {
        row.style.opacity = '0.6';
        row.style.backgroundColor = '#ffffff';
      }

      row.innerHTML = `
                <td>${this.escapeHtml(data.operator)}</td>
                <td><strong>${data.total}</strong></td>
                <td>${data.errors}</td>
                <td>${data.perfect}</td>
            `;
      table.appendChild(row);
    });
  }

  async loadViolationStats() {
    try {
      const data = await this.callGoogleScript('getViolationStats');
      this.updateViolationTable(data);
    } catch (error) {
      console.error('Error loading violation stats:', error);
    }
  }

  async updateViolationTable() {
    const periodType = document.getElementById('violationPeriod').value;
    const operator = document.getElementById('violationOperator').value;
    const clinic = document.getElementById('violationClinic').value;

    try {
      let data;
      if (periodType === 'today') {
        data = await this.callGoogleScript('getViolationStats', { clinic });
      } else {
        const startDate = document.getElementById('violationStartDate').value;
        const endDate = document.getElementById('violationEndDate').value;

        if (!startDate || !endDate) {
          alert('Выберите начальную и конечную даты для периода');
          return;
        }

        data = await this.callGoogleScript('getViolationStatsForPeriod', {
          startDate, endDate, clinic
        });
      }

      this.renderViolationTable(data, operator, clinic, periodType);
    } catch (error) {
      this.showError(error);
    }
  }

  renderViolationTable(data, operator, clinic, periodType) {
    const container = document.getElementById('violationTableContainer');

    if (!data || data.totalRecords === 0) {
      let message = `Нет данных о нарушениях`;
      if (clinic) message += ` для клиники "${clinic}"`;
      if (operator) message += ` и оператора "${operator}"`;
      container.innerHTML = `<p>${message}</p>`;
      return;
    }

    // Реализация отображения таблицы нарушений
    // (аналогично вашему оригинальному коду)
    container.innerHTML = this.generateViolationHTML(data, operator, clinic, periodType);
  }

  generateViolationHTML(data, operator, clinic, periodType) {
    // Генерация HTML для таблицы нарушений
    // Верните HTML строку на основе данных
    return `<h3>Статистика нарушений</h3><p>Данные загружены</p>`;
  }

  showError(error) {
    console.error('Error:', error);
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = 'Произошла ошибка: ' + (error.message || error);
    errorMessage.style.display = 'block';
  }

  hideError() {
    document.getElementById('errorMessage').style.display = 'none';
  }

  escapeHtml(unsafe) {
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Методы для работы с перепроверками, периодами и баллами
  async calculateRechecks() {
    // Реализация расчета перепроверок
  }

  async addManualPoints() {
    // Реализация добавления баллов
  }

  async deductManualPoints() {
    // Реализация вычитания баллов
  }

  async getPeriodStats() {
    // Реализация получения статистики за период
  }
}

// Глобальные функции для HTML onclick
function showSheetTab(sheetId) {
  document.querySelectorAll('.sheet-content').forEach(tab => {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.sheet-tab').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(sheetId).classList.add('active');
  event.currentTarget.classList.add('active');

  if (window.app && window.app.statsData.detailed) {
    window.app.renderSheetStats(sheetId);
  }
}

function toggleCustomPeriod() {
  const periodType = document.getElementById('violationPeriod').value;
  const customPeriodDiv = document.getElementById('customPeriod');
  customPeriodDiv.style.display = periodType === 'custom' ? 'block' : 'none';
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
  window.app = new OperatorScoringApp();
});

// Глобальные функции
function refreshData() {
  if (window.app) window.app.refreshData();
}

function updateViolationTable() {
  if (window.app) window.app.updateViolationTable();
}

function calculateRechecks() {
  if (window.app) window.app.calculateRechecks();
}

function addManualPoints() {
  if (window.app) window.app.addManualPoints();
}

function deductManualPoints() {
  if (window.app) window.app.deductManualPoints();
}

function getPeriodStats() {
  if (window.app) window.app.getPeriodStats();
}
