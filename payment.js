// payment.js - Система оплаты USDT
window.Payment = {
    currentDepositId: null,
    
    // Создать заявку на пополнение
    async createDepositRequest(amountUSDT) {
        console.log('💎 Создание заявки на', amountUSDT, 'USDT');
        
        try {
            const user = window.Database.getUserData();
            if (!user) {
                this.showAlert('Пользователь не авторизован', 'error');
                return null;
            }
            
            const supabase = window.Database.getSupabaseClient();
            
            // 1. Получаем активный кошелек
            const { data: wallets, error: walletError } = await supabase
                .from('payment_wallets')
                .select('wallet_address')
                .eq('is_active', true)
                .eq('network', 'TRC20')
                .eq('currency', 'USDT')
                .limit(1);
            
            if (walletError || !wallets || wallets.length === 0) {
                console.error('❌ Нет активных кошельков:', walletError);
                this.showAlert('Ошибка: нет доступных кошельков для оплаты', 'error');
                return null;
            }
            
            const depositWallet = wallets[0].wallet_address;
            
            // 2. Создаем заявку в БД
            const amountRUB = amountUSDT * 100;
            const { data: deposit, error: depositError } = await supabase
                .from('deposit_requests')
                .insert([{
                    user_id: user.id,
                    amount: amountUSDT,
                    amount_rub: amountRUB,
                    wallet_address: depositWallet,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (depositError) {
                console.error('❌ Ошибка создания заявки:', depositError);
                this.showAlert('Ошибка создания заявки', 'error');
                return null;
            }
            
            this.currentDepositId = deposit.id;
            
            // 3. Показываем инструкции
            this.showDepositInfo(depositWallet, amountUSDT, deposit.id);
            
            return deposit;
            
        } catch (error) {
            console.error('🔥 Критическая ошибка:', error);
            this.showAlert('Произошла ошибка при создании заявки', 'error');
            return null;
        }
    },
    
    // Показать информацию для оплаты
    showDepositInfo(wallet, amount, depositId) {
        const amountRUB = amount * 100;
        
        const modalHTML = `
            <div id="paymentInfoModal" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.95); display: flex; justify-content: center;
                align-items: center; z-index: 9999; padding: 20px;
            ">
                <div style="
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    padding: 25px; border-radius: 20px; max-width: 90%;
                    width: 400px; border: 2px solid #00d4ff;
                    box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
                ">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 40px;">💎</div>
                        <h2 style="color: #00d4ff; margin: 10px 0;">ОПЛАТА USDT</h2>
                        <div style="color: #aaa;">TRC20 (Tron Network)</div>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #aaa;">Сумма:</span>
                            <span style="color: white; font-weight: bold;">${amount} USDT</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #aaa;">В рублях:</span>
                            <span style="color: #00ff88; font-weight: bold;">${amountRUB.toFixed(2)} ₽</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #aaa;">ID заявки:</span>
                            <span style="color: #ffcc00; font-size: 12px;">${depositId}</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div style="color: #aaa; margin-bottom: 10px; font-size: 14px;">
                            Отправьте точную сумму на кошелек:
                        </div>
                        <div style="
                            background: rgba(0,212,255,0.1); padding: 15px; border-radius: 10px;
                            border: 1px solid rgba(0,212,255,0.3); margin-bottom: 15px;
                        ">
                            <code style="
                                color: #00ff88; font-size: 14px; word-break: break-all;
                                display: block; text-align: center; font-family: monospace;
                            ">${wallet}</code>
                        </div>
                        <button onclick="Payment.copyToClipboard('${wallet}')" style="
                            width: 100%; background: #00d4ff; color: #000;
                            border: none; padding: 12px; border-radius: 10px;
                            font-weight: bold; cursor: pointer; margin-bottom: 10px;
                        ">
                            📋 СКОПИРОВАТЬ КОШЕЛЕК
                        </button>
                    </div>
                    
                    <div style="
                        background: rgba(255, 193, 7, 0.1); padding: 15px;
                        border-radius: 10px; border: 1px solid rgba(255, 193, 7, 0.3);
                        margin-bottom: 20px;
                    ">
                        <div style="color: #ffcc00; font-weight: bold; margin-bottom: 5px;">
                            ⚠️ ВАЖНАЯ ИНФОРМАЦИЯ
                        </div>
                        <div style="color: #aaa; font-size: 12px; line-height: 1.4;">
                            1. Отправляйте ТОЧНО ${amount} USDT<br>
                            2. Только сеть TRC20 (Tron)<br>
                            3. Сохраните TX Hash (обязательно)<br>
                            4. Зачисление: 5-15 минут после подтверждения<br>
                            5. При проблемах - свяжитесь с поддержкой
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button onclick="Payment.confirmPayment()" style="
                            flex: 2; background: linear-gradient(90deg, #00b09b, #96c93d);
                            color: white; border: none; padding: 15px;
                            border-radius: 10px; cursor: pointer; font-weight: bold;
                            font-size: 16px;
                        ">
                            ✅ Я ОПЛАТИЛ
                        </button>
                        <button onclick="Payment.closePaymentModal()" style="
                            flex: 1; background: rgba(255, 85, 85, 0.2);
                            color: #ff5555; border: 2px solid #ff5555;
                            padding: 15px; border-radius: 10px; cursor: pointer;
                            font-weight: bold;
                        ">
                            ❌ Отмена
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    // Копировать в буфер обмена
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showAlert('Кошелек скопирован!', 'success');
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            this.showAlert('Ошибка копирования', 'error');
        });
    },
    
    // Подтвердить оплату
    async confirmPayment() {
        if (!this.currentDepositId) {
            this.showAlert('Ошибка: ID заявки не найден', 'error');
            return;
        }
        
        const txHash = prompt('📝 Введите TX Hash транзакции (обязательно):\n\nВы можете найти его в истории переводов вашего крипто-кошелька.', '');
        
        if (!txHash || txHash.trim() === '') {
            this.showAlert('TX Hash обязателен для подтверждения оплаты', 'error');
            return;
        }
        
        try {
            const supabase = window.Database.getSupabaseClient();
            
            // Обновляем заявку с хэшем
            const { error } = await supabase
                .from('deposit_requests')
                .update({
                    tx_hash: txHash.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentDepositId);
            
            if (error) {
                console.error('❌ Ошибка обновления:', error);
                this.showAlert('Ошибка при отправке заявки', 'error');
                return;
            }
            
            this.closePaymentModal();
            this.showAlert('✅ Заявка отправлена на проверку!\n\nАдминистратор получил уведомление. Зачисление обычно занимает 5-15 минут после подтверждения.', 'success');
            
            // Автоматическая проверка статуса
            this.startStatusChecker(this.currentDepositId);
            
        } catch (error) {
            console.error('🔥 Ошибка:', error);
            this.showAlert('Произошла ошибка', 'error');
        }
    },
    
    // Автоматическая проверка статуса депозита
    async startStatusChecker(depositId) {
        const checkInterval = setInterval(async () => {
            try {
                const supabase = window.Database.getSupabaseClient();
                const { data: deposit, error } = await supabase
                    .from('deposit_requests')
                    .select('status, amount')
                    .eq('id', depositId)
                    .single();
                
                if (!error && deposit) {
                    if (deposit.status === 'completed') {
                        clearInterval(checkInterval);
                        this.showAlert(`✅ Депозит ${deposit.amount} USDT подтвержден! Баланс пополнен.`, 'success');
                        if (window.App && window.App.updateBalance) {
                            window.App.updateBalance();
                        }
                    } else if (deposit.status === 'rejected') {
                        clearInterval(checkInterval);
                        this.showAlert('❌ Депозит отклонен администратором. Свяжитесь с поддержкой.', 'error');
                    }
                }
            } catch (error) {
                console.error('Ошибка проверки статуса:', error);
            }
        }, 30000);
        
        // Остановить проверку через 10 минут
        setTimeout(() => clearInterval(checkInterval), 600000);
    },
    
    // Закрыть модальное окно
    closePaymentModal() {
        const modal = document.getElementById('paymentInfoModal');
        if (modal) modal.remove();
        this.currentDepositId = null;
    },
    
    // Показать уведомление
    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            background: ${type === 'error' ? '#ff5555' : 
                        type === 'warning' ? '#ffcc00' : '#00b894'};
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(alertDiv);
            }, 300);
        }, 5000);
    }
};

// Добавляем CSS для анимации
const style = document.createElement('style');
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
