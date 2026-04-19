import fs from 'fs';
import { setConfig } from './server/db';

async function setup() {
    if (fs.existsSync('.env.example')) {
        const envExample = fs.readFileSync('.env.example', 'utf-8');
        fs.writeFileSync('.env', envExample);
        console.log('.env updated from .env.example');
    }

    const token = '8778299566:AAG8E91C7G0cKT35gaGp4bMbFwH-0_Ziw8U';
    setConfig.run('telegramToken', token);
    setConfig.run('telegramEnabled', 'true');
    console.log('Database updated with Telegram Token.');

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            const chatId = data.result[data.result.length - 1].message?.chat?.id;
            if (chatId) {
                setConfig.run('telegramChatId', String(chatId));
                console.log(`Successfully found and updated Chat ID: ${chatId}`);
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '✅ 监控系统已连接！正在接收量化信号推送...'
                    })
                });
            } else {
                console.log('No chat ID found in the latest update.');
            }
        } else {
            console.log('No messages sent to the bot yet. Cannot determine Chat ID automatically.');
        }
    } catch (e) {
         console.error('Error fetching Telegram updates:', e);
    }
}
setup();
