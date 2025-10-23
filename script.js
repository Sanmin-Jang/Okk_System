// script.js - РАБОЧАЯ ВЕРСИЯ
console.log('🚀 script.js загружен!');

// ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwNUPGee8tJkEoDBbtWzdUxs8-aWw2hyEtmDas8iK7OFIMLn1rhqrmXr_A1JQOboaua/exec';

class OperatorScoringApp {
    constructor() {
        this.init();
    }

    init() {
        console.log('🔧 Инициализация приложения...');
        this.setupEventListeners();
        this.loadData();
    }

    async loadData() {
        console.log('📡 Загружаем данные...');
        
        this.showLoading();
        
        try {
            // Способ 1: Прямой вызов
            const data = await this.fetchData();
            this.displayData(data);
            
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showError(`Не удалось загрузить данные: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async fetchData() {
        // Создаем URL с параметрами
        const url = `${API_URL}?method=getStatsData&timestamp=${Date.now()}`;
        console.log('🔄 Запрос к:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('📨 Ответ получен. Статус:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('📝 Текст ответа:', text.substring(0, 200) + '...');
        
        return JSON.parse(text);
    }

    displayData(data) {
        console.log('✅ Данные для отображения:', data);
        
        // Очищаем контейнер
        const container = document.getElementById('statsTable');
        container.innerHTML = '';
        
        if (!data) {
            container.innerHTML = '<p>Нет данных</p>';
            return;
        }
        
        // Создаем таблицу
        let html = `
            <h2>📊 Статистика операторов</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                    <h3>Всего фиксаций</h3>
                    <div style="font-size: 24px; font-weight: bold;">${data.totalFixationsToday || 0}</div>
                </div>
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px;">
                    <h3>Операторов сегодня</h3>
                    <div style="font-size: 24px; font-weight: bold;">${data.current ? Object.keys(data.current.total || {}).length : 0}</div>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px;">
                    <h3>Топ операторов</h3>
                    <div style="font-size: 24px; font-weight: bold;">${data.top ? data.top.length : 0}</div>
                </div>
            </div>
        `;
        
        // Таблица текущей статистики
        if (data.current && data.current.total) {
            html += '<h3>📈 Сегодняшняя статистика</h3>';
            html += '<table border="1" style="width:100%; border-collapse: collapse;">';
            html += '<tr style="background: #f5f5f5;"><th>Оператор</th><th>Фиксации</th><th>Ошибки</th><th>Идеально</th><th>Баллы</th></tr>';
            
            const operators = Object.keys(data.current.total).sort((a, b) => data.current.total[b] - data.current.total[a]);
            
            operators.forEach(operator => {
                const total = data.current.total[operator] || 0;
                const errors = data.current.errors?.[operator] || 0;
                const perfect = data.current.perfect?.[operator] || 0;
                const points = data.todaysPoints?.[operator] || 0;
                
                html += `
                    <tr>
                        <td><strong>${this.escapeHtml(operator)}</strong></td>
                        <td>${total}</td>
                        <td>${errors}</td>
                        <td>${perfect}</td>
                        <td>${points.toFixed(1)}</td>
                    </tr>
                `;
            });
            
            html += '</table>';
        }
        
        // Топ операторов
        if (data.top && data.top.length > 0) {
            html += '<h3>🏆 Топ операторов (все время)</h3>';
            html += '<table border="1" style="width:100%; border-collapse: collapse;">';
            html += '<tr style="background: #f5f5f5;"><th>#</th><th>Оператор</th><th>Всего</th><th>Баллы</th></tr>';
            
            data.top.forEach((item, index) => {
                const totalPoints = data.points?.[item.operator] || 0;
                const fixations = item.count - totalPoints;
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td><strong>${this.escapeHtml(item.operator)}</strong></td>
                        <td>${item.count}</td>
                        <td>${totalPoints.toFixed(1)}</td>
                    </tr>
                `;
            });
            
            html += '</table>';
        }
        
        container.innerHTML = html;
        
        // Обновляем время
        this.updateLastUpdateTime();
    }

    showLoading() {
        const container = document.getElementById('statsTable');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
                <p>Загрузка данных...</p>
            </div>
        `;
        
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.disabled = true;
    }

    hideLoading() {
        const btn = document.getElementById('refreshBtn');
        if (btn) btn.disabled = false;
    }

    showError(message) {
        const container = document.getElementById('statsTable');
        container.innerHTML = `
            <div style="background: #ffebee; color: #c62828; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>❌ Ошибка</h3>
                <p>${message}</p>
                <button onclick="window.app.loadData()" style="background: #c62828; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Попробовать снова
                </button>
            </div>
        `;
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        console.log('🕐 Время обновления:', timeString);
    }

    setupEventListeners() {
        const btn = document.getElementById('refreshBtn');
        if (btn) {
            btn.addEventListener('click', () => this.loadData());
        }
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
}

// Стили для анимации загрузки
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Запускаем приложение
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен!');
    window.app = new OperatorScoringApp();
});
