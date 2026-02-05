// database.js - Работа с базой данных

const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://okfakvtsevlyvbbfzyla.supabase.co';
const SUPABASE_KEY = window.SUPABASE_CONFIG?.key || 'sb_publishable_FY7dJEwFGZxImSE_Qyad9Q_M0zQGOY0';

let supabaseClient = null;
let userData = null;

// Инициализация Supabase
async function initSupabase() {
    try {
        if (!window.supabase) {
            console.error('❌ Библиотека Supabase не загружена!');
            throw new Error('Supabase library not loaded');
        }
        
        const { createClient } = window.supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        console.log('✅ Supabase клиент создан');
        
        // Получаем данные пользователя из Telegram
        const tg = window.Telegram?.WebApp;
        
        if (!tg) {
            console.error('❌ Telegram WebApp не найден');
            throw new Error('Telegram WebApp not found');
        }
        
        await tg.ready();
        const tgUser = tg.initDataUnsafe?.user;
        const userId = tgUser?.id;
        
        if (!userId) {
            console.error('❌ Не удалось получить ID пользователя');
            throw new Error('Telegram user ID not found');
        }
        
        console.log('👤 Telegram пользователь:', tgUser.id);
        
        // Регистрируем/получаем пользователя
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Создаем нового пользователя
            const { data: newUser, error: createError } = await supabaseClient
                .from('users')
                .insert([{
                    id: userId,
                    username: tgUser.username || `user_${userId}`,
                    balance: 0,
                    created_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Ошибка создания пользователя:', createError);
                throw createError;
            }
            
            userData = newUser;
            console.log('✅ Новый пользователь создан');
            
        } else if (error) {
            console.error('❌ Ошибка получения пользователя:', error);
            throw error;
        } else {
            userData = data;
            console.log('✅ Пользователь загружен');
            
            // Обновляем last_seen
            await supabaseClient
                .from('users')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', userId);
        }
        
        return userData;
        
    } catch (error) {
        console.error('🔥 Ошибка в initSupabase:', error);
        throw error;
    }
}

// Получить баланс
async function getBalance() {
    try {
        if (!userData) {
            await initSupabase();
        }
        
        if (!userData) {
            console.error('❌ Пользователь не инициализирован');
            return 0;
        }
        
        // Получаем актуальный баланс из БД
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('users')
                .select('balance')
                .eq('id', userData.id)
                .single();
            
            if (!error && data) {
                userData.balance = data.balance || 0;
            }
        }
        
        return userData?.balance || 0;
        
    } catch (error) {
        console.error('❌ Ошибка получения баланса:', error);
        return 0;
    }
}

// Обновить баланс
async function updateBalance(amount) {
    try {
        if (!userData) {
            await initSupabase();
        }
        
        if (!supabaseClient || !userData) {
            console.error('❌ База данных или пользователь не инициализированы');
            return false;
        }
        
        const newBalance = (userData.balance || 0) + amount;
        
        // Обновляем в БД
        const { data, error } = await supabaseClient
            .from('users')
            .update({ 
                balance: newBalance,
                last_seen: new Date().toISOString()
            })
            .eq('id', userData.id)
            .select()
            .single();
        
        if (error) {
            console.error('❌ Ошибка обновления баланса:', error);
            return false;
        }
        
        userData = data;
        console.log(`💰 Баланс обновлен: ${amount > 0 ? '+' : ''}${amount} = ${newBalance}`);
        
        // Записываем транзакцию
        if (amount !== 0) {
            const transactionType = amount > 0 ? 'win' : 'bet';
            const transactionDesc = amount > 0 ? 'Выигрыш' : 'Ставка';
            
            await supabaseClient
                .from('transactions')
                .insert({
                    user_id: userData.id,
                    type: transactionType,
                    amount: Math.abs(amount),
                    status: 'completed',
                    description: transactionDesc,
                    created_at: new Date().toISOString()
                });
            
            console.log('📝 Транзакция записана');
        }
        
        return true;
        
    } catch (error) {
        console.error('🔥 Ошибка в updateBalance:', error);
        return false;
    }
}

// Принудительное обновление баланса из БД
async function refreshBalance() {
    try {
        if (!userData || !supabaseClient) return 0;
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('balance')
            .eq('id', userData.id)
            .single();
        
        if (error) {
            console.error('❌ Ошибка обновления баланса:', error);
            return userData?.balance || 0;
        }
        
        if (data) {
            userData.balance = data.balance || 0;
        }
        
        return userData.balance;
        
    } catch (error) {
        console.error('❌ Ошибка refreshBalance:', error);
        return userData?.balance || 0;
    }
}

// Получить историю транзакций
async function getTransactionHistory(limit = 20) {
    try {
        if (!userData) {
            await initSupabase();
        }
        
        if (!supabaseClient || !userData) {
            console.error('❌ База данных или пользователь не инициализированы');
            return [];
        }
        
        const { data, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('❌ Ошибка получения истории:', error);
            return [];
        }
        
        return data || [];
        
    } catch (error) {
        console.error('🔥 Ошибка в getTransactionHistory:', error);
        return [];
    }
}

// Получить историю депозитов
async function getDepositHistory(limit = 10) {
    try {
        if (!userData) {
            await initSupabase();
        }
        
        if (!supabaseClient || !userData) {
            console.error('❌ База данных или пользователь не инициализированы');
            return [];
        }
        
        const { data, error } = await supabaseClient
            .from('deposit_requests')
            .select('*')
            .eq('user_id', userData.id)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('❌ Ошибка получения истории депозитов:', error);
            return [];
        }
        
        return data || [];
        
    } catch (error) {
        console.error('🔥 Ошибка в getDepositHistory:', error);
        return [];
    }
}

// Проверить ожидающие депозиты
async function checkPendingDeposits() {
    try {
        if (!userData) {
            await initSupabase();
        }
        
        if (!supabaseClient || !userData) {
            console.error('❌ База данных или пользователь не инициализированы');
            return [];
        }
        
        const { data, error } = await supabaseClient
            .from('deposit_requests')
            .select('*')
            .eq('user_id', userData.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка проверки депозитов:', error);
            return [];
        }
        
        return data || [];
        
    } catch (error) {
        console.error('🔥 Ошибка в checkPendingDeposits:', error);
        return [];
    }
}

// Экспортируем функции
window.Database = {
    initSupabase,
    getBalance,
    updateBalance,
    refreshBalance,
    getTransactionHistory,
    getDepositHistory,
    checkPendingDeposits,
    getUserData: () => userData,
    getSupabaseClient: () => supabaseClient
};

console.log('✅ database.js загружен');
