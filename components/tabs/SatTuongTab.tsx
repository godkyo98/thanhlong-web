// components/tabs/SatTuongTab.tsx
import React from 'react';

export default function SatTuongTab({ data, danhLuc }: { data: any, danhLuc: any }) {
    // Lột dữ liệu Top Tháng
    const monthlyRankingList = (() => {
        if (!data || !data.monthlyRanking) return [];
        return Object.entries(data.monthlyRanking).map(([key, d]: any) => {
            const officialName = (danhLuc && danhLuc[key]?.ingame) ? danhLuc[key].ingame : d.name;
            return { id: key, name: officialName, points: d.points || 0 };
        }).sort((a, b) => b.points - a.points);
    })();

    // Lột dữ liệu Danh hiệu mùa giải
    const seasonRankingList = (() => {
        if (!data || !data.seasonRanking) return [];
        return Object.entries(data.seasonRanking)
            .filter(([_, d]: any) => d.satTuongSeasonPts > 0)
            .map(([uid, d]: any) => {
                const officialName = (danhLuc && danhLuc[uid]?.ingame) ? danhLuc[uid].ingame : (d.username || `Hiệp sĩ #${uid.substring(0, 4)}`);
                return { id: uid, name: officialName, seasonPts: d.satTuongSeasonPts || 0 };
            }).sort((a, b) => b.seasonPts - a.seasonPts);
    })();

    const top3Monthly = monthlyRankingList.slice(0, 3);

    return (
        <section className="animate-in fade-in duration-300">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-rose-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.2)]">🏆 HOÀNG BẢNG SÁT TƯỚNG</h2>
                    <p className="text-zinc-400 text-sm mt-1">Nơi vinh danh các Chiến Thần PVE. Dữ liệu được đồng bộ Real-time từ hệ thống Discord.</p>
                </div>
            </div>

            {/* BỤC VINH QUANG TỔNG THÁNG */}
            {top3Monthly.length > 0 && (
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 mb-12 mt-6">
                    {top3Monthly[1] && (
                        <div className="bg-zinc-900/90 border border-zinc-700/50 rounded-t-2xl p-5 flex flex-col items-center justify-end relative shadow-md w-full md:w-56 h-36 order-2 md:order-1 transition-transform hover:-translate-y-1">
                            <div className="absolute -top-8 text-4xl">🥈</div>
                            <div className="font-bold text-zinc-300 text-sm truncate w-full text-center">{top3Monthly[1].name}</div>
                            <div className="text-xs text-zinc-500 mt-1">Tháng này: <span className="text-rose-400 font-bold font-mono">{top3Monthly[1].points}đ</span></div>
                        </div>
                    )}
                    {top3Monthly[0] && (
                        <div className="bg-gradient-to-t from-rose-950/30 to-rose-900/5 border border-rose-500/30 rounded-t-2xl p-6 flex flex-col items-center justify-end relative shadow-[0_-8px_25px_rgba(239,68,68,0.1)] w-full md:w-64 h-44 order-1 md:order-2 z-10 transition-transform hover:-translate-y-1">
                            <div className="absolute -top-12 text-6xl drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">👑</div>
                            <div className="text-[9px] text-rose-400 font-black uppercase mb-1 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 tracking-wider">Đệ Nhất Chiến Thần</div>
                            <div className="font-black text-lg text-rose-400 truncate w-full text-center">{top3Monthly[0].name}</div>
                            <div className="text-sm text-zinc-400 mt-1">Tổng điểm: <span className="text-rose-400 font-black font-mono text-base">{top3Monthly[0].points}đ</span></div>
                        </div>
                    )}
                    {top3Monthly[2] && (
                        <div className="bg-zinc-900/90 border border-zinc-700/50 rounded-t-2xl p-5 flex flex-col items-center justify-end relative shadow-md w-full md:w-56 h-32 order-3 md:order-3 transition-transform hover:-translate-y-1">
                            <div className="absolute -top-8 text-4xl">🥉</div>
                            <div className="font-bold text-zinc-300 text-sm truncate w-full text-center">{top3Monthly[2].name}</div>
                            <div className="text-xs text-zinc-500 mt-1">Tháng này: <span className="text-rose-400 font-bold font-mono">{top3Monthly[2].points}đ</span></div>
                        </div>
                    )}
                </div>
            )}

            {/* HAI CỘT THỐNG KÊ LỚN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* CỘT TRÁI: BẢNG PHONG THẦN THÁNG */}
                <div className="border border-zinc-800/80 rounded-xl bg-zinc-900/20 overflow-hidden">
                    <div className="bg-zinc-900/60 px-5 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-rose-400 uppercase tracking-wider">🏆 Điểm Phong Thần Tháng</h4>
                        <span className="text-zinc-500 text-xs font-mono">Top {monthlyRankingList.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-2.5 text-center w-16">Hạng</th>
                                    <th className="px-4 py-2.5">Hiệp Khách</th>
                                    <th className="px-4 py-2.5 text-center w-28">Tích Lũy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-sm font-medium">
                                {monthlyRankingList.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-600 text-xs">🔮 Chưa chốt sổ đợt nào trong tháng...</td></tr>
                                ) : (
                                    monthlyRankingList.map((user, idx) => (
                                        <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                                            <td className="px-4 py-3 text-center font-mono text-zinc-500 font-bold">
                                                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-zinc-300">{user.name}</td>
                                            <td className="px-4 py-3 text-center text-rose-400 font-mono font-bold">{user.points}đ</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CỘT PHẢI: BẢNG VÀNG TÍCH LŨY MÙA (DANH HIỆU KIẾM MỞ CỔNG TRỜI) */}
                <div className="border border-zinc-800/80 rounded-xl bg-zinc-900/20 overflow-hidden">
                    <div className="bg-zinc-900/60 px-5 py-4 border-b border-zinc-800 flex justify-between items-center">
                        <h4 className="font-bold text-sm text-amber-400 uppercase tracking-wider">🌟 Kiếm Mở Cổng Trời (Mùa Giải)</h4>
                        <span className="text-zinc-500 text-xs font-mono">Đã Đạt Lực</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                    <th className="px-4 py-2.5 text-center w-16">Bao Lăm</th>
                                    <th className="px-4 py-2.5">Đại Hiệp</th>
                                    <th className="px-4 py-2.5 text-center">Cấp Danh Hiệu PVE</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-sm font-medium">
                                {seasonRankingList.length === 0 ? (
                                    <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-600 text-xs">🔮 Chưa tích lũy được thần khí...</td></tr>
                                ) : (
                                    seasonRankingList.map((user) => {
                                        const level = user.seasonPts;
                                        let icon = level >= 3 ? "🐉" : level === 2 ? "🔥" : "🗡️";
                                        let titleText = level === 1 ? "Kiếm Mở Cổng Trời" : `Kiếm Mở Cổng Trời +${level - 1}`;

                                        return (
                                            <tr key={user.id} className="hover:bg-zinc-900/30 transition-colors">
                                                <td className="px-4 py-3 text-center text-lg">{icon}</td>
                                                <td className="px-4 py-3 font-bold text-zinc-300">{user.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-3 py-1 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.05)]">
                                                        {titleText}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </section>
    );
}