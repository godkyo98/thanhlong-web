// components/tabs/TuViTab.tsx
import React, { useState } from 'react';

type SortKey = 'rank' | 'msgCount' | 'voiceMinutes' | 'xp';

export default function TuViTab({ data, danhLuc }: { data: any, danhLuc: any }) {
    // 🟢 MẶC ĐỊNH SORT THEO XP CAO NHẤT
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({
        key: 'xp',
        direction: 'desc'
    });

    // 🔮 ĐÀ TIẾN HÀNH XỬ LÝ DỮ LIỆU TỪ CHAT_RANK_DATA
    const rawTuViList = (() => {
        if (!data || Object.keys(data).length === 0) return [];
        return Object.entries(data).map(([id, d]: any) => {
            const calculatedXp = d.xp ?? ((d.msgCount || 0) * 10 + (d.voiceMinutes || 0) * 5 + (d.reactionCount || 0) * 2);
            const userLevel = d.level || d.lvl || Math.floor(Math.sqrt(calculatedXp / 100)) || 1;

            // 🟢 VÁ LỖI CỐT LÕI: Luôn ưu tiên tên In-game đồng bộ trong Sổ Danh Lục lên vị trí SỐ 1
            const officialName = (danhLuc && danhLuc[id]?.ingame) 
                                 ? danhLuc[id].ingame 
                                 : (d.displayName || d.username || d.name || `Cao thủ (${id.substring(0,4)})`);

            return {
                id,
                name: officialName,
                msgCount: d.msgCount || 0,
                voiceMinutes: d.voiceMinutes || 0,
                achievements: Array.isArray(d.achievements) ? d.achievements : [],
                xp: calculatedXp,
                level: userLevel
            };
        });
    })();

    // 🟢 THUẬT TOÁN ĐỊNH DANH THỨ HẠNG CỐ ĐỊNH THEO XP
    // Tạo một danh sách sắp xếp nghiêm ngặt theo XP để cấp phát "Chứng minh thư" Top Rank
    const xpRankedList = [...rawTuViList].sort((a, b) => b.xp - a.xp);
    
    // Tạo 1 từ điển lôi UID ra xem ông này là Top mấy Tu Vi
    const rankMap: Record<string, number> = {};
    xpRankedList.forEach((user, index) => {
        rankMap[user.id] = index + 1; // Top 1, Top 2, Top 3...
    });

    // 🟢 THỰC THI LUỒNG SẮP XẾP CỦA BẢNG TÙY BIẾN
    const sortedTuVi = [...rawTuViList].sort((a, b) => {
        // Nếu chọn sort theo 'rank', ta lôi cái Chứng minh thư Tu vi ra so sánh
        if (sortConfig.key === 'rank') {
            return sortConfig.direction === 'asc' ? rankMap[a.id] - rankMap[b.id] : rankMap[b.id] - rankMap[a.id];
        }

        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // 🟢 RÚT CHUẨN TOP 5 CAO THỦ LINH LỰC CAO NHẤT ĐỂ ĐƯA LÊN BỤC VINH QUANG
    const topFive = xpRankedList.slice(0, 5);

    return (
        <section className="animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">🏆 THÁP PHONG THẦN</h2>
                    <p className="text-sm text-zinc-400 mt-1">Nơi vinh danh các đại hiệp năng nổ tương tác. Bấm vào tiêu đề các cột để thay đổi trận pháp sắp xếp.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm text-amber-400 flex flex-col items-end shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                    <span className="text-xs uppercase tracking-wider font-semibold text-amber-500/80">Sĩ Số Đã Tu Luyện</span>
                    <span className="font-bold text-xl leading-none mt-1">{sortedTuVi.length} Đại Hiệp</span>
                </div>
            </div>

            {/* 🏛️ BỤC VINH QUANG TOP 5 */}
            {topFive.length >= 5 && (
                <div className="flex flex-wrap md:flex-nowrap justify-center items-end gap-3 mb-14 mt-12 md:mt-24 max-w-5xl mx-auto px-2">
                    {/* Hạng 4 */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-t-2xl p-4 flex flex-col items-center justify-end shadow-md w-full md:w-44 h-36 order-4 md:order-1 transition-transform hover:-translate-y-1">
                        <div className="text-2xl mb-1">🏅 <span className="text-xs font-mono font-bold text-zinc-500">#4</span></div>
                        <div className="font-bold text-xs text-zinc-300 truncate w-full text-center">{topFive[3].name}</div>
                        <div className="text-[10px] text-amber-500/70 font-bold mt-0.5">Cấp {topFive[3].level}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{topFive[3].xp.toLocaleString('vi-VN')} XP</div>
                    </div>

                    {/* Hạng 2 */}
                    <div className="bg-zinc-900/90 border border-zinc-700 rounded-t-2xl p-5 flex flex-col items-center justify-end shadow-lg w-full md:w-52 h-44 order-2 md:order-2 transition-transform hover:-translate-y-1.5">
                        <div className="text-4xl mb-1">🥈</div>
                        <div className="font-bold text-sm text-zinc-200 truncate w-full text-center">{topFive[1].name}</div>
                        <div className="text-xs text-amber-400 font-bold mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Cấp {topFive[1].level}</div>
                        <div className="text-xs text-zinc-400 font-mono mt-1.5"><span className="text-cyan-400 font-bold">{topFive[1].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 1 */}
                    <div className="bg-gradient-to-t from-amber-500/20 to-amber-500/5 border border-amber-500/40 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-[0_-10px_35px_rgba(245,158,11,0.18)] w-full md:w-60 h-56 order-1 md:order-3 z-10 transition-transform hover:-translate-y-2">
                        <div className="absolute -top-14 text-7xl drop-shadow-[0_0_15px_rgba(251,191,36,0.7)]">👑</div>
                        <div className="font-black text-lg text-amber-400 truncate w-full text-center drop-shadow-md">{topFive[0].name}</div>
                        <div className="text-xs text-amber-400 font-extrabold uppercase mt-1 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40 tracking-wider">Cấp {topFive[0].level}</div>
                        <div className="text-sm text-amber-200/80 mt-2">⚡ <span className="text-cyan-400 font-black font-mono text-base">{topFive[0].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 3 */}
                    <div className="bg-zinc-900/90 border border-zinc-700 rounded-t-2xl p-5 flex flex-col items-center justify-end shadow-lg w-full md:w-52 h-40 order-3 md:order-4 transition-transform hover:-translate-y-1.5">
                        <div className="text-4xl mb-1">🥉</div>
                        <div className="font-bold text-sm text-zinc-200 truncate w-full text-center">{topFive[2].name}</div>
                        <div className="text-xs text-amber-400 font-bold mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Cấp {topFive[2].level}</div>
                        <div className="text-xs text-zinc-400 font-mono mt-1.5"><span className="text-cyan-400 font-bold">{topFive[2].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 5 */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-t-2xl p-4 flex flex-col items-center justify-end shadow-md w-full md:w-44 h-32 order-5 md:order-5 transition-transform hover:-translate-y-1">
                        <div className="text-2xl mb-1"> 🏅 <span className="text-xs font-mono font-bold text-zinc-500">#5</span></div>
                        <div className="font-bold text-xs text-zinc-300 truncate w-full text-center">{topFive[4].name}</div>
                        <div className="text-[10px] text-amber-500/70 font-bold mt-0.5">Cấp {topFive[4].level}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{topFive[4].xp.toLocaleString('vi-VN')} XP</div>
                    </div>
                </div>
            )}

            {/* BẢNG DANH SÁCH RANK */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md">
                <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('rank')} className="px-6 py-4 text-center w-24 cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">Thứ Hạng <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th className="px-6 py-4">Đại Hiệp</th>
                            <th onClick={() => handleSort('xp')} className="px-6 py-4 cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center gap-1.5">🔮 Tu Vi (Cấp Độ / XP) <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'xp' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th onClick={() => handleSort('msgCount')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">💬 Tin Nhắn <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'msgCount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th onClick={() => handleSort('voiceMinutes')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">🎙️ Tọa Thiền <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'voiceMinutes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th className="px-6 py-4">🏆 Danh Hiệu Đã Độ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-sm">
                        {sortedTuVi.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-500">Chưa có dữ liệu tu vi phong thần...</td></tr>
                        ) : (
                            sortedTuVi.map((user) => {
                                // 🟢 LẤY CHUẨN XÁC CHỨNG MINH THƯ THỨ HẠNG TỪ TỪ ĐIỂN RANKMAP
                                const userRank = rankMap[user.id];

                                return (
                                    <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4 text-center font-mono font-bold text-zinc-500 text-base">
                                            {userRank === 1 ? <span className="text-2xl drop-shadow-md">🥇</span> : 
                                             userRank === 2 ? <span className="text-2xl drop-shadow-md">🥈</span> : 
                                             userRank === 3 ? <span className="text-2xl drop-shadow-md">🥉</span> : 
                                             <span className="bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700 text-xs">#{userRank}</span>}
                                        </td>
                                        
                                        <td className="px-6 py-4 font-bold text-zinc-200 text-base">
                                            {user.name}
                                        </td>
                                        
                                        <td className="px-6 py-4 w-72">
                                            <div className="flex justify-between items-center mb-1 text-xs">
                                                <span className="text-amber-400 font-extrabold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Cấp {user.level}</span>
                                                <span className="text-zinc-400 font-mono font-bold">{user.xp.toLocaleString('vi-VN')} XP</span>
                                            </div>
                                            <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-amber-600 via-yellow-500 to-cyan-400 h-1.5 rounded-full" 
                                                    style={{ width: `${Math.min((user.xp % 1000) / 10, 100) || 30}%` }}
                                                ></div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center text-cyan-400 font-mono font-bold text-base bg-cyan-500/5">
                                            {user.msgCount.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-center text-emerald-400 font-mono bg-emerald-500/5">
                                            {user.voiceMinutes.toLocaleString('vi-VN')}p
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.achievements.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {user.achievements.map((ach: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-1 bg-gradient-to-r from-rose-500/20 to-orange-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm">
                                                            {ach}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-zinc-600 italic">Vô danh lãng khách</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}