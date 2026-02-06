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
            
            const { data: deposit, error } = await supabase
                .from('deposit_requests')
                .insert([{
                    user_id: userId,
                    amount: parseFloat(amountUsdt),
                    amount_rub: parseInt(amountRub),
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
                return { success: false, error: error.message };
            }
            
            return { success: true, deposit: deposit };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
