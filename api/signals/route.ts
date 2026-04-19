import { NextResponse } from 'next/server';
import { getSignalsDesc } from '@/server/db';

export async function GET() {
    try {
        const signals = getSignalsDesc.all();
        return NextResponse.json(signals);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
