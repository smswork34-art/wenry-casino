// State Management for Casino
class CasinoState {
    constructor() {
        this.user = null;
        this.balance = 0;
        this.bonuses = [];
        this.gameHistory = [];
        this.init();
    }

    init() {
        this.loadUser();
        this.loadBalance();
        this.loadBonuses();
        this.loadGameHistory();
        this.setupEventListeners();
    }

    // Загрузка данных пользователя
    loadUser() {
        const savedUser = localStorage.getItem('casino_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
        } else {
            // Создаем нового пользователя если нет
            this.user = {
                id: Date.now(),
                username: 'Игрок' + Math.floor(Math.random() * 1000),
                registrationDate: new Date().toISOString(),
                totalGames: 0,
                totalWins: 0,
                totalLosses: 0,
                totalWagered: 0,
                totalProfit: 0
            };
            localStorage.setItem('casino_user', JSON.stringify(this.user));
        }
    }

    // Загрузка баланса
    loadBalance() {
        const savedBalance = localStorage.getItem('casino_balance');
        this.balance = savedBalance ? parseFloat(savedBalance) : 1000; // Начальный баланс 1000р
        
        // Обновляем баланс на всех страницах
        this.updateBalanceDisplay();
        return this.balance;
    }

    // Загрузка бонусов
    loadBonuses() {
        const savedBonuses = localStorage.getItem('casino_bonuses');
        this.bonuses = savedBonuses ? JSON.parse(savedBonuses) : [];
    }

    // Загрузка истории игр
    loadGameHistory() {
        const savedHistory = localStorage.getItem('casino_game_history');
        this.gameHistory = savedHistory ? JSON.parse(savedHistory) : [];
    }

    // Сохранение данных
    saveUser() {
        localStorage.setItem('casino_user', JSON.stringify(this.user));
    }

    saveBalance() {
        localStorage.setItem('casino_balance', this.balance.toString());
        this.updateBalanceDisplay();
    }

    saveBonuses() {
        localStorage.setItem('casino_bonuses', JSON.stringify(this.bonuses));
    }

    saveGameHistory() {
        localStorage.setItem('casino_game_history', JSON.stringify(this.gameHistory));
    }

    // Обновление отображения баланса
    updateBalanceDisplay() {
        // Обновляем на всех страницах где есть элемент с классом .balance
        const balanceElements = document.querySelectorAll('.balance, .user-balance, #balance');
        balanceElements.forEach(element => {
            element.textContent = `${this.balance.toFixed(2)} ₽`;
        });
        
        // Также обновляем в профиле если есть
        const profileBalance = document.getElementById('profileBalance');
        if (profileBalance) {
            profileBalance.textContent = `${this.balance.toFixed(2)} ₽`;
        }
    }

    // Проверка баланса для ставки
    canPlaceBet(betAmount) {
        return this.balance >= betAmount;
    }

    // Списание ставки (вызывается ПЕРЕД игрой)
    placeBet(betAmount) {
        if (!this.canPlaceBet(betAmount)) {
            throw new Error('Недостаточно средств');
        }
        
        this.balance -= betAmount;
        this.user.totalWagered += betAmount;
        this.saveBalance();
        this.saveUser();
        
        return betAmount;
    }

    // Добавление выигрыша (вызывается ПОСЛЕ выигрыша)
    addWinnings(amount) {
        this.balance += amount;
        this.user.totalProfit += amount;
        this.user.totalWins += 1;
        this.saveBalance();
        this.saveUser();
        
        return amount;
    }

    // Обработка проигрыша (ставка уже списана, просто обновляем статистику)
    processLoss() {
        this.user.totalLosses += 1;
        this.saveUser();
    }

    // Добавление бонуса
    addBonus(amount, type = 'deposit') {
        this.balance += amount;
        
        const bonus = {
            id: Date.now(),
            amount: amount,
            type: type,
            date: new Date().toISOString(),
            status: 'active'
        };
        
        this.bonuses.push(bonus);
        this.saveBalance();
        this.saveBonuses();
        
        // Добавляем в историю
        this.addToHistory('bonus', `Бонус: +${amount} ₽`, amount);
        
        return bonus;
    }

    // Добавление записи в историю
    addToHistory(gameType, description, amount, result = null) {
        const historyEntry = {
            id: Date.now(),
            gameType: gameType,
            description: description,
            amount: amount,
            result: result,
            balanceAfter: this.balance,
            timestamp: new Date().toISOString()
        };
        
        this.gameHistory.unshift(historyEntry); // Добавляем в начало
        if (this.gameHistory.length > 100) {
            this.gameHistory = this.gameHistory.slice(0, 100); // Ограничиваем историю
        }
        
        this.saveGameHistory();
        
        // Обновляем счетчик игр пользователя
        if (gameType !== 'bonus' && gameType !== 'withdrawal') {
            this.user.totalGames += 1;
            this.saveUser();
        }
        
        return historyEntry;
    }

    // Получение статистики
    getStats() {
        return {
            balance: this.balance,
            totalGames: this.user.totalGames,
            totalWins: this.user.totalWins,
            totalLosses: this.user.totalLosses,
            winRate: this.user.totalGames > 0 ? (this.user.totalWins / this.user.totalGames * 100).toFixed(1) : 0,
            totalWagered: this.user.totalWagered,
            totalProfit: this.user.totalProfit,
            averageBet: this.user.totalGames > 0 ? (this.user.totalWagered / this.user.totalGames).toFixed(2) : 0
        };
    }

    // Получение истории
    getGameHistory(limit = 50) {
        return this.gameHistory.slice(0, limit);
    }

    // Получение бонусов
    getBonuses() {
        return this.bonuses;
    }

    // Настройка слушателей событий
    setupEventListeners() {
        // Обновляем баланс при изменении localStorage из других вкладок
        window.addEventListener('storage', (event) => {
            if (event.key === 'casino_balance') {
                this.balance = parseFloat(event.newValue) || 0;
                this.updateBalanceDisplay();
            }
        });
    }
}

// Создаем глобальный экземпляр
window.casinoState = new CasinoState();

// Вспомогательные функции для игр
window.casinoUtils = {
    // Форматирование числа
    formatNumber(num) {
        return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$& ');
    },
    
    // Анимация изменения баланса
    animateBalanceChange(oldBalance, newBalance, element) {
        if (!element) return;
        
        const diff = newBalance - oldBalance;
        const duration = 1000;
        const steps = 20;
        const stepTime = duration / steps;
        const increment = diff / steps;
        
        let current = oldBalance;
        let step = 0;
        
        const timer = setInterval(() => {
            step++;
            current += increment;
            
            if (step >= steps) {
                current = newBalance;
                clearInterval(timer);
            }
            
            element.textContent = `${current.toFixed(2)} ₽`;
        }, stepTime);
    },
    
    // Получение параметров из URL
    getUrlParams() {
        const params = {};
        window.location.search.substring(1).split("&").forEach(pair => {
            const [key, value] = pair.split("=");
            if (key) params[key] = decodeURIComponent(value);
        });
        return params;
    }
};
