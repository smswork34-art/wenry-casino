// admin_bot.js - Telegram бот для админа
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Конфигурация
const SUPABASE_URL = 'https://okfakvtsevlyvbbfzyla.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FY7dJEwFGZxImSE_Qyad9Q_M0zQGOY0';
const BOT_TOKEN = '8546972046:AAFMR0WqJ0x_xBtosVmieypofIjHcnMtySY'; // Замени на свой
const ADMIN_CHAT_ID = 8155919358; // Твой ID в Telegram

// Инициализация
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🤖 Админ-бот запущен...');

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = `
👑 *Админ-панель казино*

Доступные команды:
/deposits - Посмотреть заявки на пополнение
/stats - Статистика
/users - Последние пользователи

Для работы с заявками используйте кнопки в уведомлениях.
    `;
    
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Команда /deposits - показать заявки
bot.onText(/\/deposits/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Получаем ожидающие заявки
        const { data: deposits, error } = await supabase
            .from('deposit_requests')
            .select(`
                *,
                users!inner(username, id)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error('Ошибка:', error);
            bot.sendMessage(chatId, '❌ Ошибка при получении заявок');
            return;
        }
        
        if (!deposits || deposits.length === 0) {
            bot.sendMessage(chatId, '📭 Нет ожидающих заявок на пополнение');
            return;
        }
        
        // Отправляем каждую заявку с кнопками
        for (const deposit of deposits) {
            const message = `
💰 *Новая заявка на пополнение*

👤 Пользователь: ${deposit.users.username || `ID: ${deposit.user_id}`}
🆔 ID пользователя: ${deposit.user_id}
💎 Сумма: *${deposit.amount} USDT*
🏦 Кошелек: \`${deposit.wallet_address}\`
📝 TX Hash: ${deposit.tx_hash || 'Не указан'}
⏰ Дата: ${new Date(deposit.created_at).toLocaleString('ru-RU')}
📋 Примечание: ${deposit.admin_note || 'Нет'}

🆔 ID заявки: \`${deposit.id}\`
            `;
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { 
                            text: '✅ Принять заявку', 
                            callback_data: `accept_${deposit.id}` 
                        }
                    ],
                    [
                        { 
                            text: '❌ Отклонить', 
                            callback_data: `reject_${deposit.id}` 
                        }
                    ]
                ]
            };
            
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        }
        
    } catch (error) {
        console.error('Ошибка в /deposits:', error);
        bot.sendMessage(chatId, '❌ Произошла ошибка');
    }
});

// Обработка callback-кнопок
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    try {
        // Принять заявку
        if (data.startsWith('accept_')) {
            const depositId = data.replace('accept_', '');
            
            // Получаем информацию о заявке
            const { data: deposit, error } = await supabase
                .from('deposit_requests')
                .select('*, users!inner(*)')
                .eq('id', depositId)
                .single();
            
            if (error || !deposit) {
                bot.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ Заявка не найдена'
                });
                return;
            }
            
            // Обновляем статус заявки
            const { error: updateError } = await supabase
                .from('deposit_requests')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString(),
                    admin_note: `Принято админом ${chatId}`
                })
                .eq('id', depositId);
            
            if (updateError) {
                throw updateError;
            }
            
            // Пополняем баланс пользователя
            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', deposit.user_id)
                .single();
            
            const newBalance = (user.balance || 0) + deposit.amount * 100; // Конвертация в рубли
            
            await supabase
                .from('users')
                .update({ 
                    balance: newBalance,
                    last_seen: new Date().toISOString()
                })
                .eq('id', deposit.user_id);
            
            // Записываем транзакцию
            await supabase
                .from('transactions')
                .insert({
                    user_id: deposit.user_id,
                    type: 'deposit',
                    amount: deposit.amount * 100,
                    status: 'completed',
                    description: `USDT пополнение #${depositId}`
                });
            
            // Отправляем уведомление пользователю (через бота)
            try {
                await bot.sendMessage(deposit.user_id, `
✅ *Ваш депозит подтвержден!*

💰 Сумма: ${deposit.amount} USDT
💳 Зачислено: ${deposit.amount * 100} ₽
🆔 ID транзакции: ${depositId}

Баланс пополнен. Удачной игры! 🎰
                `, { parse_mode: 'Markdown' });
            } catch (userError) {
                console.log('Пользователь не писал боту:', userError.message);
            }
            
            // Обновляем сообщение админу
            const updatedText = callbackQuery.message.text + 
                `\n\n---\n✅ *ПРИНЯТО админом* ${new Date().toLocaleTimeString('ru-RU')}`;
            
            bot.editMessageText(updatedText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [] }
            });
            
            bot.answerCallbackQuery(callbackQuery.id, {
                text: '✅ Заявка принята, баланс пополнен'
            });
            
            console.log(`Заявка ${depositId} принята, пользователь ${deposit.user_id}`);
        }
        
        // Отклонить заявку
        else if (data.startsWith('reject_')) {
            const depositId = data.replace('reject_', '');
            
            // Запрашиваем причину
            bot.answerCallbackQuery(callbackQuery.id);
            
            bot.sendMessage(chatId, `📝 Укажите причину отклонения заявки ${depositId}:`, {
                reply_markup: {
                    force_reply: true,
                    selective: true
                }
            }).then((sentMsg) => {
                // Слушаем ответ
                bot.onReplyToMessage(chatId, sentMsg.message_id, async (replyMsg) => {
                    const reason = replyMsg.text;
                    
                    // Обновляем заявку
                    await supabase
                        .from('deposit_requests')
                        .update({
                            status: 'rejected',
                            updated_at: new Date().toISOString(),
                            admin_note: `Отклонено админом ${chatId}: ${reason}`
                        })
                        .eq('id', depositId);
                    
                    // Получаем данные пользователя для уведомления
                    const { data: deposit } = await supabase
                        .from('deposit_requests')
                        .select('user_id, amount')
                        .eq('id', depositId)
                        .single();
                    
                    // Отправляем уведомление пользователю
                    try {
                        await bot.sendMessage(deposit.user_id, `
❌ *Ваша заявка отклонена*

💰 Сумма: ${deposit.amount} USDT
📝 Причина: ${reason}

Если вы уверены, что оплата прошла, обратитесь в поддержку.
                        `, { parse_mode: 'Markdown' });
                    } catch (userError) {
                        console.log('Пользователь не писал боту:', userError.message);
                    }
                    
                    // Обновляем сообщение админу
                    const updatedText = callbackQuery.message.text + 
                        `\n\n---\n❌ *ОТКЛОНЕНО*: ${reason}`;
                    
                    bot.editMessageText(updatedText, {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: [] }
                    });
                    
                    bot.sendMessage(chatId, `Заявка ${depositId} отклонена с причиной: ${reason}`);
                });
            });
        }
        
    } catch (error) {
        console.error('Ошибка в callback:', error);
        bot.answerCallbackQuery(callbackQuery.id, {
            text: '❌ Произошла ошибка'
        });
    }
});

// Команда /stats - статистика
bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Получаем статистику
        const [
            { count: totalUsers },
            { count: pendingDeposits },
            { data: recentDeposits },
            { data: totalDeposits }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('deposit_requests').select('amount').eq('status', 'completed').order('created_at', { ascending: false }).limit(100),
            supabase.from('deposit_requests').select('amount').eq('status', 'completed')
        ]);
        
        const totalDeposited = recentDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
        const allTimeDeposited = totalDeposits?.reduce((sum, d) => sum + d.amount, 0) || 0;
        
        const statsText = `
📊 *Статистика казино*

👥 Всего пользователей: *${totalUsers}*
💰 Ожидает заявок: *${pendingDeposits}*
💎 Пополнено (за 100 операций): *${totalDeposited.toFixed(2)} USDT*
🏦 Всего пополнено: *${allTimeDeposited.toFixed(2)} USDT*

Последние депозиты:
${recentDeposits?.slice(0, 5).map((d, i) => `${i+1}. ${d.amount} USDT`).join('\n') || 'Нет данных'}
        `;
        
        bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Ошибка в /stats:', error);
        bot.sendMessage(chatId, '❌ Ошибка при получении статистики');
    }
});

// Команда /users - последние пользователи
bot.onText(/\/users/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const { data: users } = await supabase
            .from('users')
            .select('id, username, balance, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (!users || users.length === 0) {
            bot.sendMessage(chatId, '📭 Нет пользователей');
            return;
        }
        
        const usersText = users.map(u => 
            `👤 ${u.username || `ID: ${u.id}`} | Баланс: ${u.balance} ₽ | ${new Date(u.created_at).toLocaleDateString('ru-RU')}`
        ).join('\n');
        
        bot.sendMessage(chatId, `👥 Последние пользователи:\n\n${usersText}`);
        
    } catch (error) {
        console.error('Ошибка в /users:', error);
        bot.sendMessage(chatId, '❌ Ошибка при получении пользователей');
    }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('Ошибка polling:', error);
});

console.log('✅ Бот готов к работе!');
