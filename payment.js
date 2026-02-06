// payment.js
window.Payment = {
    // Создание заявки на депозит
    async createDepositRequest(userId, amountUsdt, amountRub, walletAddress) {
        try {
            const { createClient } = window.supabase;
            const supabase = createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.key
            );
            
            console.log('Создание депозита:', { userId, amountUsdt, amountRub, walletAddress });
            
            // Используем правильные названия колонок из твоей таблицы
            const { data: deposit, error } = await supabase
                .from('deposit_requests')
                .insert([{
                    user_id: userId,
                    amount: parseFloat(amountUsdt), // amount в USDT
                    amount_rub: parseInt(amountRub), // amount_rub в рублях
                    wallet_address: walletAddress,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    notified: false
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Error creating deposit:', error);
                return { success: false, message: error.message };
            }
            
            return { 
                success: true, 
                depositId: deposit.id,
                wallet: walletAddress,
                amount: amountUsdt,
                amountRub: amountRub
            };
            
        } catch (error) {
            console.error('Payment error:', error);
            return { success: false, message: 'Системная ошибка' };
        }
    }
};
