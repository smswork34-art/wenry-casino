// ==================== payment.js ====================
// Логика пополнения и вывода средств

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация пользователя
  if (window.initUser) window.initUser();
  
  // Элементы для пополнения
  const depositAmountInput = document.getElementById('depositAmount');
  const depositBtn = document.getElementById('depositBtn');
  const walletInfo = document.getElementById('walletInfo');
  const confirmDepositBtn = document.getElementById('confirmDeposit');
  const depositStatus = document.getElementById('depositStatus');
  
  // Элементы для вывода
  const withdrawAmountInput = document.getElementById('withdrawAmount');
  const withdrawWalletInput = document.getElementById('withdrawWallet');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const withdrawStatus = document.getElementById('withdrawStatus');
  
  // Кошелек для пополнения
  const walletAddress = "4100117495602932"; // ЮMoney кошелек
  if (walletInfo) {
    walletInfo.textContent = walletAddress;
  }
  
  // Кнопка "Скопировать"
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(walletAddress).then(() => {
        copyBtn.textContent = 'Скопировано!';
        setTimeout(() => {
          copyBtn.textContent = 'Скопировать';
        }, 2000);
      });
    });
  }
  
  // Пополнение баланса
  if (depositBtn) {
    depositBtn.addEventListener('click', function() {
      if (!window.user || !window.user.id) {
        alert('Пожалуйста, войдите в систему');
        return;
      }
      
      const amount = parseFloat(depositAmountInput.value);
      if (isNaN(amount) || amount < 10 || amount > 50000) {
        alert('Введите сумму от 10 до 50 000 рублей');
        return;
      }
      
      // Показываем инструкцию
      depositStatus.innerHTML = `
        <div class="alert alert-info">
          <p><strong>Инструкция по пополнению:</strong></p>
          <p>1. Переведите <strong>${amount} рублей</strong> на кошелек: <strong>${walletAddress}</strong></p>
          <p>2. В комментарии к переводу укажите: <strong>${window.user.id}</strong></p>
          <p>3. После перевода нажмите кнопку "Я отправил"</p>
        </div>
      `;
      
      // Показываем кнопку подтверждения
      confirmDepositBtn.style.display = 'block';
      
      // Сохраняем сумму для подтверждения
      confirmDepositBtn.dataset.amount = amount;
    });
  }
  
  // Кнопка "Я отправил" (только теперь создает заявку)
  if (confirmDepositBtn) {
    confirmDepositBtn.addEventListener('click', function() {
      if (!window.user || !window.user.id) return;
      
      const amount = parseFloat(this.dataset.amount);
      
      // Создаем заявку на пополнение
      const request = window.createDepositRequest(window.user.id, amount);
      
      if (request) {
        depositStatus.innerHTML = `
          <div class="alert alert-success">
            <p><strong>Заявка создана!</strong></p>
            <p>ID заявки: <strong>${request.id}</strong></p>
            <p>Сумма: <strong>${amount} рублей</strong></p>
            <p>Статус: <strong>В обработке</strong></p>
            <p>Администратор проверит платеж в течение 15 минут.</p>
          </div>
        `;
        confirmDepositBtn.style.display = 'none';
      }
    });
  }
  
  // Вывод средств
  if (withdrawBtn) {
    withdrawBtn.addEventListener('click', function() {
      if (!window.user || !window.user.id) {
        alert('Пожалуйста, войдите в систему');
        return;
      }
      
      const amount = parseFloat(withdrawAmountInput.value);
      const wallet = withdrawWalletInput.value.trim();
      
      if (isNaN(amount) || amount < 100 || amount > 50000) {
        alert('Сумма вывода от 100 до 50 000 рублей');
        return;
      }
      
      if (wallet.length < 5) {
        alert('Введите корректный номер кошелька');
        return;
      }
      
      if (amount > window.user.balance) {
        alert('Недостаточно средств на балансе');
        return;
      }
      
      // Создаем заявку на вывод
      const request = window.createWithdrawalRequest(window.user.id, amount, wallet);
      
      if (request) {
        // Сразу списываем средства (резервируем)
        window.updateBalance(-amount, 'Заявка на вывод');
        
        withdrawStatus.innerHTML = `
          <div class="alert alert-success">
            <p><strong>Заявка создана!</strong></p>
            <p>ID заявки: <strong>${request.id}</strong></p>
            <p>Сумма: <strong>${amount} рублей</strong></p>
            <p>Кошелек: <strong>${wallet}</strong></p>
            <p>Статус: <strong>В обработке</strong></p>
            <p>Вывод происходит в течение 24 часов.</p>
          </div>
        `;
        
        // Очищаем поля
        withdrawAmountInput.value = '';
        withdrawWalletInput.value = '';
      }
    });
  }
  
  // Обновляем максимальную сумму вывода
  if (withdrawAmountInput) {
    withdrawAmountInput.max = window.user ? window.user.balance : 0;
    withdrawAmountInput.placeholder = `Макс: ${window.user ? window.user.balance : 0}₽`;
  }
});
