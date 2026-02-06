// payment.js - обновленная версия
document.addEventListener('DOMContentLoaded', function() {
    const paymentForm = document.getElementById('payment-form');
    const walletDisplay = document.getElementById('wallet-display');
    const amountInput = document.getElementById('amount');
    const confirmPaymentBtn = document.getElementById('confirm-payment');
    
    // Кошелек для демонстрации
    const walletAddress = 'TCpVjAqB5hmLkL3W8Bq7z8X4L2Kv7RtN9F';
    
    if (walletDisplay) {
        walletDisplay.textContent = walletAddress;
        
        // Кнопка копирования
        walletDisplay.addEventListener('click', function() {
            navigator.clipboard.writeText(walletAddress).then(() => {
                alert('Кошелек скопирован!');
            });
        });
    }
    
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!state.currentUser) {
                alert('Сначала войдите в аккаунт!');
                window.location.href = 'index.html';
                return;
            }
            
            const amount = parseFloat(amountInput.value);
            if (isNaN(amount) || amount < 10 || amount > 50000) {
                alert('Введите сумму от 10 до 50,000 ₽');
                return;
            }
            
            // Показываем подтверждение
            document.getElementById('payment-details').style.display = 'none';
            document.getElementById('confirmation-step').style.display = 'block';
        });
    }
    
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', function() {
            const amount = parseFloat(amountInput.value);
            
            // Создаем заявку на пополнение
            const payment = database.addPaymentRequest(
                state.currentUser.username,
                amount,
                walletAddress
            );
            
            if (payment) {
                alert(`Заявка #${payment.id} создана! Ожидайте подтверждения в админ-панели.`);
                window.location.href = 'profile.html';
            } else {
                alert('Ошибка при создании заявки!');
            }
        });
    }
    
    // Кнопка "Назад" в процессе пополнения
    const backBtn = document.getElementById('back-to-payment');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            document.getElementById('payment-details').style.display = 'block';
            document.getElementById('confirmation-step').style.display = 'none';
        });
    }
});
