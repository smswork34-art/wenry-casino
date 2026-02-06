// database.js
window.Database = {
    // Получение баланса пользователя
    async getUserBalance(userId) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: user, error } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();
            
            if (error) {
                console.error('Error getting user balance:', error);
                return 0;
            }
            
            return user.balance || 0;
            
        } catch (error) {
            console.error('Database error:', error);
            return 0;
        }
    },
    
    // Обновление баланса
    async updateBalance(userId, amount, type) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            let newBalance;
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();
            
            if (fetchError) {
                console.error('Error fetching user:', fetchError);
                return false;
            }
            
            const currentBalance = user.balance || 0;
            
            if (type === 'deposit' || type === 'win') {
                newBalance = currentBalance + amount;
            } else if (type === 'withdraw' || type === 'bet') {
                newBalance = currentBalance - amount;
            } else {
                return false;
            }
            
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    balance: newBalance,
                    last_seen: new Date().toISOString()
                })
                .eq('id', userId);
            
            if (updateError) {
                console.error('Error updating balance:', updateError);
                return false;
            }
            
            // Создаем транзакцию
            const { error: transError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: userId,
                    type: type,
                    amount: amount,
                    status: 'completed',
                    description: this.getTransactionDescription(type, amount),
                    created_at: new Date().toISOString()
                }]);
            
            if (transError) {
                console.error('Error creating transaction:', transError);
            }
            
            return true;
            
        } catch (error) {
            console.error('Database error:', error);
            return false;
        }
    },
    
    // Получение истории транзакций
    async getTransactionHistory(userId, limit = 50) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                console.error('Error getting transactions:', error);
                return [];
            }
            
            return transactions || [];
            
        } catch (error) {
            console.error('Database error:', error);
            return [];
        }
    },
    
    // Получение активных депозитов
    async getActiveDeposits(userId) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            const { data: deposits, error } = await supabase
                .from('deposit_requests')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['pending', 'processing'])
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error getting deposits:', error);
                return [];
            }
            
            return deposits || [];
            
        } catch (error) {
            console.error('Database error:', error);
            return [];
        }
    },
    
    // Вспомогательная функция для описания транзакции
    getTransactionDescription(type, amount) {
        const descriptions = {
            'deposit': `Пополнение ${(amount/100).toFixed(2)} ₽`,
            'withdraw': `Вывод ${(amount/100).toFixed(2)} ₽`,
            'bet': `Ставка в игре ${(amount/100).toFixed(2)} ₽`,
            'win': `Выигрыш ${(amount/100).toFixed(2)} ₽`,
            'bonus': `Бонус ${(amount/100).toFixed(2)} ₽`
        };
        
        return descriptions[type] || `Транзакция ${(amount/100).toFixed(2)} ₽`;
    }
};
