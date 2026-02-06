// Инициализация базы данных
let users = JSON.parse(localStorage.getItem('casinoUsers')) || [];
let paymentRequests = JSON.parse(localStorage.getItem('paymentRequests')) || [];
let gameHistory = JSON.parse(localStorage.getItem('gameHistory')) || [];
let bonuses = JSON.parse(localStorage.getItem('bonuses')) || [];
let bonusClaims = JSON.parse(localStorage.getItem('bonusClaims')) || {};

// Инициализация администратора
if (!users.find(u => u.username === 'admin')) {
    users.push({
        username: 'admin',
        password: 'admin123',
        balance: 0,
        totalGames: 0,
        totalWins: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        registrationDate: new Date().toISOString()
    });
    localStorage.setItem('casinoUsers', JSON.stringify(users));
}

// Инициализация бонусов
if (bonuses.length === 0) {
    bonuses = [
        {
            id: 1,
            name: "Добро пожаловать",
            amount: 50,
            type: "one-time",
            minDeposit: 0,
            description: "Бонус за регистрацию"
        },
        {
            id: 2,
            name: "Ежедневный бонус",
            amount: 10,
            type: "daily",
            minDeposit: 0,
            description: "Ежедневный бонус"
        },
        {
            id: 3,
            name: "Бонус на депозит",
            amount: 100,
            type: "deposit",
            minDeposit: 500,
            description: "+100% к первому депозиту от 500₽"
        }
    ];
    localStorage.setItem('bonuses', JSON.stringify(bonuses));
}

// Функции для работы с пользователями
function getUser(username) {
    return users.find(u => u.username === username);
}

function updateUser(username, data) {
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...data };
        localStorage.setItem('casinoUsers', JSON.stringify(users));
        return true;
    }
    return false;
}

// Функции для платежей
function createPaymentRequest(username, amount, wallet) {
    const request = {
        id: Date.now(),
        username,
        amount,
        wallet,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    paymentRequests.push(request);
    localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
    return request;
}

function getPaymentRequests(status = null) {
    if (status) {
        return paymentRequests.filter(req => req.status === status);
    }
    return paymentRequests;
}

function updatePaymentRequest(id, updates) {
    const requestIndex = paymentRequests.findIndex(req => req.id === id);
    if (requestIndex !== -1) {
        paymentRequests[requestIndex] = { ...paymentRequests[requestIndex], ...updates };
        localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
        return true;
    }
    return false;
}

// Функции для истории игр
function addGameHistory(username, game, bet, win, result) {
    const historyEntry = {
        id: Date.now(),
        username,
        game,
        bet,
        win,
        result,
        timestamp: new Date().toISOString(),
        balanceBefore: getUser(username)?.balance || 0
    };
    
    gameHistory.push(historyEntry);
    localStorage.setItem('gameHistory', JSON.stringify(gameHistory));
    
    // Обновляем статистику пользователя
    const user = getUser(username);
    if (user) {
        user.totalGames = (user.totalGames || 0) + 1;
        if (win > 0) {
            user.totalWins = (user.totalWins || 0) + 1;
        }
        updateUser(username, {
            totalGames: user.totalGames,
            totalWins: user.totalWins,
            balance: (user.balance || 0) - bet + win
        });
    }
    
    return historyEntry;
}

function getUserGameHistory(username) {
    return gameHistory.filter(entry => entry.username === username)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Функции для бонусов
function getAvailableBonuses(username) {
    const user = getUser(username);
    const userClaims = bonusClaims[username] || {};
    const now = new Date();
    
    return bonuses.filter(bonus => {
        if (bonus.type === 'one-time') {
            return !userClaims[bonus.id];
        }
        if (bonus.type === 'daily') {
            const lastClaim = userClaims[bonus.id];
            if (!lastClaim) return true;
            const lastClaimDate = new Date(lastClaim);
            return now.toDateString() !== lastClaimDate.toDateString();
        }
        if (bonus.type === 'deposit') {
            return !userClaims[bonus.id] && (user?.totalDeposits || 0) >= bonus.minDeposit;
        }
        return true;
    });
}

function claimBonus(username, bonusId) {
    const user = getUser(username);
    const bonus = bonuses.find(b => b.id === bonusId);
    
    if (!user || !bonus) return false;
    
    // Проверяем доступность бонуса
    const availableBonuses = getAvailableBonuses(username);
    if (!availableBonuses.find(b => b.id === bonusId)) return false;
    
    // Обновляем баланс
    user.balance = (user.balance || 0) + bonus.amount;
    updateUser(username, { balance: user.balance });
    
    // Отмечаем получение бонуса
    if (!bonusClaims[username]) bonusClaims[username] = {};
    bonusClaims[username][bonusId] = new Date().toISOString();
    localStorage.setItem('bonusClaims', JSON.stringify(bonusClaims));
    
    // Добавляем в историю
    addGameHistory(username, 'bonus', 0, bonus.amount, 'Бонус получен');
    
    return true;
}

// Функция для обновления баланса после игры
function updateBalanceAfterGame(username, betAmount, winAmount) {
    const user = getUser(username);
    if (!user) return false;
    
    const newBalance = (user.balance || 0) - betAmount + winAmount;
    if (newBalance < 0) return false;
    
    return updateUser(username, { balance: newBalance });
}

// Экспорт функций
window.database = {
    // Пользователи
    users,
    getUser,
    updateUser,
    
    // Платежи
    paymentRequests,
    createPaymentRequest,
    getPaymentRequests,
    updatePaymentRequest,
    
    // История игр
    gameHistory,
    addGameHistory,
    getUserGameHistory,
    
    // Бонусы
    bonuses,
    bonusClaims,
    getAvailableBonuses,
    claimBonus,
    
    // Общие функции
    updateBalanceAfterGame
};
