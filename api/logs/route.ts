import { NextResponse } from 'next/server';
import { getLogs } from '@/server/db';

export async function GET() {
    try {
        const logs = getLogs.all(100);
        return NextResponse.json(logs);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
