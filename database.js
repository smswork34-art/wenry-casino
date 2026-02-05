// database.js
let supabaseClient = null;
let userData = null;

// Инициализация Supabase
async function initSupabase() {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Получаем данные пользователя из Telegram
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe.user?.id || tg.initDataUnsafe.user?.id;
    
    if (!userId) {
        console.error('Не удалось получить ID пользователя');
        return;
    }
    
    // Регистрируем/получаем пользователя
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error && error.code === 'PGRST116') {
        // Пользователь не найден - создаем нового
        const { data: newUser, error: createError } = await supabaseClient
            .from('users')
            .insert([
                {
                    id: userId,
                    username: tg.initDataUnsafe.user?.username || `user_${userId}`,
                    balance: 0,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();
        
        if (createError) {
            console.error('Ошибка создания пользователя:', createError);
            return;
        }
        
        userData = newUser;
        console.log('Новый пользователь создан:', userData);
    } else if (error) {
        console.error('Ошибка получения пользователя:', error);
    } else {
        userData = data;
        console.log('Пользователь найден:', userData);
    }
}

// Получить баланс
async function getBalance() {
    if (!userData) await initSupabase();
    return userData?.balance || 0;
}

// Обновить баланс (публичная функция для игр)
async function updateBalance(amount) {
    if (!supabaseClient || !userData) {
        await initSupabase();
    }
    
    const newBalance = (userData.balance || 0) + amount;
    
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
        console.error('Ошибка обновления баланса:', error);
        return false;
    }
    
    userData = data;
    
    // Обновляем транзакции
    await supabaseClient
        .from('transactions')
        .insert([
            {
                user_id: userData.id,
                type: amount > 0 ? 'win' : 'bet',
                amount: Math.abs(amount),
                status: 'completed',
                description: amount > 0 ? 'Выигрыш' : 'Ставка'
            }
        ]);
    
    return true;
}

// Сброс баланса до 0 (для тестов)
async function resetBalance() {
    if (!supabaseClient || !userData) {
        await initSupabase();
    }
    
    const { error } = await supabaseClient
        .from('users')
        .update({ 
            balance: 0,
            last_seen: new Date().toISOString()
        })
        .eq('id', userData.id);
    
    if (error) {
        console.error('Ошибка сброса баланса:', error);
        return false;
    }
    
    userData.balance = 0;
    return true;
}

// Экспортируем функции
window.Database = {
    initSupabase,
    getBalance,
    updateBalance,
    resetBalance,
    getUserData: () => userData
};
