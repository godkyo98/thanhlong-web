/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/TalentTab.tsx
'use client';

import React, { useState, useMemo } from 'react';

interface Props {
    data: any;
    danhLuc: any;
}

interface BossRegistration {
    id: string;
    ingame: string;
    uid: string;
    avatar: string;
    className: string;
    mocs: string[];
}

export default function TalentTab({ data, danhLuc }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState<'ALL' | 'FULL' | 'NEED_MORE'>('ALL');
    const [copiedBoss, setCopiedBoss] = useState<string | null>(null);

    // Group players by Boss Name
    const bossGroups = useMemo<Record<string, BossRegistration[]>>(() => {
        const groups: Record<string, BossRegistration[]> = {};
        if (!data || typeof data !== 'object') return groups;

        for (const [userId, userBosses] of Object.entries(data)) {
            if (!userBosses || typeof userBosses !== 'object') continue;

            const dl = danhLuc?.[userId] || {};
            const ingame = dl.ingame || `Đại hiệp #${userId.slice(0, 5)}`;
            const uid = dl.uid || '';
            const avatar = dl.avatar || dl.image || '';
            const className = dl.class || '';

            for (const [bossName, milestones] of Object.entries(userBosses as Record<string, any>)) {
                if (!milestones || !Array.isArray(milestones) || milestones.length === 0) continue;
                if (!groups[bossName]) groups[bossName] = [];

                groups[bossName].push({
                    id: userId,
                    ingame,
                    uid,
                    avatar,
                    className,
                    mocs: milestones.map(String)
                });
            }
        }
        return groups;
    }, [data, danhLuc]);

    // Statistics for Hero Banner
    const stats = useMemo(() => {
        const bossList = Object.entries(bossGroups);
        const totalBosses = bossList.length;
        let totalRegistrations = 0;
        let mostPopularBoss = { name: '--', count: 0 };
        const userBossCount: Record<string, { name: string; count: number }> = {};

        bossList.forEach(([bossName, members]) => {
            totalRegistrations += members.length;
            if (members.length > mostPopularBoss.count) {
                mostPopularBoss = { name: bossName, count: members.length };
            }
            members.forEach(m => {
                if (!userBossCount[m.id]) userBossCount[m.id] = { name: m.ingame, count: 0 };
                userBossCount[m.id].count++;
            });
        });

        const topHunter = Object.values(userBossCount).sort((a, b) => b.count - a.count)[0] || { name: '--', count: 0 };

        return {
            totalBosses,
            totalRegistrations,
            mostPopularBoss,
            topHunter
        };
    }, [bossGroups]);

    // Filter and Search
    const filteredBosses = useMemo(() => {
        const list = Object.entries(bossGroups);
        const q = searchQuery.toLowerCase().trim();

        return list.filter(([bossName, members]) => {
            if (filterMode === 'FULL' && members.length < 3) return false;
            if (filterMode === 'NEED_MORE' && members.length >= 3) return false;

            if (q) {
                const matchBoss = bossName.toLowerCase().includes(q);
                const matchMember = members.some(m =>
                    m.ingame.toLowerCase().includes(q) ||
                    m.uid.toLowerCase().includes(q) ||
                    m.mocs.some(moc => moc.toLowerCase().includes(q))
                );
                if (!matchBoss && !matchMember) return false;
            }

            return true;
        }).sort((a, b) => b[1].length - a[1].length);
    }, [bossGroups, searchQuery, filterMode]);

    // Copy roster for Discord
    const handleCopyRoster = (bossName: string, members: BossRegistration[]) => {
        const text = `👹 **TỔ ĐỘI CHINH PHẠT THIÊN PHÚ BOSS: ${bossName}**\n` +
            members.map((m, idx) => `${idx + 1}. ${m.ingame} ${m.uid ? `(#${m.uid})` : ''} - Mốc: [${m.mocs.join(', ')}]`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedBoss(bossName);
        setTimeout(() => setCopiedBoss(null), 2500);
    };

    return (
        <section className="space-y-8 animate-fadeIn">
            {/* 👹 HERO BANNER: THIÊN PHÚ BOSS */}
            <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider">
                            <span>👹</span>
                            <span>Cáo Thị Tông Môn · Thiên Phú Boss</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-rose-300 to-amber-400">
                            BẢNG CÁO THỊ THIÊN PHÚ BOSS
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            Lộ trình tổ đội chinh phạt Boss ẩn, ghi danh mốc độ khó và chia sẻ quân lực đồng bộ thời gian thực từ Discord Bot.
                        </p>
                    </div>
                </div>

                {/* 4 HIGHLIGHT TILES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl shrink-0">
                            👹
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Mục Tiêu Boss</div>
                            <div className="text-xl sm:text-2xl font-black text-rose-400">{stats.totalBosses}</div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            👥
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Lượt Báo Danh</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-300">{stats.totalRegistrations}</div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-2xl shrink-0">
                            🔥
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Boss Nóng Nhất</div>
                            <div className="text-sm font-black text-orange-300 truncate max-w-[130px]" title={stats.mostPopularBoss.name}>
                                {stats.mostPopularBoss.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {stats.mostPopularBoss.count > 0 ? `${stats.mostPopularBoss.count} cao thủ` : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
                            🏹
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Thợ Săn Tích Cực</div>
                            <div className="text-sm font-black text-cyan-300 truncate max-w-[130px]" title={stats.topHunter.name}>
                                {stats.topHunter.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {stats.topHunter.count > 0 ? `${stats.topHunter.count} Boss ghi danh` : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔍 FILTER & SEARCH BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
                <div className="relative w-full sm:w-80">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-xs pointer-events-none">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tên Boss, cao thủ, mốc..."
                        className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:border-red-500/60 focus:outline-none transition-colors placeholder:text-zinc-600"
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

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setFilterMode('ALL')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterMode === 'ALL'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        Tất Cả ({Object.keys(bossGroups).length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterMode('FULL')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterMode === 'FULL'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        🔥 Đủ Đội (≥3)
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterMode('NEED_MORE')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            filterMode === 'NEED_MORE'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        📢 Cần Thêm (&lt;3)
                    </button>
                </div>
            </div>

            {/* 📜 BOSS CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                {!data ? (
                    <div className="col-span-full text-center py-16 text-zinc-500 animate-pulse">
                        🔮 Đang tải mật báo Thiên Phú Boss...
                    </div>
                ) : filteredBosses.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20 space-y-3">
                        <div className="text-5xl animate-bounce">🍃</div>
                        <div className="font-bold text-zinc-400">Không tìm thấy tổ đội Boss nào khớp với điều kiện lọc</div>
                        <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                            Đại hiệp có thể đặt lại từ khóa tìm kiếm hoặc dùng bot Discord để ghi danh vào lộ trình săn Boss!
                        </p>
                    </div>
                ) : (
                    filteredBosses.map(([bossName, members]) => (
                        <div
                            key={bossName}
                            className="group relative bg-zinc-950/80 border border-zinc-800/80 hover:border-red-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl overflow-hidden"
                        >
                            <div className="space-y-4">
                                {/* Card Header */}
                                <div className="flex justify-between items-start pb-3 border-b border-zinc-800/80 gap-2">
                                    <h3 className="text-base font-bold text-zinc-100 group-hover:text-red-300 transition-colors flex items-center gap-2 truncate">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                        <span className="truncate" title={bossName}>{bossName}</span>
                                    </h3>
                                    <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs rounded-full font-bold shrink-0">
                                        {members.length} Người
                                    </span>
                                </div>

                                {/* Members List */}
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                    {members.map((mem) => (
                                        <div
                                            key={mem.id}
                                            className="bg-zinc-900/50 hover:bg-zinc-900/90 border border-zinc-800/60 rounded-xl p-2.5 transition-all space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    {mem.avatar ? (
                                                        <img
                                                            src={mem.avatar}
                                                            alt={mem.ingame}
                                                            className="w-6 h-6 rounded-lg object-cover border border-amber-500/30 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-lg bg-zinc-800 text-[10px] flex items-center justify-center text-amber-400 shrink-0">
                                                            👤
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-xs text-zinc-200 truncate">
                                                        {mem.ingame}
                                                    </span>
                                                </div>

                                                {mem.uid && (
                                                    <span className="text-[9px] text-zinc-500 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                                                        #{mem.uid}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Milestones */}
                                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                {mem.mocs.map((m) => (
                                                    <span
                                                        key={m}
                                                        className="px-2 py-0.5 bg-gradient-to-r from-amber-500/10 to-red-500/10 text-amber-300 border border-amber-500/20 rounded-md text-[10px] font-mono font-semibold"
                                                    >
                                                        ✨ {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card Footer: Copy Team Button */}
                            <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
                                <span className="text-[11px] text-zinc-500 font-mono">
                                    Đội hình: <b className="text-zinc-300">{members.length} / 5</b>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCopyRoster(bossName, members)}
                                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                >
                                    <span>{copiedBoss === bossName ? '✅' : '📋'}</span>
                                    <span>{copiedBoss === bossName ? 'Đã chép' : 'Sao chép đội'}</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
