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
        
        // Восстанавливаем сессию при загрузке новой страницы
        if (this.currentUser) {
            console.log('✅ Восстановлена сессия пользователя:', this.currentUser.username);
            this.dispatchEvent('userChanged', this.currentUser);
            this.dispatchEvent('balanceUpdated', this.balance);
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
        
        console.log('👤 Пользователь установлен в глобальное состояние:', user.username);
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
            
            console.log(`💰 Баланс обновлен: ${oldBalance/100} → ${newBalance/100} ₽`);
        }
    },
    
    // Изменение баланса (пополнение/вывод/игра)
    changeBalance(amount, type) {
        const oldBalance = this.balance;
        
        if (type === 'deposit' || type === 'win' || type === 'bonus') {
            this.balance += amount;
        } else if (type === 'withdraw' || type === 'bet') {
            this.balance -= amount;
        } else {
            console.error('❌ Неизвестный тип операции:', type);
            return false;
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
        
        console.log(`💰 Баланс изменен: ${oldBalance/100} → ${this.balance/100} ₽ (${type}: ${amount/100} ₽)`);
        return true;
    },
    
    // Добавление транзакции
    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        if (this.transactions.length > 100) {
            this.transactions = this.transactions.slice(0, 100);
        }
        this.saveToLocalStorage();
        this.dispatchEvent('transactionAdded', transaction);
        
        console.log(`📝 Транзакция добавлена: ${transaction.type} ${transaction.amount/100} ₽`);
    },
    
    // Получение истории транзакций
    getTransactions(limit = 20) {
        return this.transactions.slice(0, limit);
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
            localStorage.setItem('orangewin_state_v2', JSON.stringify(state));
            
            // Также сохраняем отдельно для быстрого доступа к балансу
            localStorage.setItem('orangewin_balance', this.balance.toString());
            localStorage.setItem('orangewin_user_id', this.currentUser?.id?.toString() || '');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения состояния:', error);
        }
    },
    
    // Загрузка из LocalStorage
    loadFromLocalStorage() {
        try {
            // Загружаем полное состояние
            const saved = localStorage.getItem('orangewin_state_v2');
            if (saved) {
                const state = JSON.parse(saved);
                
                // Проверяем актуальность данных (не старше 24 часов)
                const saveTime = new Date(state.saveTime);
                const now = new Date();
                const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    this.currentUser = state.user;
                    this.balance = state.balance || 0;
                    this.transactions = state.transactions || [];
                    this.lastSync = state.lastSync;
                    console.log('✅ Состояние загружено из LocalStorage');
                } else {
                    console.log('⚠️ Данные в LocalStorage устарели (старше 24 часов)');
                    this.clear();
                }
            }
            
            // Также загружаем баланс напрямую для быстрого доступа
            const quickBalance = localStorage.getItem('orangewin_balance');
            const quickUserId = localStorage.getItem('orangewin_user_id');
            
            if (quickBalance && quickUserId) {
                if (!this.currentUser) {
                    this.currentUser = { id: parseInt(quickUserId), balance: parseInt(quickBalance) };
                }
                if (!this.balance) {
                    this.balance = parseInt(quickBalance);
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки состояния:', error);
        }
    },
    
    // Очистка состояния
    clear() {
        this.currentUser = null;
        this.balance = 0;
        this.transactions = [];
        this.lastSync = null;
        localStorage.removeItem('orangewin_state_v2');
        localStorage.removeItem('orangewin_balance');
        localStorage.removeItem('orangewin_user_id');
        this.dispatchEvent('stateCleared');
        
        console.log('🧹 Глобальное состояние очищено');
    },
    
    // Проверка авторизации
    isAuthenticated() {
        return !!this.currentUser && !!this.currentUser.id;
    },
    
    // Получение пользователя
    getUser() {
        return this.currentUser;
    },
    
    // Получение баланса (синхронно)
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
        
        // Сохраняем обработчик в LocalStorage для восстановления между страницами
        this.saveEventHandlers();
    },
    
    // Отписка от событий
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    },
    
    // Отправка события
    dispatchEvent(event, data = null) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
        
        // Также отправляем событие через window для межстраничной коммуникации
        try {
            const eventObj = new CustomEvent(`appstate:${event}`, { detail: data });
            window.dispatchEvent(eventObj);
        } catch (error) {
            console.error('Ошибка отправки CustomEvent:', error);
        }
    },
    
    // Сохранение обработчиков событий
    saveEventHandlers() {
        // Этот метод можно расширить для сохранения важных обработчиков
    },
    
    // Синхронизация с другими вкладками
    syncWithOtherTabs() {
        // Используем BroadcastChannel для синхронизации между вкладками
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('orangewin_state');
                
                channel.onmessage = (event) => {
                    if (event.data.type === 'balance_update') {
                        console.log('🔄 Получено обновление баланса из другой вкладки:', event.data.balance);
                        this.updateBalance(event.data.balance);
                    }
                };
                
                // Отправляем текущее состояние при изменении
                this.on('balanceChanged', (data) => {
                    channel.postMessage({
                        type: 'balance_update',
                        balance: this.balance,
                        timestamp: new Date().toISOString()
                    });
                });
                
            } catch (error) {
                console.error('Ошибка инициализации BroadcastChannel:', error);
            }
        }
    }
};

// Инициализируем синхронизацию между вкладками
if (window.AppState) {
    window.AppState.syncWithOtherTabs();
}

// Экспортируем глобальные функции для удобного доступа
window.getAppBalance = () => {
    return window.AppState ? window.AppState.getBalance() : 0;
};

window.updateAppBalance = (amount, type) => {
    if (window.AppState) {
        return window.AppState.changeBalance(amount, type);
    }
    return false;
};

window.getAppUser = () => {
    return window.AppState ? window.AppState.getUser() : null;
};

// Глобальный обработчик для межстраничной коммуникации
window.addEventListener('storage', (event) => {
    if (event.key === 'orangewin_balance' && window.AppState) {
        const newBalance = parseInt(event.newValue) || 0;
        const currentBalance = window.AppState.getBalance();
        
        if (newBalance !== currentBalance) {
            console.log('🔄 Обнаружено изменение баланса из другой вкладки через localStorage');
            window.AppState.updateBalance(newBalance);
        }
    }
});
