import axios from 'axios';
import { getConfig, log } from '../db';
import { StrategySnapshot } from './strategy';

export async function sendTelegramSignal(snapshot: StrategySnapshot, aiPass: boolean, aiScore: number, aiReason: string) {
    const getConfVal = (key: string) => (getConfig.get(key) as any)?.value as string;
    const isEnabled = getConfVal('telegramEnabled') === 'true';
    if (!isEnabled) return;

    const token = getConfVal('telegramToken');
    const chatId = getConfVal('telegramChatId');

    if (!token || !chatId) {
        log('WARN', 'Telegram enabled but token/chat_id missing');
        return;
    }

    const message = `
🚨 <b>【${snapshot.direction === 'LONG' ? '🟢 做多' : '🔴 做空'} 信号触发】</b>
<b>币种</b>: ${snapshot.symbol}
<b>策略</b>: 5m执行 + 15m过滤：${snapshot.signalType}

<b>📊 入场信息</b>
<b>当前价</b>: ${snapshot.currentPrice.toFixed(4)}
<b>建议入场</b>: ${snapshot.entry.toFixed(4)}
<b>防御止损</b>: ${snapshot.stop.toFixed(4)}
<b>TP1 (1R)</b>: ${snapshot.tp1.toFixed(4)}
<b>TP2 (2R)</b>: ${snapshot.tp2.toFixed(4)}

🤖 <b>AI 评估 (${getConfVal('aiProvider')})</b>
<b>评分</b>: ${aiScore} / 100
<b>结论</b>: ${aiPass ? '✅ 值得开单' : '❌ 建议过滤'}
<b>AI 分析</b>:
${aiReason}

<i>⏱ ${new Date().toLocaleString('zh-CN')}</i>
    `;

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        log('INFO', `Telegram sent for ${snapshot.symbol}`);
    } catch (e: any) {
        if (e.response?.status === 403 || e.response?.status === 401) {
            log('ERROR', `Telegram Setup Error: The bot cannot message the user. Ensure the bot token is correct and you have started the bot via '/start' in Telegram.`);
        } else {
            log('ERROR', `Telegram send failed: ${e.message}`);
        }
    }
}
