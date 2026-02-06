// ==================== state.js ====================
// Глобальное состояние приложения

window.user = {
  id: null,
  username: '',
  balance: 0,
  totalWagered: 0,
  totalWon: 0,
  gamesPlayed: 0,
  lastBonusDate: null,
  gameHistory: []
};

window.database = window.database || {};

// Функция для обновления баланса с автоматической синхронизацией
window.updateBalance = function(amount, reason = '') {
  if (!window.user || !window.user.id) {
    console.error('Пользователь не авторизован');
    return false;
  }

  const newBalance = window.user.balance + amount;
  if (newBalance < 0) {
    console.error('Недостаточно средств');
    return false;
  }

  // 1. Обновляем в state.js
  window.user.balance = newBalance;
  
  // 2. Синхронизируем с базой данных
  if (window.database[window.user.id]) {
    window.database[window.user.id].balance = newBalance;
    saveDatabase();
  }
  
  // 3. Обновляем отображение на всех страницах
  updateBalanceDisplay();
  
  // 4. Логируем операцию
  if (reason) {
    console.log(`Баланс изменен: ${amount > 0 ? '+' : ''}${amount}р. Причина: ${reason}. Новый баланс: ${newBalance}р`);
  }
  
  return true;
};

// Функция для обновления отображения баланса во всех вкладках
window.updateBalanceDisplay = function() {
  const balanceElements = document.querySelectorAll('.balance-amount, #userBalance, .balance-text, [data-balance]');
  balanceElements.forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      el.value = window.user ? window.user.balance : 0;
    } else {
      el.textContent = window.user ? window.user.balance : 0;
    }
  });
  
  // Также обновляем в играх
  const betInputs = document.querySelectorAll('input[type="number"]');
  betInputs.forEach(input => {
    const max = parseFloat(input.max) || 0;
    const currentBalance = window.user ? window.user.balance : 0;
    if (max > currentBalance) {
      input.max = currentBalance;
    }
  });
};

// Функция для добавления записи в историю игр
window.addGameHistory = function(game, bet, win, result) {
  if (!window.user || !window.user.id) return;
  
  const historyEntry = {
    id: Date.now(),
    game: game,
    bet: bet,
    win: win,
    result: result,
    date: new Date().toLocaleString('ru-RU')
  };
  
  // Добавляем в state
  window.user.gameHistory.unshift(historyEntry);
  
  // Синхронизируем с базой
  if (window.database[window.user.id]) {
    if (!window.database[window.user.id].gameHistory) {
      window.database[window.user.id].gameHistory = [];
    }
    window.database[window.user.id].gameHistory.unshift(historyEntry);
    
    // Обновляем статистику
    window.database[window.user.id].gamesPlayed = (window.database[window.user.id].gamesPlayed || 0) + 1;
    window.database[window.user.id].totalWagered = (window.database[window.user.id].totalWagered || 0) + bet;
    if (win > 0) {
      window.database[window.user.id].totalWon = (window.database[window.user.id].totalWon || 0) + win;
    }
    
    // Обновляем в state.js
    window.user.gamesPlayed = window.database[window.user.id].gamesPlayed;
    window.user.totalWagered = window.database[window.user.id].totalWagered;
    window.user.totalWon = window.database[window.user.id].totalWon;
    
    saveDatabase();
  }
  
  // Обновляем отображение истории, если страница открыта
  if (typeof updateHistoryDisplay === 'function') {
    updateHistoryDisplay();
  }
  
  // Обновляем статистику в профиле, если страница открыта
  if (typeof updateProfileStats === 'function') {
    updateProfileStats();
  }
};

// Функция для проверки и выдачи бонуса
window.claimBonusIfAvailable = function() {
  if (!window.user || !window.user.id) return false;
  
  const now = new Date();
  const lastBonus = window.user.lastBonusDate ? new Date(window.user.lastBonusDate) : null;
  
  // Проверяем, прошло ли 24 часа
  if (lastBonus && (now - lastBonus) < 24 * 60 * 60 * 1000) {
    const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - lastBonus)) / (60 * 60 * 1000));
    return { available: false, hoursLeft: hoursLeft };
  }
  
  // Выдаем бонус
  const bonusAmount = 50; // Сумма бонуса
  window.updateBalance(bonusAmount, 'Ежедневный бонус');
  
  // Обновляем дату последнего бонуса
  window.user.lastBonusDate = now.toISOString();
  if (window.database[window.user.id]) {
    window.database[window.user.id].lastBonusDate = window.user.lastBonusDate;
    saveDatabase();
  }
  
  return { available: true, amount: bonusAmount };
};

// Инициализация пользователя
window.initUser = function() {
  const userId = localStorage.getItem('userId');
  if (!userId) return false;
  
  if (window.database[userId]) {
    // Восстанавливаем данные из базы
    window.user = { ...window.database[userId] };
    window.user.id = userId;
    
    // Обновляем отображение баланса
    updateBalanceDisplay();
    
    return true;
  }
  
  return false;
};

// Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', function() {
  initUser();
  updateBalanceDisplay();
});
