// payment.js - совместимый с твоей таблицей
window.Payment = {
    // Создание заявки на депозит
    async createDepositRequest(userId, amountUsdt, amountRub, walletAddress) {
        try {
            console.log('🔄 Создание депозита:', { 
                userId, 
                amountUsdt, 
                amountRub, 
                walletAddress: walletAddress.substring(0, 15) + '...' 
            });
            
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            // Проверяем подключение к Supabase
            const { data: testData, error: testError } = await supabase
                .from('payment_wallets')
                .select('count')
                .limit(1);
                
            if (testError) {
                console.error('❌ Ошибка подключения к Supabase:', testError);
                return { 
                    success: false, 
                    message: 'Ошибка подключения к базе данных' 
                };
            }
            
            // Создаем депозитную запись с ТОЧНЫМИ названиями колонок из твоей таблицы
            const depositData = {
                user_id: userId,
                amount: parseFloat(amountUsdt), // DECIMAL(10,2)
                amount_rub: parseInt(amountRub), // INTEGER
                wallet_address: walletAddress,
                status: 'pending',
                notified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('📝 Данные для вставки:', depositData);
            
            const { data: deposit, error } = await supabase
                .from('deposit_requests')
                .insert([depositData])
                .select()
                .single();
            
            if (error) {
                console.error('❌ Ошибка создания депозита:', error);
                
                // Если ошибка из-за кэша схемы, пробуем без amount_rub
                if (error.message.includes('amount_rub') || error.message.includes('schema cache')) {
                    console.log('🔄 Пробуем создать депозит без amount_rub...');
                    
                    // Пробуем альтернативный вариант
                    const altDepositData = {
                        user_id: userId,
                        amount: parseFloat(amountUsdt),
                        wallet_address: walletAddress,
                        status: 'pending',
                        created_at: new Date().toISOString()
                    };
                    
                    const { data: altDeposit, error: altError } = await supabase
                        .from('deposit_requests')
                        .insert([altDepositData])
                        .select()
                        .single();
                    
                    if (altError) {
                        console.error('❌ Ошибка альтернативного создания:', altError);
                        return { 
                            success: false, 
                            message: 'Ошибка создания заявки: ' + altError.message 
                        };
                    }
                    
                    console.log('✅ Депозит создан (без amount_rub):', altDeposit);
                    return { 
                        success: true, 
                        depositId: altDeposit.id,
                        wallet: walletAddress,
                        amount: amountUsdt,
                        amountRub: amountRub
                    };
                }
                
                return { 
                    success: false, 
                    message: 'Ошибка создания заявки: ' + error.message 
                };
            }
            
            console.log('✅ Депозит успешно создан:', deposit);
            
            return { 
                success: true, 
                depositId: deposit.id,
                wallet: walletAddress,
                amount: amountUsdt,
                amountRub: amountRub
            };
            
        } catch (error) {
            console.error('💥 Критическая ошибка в Payment.createDepositRequest:', error);
            return { 
                success: false, 
                message: 'Системная ошибка: ' + error.message 
            };
        }
    },
    
    // Проверка статуса депозита
    async checkDepositStatus(depositId) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: deposit, error } = await supabase
                .from('deposit_requests')
                .select('*')
                .eq('id', depositId)
                .single();
            
            if (error) {
                return { 
                    success: false, 
                    error: error.message,
                    deposit: null 
                };
            }
            
            return { 
                success: true, 
                deposit: deposit 
            };
            
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                deposit: null 
            };
        }
    },
    
    // Получение активного кошелька
    async getActiveWallet() {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: wallets, error } = await supabase
                .from('payment_wallets')
                .select('wallet_address')
                .eq('is_active', true)
                .limit(1);
            
            if (error || !wallets || wallets.length === 0) {
                console.error('Ошибка получения кошелька:', error);
                return null;
            }
            
            return wallets[0].wallet_address;
            
        } catch (error) {
            console.error('Ошибка:', error);
            return null;
        }
    },
    
    // Проверка завершенных депозитов пользователя
    async checkCompletedDeposits(userId) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: deposits, error } = await supabase
                .from('deposit_requests')
                .select('id, amount, amount_rub, status, created_at')
                .eq('user_id', userId)
                .eq('status', 'completed')
                .eq('notified', false)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) {
                console.error('Ошибка проверки депозитов:', error);
                return [];
            }
            
            return deposits || [];
            
        } catch (error) {
            console.error('Ошибка:', error);
            return [];
        }
    }
};
