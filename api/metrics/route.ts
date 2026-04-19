import { NextResponse } from 'next/server';
import { getSignalStats, db } from '@/server/db';

export async function GET() {
    try {
        const stats = getSignalStats.all();
        const overview = db.prepare(`SELECT 
            COUNT(*) as total, 
            SUM(case when ai_pass = 1 then 1 else 0 end) as aiPass,
            SUM(case when final_result = 'WIN_TP1' OR final_result = 'WIN_TP2' then 1 else 0 end) as wins
        FROM signals`).get() as any;

        return NextResponse.json({ stats, overview });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
