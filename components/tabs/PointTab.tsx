// components/tabs/PointTab.tsx
import React, { useState } from 'react';

type SortKey = 'rank' | 'point' | 'total';

export default function PointTab({ data, danhLuc }: { data: any, danhLuc: any }) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({
        key: 'total',
        direction: 'desc'
    });

    const rawPointList = (() => {
        if (!data || Object.keys(data).length === 0) return [];
        return Object.entries(data).map(([id, d]: any) => {
            if (!d || typeof d !== 'object') {
                return { id, name: `Lỗi Data (${id.substring(0,4)})`, point: 0, total: 0 };
            }
            
            const officialName = (danhLuc && danhLuc[id]?.ingame) 
                                 ? danhLuc[id].ingame 
                                 : (d.name || d.username || d.displayName || `Khách (${id.substring(0,4)})`);
            return {
                id,
                name: officialName,
                // 🟢 ĐÃ VÁ LỖI CỐT LÕI: Đọc chuẩn xác tên biến 'points' và 'total_points' từ Firebase của ngài
                point: Number(d.points ?? d.point) || 0,
                total: Number(d.total_points ?? d.total) || 0
            };
        });
    })();

    const totalRankedList = [...rawPointList].sort((a, b) => b.total - a.total);
    const rankMap: Record<string, number> = {};
    totalRankedList.forEach((user, index) => { rankMap[user.id] = index + 1; });

    const sortedPoints = [...rawPointList].sort((a, b) => {
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
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const topRichest = [...rawPointList].sort((a, b) => b.point - a.point).slice(0, 3);

    return (
        <section className="animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">💰 BẢNG CÔNG TRẠNG</h2>
                    <p className="text-sm text-zinc-400 mt-1">Nơi quản lý Ngân khố và Điểm Cống Hiến. <b className="text-emerald-400">Điểm (Point)</b> dùng để đổi quà, <b className="text-rose-400">Tổng Cống Hiến (Total)</b> vinh danh lịch sử.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 rounded-xl text-sm text-amber-400 flex flex-col items-end shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                    <span className="text-xs uppercase tracking-wider font-semibold text-amber-500/80">Sĩ Số Góp Công</span>
                    <span className="font-bold text-xl leading-none mt-1">{sortedPoints.length} Đại Hiệp</span>
                </div>
            </div>

            {/* BỤC VINH QUANG PHÚ HỘ */}
            {topRichest.length >= 3 && (
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 mb-12 mt-12 md:mt-20">
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-44 order-2 md:order-1 transition-transform hover:-translate-y-2">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥈</div>
                        <div className="font-bold text-lg text-zinc-200 truncate w-full text-center">{topRichest[1].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[1].point.toLocaleString('vi-VN')}</span> Pt</div>
                    </div>
                    <div className="bg-gradient-to-t from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-[0_-10px_30px_rgba(16,185,129,0.15)] w-full md:w-72 h-56 order-1 md:order-2 z-10 transition-transform hover:-translate-y-2">
                        <div className="absolute -top-14 text-7xl drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]">👑</div>
                        <div className="text-[10px] text-emerald-400 font-extrabold uppercase mb-1 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 tracking-wider">Đệ Nhất Phú Hộ</div>
                        <div className="font-black text-2xl text-emerald-400 truncate w-full text-center drop-shadow-md">{topRichest[0].name}</div>
                        <div className="text-sm text-emerald-200/80 mt-2">Ngân khố: <span className="text-emerald-400 font-black font-mono text-xl">{topRichest[0].point.toLocaleString('vi-VN')}</span> Pt</div>
                    </div>
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-40 order-3 md:order-3 transition-transform hover:-translate-y-2">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥉</div>
                        <div className="font-bold text-lg text-emerald-200 truncate w-full text-center">{topRichest[2].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[2].point.toLocaleString('vi-VN')}</span> Pt</div>
                    </div>
                </div>
            )}

            {/* BẢNG THỐNG KÊ CHI TIẾT */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('rank')} className="px-6 py-4 text-center w-24 cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">Hạng Công Thần <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th className="px-6 py-4">Đại Hiệp</th>
                            <th onClick={() => handleSort('point')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">💰 Điểm Hiện Tại (Point) <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'point' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                            <th onClick={() => handleSort('total')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-zinc-200 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">🌟 Tổng Lịch Sử (Total) <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-sm">
                        {sortedPoints.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-10 text-center text-zinc-500">🔮 Ngân khố trống vắng, đang đợi nạp linh khí...</td></tr>
                        ) : (
                            sortedPoints.map((user) => {
                                const userRank = rankMap[user.id];
                                return (
                                    <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                                        <td className="px-6 py-4 text-center font-mono font-bold text-zinc-500 text-base">
                                            {userRank === 1 ? <span className="text-2xl drop-shadow-md">🥇</span> : 
                                             userRank === 2 ? <span className="text-2xl drop-shadow-md">🥈</span> : 
                                             userRank === 3 ? <span className="text-2xl drop-shadow-md">🥉</span> : 
                                             <span className="bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700 text-xs">#{userRank}</span>}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-zinc-200 text-base">{user.name}</td>
                                        <td className="px-6 py-4 text-center text-emerald-400 font-mono font-bold text-base bg-emerald-500/5">{user.point.toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-4 text-center text-rose-400 font-mono font-bold text-base bg-rose-500/5">{user.total.toLocaleString('vi-VN')}</td>
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