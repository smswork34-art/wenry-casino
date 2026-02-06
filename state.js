// state.js - обновленная версия
const state = {
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    currentGame: null,

    setUser(user) {
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.updateUI();
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },

    updateUserData() {
        if (this.currentUser && this.currentUser.username) {
            const userData = database.getUser(this.currentUser.username);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.updateUI();
            }
        }
    },

    updateUI() {
        // Обновляем баланс во всех местах
        const balanceElements = document.querySelectorAll('.user-balance, #balance, [data-balance]');
        balanceElements.forEach(el => {
            if (this.currentUser) {
                el.textContent = `${this.currentUser.balance}₽`;
            }
        });

        // Обновляем имя пользователя
        const usernameElements = document.querySelectorAll('.username-display');
        usernameElements.forEach(el => {
            if (this.currentUser) {
                el.textContent = this.currentUser.username;
            }
        });

        // Обновляем статистику
        const totalGamesElements = document.querySelectorAll('[data-total-games]');
        totalGamesElements.forEach(el => {
            if (this.currentUser) {
                el.textContent = this.currentUser.totalGames || 0;
            }
        });

        const totalWinsElements = document.querySelectorAll('[data-total-wins]');
        totalWinsElements.forEach(el => {
            if (this.currentUser) {
                el.textContent = this.currentUser.totalWins || 0;
            }
        });
    },

    updateBalance(amount) {
        if (!this.currentUser) return false;
        
        const success = database.updateBalance(this.currentUser.username, amount);
        if (success) {
            this.updateUserData();
        }
        return success;
    },

    placeBet(gameType, betAmount, winAmount, result) {
        if (!this.currentUser) return false;
        
        if (betAmount > this.currentUser.balance) {
            alert('Недостаточно средств на балансе!');
            return false;
        }

        // Сначала списываем ставку
        const betSuccess = database.updateBalance(this.currentUser.username, -betAmount);
        if (!betSuccess) return false;
        
        // Обновляем состояние
        this.updateUserData();
        
        // Если есть выигрыш, добавляем его
        if (winAmount > 0) {
            const winSuccess = database.updateBalance(this.currentUser.username, winAmount);
            if (!winSuccess) return false;
        }
        
        // Добавляем запись в историю
        database.addGameHistory(
            this.currentUser.username,
            gameType,
            betAmount,
            winAmount,
            result
        );
        
        // Обновляем UI
        this.updateUserData();
        return true;
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    state.updateUI();
});
