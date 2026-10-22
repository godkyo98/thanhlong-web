/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/TuViTab.tsx
'use client';

import React, { useState, useMemo } from 'react';

type SortKey = 'rank' | 'msgCount' | 'voiceMinutes' | 'xp';

interface Props {
    data: any;
    danhLuc: any;
}

export default function TuViTab({ data, danhLuc }: Props) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'xp',
        direction: 'desc'
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Process raw chat rank data and enrich with Danh Luc
    const rawTuViList = useMemo(() => {
        if (!data || typeof data !== 'object') return [];

        return Object.entries(data).map(([id, d]: any) => {
            const calculatedXp = d.xp ?? ((d.msgCount || 0) * 10 + (d.voiceMinutes || 0) * 5 + (d.reactionCount || 0) * 2);
            const userLevel = d.level || d.lvl || Math.floor(Math.sqrt(calculatedXp / 100)) || 1;

            const dl = danhLuc?.[id] || {};
            const officialName = dl.ingame || d.displayName || d.username || d.name || `Cao thủ #${id.substring(0, 4)}`;
            const uid = dl.uid || '';
            const avatar = dl.avatar || dl.image || '';
            const className = dl.class || '';

            return {
                id,
                name: officialName,
                uid,
                avatar,
                className,
                msgCount: Number(d.msgCount) || 0,
                voiceMinutes: Number(d.voiceMinutes) || 0,
                achievements: Array.isArray(d.achievements) ? d.achievements : [],
                xp: calculatedXp,
                level: userLevel
            };
        });
    }, [data, danhLuc]);

    // Rank strictly by XP to assign permanent rank badge
    const xpRankedList = useMemo(() => {
        return [...rawTuViList].sort((a, b) => b.xp - a.xp);
    }, [rawTuViList]);

    const rankMap = useMemo(() => {
        const map: Record<string, number> = {};
        xpRankedList.forEach((user, index) => {
            map[user.id] = index + 1;
        });
        return map;
    }, [xpRankedList]);

    // Highlights for Hero Banner
    const highlights = useMemo(() => {
        const totalMembers = rawTuViList.length;
        const top1XP = xpRankedList[0];
        const topMsg = [...rawTuViList].sort((a, b) => b.msgCount - a.msgCount)[0];
        const topVoice = [...rawTuViList].sort((a, b) => b.voiceMinutes - a.voiceMinutes)[0];

        return {
            totalMembers,
            top1XP,
            topMsg,
            topVoice
        };
    }, [rawTuViList, xpRankedList]);

    // Top 5 Podium
    const topFive = useMemo(() => {
        return xpRankedList.slice(0, 5);
    }, [xpRankedList]);

    // Filter and Sort List
    const sortedTuVi = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return rawTuViList.filter(user => {
            if (!q) return true;
            const matchName = user.name.toLowerCase().includes(q);
            const matchUid = user.uid.toLowerCase().includes(q);
            const matchAch = user.achievements.some((ach: string) => ach.toLowerCase().includes(q));
            return matchName || matchUid || matchAch;
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
    }, [rawTuViList, searchQuery, sortConfig, rankMap]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <section className="space-y-8 animate-fadeIn">
            {/* 🏆 HERO BANNER: THÁP PHONG THẦN */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                            <span>🏆</span>
                            <span>Bảng Phong Thần · Tu Vi Tương Tác</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
                            THÁP PHONG THẦN TU VI
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            Nơi vinh danh các bậc cao thủ tích cực luận đàm, tọa thiền và năng động cống hiến trong sơn môn.
                        </p>
                    </div>
                </div>

                {/* 4 HIGHLIGHT TILES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            👥
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Tổng Tu Sĩ</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-400">{highlights.totalMembers}</div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shrink-0">
                            ⚡
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đỉnh Phong Tu Vi</div>
                            <div className="text-sm font-black text-yellow-300 truncate max-w-[130px]" title={highlights.top1XP?.name}>
                                {highlights.top1XP?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.top1XP ? `${highlights.top1XP.xp.toLocaleString('vi-VN')} XP` : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
                            💬
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Luận Đàm</div>
                            <div className="text-sm font-black text-cyan-300 truncate max-w-[130px]" title={highlights.topMsg?.name}>
                                {highlights.topMsg?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topMsg ? `${highlights.topMsg.msgCount.toLocaleString('vi-VN')} tin` : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                            🎙️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Thiền Định</div>
                            <div className="text-sm font-black text-emerald-300 truncate max-w-[130px]" title={highlights.topVoice?.name}>
                                {highlights.topVoice?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topVoice ? `${highlights.topVoice.voiceMinutes.toLocaleString('vi-VN')} phút` : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🏛️ BỤC VINH QUANG TOP 5 */}
            {topFive.length >= 5 && (
                <div className="flex flex-wrap md:flex-nowrap justify-center items-end gap-3 mb-12 mt-12 md:mt-20 max-w-5xl mx-auto px-2">
                    {/* Hạng 4 */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-t-2xl p-4 flex flex-col items-center justify-end shadow-md w-full md:w-44 h-36 order-4 md:order-1 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700">
                        <div className="text-2xl mb-1">🏅 <span className="text-xs font-mono font-bold text-zinc-500">#4</span></div>
                        <div className="font-bold text-xs text-zinc-300 truncate w-full text-center">{topFive[3].name}</div>
                        <div className="text-[10px] text-amber-500/70 font-bold mt-0.5">Cấp {topFive[3].level}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{topFive[3].xp.toLocaleString('vi-VN')} XP</div>
                    </div>

                    {/* Hạng 2 */}
                    <div className="bg-zinc-900/90 border border-zinc-700 rounded-t-2xl p-5 flex flex-col items-center justify-end shadow-lg w-full md:w-52 h-44 order-2 md:order-2 transition-all duration-300 hover:-translate-y-2 hover:border-zinc-500">
                        <div className="text-4xl mb-1">🥈</div>
                        <div className="font-bold text-sm text-zinc-200 truncate w-full text-center">{topFive[1].name}</div>
                        <div className="text-xs text-amber-400 font-bold mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Cấp {topFive[1].level}</div>
                        <div className="text-xs text-zinc-400 font-mono mt-1.5"><span className="text-cyan-400 font-bold">{topFive[1].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 1 */}
                    <div className="bg-gradient-to-t from-amber-500/20 to-amber-500/5 border border-amber-500/40 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-[0_-10px_35px_rgba(245,158,11,0.18)] w-full md:w-60 h-56 order-1 md:order-3 z-10 transition-all duration-300 hover:-translate-y-2.5 hover:border-amber-400">
                        <div className="absolute -top-14 text-7xl drop-shadow-[0_0_15px_rgba(251,191,36,0.7)] animate-bounce">👑</div>
                        <div className="font-black text-lg text-amber-400 truncate w-full text-center drop-shadow-md">{topFive[0].name}</div>
                        <div className="text-xs text-amber-400 font-extrabold uppercase mt-1 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40 tracking-wider">Cấp {topFive[0].level}</div>
                        <div className="text-sm text-amber-200/80 mt-2">⚡ <span className="text-cyan-400 font-black font-mono text-base">{topFive[0].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 3 */}
                    <div className="bg-zinc-900/90 border border-zinc-700 rounded-t-2xl p-5 flex flex-col items-center justify-end shadow-lg w-full md:w-52 h-40 order-3 md:order-4 transition-all duration-300 hover:-translate-y-2 hover:border-zinc-500">
                        <div className="text-4xl mb-1">🥉</div>
                        <div className="font-bold text-sm text-zinc-200 truncate w-full text-center">{topFive[2].name}</div>
                        <div className="text-xs text-amber-400 font-bold mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Cấp {topFive[2].level}</div>
                        <div className="text-xs text-zinc-400 font-mono mt-1.5"><span className="text-cyan-400 font-bold">{topFive[2].xp.toLocaleString('vi-VN')}</span> XP</div>
                    </div>

                    {/* Hạng 5 */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-t-2xl p-4 flex flex-col items-center justify-end shadow-md w-full md:w-44 h-32 order-5 md:order-5 transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700">
                        <div className="text-2xl mb-1">🏅 <span className="text-xs font-mono font-bold text-zinc-500">#5</span></div>
                        <div className="font-bold text-xs text-zinc-300 truncate w-full text-center">{topFive[4].name}</div>
                        <div className="text-[10px] text-amber-500/70 font-bold mt-0.5">Cấp {topFive[4].level}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">{topFive[4].xp.toLocaleString('vi-VN')} XP</div>
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
                        placeholder="Tìm đại hiệp, UID, danh hiệu..."
                        className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:border-amber-500/60 focus:outline-none transition-colors placeholder:text-zinc-600"
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
                    Hiển thị <b className="text-zinc-300">{sortedTuVi.length}</b> / {rawTuViList.length} Đại Hiệp
                </div>
            </div>

            {/* 📜 BẢNG DANH SÁCH RANK */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md shadow-xl">
                <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('rank')} className="px-6 py-4 text-center w-24 cursor-pointer hover:bg-zinc-800/40 hover:text-amber-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>Thứ Hạng</span>
                                    <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th className="px-6 py-4">Đại Hiệp</th>
                            <th onClick={() => handleSort('xp')} className="px-6 py-4 cursor-pointer hover:bg-zinc-800/40 hover:text-amber-300 transition-colors group">
                                <div className="flex items-center gap-1.5">
                                    <span>🔮 Tu Vi (Cấp Độ / XP)</span>
                                    <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'xp' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th onClick={() => handleSort('msgCount')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-amber-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>💬 Luận Đàm</span>
                                    <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'msgCount' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th onClick={() => handleSort('voiceMinutes')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-amber-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>🎙️ Tọa Thiền</span>
                                    <span className="text-zinc-600 group-hover:text-amber-400">{sortConfig.key === 'voiceMinutes' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th className="px-6 py-4">🏆 Danh Hiệu Đã Độ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 text-sm">
                        {sortedTuVi.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">
                                    🍃 Không tìm thấy đại hiệp nào khớp với từ khóa tìm kiếm...
                                </td>
                            </tr>
                        ) : (
                            sortedTuVi.map((user) => {
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
                                                        className="w-8 h-8 rounded-xl object-cover border border-amber-500/30 shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-amber-400 shrink-0">
                                                        🐉
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-zinc-200 text-sm hover:text-amber-300 transition-colors">
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
                                        
                                        <td className="px-6 py-4 w-72">
                                            <div className="flex justify-between items-center mb-1.5 text-xs">
                                                <span className="text-amber-400 font-extrabold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
                                                    Cấp {user.level}
                                                </span>
                                                <span className="text-zinc-400 font-mono font-bold">
                                                    {user.xp.toLocaleString('vi-VN')} XP
                                                </span>
                                            </div>
                                            <div className="w-full bg-zinc-950 rounded-full h-1.5 border border-zinc-800 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-amber-600 via-yellow-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500" 
                                                    style={{ width: `${Math.min((user.xp % 1000) / 10, 100) || 30}%` }}
                                                ></div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-center font-mono font-bold text-sm text-cyan-400 bg-cyan-950/10">
                                            {user.msgCount.toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-sm text-emerald-400 bg-emerald-950/10">
                                            {user.voiceMinutes.toLocaleString('vi-VN')}p
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.achievements.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.achievements.map((ach: string, i: number) => (
                                                        <span key={i} className="px-2.5 py-0.5 bg-gradient-to-r from-rose-500/15 to-orange-500/15 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm">
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
