/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/PointTab.tsx
'use client';

import React, { useState, useMemo } from 'react';

type SortKey = 'rank' | 'point' | 'total';

interface Props {
    data: any;
    danhLuc: any;
}

export default function PointTab({ data, danhLuc }: Props) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'total',
        direction: 'desc'
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Enrich point data with Danh Luc
    const rawPointList = useMemo(() => {
        if (!data || typeof data !== 'object') return [];

        return Object.entries(data).map(([id, d]: any) => {
            if (!d || typeof d !== 'object') {
                return { id, name: `Khách (#${id.substring(0, 4)})`, uid: '', avatar: '', point: 0, total: 0 };
            }

            const dl = danhLuc?.[id] || {};
            const officialName = dl.ingame || d.name || d.username || d.displayName || `Khách (#${id.substring(0, 4)})`;
            const uid = dl.uid || '';
            const avatar = dl.avatar || dl.image || '';

            return {
                id,
                name: officialName,
                uid,
                avatar,
                point: Number(d.points ?? d.point) || 0,
                total: Number(d.total_points ?? d.total) || 0
            };
        });
    }, [data, danhLuc]);

    // Rank strictly by Total Points for permanent rank index
    const totalRankedList = useMemo(() => {
        return [...rawPointList].sort((a, b) => b.total - a.total);
    }, [rawPointList]);

    const rankMap = useMemo(() => {
        const map: Record<string, number> = {};
        totalRankedList.forEach((user, index) => {
            map[user.id] = index + 1;
        });
        return map;
    }, [totalRankedList]);

    // Top 3 Richest by current points
    const topRichest = useMemo(() => {
        return [...rawPointList].sort((a, b) => b.point - a.point).slice(0, 3);
    }, [rawPointList]);

    // Highlights for Hero Banner
    const highlights = useMemo(() => {
        let totalVaultPoints = 0;
        let totalHistoricalPoints = 0;
        const topPointUser = topRichest[0];
        const topTotalUser = totalRankedList[0];

        rawPointList.forEach(u => {
            totalVaultPoints += u.point;
            totalHistoricalPoints += u.total;
        });

        return {
            totalMembers: rawPointList.length,
            totalVaultPoints,
            totalHistoricalPoints,
            topPointUser,
            topTotalUser
        };
    }, [rawPointList, topRichest, totalRankedList]);

    // Filter and Sort
    const sortedPoints = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return rawPointList.filter(user => {
            if (!q) return true;
            const matchName = user.name.toLowerCase().includes(q);
            const matchUid = user.uid.toLowerCase().includes(q);
            return matchName || matchUid;
        }).sort((a, b) => {
            if (sortConfig.key === 'rank') {
                return sortConfig.direction === 'asc' ? rankMap[a.id] - rankMap[b.id] : rankMap[b.id] - rankMap[a.id];
            }
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [rawPointList, searchQuery, sortConfig, rankMap]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
        <section className="space-y-8 animate-fadeIn">
            {/* 💰 HERO BANNER: BẢNG CÔNG TRẠNG */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                            <span>💰</span>
                            <span>Bảng Vàng · Công Trạng & Ngân Khố</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-amber-300 to-emerald-400">
                            BẢNG VÀNG CÔNG TRẠNG
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            Nơi quản lý Ngân khố và Điểm Cống Hiến. <b className="text-emerald-400">Điểm (Point)</b> dùng để đổi quà phúc lợi, <b className="text-rose-400">Tổng Cống Hiến (Total)</b> lưu danh sử sách.
                        </p>
                    </div>
                </div>

                {/* 4 HIGHLIGHT TILES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                            💰
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Tổng Ngân Khố</div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-400">
                                {highlights.totalVaultPoints.toLocaleString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            🏛️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Tổng Cống Hiến</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-300">
                                {highlights.totalHistoricalPoints.toLocaleString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shrink-0">
                            👑
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Phú Hộ</div>
                            <div className="text-sm font-black text-yellow-300 truncate max-w-[130px]" title={highlights.topPointUser?.name}>
                                {highlights.topPointUser?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topPointUser ? `${highlights.topPointUser.point.toLocaleString('vi-VN')} Pt` : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
                            ⚔️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Công Thần</div>
                            <div className="text-sm font-black text-rose-300 truncate max-w-[130px]" title={highlights.topTotalUser?.name}>
                                {highlights.topTotalUser?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topTotalUser ? `${highlights.topTotalUser.total.toLocaleString('vi-VN')} Total` : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 👑 BỤC VINH QUANG PHÚ HỘ */}
            {topRichest.length >= 3 && (
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 mb-12 mt-12 md:mt-20 max-w-4xl mx-auto px-2">
                    {/* Hạng 2 */}
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-44 order-2 md:order-1 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥈</div>
                        <div className="font-bold text-lg text-zinc-200 truncate w-full text-center">{topRichest[1].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">
                            Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[1].point.toLocaleString('vi-VN')}</span> Pt
                        </div>
                    </div>

                    {/* Hạng 1 */}
                    <div className="bg-gradient-to-t from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-[0_-10px_30px_rgba(16,185,129,0.15)] w-full md:w-72 h-56 order-1 md:order-2 z-10 transition-all duration-300 hover:-translate-y-2.5 hover:border-emerald-400">
                        <div className="absolute -top-14 text-7xl drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-bounce">👑</div>
                        <div className="text-[10px] text-emerald-400 font-extrabold uppercase mb-1 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 tracking-wider">
                            Đệ Nhất Phú Hộ
                        </div>
                        <div className="font-black text-2xl text-emerald-400 truncate w-full text-center drop-shadow-md">{topRichest[0].name}</div>
                        <div className="text-sm text-emerald-200/80 mt-2">
                            Ngân khố: <span className="text-emerald-400 font-black font-mono text-xl">{topRichest[0].point.toLocaleString('vi-VN')}</span> Pt
                        </div>
                    </div>

                    {/* Hạng 3 */}
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-40 order-3 md:order-3 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥉</div>
                        <div className="font-bold text-lg text-emerald-200 truncate w-full text-center">{topRichest[2].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">
                            Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[2].point.toLocaleString('vi-VN')}</span> Pt
                        </div>
                    </div>
                </div>
            )}

            {/* 🔍 SEARCH AND CONTROLS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
                <div className="relative w-full sm:w-80">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-xs pointer-events-none">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm đại hiệp, UID..."
                        className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="text-xs text-zinc-500 font-mono">
                    Hiển thị <b className="text-zinc-300">{sortedPoints.length}</b> / {rawPointList.length} Đại Hiệp
                </div>
            </div>

            {/* 📜 BẢNG THỐNG KÊ CHI TIẾT */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md shadow-xl">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('rank')} className="px-6 py-4 text-center w-28 cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>Hạng Công Thần</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th className="px-6 py-4">Đại Hiệp</th>
                            <th onClick={() => handleSort('point')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>💰 Điểm Hiện Tại (Point)</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'point' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th onClick={() => handleSort('total')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>🏛️ Tổng Cống Hiến (Total)</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 text-sm">
                        {sortedPoints.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                    🍃 Không tìm thấy đại hiệp nào khớp với từ khóa tìm kiếm...
                                </td>
                            </tr>
                        ) : (
                            sortedPoints.map((user) => {
                                const userRank = rankMap[user.id];

                                return (
                                    <tr key={user.id} className="hover:bg-zinc-900/60 transition-colors">
                                        <td className="px-6 py-4 text-center font-mono font-bold text-zinc-500 text-base">
                                            {userRank === 1 ? <span className="text-2xl drop-shadow-md">🥇</span> : 
                                             userRank === 2 ? <span className="text-2xl drop-shadow-md">🥈</span> : 
                                             userRank === 3 ? <span className="text-2xl drop-shadow-md">🥉</span> : 
                                             <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 text-xs font-mono">#{userRank}</span>}
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {user.avatar ? (
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        className="w-8 h-8 rounded-xl object-cover border border-emerald-500/30 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-emerald-400 shrink-0">
                                                        💰
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-zinc-200 text-sm hover:text-emerald-300 transition-colors">
                                                        {user.name}
                                                    </div>
                                                    {user.uid && (
                                                        <div className="text-[10px] text-zinc-500 font-mono">
                                                            #{user.uid}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <span className="text-emerald-400 font-black font-mono text-base px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                {user.point.toLocaleString('vi-VN')}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <span className="text-amber-400 font-black font-mono text-base px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                {user.total.toLocaleString('vi-VN')}
                                            </span>
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
