// state.js - Глобальное состояние приложения
window.AppState = {
    currentUser: null,
    balance: 0,
    transactions: [],
    isAdmin: false,
    lastSync: null,
    
    // Инициализация
    init() {
        console.log('🚀 Инициализация глобального состояния ORANGEWIN...');
        this.loadFromLocalStorage();
        
        if (this.currentUser) {
            console.log('✅ Восстановлена сессия пользователя:', this.currentUser.username);
        }
    },
    
    // Установка пользователя
    setUser(user) {
        this.currentUser = user;
        this.balance = user?.balance || 0;
        this.lastSync = new Date().toISOString();
        this.saveToLocalStorage();
        this.dispatchEvent('userChanged', user);
        this.dispatchEvent('balanceUpdated', this.balance);
    },
    
    // Обновление баланса
    updateBalance(newBalance) {
        if (this.currentUser) {
            const oldBalance = this.balance;
            this.balance = newBalance;
            this.currentUser.balance = newBalance;
            this.lastSync = new Date().toISOString();
            this.saveToLocalStorage();
            this.dispatchEvent('balanceUpdated', this.balance);
            
            if (oldBalance !== newBalance) {
                this.dispatchEvent('balanceChanged', { 
                    oldBalance, 
                    newBalance, 
                    difference: newBalance - oldBalance 
                });
            }
        }
    },
    
    // Изменение баланса
    changeBalance(amount, type) {
        const oldBalance = this.balance;
        
        if (type === 'deposit' || type === 'win' || type === 'bonus') {
            this.balance += amount;
        } else if (type === 'withdraw' || type === 'bet') {
            this.balance -= amount;
        }
        
        if (this.currentUser) {
            this.currentUser.balance = this.balance;
        }
        
        this.lastSync = new Date().toISOString();
        this.saveToLocalStorage();
        
        this.dispatchEvent('balanceChanged', { 
            oldBalance, 
            newBalance: this.balance, 
            amount, 
            type 
        });
        
        return true;
    },
    
    // Сохранение в LocalStorage
    saveToLocalStorage() {
        try {
            const state = {
                user: this.currentUser,
                balance: this.balance,
                transactions: this.transactions,
                lastSync: this.lastSync,
                saveTime: new Date().toISOString()
            };
            localStorage.setItem('orangewin_state', JSON.stringify(state));
            localStorage.setItem('orangewin_balance', this.balance.toString());
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    },
    
    // Загрузка из LocalStorage
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('orangewin_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.currentUser = state.user;
                this.balance = state.balance || 0;
                this.transactions = state.transactions || [];
                this.lastSync = state.lastSync;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
        }
    },
    
    // Проверка авторизации
    isAuthenticated() {
        return !!this.currentUser && !!this.currentUser.id;
    },
    
    // Получение пользователя
    getUser() {
        return this.currentUser;
    },
    
    // Получение баланса
    getBalance() {
        return this.balance;
    },
    
    // Получение баланса в рублях
    getBalanceRub() {
        return (this.balance / 100).toFixed(2);
    },
    
    // Система событий
    listeners: {},
    
    // Подписка на события
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    
    // Отправка события
    dispatchEvent(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Ошибка в обработчике ${event}:`, error);
                }
            });
        }
    }
};
