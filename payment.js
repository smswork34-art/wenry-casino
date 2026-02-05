// payment.js - Полноценная система оплаты USDT TRC20
window.Payment = {
    currentDepositId: null,
    
    // Создать заявку на пополнение
    async createDepositRequest(amountUSDT) {
        console.log('💎 Создание заявки на', amountUSDT, 'USDT');
        
        const app = window.App;
        if (!app || !app.getCurrentUser()) {
            alert('Пользователь не авторизован');
            return null;
        }
        
        const user = app.getCurrentUser();
        const supabase = app.getSupabaseClient();
        
        try {
            // 1. Получаем активный кошелек из БД
            console.log('🔍 Поиск активного кошелька USDT...');
            const { data: wallets, error: walletError } = await supabase
                .from('payment_wallets')
                .select('wallet_address')
                .eq('is_active', true)
                .eq('network', 'TRC20')
                .eq('currency', 'USDT')
                .limit(1);
            
            if (walletError || !wallets || wallets.length === 0) {
                console.error('❌ Нет активных кошельков:', walletError);
                alert('Ошибка: нет доступных кошельков для оплаты');
                return null;
            }
            
            const depositWallet = wallets[0].wallet_address;
            console.log('✅ Кошелек найден:', depositWallet);
            
            // 2. Создаем заявку в deposit_requests
            const depositData = {
                user_id: user.id,
                amount: amountUSDT,
                wallet_address: depositWallet,
                status: 'pending',
                admin_note: `USDT TRC20: ${amountUSDT} USDT`
            };
            
            console.log('📝 Создаем запись в БД:', depositData);
            const { data: deposit, error: depositError } = await supabase
                .from('deposit_requests')
                .insert([depositData])
                .select()
                .single();
            
            if (depositError) {
                console.error('❌ Ошибка создания заявки:', depositError);
                alert('Ошибка создания заявки');
                return null;
            }
            
            console.log('✅ Заявка создана ID:', deposit.id);
            this.currentDepositId = deposit.id;
            
            // 3. Показываем пользователю информацию для оплаты
            this.showDepositInfo(depositWallet, amountUSDT, deposit.id);
            
            // 4. Отправляем уведомление админу
            this.sendAdminNotification(user, amountUSDT, depositWallet, deposit.id);
            
            return deposit;
            
        } catch (error) {
            console.error('🔥 Критическая ошибка:', error);
            alert('Произошла ошибка при создании заявки');
            return null;
        }
    },
    
    // Показать информацию для оплаты
    showDepositInfo(wallet, amount, depositId) {
        const amountRUB = amount * 100; // Конвертация в рубли
        
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
                            3. Комиссия: 0%<br>
                            4. Зачисление: 5-15 минут после оплаты<br>
                            5. Не забудьте TX Hash для подтверждения
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
            alert('Кошелек скопирован в буфер обмена!');
        }).catch(err => {
            console.error('Ошибка копирования:', err);
        });
    },
    
    // Подтвердить оплату
    async confirmPayment() {
        if (!this.currentDepositId) {
            alert('Ошибка: ID заявки не найден');
            return;
        }
        
        // Запрашиваем TX Hash у пользователя
        const txHash = prompt('📝 Введите TX Hash транзакции (обязательно):\n\nВы можете найти его в истории переводов вашего крипто-кошелька.', '');
        
        if (!txHash || txHash.trim() === '') {
            alert('TX Hash обязателен для подтверждения оплаты');
            return;
        }
        
        const app = window.App;
        const supabase = app.getSupabaseClient();
        
        try {
            // Обновляем заявку с хэшем
            const { error } = await supabase
                .from('deposit_requests')
                .update({
                    tx_hash: txHash.trim(),
                    updated_at: new Date().toISOString(),
                    admin_note: 'Ожидает подтверждения админом. TX: ' + txHash.substring(0, 20) + '...'
                })
                .eq('id', this.currentDepositId);
            
            if (error) {
                console.error('❌ Ошибка обновления:', error);
                alert('Ошибка при отправке заявки');
                return;
            }
            
            this.closePaymentModal();
            alert('✅ Заявка отправлена на проверку!\n\nАдминистратор получил уведомление. Зачисление обычно занимает 5-15 минут после подтверждения.');
            
            // Обновляем баланс через 30 секунд (на случай быстрого подтверждения)
            setTimeout(() => {
                if (app && app.updateBalance) {
                    app.updateBalance();
                }
            }, 30000);
            
        } catch (error) {
            console.error('🔥 Ошибка:', error);
            alert('Произошла ошибка');
        }
    },
    
    // Закрыть модальное окно
    closePaymentModal() {
        const modal = document.getElementById('paymentInfoModal');
        if (modal) modal.remove();
        this.currentDepositId = null;
    },
    
    // Отправить уведомление админу
    async sendAdminNotification(user, amount, wallet, depositId) {
        const botToken = window.SUPABASE_CONFIG?.botToken;
        const adminId = window.SUPABASE_CONFIG?.adminId;
        
        if (!botToken || !adminId) {
            console.warn('⚠️ Не настроен бот для уведомлений');
            return;
        }
        
        try {
            const message = `
💰 *НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ*

👤 Пользователь: ${user.username || `ID: ${user.id}`}
🆔 ID пользователя: \`${user.id}\`
💎 Сумма: *${amount} USDT* (${amount * 100} ₽)
🏦 Кошелек: \`${wallet}\`
⏰ Дата: ${new Date().toLocaleString('ru-RU')}

🆔 ID заявки: \`${depositId}\`
            `;
            
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: adminId,
                    text: message,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { 
                                    text: '✅ Принять заявку', 
                                    callback_data: `accept_${depositId}` 
                                },
                                { 
                                    text: '❌ Отклонить', 
                                    callback_data: `reject_${depositId}` 
                                }
                            ]
                        ]
                    }
                })
            });
            
            const result = await response.json();
            console.log('📨 Уведомление админу отправлено:', result.ok);
            
        } catch (error) {
            console.error('Ошибка отправки уведомления:', error);
        }
    }
};
