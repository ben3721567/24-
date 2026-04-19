import { NextResponse } from 'next/server';
import { getAllConfigs, setConfig } from '@/server/db';

export async function GET() {
    try {
        const configsRaw = getAllConfigs.all() as {key: string, value: string}[];
        const configs = configsRaw.reduce((acc, curr) => ({...acc, [curr.key]: curr.value}), {});
        return NextResponse.json(configs);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        for (const [k, v] of Object.entries(body)) {
             setConfig.run(k, String(v));
        }
        return NextResponse.json({ success: true });
    } catch (e) {
         return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
