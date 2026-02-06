// Инициализация состояния
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Функции для работы с состоянием
function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function getCurrentUser() {
    return currentUser;
}

function clearCurrentUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

// Функция для обновления данных пользователя из localStorage
function refreshUserData() {
    if (currentUser) {
        const users = JSON.parse(localStorage.getItem('casinoUsers')) || [];
        const updatedUser = users.find(u => u.username === currentUser.username);
        if (updatedUser) {
            setCurrentUser(updatedUser);
        }
    }
}

// Функция для проверки авторизации
function isAuthenticated() {
    return currentUser !== null;
}

// Функция для получения баланса
function getCurrentBalance() {
    if (!currentUser) return 0;
    refreshUserData();
    return currentUser.balance || 0;
}

// Функция для обновления баланса в UI
function updateBalanceDisplay() {
    const balanceElements = document.querySelectorAll('.balance-amount, #userBalance, .balance');
    const balance = getCurrentBalance();
    
    balanceElements.forEach(element => {
        if (element) {
            element.textContent = `${balance}₽`;
        }
    });
    
    // Обновляем статистику в профиле
    updateProfileStats();
}

// Функция для обновления статистики в профиле
function updateProfileStats() {
    if (!currentUser) return;
    
    const user = database.getUser(currentUser.username);
    if (!user) return;
    
    // Обновляем элементы на странице профиля
    const totalGamesEl = document.getElementById('totalGames');
    const totalWinsEl = document.getElementById('totalWins');
    const winRateEl = document.getElementById('winRate');
    const totalDepositsEl = document.getElementById('totalDeposits');
    const totalWithdrawalsEl = document.getElementById('totalWithdrawals');
    
    if (totalGamesEl) totalGamesEl.textContent = user.totalGames || 0;
    if (totalWinsEl) totalWinsEl.textContent = user.totalWins || 0;
    
    if (winRateEl && user.totalGames > 0) {
        const winRate = ((user.totalWins || 0) / user.totalGames * 100).toFixed(1);
        winRateEl.textContent = `${winRate}%`;
    }
    
    if (totalDepositsEl) totalDepositsEl.textContent = `${user.totalDeposits || 0}₽`;
    if (totalWithdrawalsEl) totalWithdrawalsEl.textContent = `${user.totalWithdrawals || 0}₽`;
}

// Функция для обновления истории игр
function updateGameHistory() {
    if (!currentUser) return;
    
    const history = database.getUserGameHistory(currentUser.username);
    const historyContainer = document.getElementById('gameHistory');
    
    if (historyContainer) {
        historyContainer.innerHTML = history.map(entry => `
            <div class="history-item">
                <div class="game-info">
                    <span class="game-name">${entry.game}</span>
                    <span class="game-date">${new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <div class="game-result">
                    <span class="bet-amount">Ставка: ${entry.bet}₽</span>
                    <span class="win-amount ${entry.win > 0 ? 'win' : 'lose'}">
                        ${entry.win > 0 ? '+' : ''}${entry.win}₽
                    </span>
                </div>
            </div>
        `).join('');
    }
}

// Экспорт функций
window.state = {
    setCurrentUser,
    getCurrentUser,
    clearCurrentUser,
    isAuthenticated,
    getCurrentBalance,
    updateBalanceDisplay,
    updateProfileStats,
    updateGameHistory,
    refreshUserData
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    if (isAuthenticated()) {
        refreshUserData();
        updateBalanceDisplay();
        updateGameHistory();
    }
});
