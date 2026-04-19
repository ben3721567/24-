import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { getConfig, log } from '../db';
import { StrategySnapshot } from './strategy';

export interface AIResult {
  should_trade: boolean;
  score: number;
  risk_level: string;
  confidence: string;
  reason: string;
  warnings: string[];
}

const defaultAIResult: AIResult = {
  should_trade: true,
  score: 80,
  risk_level: 'medium',
  confidence: 'high',
  reason: 'Fallback response due to API failure',
  warnings: []
};

async function callOpenAI(apiUrl: string | undefined, apiKey: string | undefined, model: string, prompt: string): Promise<AIResult> {
  if (!apiKey) throw new Error('API Key is missing');
  
  const client = new OpenAI({ baseURL: apiUrl, apiKey: apiKey });
  const completion = await client.chat.completions.create({
    messages: [{ role: 'system', content: 'You are an advanced crypto trading AI. Evaluate the given strategy signal and output ONLY valid JSON matching the requested schema.' }, { role: 'user', content: prompt }],
    model: model,
    response_format: { type: "json_object" },
  });

  const responseJson = completion.choices[0].message.content;
  return JSON.parse(responseJson || '{}') as AIResult;
}

async function callGemini(apiKey: string | undefined, prompt: string): Promise<AIResult> {
  if (!apiKey) throw new Error('Gemini API Key is missing');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
        role: "user",
        parts: [{ text: "You are an advanced crypto trading AI. Evaluate the given strategy signal and output ONLY valid JSON matching the requested schema.\n\n" + prompt }]
    }],
    config: {
        responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || '{}') as AIResult;
}

export async function evaluateWithAI(snapshot: StrategySnapshot): Promise<{ pass: boolean, score: number, reason: string, provider: string }> {
  try {
    const getConfigVal = (key: string) => (getConfig.get(key) as any)?.value as string;
    const aiProvider = getConfigVal('aiProvider') || 'gpt';
    const aiThreshold = parseInt(getConfigVal('aiThreshold') || '70');
    
    const prompt = `
Please evaluate this crypto trading signal:
Symbol: ${snapshot.symbol}
Direction: ${snapshot.direction}
Signal Type: ${snapshot.signalType}
Current Price: ${snapshot.currentPrice}
Entry: ${snapshot.entry}
Stop: ${snapshot.stop}
TP1: ${snapshot.tp1}
TP2: ${snapshot.tp2}
15m Filter Status: ${snapshot.filter15m}
Context: ${JSON.stringify(snapshot.context)}

Output format (JSON):
{
  "should_trade": true,
  "score": 82,
  "risk_level": "medium",
  "confidence": "high",
  "reason": "Clear explanation",
  "warnings": ["Warning 1"]
}`;

    let result1: AIResult | null = null;
    let result2: AIResult | null = null;
    let providerName = aiProvider;

    if (aiProvider === 'gpt' || aiProvider === 'both') {
      try {
        result1 = await callOpenAI(undefined, process.env.OPENAI_API_KEY, 'gpt-4o', prompt);
      } catch (e: any) {
        log('WARN', `GPT API Error: ${e?.message?.includes('401') ? 'API Key is invalid or depleted. Please check your OPENAI_API_KEY.' : e.message}`);
        result1 = defaultAIResult;
      }
    }
    
    if (aiProvider === 'deepseek' || aiProvider === 'both') {
      try {
        result2 = await callOpenAI('https://api.deepseek.com', process.env.DEEPSEEK_API_KEY, 'deepseek-chat', prompt);
      } catch (e: any) {
        log('WARN', `DeepSeek API Error: ${e?.message?.includes('401') ? 'API Key is invalid or depleted. Please check your DEEPSEEK_API_KEY.' : e.message}`);
        result2 = defaultAIResult;
      }
    }
    
    if (aiProvider === 'gemini') {
        try {
            result1 = await callGemini(process.env.GEMINI_API_KEY, prompt);
        } catch(e) {
            log('WARN', `Gemini failed: ${e}`);
            result1 = defaultAIResult;
        }
    }

    let finalScore = 0;
    let finalPass = false;
    let finalReason = '';

    if (aiProvider === 'both' && result1 && result2) {
      finalScore = (result1.score + result2.score) / 2;
      finalPass = result1.should_trade && result2.should_trade && finalScore >= aiThreshold;
      finalReason = `GPT: ${result1.reason} | DeepSeek: ${result2.reason}`;
    } else {
      const res = result1 || result2 || defaultAIResult;
      finalScore = res.score;
      finalPass = res.should_trade && res.score >= aiThreshold;
      finalReason = res.reason;
    }

    return { pass: finalPass, score: finalScore, reason: finalReason, provider: providerName };

  } catch (err) {
    log('ERROR', `AI Evaluation failed: ${err}`);
    return { pass: false, score: 0, reason: 'AI Evaluation Error', provider: 'unknown' };
  }
}
