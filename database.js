// ==================== database.js ====================
// База данных пользователей

window.database = {
  // Пример пользователя (для теста)
  "demo": {
    username: "demo",
    balance: 1000,
    totalWagered: 0,
    totalWon: 0,
    gamesPlayed: 0,
    lastBonusDate: null,
    gameHistory: [],
    paymentRequests: []
  }
};

// Функция для сохранения базы в localStorage
window.saveDatabase = function() {
  try {
    localStorage.setItem('wenryCasinoDB', JSON.stringify(window.database));
    console.log('База данных сохранена');
  } catch (e) {
    console.error('Ошибка сохранения базы данных:', e);
  }
};

// Функция для загрузки базы из localStorage
window.loadDatabase = function() {
  try {
    const saved = localStorage.getItem('wenryCasinoDB');
    if (saved) {
      window.database = JSON.parse(saved);
      console.log('База данных загружена');
    }
  } catch (e) {
    console.error('Ошибка загрузки базы данных:', e);
  }
};

// Функция для создания нового пользователя
window.createUser = function(username) {
  const userId = 'user_' + Date.now();
  
  window.database[userId] = {
    username: username,
    balance: 100, // Стартовый баланс
    totalWagered: 0,
    totalWon: 0,
    gamesPlayed: 0,
    lastBonusDate: null,
    gameHistory: [],
    paymentRequests: []
  };
  
  saveDatabase();
  return userId;
};

// Функция для создания заявки на выплату
window.createWithdrawalRequest = function(userId, amount, wallet) {
  if (!window.database[userId]) return null;
  
  const request = {
    id: Date.now(),
    userId: userId,
    username: window.database[userId].username,
    amount: amount,
    wallet: wallet,
    status: 'pending',
    date: new Date().toLocaleString('ru-RU')
  };
  
  // Добавляем заявку в историю пользователя
  if (!window.database[userId].paymentRequests) {
    window.database[userId].paymentRequests = [];
  }
  window.database[userId].paymentRequests.push(request);
  
  // Также добавляем в общий список заявок (для админа)
  if (!window.database._withdrawalRequests) {
    window.database._withdrawalRequests = [];
  }
  window.database._withdrawalRequests.push(request);
  
  saveDatabase();
  return request;
};

// Функция для создания заявки на пополнение
window.createDepositRequest = function(userId, amount) {
  if (!window.database[userId]) return null;
  
  const request = {
    id: Date.now(),
    userId: userId,
    username: window.database[userId].username,
    amount: amount,
    status: 'pending',
    date: new Date().toLocaleString('ru-RU')
  };
  
  if (!window.database._depositRequests) {
    window.database._depositRequests = [];
  }
  window.database._depositRequests.push(request);
  
  saveDatabase();
  return request;
};

// Функция для обновления статуса заявки
window.updateRequestStatus = function(requestId, newStatus, requestType = 'withdrawal') {
  const requestsKey = requestType === 'withdrawal' ? '_withdrawalRequests' : '_depositRequests';
  const userRequestsKey = 'paymentRequests';
  
  if (!window.database[requestsKey]) return false;
  
  // Ищем заявку в общем списке
  const requestIndex = window.database[requestsKey].findIndex(req => req.id === requestId);
  if (requestIndex === -1) return false;
  
  // Обновляем статус в общем списке
  window.database[requestsKey][requestIndex].status = newStatus;
  window.database[requestsKey][requestIndex].processedDate = new Date().toLocaleString('ru-RU');
  
  // Обновляем статус в истории пользователя
  const userId = window.database[requestsKey][requestIndex].userId;
  if (window.database[userId] && window.database[userId][userRequestsKey]) {
    const userRequestIndex = window.database[userId][userRequestsKey].findIndex(req => req.id === requestId);
    if (userRequestIndex !== -1) {
      window.database[userId][userRequestsKey][userRequestIndex].status = newStatus;
      window.database[userId][userRequestsKey][userRequestIndex].processedDate = new Date().toLocaleString('ru-RU');
      
      // Если заявка на пополнение подтверждена, пополняем баланс
      if (requestType === 'deposit' && newStatus === 'approved' && window.user && window.user.id === userId) {
        const amount = window.database[userId][userRequestsKey][userRequestIndex].amount;
        window.updateBalance(amount, 'Пополнение баланса');
      }
      
      // Если заявка на вывод подтверждена, списываем средства
      if (requestType === 'withdrawal' && newStatus === 'approved' && window.user && window.user.id === userId) {
        const amount = window.database[userId][userRequestsKey][userRequestIndex].amount;
        window.updateBalance(-amount, 'Вывод средств');
      }
    }
  }
  
  saveDatabase();
  return true;
};

// Загружаем базу при инициализации
loadDatabase();
