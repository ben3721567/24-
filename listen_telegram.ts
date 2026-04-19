import { setConfig } from './server/db';
import cron from 'node-cron';

const token = '8778299566:AAG8E91C7G0cKT35gaGp4bMbFwH-0_Ziw8U';

console.log('Listening for Telegram messages to capture Chat ID...');

let found = false;
const task = cron.schedule('*/5 * * * * *', async () => {
    if (found) {
        task.stop();
        return;
    }
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
        const data = await response.json();
        if (data.ok && data.result.length > 0) {
            const chatId = data.result[data.result.length - 1].message?.chat?.id;
            if (chatId) {
                setConfig.run('telegramChatId', String(chatId));
                console.log(`\n🎉 Successfully found Chat ID: ${chatId} and updated DB!`);
                found = true;
                
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '✅ 机器人已成功绑定！监控系统目前正在正常运行，等待信号触发。'
                    })
                });
                
                process.exit(0);
            }
        }
    } catch (e) {
        console.error('Error fetching Telegram updates', e);
    }
});
