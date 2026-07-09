// components/tabs/TalentTab.tsx
import React from 'react';

export default function TalentTab({ data, danhLuc }: { data: any, danhLuc: any }) {
    // Thuật toán nhóm anh em theo từng con Boss
    const bossGroups: Record<string, { id: string, mocs: string[] }[]> = {};
    
    if (data) {
        for (const [userId, userBosses] of Object.entries(data)) {
            if (!userBosses) continue;
            for (const [bossName, milestones] of Object.entries(userBosses as Record<string, any>)) {
                if (!milestones || milestones.length === 0) continue;
                if (!bossGroups[bossName]) bossGroups[bossName] = [];
                bossGroups[bossName].push({ id: userId, mocs: milestones });
            }
        }
    }

    return (
        <section className="w-full animate-in fade-in duration-300">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-zinc-50">👹 Bảng Cáo Thị Đăng Ký Săn Boss</h2>
                <p className="text-sm text-zinc-400 mt-1">Danh sách cao thủ đã lập đội và đăng ký mốc lộ trình săn Boss Talent.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                {!data ? (
                    <div className="col-span-full text-center py-10 text-zinc-500">🔮 Đang tải mật báo...</div>
                ) : Object.keys(bossGroups).length === 0 ? (
                    <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">🍃 Chưa có huynh đệ nào ghi danh đi săn.</div>
                ) : (
                    Object.entries(bossGroups).map(([bossName, members]) => (
                        <div key={bossName} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-4 pb-2 border-b border-zinc-800/50">
                                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        {bossName}
                                    </h3>
                                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-full font-semibold">{members.length} Người</span>
                                </div>
                                <div className="space-y-1 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                                    {members.map((mem, i) => {
                                        // Ánh xạ UID ra Tên In-game nếu có trong Sổ Danh Lục
                                        const playerName = danhLuc && danhLuc[mem.id] && danhLuc[mem.id].ingame ? danhLuc[mem.id].ingame : `Mật danh (${mem.id.substring(0, 5)}...)`;
                                        return (
                                            <div key={i} className="flex items-center justify-between text-xs py-2.5 border-b border-zinc-800/30 last:border-0 gap-4">
                                                <span className="text-amber-300 font-medium flex-shrink-0">👤 {playerName}</span>
                                                <div className="flex gap-1 flex-wrap justify-end">
                                                    {mem.mocs.map(m => (
                                                        <span key={m} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-mono whitespace-nowrap">{m}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}