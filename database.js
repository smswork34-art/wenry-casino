// database.js - обновленная версия
const database = {
    users: JSON.parse(localStorage.getItem('casinoUsers')) || {},
    payments: JSON.parse(localStorage.getItem('casinoPayments')) || [],
    gamesHistory: JSON.parse(localStorage.getItem('casinoGamesHistory')) || [],
    bonuses: JSON.parse(localStorage.getItem('casinoBonuses')) || {},
    adminPassword: "admin123",

    saveUsers() {
        localStorage.setItem('casinoUsers', JSON.stringify(this.users));
    },

    savePayments() {
        localStorage.setItem('casinoPayments', JSON.stringify(this.payments));
    },

    saveGamesHistory() {
        localStorage.setItem('casinoGamesHistory', JSON.stringify(this.gamesHistory));
    },

    saveBonuses() {
        localStorage.setItem('casinoBonuses', JSON.stringify(this.bonuses));
    },

    getUser(username) {
        return this.users[username];
    },

    createUser(username, password) {
        if (this.users[username]) {
            return false;
        }
        
        this.users[username] = {
            username: username,
            password: password,
            balance: 100, // начальный баланс
            totalGames: 0,
            totalWins: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            lastBonusDate: null,
            registrationDate: new Date().toISOString()
        };
        this.saveUsers();
        return true;
    },

    updateBalance(username, amount) {
        if (!this.users[username]) return false;
        
        this.users[username].balance += amount;
        this.saveUsers();
        return true;
    },

    setBalance(username, amount) {
        if (!this.users[username]) return false;
        
        this.users[username].balance = amount;
        this.saveUsers();
        return true;
    },

    addGameHistory(username, gameType, bet, win, result) {
        const gameRecord = {
            id: Date.now(),
            username: username,
            gameType: gameType,
            bet: bet,
            win: win,
            result: result,
            timestamp: new Date().toISOString(),
            balanceAfter: this.users[username]?.balance || 0
        };
        
        this.gamesHistory.push(gameRecord);
        
        // Обновляем статистику пользователя
        if (this.users[username]) {
            this.users[username].totalGames += 1;
            if (win > 0) {
                this.users[username].totalWins += 1;
            }
            this.saveUsers();
        }
        
        this.saveGamesHistory();
        return gameRecord;
    },

    getUserGames(username) {
        return this.gamesHistory
            .filter(game => game.username === username)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    addPaymentRequest(username, amount, wallet) {
        const payment = {
            id: Date.now(),
            username: username,
            amount: amount,
            wallet: wallet,
            status: 'pending',
            createdAt: new Date().toISOString(),
            type: 'deposit'
        };
        
        this.payments.push(payment);
        this.savePayments();
        return payment;
    },

    updatePaymentStatus(paymentId, status) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (payment) {
            payment.status = status;
            if (status === 'approved' && payment.type === 'deposit') {
                this.updateBalance(payment.username, payment.amount);
            }
            this.savePayments();
            return true;
        }
        return false;
    },

    getPendingPayments() {
        return this.payments.filter(p => p.status === 'pending');
    },

    canClaimBonus(username) {
        const user = this.users[username];
        if (!user || !user.lastBonusDate) return true;
        
        const lastDate = new Date(user.lastBonusDate);
        const now = new Date();
        const diffHours = (now - lastDate) / (1000 * 60 * 60);
        
        return diffHours >= 24; // Бонус раз в 24 часа
    },

    claimBonus(username) {
        const user = this.users[username];
        if (!user || !this.canClaimBonus(username)) return false;
        
        const bonusAmount = 10; // Фиксированный бонус
        user.balance += bonusAmount;
        user.lastBonusDate = new Date().toISOString();
        
        // Добавляем запись в историю бонусов
        if (!this.bonuses[username]) {
            this.bonuses[username] = [];
        }
        this.bonuses[username].push({
            amount: bonusAmount,
            date: new Date().toISOString()
        });
        
        this.saveUsers();
        this.saveBonuses();
        
        // Добавляем в историю игр как бонус
        this.addGameHistory(username, 'bonus', 0, bonusAmount, 'bonus_claimed');
        
        return true;
    },

    getBonusHistory(username) {
        return this.bonuses[username] || [];
    }
};
