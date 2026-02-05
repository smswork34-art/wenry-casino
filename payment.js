// payment.js - Система оплаты USDT TRC20
let currentDepositId = null;

// Создать заявку на пополнение
async function createDepositRequest(amount) {
    if (!window.Database.getUserData()) {
        await window.Database.initSupabase();
    }
    
    const user = window.Database.getUserData();
    
    try {
        // Получаем активный кошелек из таблицы payment_wallets
        const { data: wallets, error: walletError } = await supabaseClient
            .from('payment_wallets')
            .select('*')
            .eq('is_active', true)
            .eq('network', 'TRC20')
            .eq('currency', 'USDT')
            .limit(1);
        
        if (walletError || !wallets || wallets.length === 0) {
            showAlert('Ошибка: нет доступных кошельков для оплаты');
            return null;
        }
        
        const depositWallet = wallets[0].wallet_address;
        
        // Создаем заявку в deposit_requests
        const { data: deposit, error: depositError } = await supabaseClient
            .from('deposit_requests')
            .insert([
                {
                    user_id: user.id,
                    amount: amount,
                    wallet_address: depositWallet,
                    status: 'pending',
                    admin_note: `USDT TRC20 payment to ${depositWallet}`
                }
            ])
            .select()
            .single();
        
        if (depositError) {
            console.error('Ошибка создания заявки:', depositError);
            showAlert('Ошибка создания заявки');
            return null;
        }
        
        currentDepositId = deposit.id;
        
        // Показываем информацию для оплаты
        showDepositInfo(depositWallet, amount, deposit.id);
        
        // Отправляем уведомление админу (симуляция)
        sendAdminNotification(user, amount, depositWallet, deposit.id);
        
        return deposit;
        
    } catch (error) {
        console.error('Ошибка в createDepositRequest:', error);
        showAlert('Произошла ошибка');
        return null;
    }
}

// Показать информацию для оплаты
function showDepositInfo(wallet, amount, depositId) {
    const modalHTML = `
        <div id="depositModal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; justify-content: center;
            align-items: center; z-index: 1000;
        ">
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                padding: 25px; border-radius: 15px; max-width: 90%;
                width: 400px; border: 2px solid #00d4ff;
                box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
            ">
                <h3 style="color: #00d4ff; margin-top: 0; text-align: center;">
                    💎 Пополнение USDT
                </h3>
                
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin: 15px 0;">
                    <p style="color: #fff; margin: 5px 0;">
                        <strong>Сумма:</strong> ${amount} USDT (TRC20)
                    </p>
                    <p style="color: #fff; margin: 5px 0;">
                        <strong>Кошелек для оплаты:</strong>
                    </p>
                    <div style="background: rgba(0,212,255,0.1); padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <code style="color: #00ff88; font-size: 14px; word-break: break-all;">
                            ${wallet}
                        </code>
                        <button onclick="copyToClipboard('${wallet}')" style="
                            background: #00d4ff; color: #000; border: none;
                            padding: 5px 10px; border-radius: 5px; margin-left: 10px;
                            cursor: pointer; font-weight: bold;
                        ">
                            Копировать
                        </button>
                    </div>
                    <p style="color: #ffcc00; font-size: 12px; margin-top: 10px;">
                        ⚠️ Отправляйте ТОЧНУЮ сумму ${amount} USDT<br>
                        ⚠️ Сеть: TRC20 (Tron)<br>
                        ⚠️ ID заявки: ${depositId}
                    </p>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="confirmPayment()" style="
                        flex: 1; background: linear-gradient(90deg, #00b09b, #96c93d);
                        color: white; border: none; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                        font-size: 16px;
                    ">
                        ✅ Я оплатил
                    </button>
                    <button onclick="closeDepositModal()" style="
                        flex: 1; background: linear-gradient(90deg, #ff416c, #ff4b2b);
                        color: white; border: none; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                    ">
                        ❌ Отмена
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Копировать в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('Кошелек скопирован!', 'success');
    });
}

// Подтвердить оплату
async function confirmPayment() {
    if (!currentDepositId) {
        showAlert('Ошибка: ID заявки не найден');
        return;
    }
    
    // Показываем окно для ввода хэша транзакции
    const txHash = prompt('Введите TX Hash транзакции (обязательно):');
    if (!txHash || txHash.trim() === '') {
        showAlert('TX Hash обязателен для подтверждения');
        return;
    }
    
    // Обновляем заявку с хэшем
    const { error } = await supabaseClient
        .from('deposit_requests')
        .update({
            tx_hash: txHash,
            updated_at: new Date().toISOString(),
            admin_note: 'Ожидает подтверждения админом'
        })
        .eq('id', currentDepositId);
    
    if (error) {
        console.error('Ошибка обновления:', error);
        showAlert('Ошибка при отправке заявки');
        return;
    }
    
    closeDepositModal();
    showAlert('✅ Заявка отправлена! Ожидайте подтверждения администратора.', 'success');
    
    // Обновляем историю транзакций
    if (window.location.pathname.includes('history.html')) {
        loadTransactionHistory();
    }
}

// Закрыть модальное окно
function closeDepositModal() {
    const modal = document.getElementById('depositModal');
    if (modal) modal.remove();
    currentDepositId = null;
}

// Отправить уведомление админу (симуляция через Telegram Bot API)
async function sendAdminNotification(user, amount, wallet, depositId) {
    // В реальном проекте здесь будет вызов Telegram Bot API
    console.log(`📨 Уведомление админу:
    Пользователь: ${user.username} (ID: ${user.id})
    Сумма: ${amount} USDT
    Кошелек: ${wallet}
    ID заявки: ${depositId}
    Ссылка на подтверждение: telegram.me/youbot?start=deposit_${depositId}
    `);
    
    // Для реального бота нужно использовать:
    // fetch(`https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage`, {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({
    //         chat_id: ADMIN_CHAT_ID,
    //         text: `Новая заявка на пополнение!`,
    //         reply_markup: {
    //             inline_keyboard: [[
    //                 {text: '✅ Принять', callback_data: `accept_${depositId}`},
    //                 {text: '❌ Отклонить', callback_data: `reject_${depositId}`}
    //             ]]
    //         }
    //     })
    // });
}

// Проверить статус депозитов
async function checkDepositStatus() {
    const user = window.Database.getUserData();
    if (!user) return;
    
    const { data: deposits, error } = await supabaseClient
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('tx_hash', null)
        .order('created_at', { ascending: false });
    
    if (error || !deposts) return;
    
    // Если есть завершенные депозиты без уведомления
    deposits.forEach(deposit => {
        showAlert(`✅ Ваш депозит ${deposit.amount} USDT подтвержден!`, 'success');
        
        // Помечаем как уведомленный
        supabaseClient
            .from('deposit_requests')
            .update({ admin_note: 'Уведомление отправлено' })
            .eq('id', deposit.id);
    });
}

// Вспомогательная функция для алертов
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        padding: 15px 25px; border-radius: 10px; z-index: 9999;
        background: ${type === 'success' ? '#00b894' : type === 'error' ? '#ff7675' : '#0984e3'};
        color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
    
    // Добавляем стили анимации
    if (!document.querySelector('#alertStyles')) {
        const style = document.createElement('style');
        style.id = 'alertStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Экспортируем функции
window.Payment = {
    createDepositRequest,
    checkDepositStatus,
    showAlert
};
