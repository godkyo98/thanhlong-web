// app/api/soi/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { searchPlayerWWM, detectServer, getPlayerInfoNative, getPlayerCombatPlan } from '@/lib/neteaseApi';

// Thuật lột mặt nạ JSON của Netease
const safeParse = (val: any) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return {}; }
};

export async function POST(req: Request) {
    try {
        const { query } = await req.json();
        const token = process.env.NETEASE_TOKEN; 
        if (!token) return NextResponse.json({ error: 'Chưa cài đặt NETEASE_TOKEN' }, { status: 500 });

        const searchRes = await searchPlayerWWM(query, token);
        if (!searchRes || (!searchRes.id_nguoi_choi && !searchRes.id)) {
            return NextResponse.json({ error: 'Không tìm thấy nhân vật!' }, { status: 404 });
        }

        const pid = searchRes.id_nguoi_choi || searchRes.id;
        const hostnum = detectServer(pid, searchRes.hostnum || 10109);
        
        // 🟢 BƯỚC 1: KÉO CHỈ SỐ GỐC
        const fullDataRes: any = await getPlayerInfoNative(token, pid, hostnum);
        
        if (!fullDataRes || fullDataRes.code !== 0 || !fullDataRes.result || !fullDataRes.result[pid]) {
            return NextResponse.json({ error: 'Lỗi khi rút chỉ số chi tiết!' }, { status: 500 });
        }

        const rawData = fullDataRes.result[pid];
        
        // 🟢 BƯỚC 2: KÉO TRANG BỊ, TÂM PHÁP, KỲ THUẬT VÀ NHỒI VÀO JSON
        try {
            const combatPlanRes: any = await getPlayerCombatPlan(token, pid, hostnum);
            if (combatPlanRes && combatPlanRes.code === 0 && combatPlanRes.result) {
                // Nhồi đúng vị trí để file page.tsx gọi ra
                rawData.combat_plan_chi_tiet = combatPlanRes.result;
            }
        } catch (combatErr) {
            console.error("Lỗi khi kéo API Combat Plan:", combatErr);
        }

        const rawBase = safeParse(rawData.base);

        const accountDataForDb = {
            playerName: searchRes.ten || rawBase.name || query,
            level: searchRes.level || searchRes.capDo || rawBase.level || 0,
            bangHoi: searchRes.ten_bang || searchRes.guildName || "Không rõ",
            phai: searchRes.monPhai || rawBase.school || "Bí ẩn",
            luc_chien: searchRes.luc_chien || searchRes.lucChien || rawBase.max_xiuwei_kungfu || 0,
            
            // Ép thành String để lách luật "Cấm mảng lồng nhau" của Firebase
            full_raw_data: JSON.stringify(rawData), 
            last_updated: new Date().toISOString()
        };

        await setDoc(doc(db, 'thanhlong_config', 'player_profiles'), {
            [pid]: accountDataForDb
        }, { merge: true });

        return NextResponse.json({ success: true, pid: pid });

    } catch (error) {
        return NextResponse.json({ error: 'Đường truyền API Game Netease bị đứt đoạn!' }, { status: 500 });
    }
}