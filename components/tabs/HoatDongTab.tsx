/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/HoatDongTab.tsx
import React, { useState, useMemo } from 'react';

interface Props {
    data: any;
    danhLuc: any;
}

export default function HoatDongTab({ data, danhLuc }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<'week' | 'month' | 'total'>('week');

    const membersList = useMemo(() => {
        if (!data) return [];
        const rawMembers = data.members || data.list || data;
        if (Array.isArray(rawMembers)) return rawMembers;
        if (typeof rawMembers === 'object') {
            return Object.entries(rawMembers)
                .filter(([k, v]) => k !== 'updatedAt' && k !== 'guildName' && typeof v === 'object')
                .map(([id, val]: any) => ({ id, ...val }));
        }
        return [];
    }, [data]);

    const filteredAndSorted = useMemo(() => {
        return [...membersList]
            .filter((m: any) => {
                const name = String(m.name || m.role_name || m.ingame || m.id || "").toLowerCase();
                return name.includes(searchTerm.toLowerCase());
            })
            .sort((a: any, b: any) => {
                const getVal = (item: any) => {
                    if (sortBy === 'week') return Number(item.week || item.weekly || item.week_liveness || item.score || 0);
                    if (sortBy === 'month') return Number(item.month || item.monthly || item.month_liveness || 0);
                    return Number(item.total || item.total_liveness || item.week || 0);
                };
                return getVal(b) - getVal(a);
            });
    }, [membersList, searchTerm, sortBy]);

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-12">
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                        🔥 Sổ Điệp Hoạt Động Bang
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        Kiểm độ năng động tuần, tháng của bang chúng đồng bộ trực tiếp từ Discord Bot (/bang_hoat_dong).
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm tên đại hiệp..."
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                    >
                        <option value="week">Xếp theo: Năng Động Tuần</option>
                        <option value="month">Xếp theo: Năng Động Tháng</option>
                        <option value="total">Xếp theo: Tổng Cống Hiến</option>
                    </select>
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                                <th className="py-3.5 px-4 font-bold">#</th>
                                <th className="py-3.5 px-4 font-bold">Đại Hiệp</th>
                                <th className="py-3.5 px-4 font-bold text-center">Cấp Độ</th>
                                <th className="py-3.5 px-4 font-bold text-right text-amber-400">Năng Động Tuần</th>
                                <th className="py-3.5 px-4 font-bold text-right text-emerald-400">Năng Động Tháng</th>
                                <th className="py-3.5 px-4 font-bold text-right text-cyan-400">Tổng Tích Lũy</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filteredAndSorted.map((m: any, idx: number) => {
                                const displayName = m.name || m.role_name || m.ingame || danhLuc?.[m.id]?.ingame || m.id;
                                const lvl = m.level || m.lvl || 0;
                                const weekScore = Number(m.week || m.weekly || m.week_liveness || m.score || 0);
                                const monthScore = Number(m.month || m.monthly || m.month_liveness || 0);
                                const totalScore = Number(m.total || m.total_liveness || weekScore);

                                return (
                                    <tr key={m.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-zinc-500">{idx + 1}</td>
                                        <td className="py-3 px-4 font-bold text-zinc-100">{displayName}</td>
                                        <td className="py-3 px-4 text-center font-mono text-zinc-400">{lvl > 0 ? `Lv.${lvl}` : '-'}</td>
                                        <td className="py-3 px-4 text-right font-mono font-black text-amber-400">{weekScore.toLocaleString('vi-VN')}</td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{monthScore.toLocaleString('vi-VN')}</td>
                                        <td className="py-3 px-4 text-right font-mono text-cyan-400">{totalScore.toLocaleString('vi-VN')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredAndSorted.length === 0 && (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                        🍃 Chưa có dữ liệu Hoạt Động Bang hoặc không tìm thấy đại hiệp phù hợp.
                    </div>
                )}
            </div>
        </section>
    );
}