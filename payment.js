// Функция для создания заявки на пополнение
function createDepositRequest(amount, wallet) {
    if (!state.isAuthenticated()) {
        alert('Пожалуйста, войдите в систему');
        return false;
    }
    
    if (amount < 10) {
        alert('Минимальная сумма пополнения: 10₽');
        return false;
    }
    
    if (amount > 100000) {
        alert('Максимальная сумма пополнения: 100,000₽');
        return false;
    }
    
    // Создаем заявку
    const request = database.createPaymentRequest(
        state.getCurrentUser().username,
        amount,
        wallet
    );
    
    alert(`Заявка на пополнение ${amount}₽ создана! Номер заявки: ${request.id}`);
    return true;
}

// Функция для создания заявки на вывод
function createWithdrawRequest(amount, wallet) {
    if (!state.isAuthenticated()) {
        alert('Пожалуйста, войдите в систему');
        return false;
    }
    
    const user = state.getCurrentUser();
    if (amount < 100) {
        alert('Минимальная сумма вывода: 100₽');
        return false;
    }
    
    if (amount > 50000) {
        alert('Максимальная сумма вывода: 50,000₽');
        return false;
    }
    
    if (amount > user.balance) {
        alert('Недостаточно средств на балансе');
        return false;
    }
    
    // Создаем заявку
    const request = database.createPaymentRequest(
        user.username,
        amount,
        wallet
    );
    
    // Резервируем средства
    database.updateUser(user.username, {
        balance: user.balance - amount,
        totalWithdrawals: (user.totalWithdrawals || 0) + amount
    });
    
    state.refreshUserData();
    state.updateBalanceDisplay();
    
    alert(`Заявка на вывод ${amount}₽ создана! Номер заявки: ${request.id}`);
    return true;
}

// Функция для обработки заявки администратором
function processPaymentRequest(requestId, action) {
    const request = database.paymentRequests.find(req => req.id === requestId);
    if (!request) {
        alert('Заявка не найдена');
        return false;
    }
    
    const user = database.getUser(request.username);
    if (!user) {
        alert('Пользователь не найден');
        return false;
    }
    
    if (action === 'approve') {
        if (request.status !== 'pending') {
            alert('Заявка уже обработана');
            return false;
        }
        
        // Для пополнения добавляем средства
        database.updateUser(request.username, {
            balance: (user.balance || 0) + request.amount,
            totalDeposits: (user.totalDeposits || 0) + request.amount
        });
        
        database.updatePaymentRequest(requestId, {
            status: 'approved',
            processedAt: new Date().toISOString()
        });
        
        alert(`Заявка ${requestId} одобрена. Баланс пользователя обновлен.`);
        
    } else if (action === 'reject') {
        if (request.status !== 'pending') {
            alert('Заявка уже обработана');
            return false;
        }
        
        // Для вывода возвращаем средства
        if (request.amount > 0) {
            database.updateUser(request.username, {
                balance: (user.balance || 0) + request.amount,
                totalWithdrawals: (user.totalWithdrawals || 0) - request.amount
            });
        }
        
        database.updatePaymentRequest(requestId, {
            status: 'rejected',
            processedAt: new Date().toISOString()
        });
        
        alert(`Заявка ${requestId} отклонена.`);
    }
    
    return true;
}

// Функция для отображения заявок в админке
function loadPaymentRequests() {
    const pendingRequests = database.getPaymentRequests('pending');
    const allRequests = database.getPaymentRequests();
    
    // Обновляем счетчик
    const pendingCount = document.getElementById('pendingCount');
    if (pendingCount) {
        pendingCount.textContent = pendingRequests.length;
    }
    
    // Загружаем таблицу заявок
    const requestsTable = document.getElementById('requestsTable');
    if (requestsTable) {
        requestsTable.innerHTML = pendingRequests.map(request => `
            <tr>
                <td>${request.id}</td>
                <td>${request.username}</td>
                <td>${request.amount}₽</td>
                <td>${request.wallet}</td>
                <td>${new Date(request.date).toLocaleString()}</td>
                <td>
                    <button onclick="processPayment(${request.id}, 'approve')" class="btn-success">Одобрить</button>
                    <button onclick="processPayment(${request.id}, 'reject')" class="btn-danger">Отклонить</button>
                </td>
            </tr>
        `).join('');
    }
    
    // Загружаем историю заявок
    const historyTable = document.getElementById('historyTable');
    if (historyTable) {
        historyTable.innerHTML = allRequests.map(request => `
            <tr class="${request.status}">
                <td>${request.id}</td>
                <td>${request.username}</td>
                <td>${request.amount}₽</td>
                <td>${request.wallet}</td>
                <td>${new Date(request.date).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${request.status}">
                        ${request.status === 'pending' ? 'В ожидании' : 
                          request.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                    </span>
                </td>
                <td>${request.processedAt ? new Date(request.processedAt).toLocaleString() : '-'}</td>
            </tr>
        `).join('');
    }
}

// Глобальные функции для использования в HTML
window.processPayment = function(requestId, action) {
    if (processPaymentRequest(requestId, action)) {
        loadPaymentRequests();
    }
};

window.createDeposit = function() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const wallet = document.getElementById('depositWallet').value.trim();
    
    if (!amount || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    if (!wallet) {
        alert('Введите номер кошелька');
        return;
    }
    
    if (createDepositRequest(amount, wallet)) {
        document.getElementById('depositAmount').value = '';
        document.getElementById('depositWallet').value = '';
    }
};

window.createWithdraw = function() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const wallet = document.getElementById('withdrawWallet').value.trim();
    
    if (!amount || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    if (!wallet) {
        alert('Введите номер кошелька');
        return;
    }
    
    if (createWithdrawRequest(amount, wallet)) {
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawWallet').value = '';
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    loadPaymentRequests();
});
