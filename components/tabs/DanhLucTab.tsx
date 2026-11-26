/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
// components/tabs/DanhLucTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { buildSatTuongTitleMap, SatTuongBadge } from '@/lib/satTuongUtils';
import {
    normalizeVoHocName,
    resolveVoHocList,
    getSectStyle,
    getGwBadge,
    buildPointAnalytics,
    buildRecentPointHistory,
} from '@/lib/pointUtils';

export { normalizeVoHocName };

export type DanhLucSubTab = 'members' | 'merit';

interface Props {
    danhLuc: Record<string, any>;
    talentData?: Record<string, any>;
    tuViData?: Record<string, any>;
    pointData?: Record<string, any>;
    notificationsData?: any;
    isMaster?: boolean;
    wwmData?: any;
    satTuongData?: any;
    subTab?: DanhLucSubTab;
    onSubTabChange?: (next: DanhLucSubTab) => void;
    onOpenAdminSection?: (section: 'treasury' | 'members') => void;
}

type SortField = 'ingame' | 'discord' | 'class' | 'gw' | 'talent' | 'point';
type SortOrder = 'asc' | 'desc';
type MeritSortKey = 'rank' | 'point' | 'total';

export default function DanhLucTab({
    danhLuc,
    talentData = {},
    tuViData = {},
    pointData = {},
    notificationsData,
    isMaster = false,
    wwmData,
    satTuongData,
    subTab,
    onSubTabChange,
    onOpenAdminSection,
}: Props) {
    const [internalSubTab, setInternalSubTab] = useState<DanhLucSubTab>('members');
    const activeSubTab = subTab ?? internalSubTab;
    const setActiveSubTab = (next: DanhLucSubTab) => {
        if (onSubTabChange) onSubTabChange(next);
        else setInternalSubTab(next);
    };

    const satTuongTitleMap = useMemo(() => buildSatTuongTitleMap(satTuongData, danhLuc), [satTuongData, danhLuc]);

    // State Tab Con 1: Quân Số & Võ Học
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSectFilter, setSelectedSectFilter] = useState<string>('ALL');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
    const [selectedGwFilter, setSelectedGwFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortField, setSortField] = useState<SortField>('ingame');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // State Tab Con 2: Bảng Vàng Công Trạng
    const [meritSearch, setMeritSearch] = useState('');
    const [meritSort, setMeritSort] = useState<{ key: MeritSortKey; direction: 'asc' | 'desc' }>({
        key: 'total',
        direction: 'desc',
    });

    const voHocList = useMemo(() => resolveVoHocList(wwmData), [wwmData]);

    const sectSubtitles = useMemo(() => {
        const grouped: Record<string, string[]> = {
            MINH_KIM: [],
            LIET_THACH: [],
            KHIEN_TY: [],
            PHA_TRUC: [],
        };
        voHocList.forEach((vh) => {
            const sectKey = getSectStyle(vh).sectKey;
            if (!grouped[sectKey]) return;
            const match = vh.match(/\(([^)]+)\)/);
            const branch = (match ? match[1] : vh).trim();
            if (branch && !grouped[sectKey].includes(branch)) {
                grouped[sectKey].push(branch);
            }
        });
        return {
            MINH_KIM: grouped.MINH_KIM.join(' • ') || 'Vô Danh • Cửu Kiếm • Thương',
            LIET_THACH: grouped.LIET_THACH.join(' • ') || 'Tank • Dame',
            KHIEN_TY: grouped.KHIEN_TY.join(' • ') || 'Dame • Heal • Buff',
            PHA_TRUC: grouped.PHA_TRUC.join(' • ') || 'Song Đao • Dù • Quyền • Túy Quyền',
        };
    }, [voHocList]);

    // Dữ liệu Công Trạng dùng chung
    const pointAnalytics = useMemo(
        () => buildPointAnalytics(pointData, danhLuc),
        [pointData, danhLuc]
    );
    const recentPointHistory = useMemo(
        () => buildRecentPointHistory(notificationsData, pointAnalytics.rawPointList, danhLuc, 15),
        [notificationsData, pointAnalytics.rawPointList, danhLuc]
    );

    // 1. Xây dựng danh sách thành viên Sổ Danh Lục (kèm Xu hiện tại từ pointData)
    const { membersList, sectCounts } = useMemo(() => {
        const entries = Object.entries(danhLuc || {});
        const counts = {
            MINH_KIM: 0,
            LIET_THACH: 0,
            KHIEN_TY: 0,
            PHA_TRUC: 0,
            OTHER: 0,
        };

        const list = entries.map(([discordId, info]: [string, any]) => {
            const rawClass = info?.class || 'Chưa rõ';
            const normalizedClass = normalizeVoHocName(rawClass);
            const sectMeta = getSectStyle(normalizedClass);
            counts[sectMeta.sectKey as keyof typeof counts] =
                (counts[sectMeta.sectKey as keyof typeof counts] || 0) + 1;

            const rankProfile = tuViData?.[discordId];
            const discordDisplay =
                info?.discordName ||
                info?.discordUsername ||
                info?.username ||
                rankProfile?.name ||
                rankProfile?.username ||
                '';

            const userTalents = talentData?.[discordId] ? Object.entries(talentData[discordId]) : [];
            const pt = pointData?.[discordId];
            const currentXu = Number(pt?.points ?? pt?.point) || 0;
            const totalXu = Number(pt?.total_points ?? pt?.total) || 0;

            return {
                discordId,
                ingame: info?.ingame || info?.ten_game || discordDisplay || `Đệ tử #${discordId.slice(-4)}`,
                discordName: discordDisplay,
                avatar: info?.avatar || rankProfile?.avatar || null,
                gameUid: info?.uid || info?.pid || '—',
                rawClass,
                voHoc: normalizedClass,
                sectMeta,
                gwRaw: info?.gw || '',
                gwBadge: getGwBadge(info?.gw),
                talents: userTalents,
                talentCount: userTalents.length,
                currentXu,
                totalXu,
                satTuongTitle:
                    satTuongTitleMap[discordId] ||
                    (info?.ingame ? satTuongTitleMap[info.ingame.trim().toLowerCase()] : null),
            };
        });

        return { membersList: list, sectCounts: counts };
    }, [danhLuc, tuViData, talentData, pointData, satTuongTitleMap]);

    // 2. Lọc & sắp xếp cho Tab Con 1 (Quân Số)
    const filteredAndSortedMembers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        const filtered = membersList.filter((m) => {
            if (selectedSectFilter !== 'ALL' && m.sectMeta.sectKey !== selectedSectFilter) return false;
            if (selectedClassFilter !== 'ALL' && m.voHoc !== selectedClassFilter) return false;
            if (selectedGwFilter !== 'ALL' && m.gwBadge.code !== selectedGwFilter) return false;

            if (!q) return true;
            return (
                m.ingame.toLowerCase().includes(q) ||
                m.discordName.toLowerCase().includes(q) ||
                m.discordId.toLowerCase().includes(q) ||
                String(m.gameUid).toLowerCase().includes(q) ||
                m.voHoc.toLowerCase().includes(q)
            );
        });

        const gwWeight: Record<string, number> = {
            'Cả 2': 4,
            T7: 3,
            CN: 2,
            'Vắng': 1,
            'Chưa báo': 0,
        };

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'ingame') {
                cmp = a.ingame.localeCompare(b.ingame, 'vi');
            } else if (sortField === 'discord') {
                cmp = (a.discordName || a.discordId).localeCompare(b.discordName || b.discordId, 'vi');
            } else if (sortField === 'class') {
                cmp = a.voHoc.localeCompare(b.voHoc, 'vi');
            } else if (sortField === 'gw') {
                cmp = (gwWeight[a.gwBadge.code] || 0) - (gwWeight[b.gwBadge.code] || 0);
            } else if (sortField === 'talent') {
                cmp = a.talentCount - b.talentCount;
            } else if (sortField === 'point') {
                cmp = a.currentXu - b.currentXu;
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }, [membersList, searchQuery, selectedSectFilter, selectedClassFilter, selectedGwFilter, sortField, sortOrder]);

    const handleSortClick = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder(field === 'gw' || field === 'talent' || field === 'point' ? 'desc' : 'asc');
        }
    };

    // 3. Lọc & sắp xếp cho Tab Con 2 (Bảng Vàng Công Trạng)
    const sortedMeritList = useMemo(() => {
        const q = meritSearch.toLowerCase().trim();
        const { rawPointList, rankMap } = pointAnalytics;

        return rawPointList
            .filter((user) => {
                if (!q) return true;
                return (
                    user.name.toLowerCase().includes(q) ||
                    user.uid.toLowerCase().includes(q) ||
                    user.id.toLowerCase().includes(q) ||
                    user.voHoc.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                if (meritSort.key === 'rank') {
                    return meritSort.direction === 'asc'
                        ? rankMap[a.id] - rankMap[b.id]
                        : rankMap[b.id] - rankMap[a.id];
                }
                const valA = a[meritSort.key];
                const valB = b[meritSort.key];
                if (valA < valB) return meritSort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return meritSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [pointAnalytics, meritSearch, meritSort]);

    const handleMeritSort = (key: MeritSortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (meritSort.key === key && meritSort.direction === 'asc') direction = 'desc';
        setMeritSort({ key, direction });
    };

    const { highlights, topRichest, rankMap, rawPointList } = pointAnalytics;

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* 🟢 BANNER ĐẦU + THANH CHUYỂN 2 TAB CON */}
            <div className="bg-[#090d16]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-2">
                            <span>📜 SỔ ĐĂNG KÝ QUÂN SỐ &amp; CÔNG TRẠNG</span>
                            <span>•</span>
                            <span>ĐỒNG BỘ REAL-TIME VỚI DISCORD</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black leading-snug py-0.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                            📜 Sổ Danh Lục &amp; Công Trạng Tông Môn
                        </h2>
                    </div>

                    {/* 2 TAB CON + CÔNG CỤ */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setActiveSubTab('members')}
                                className={`px-3.5 py-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                    activeSubTab === 'members'
                                        ? 'bg-cyan-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                📜 Quân Số ({membersList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSubTab('merit')}
                                className={`px-3.5 py-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                    activeSubTab === 'merit'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                💰 Bảng Vàng Công Trạng ({highlights.totalVaultPoints.toLocaleString('vi-VN')} Xu)
                            </button>
                        </div>

                        {activeSubTab === 'members' && (
                            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`px-3 py-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                        viewMode === 'table' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    📋 Bảng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-2 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                        viewMode === 'grid' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    🪪 Thẻ RPG
                                </button>
                            </div>
                        )}

                        {isMaster && onOpenAdminSection && (
                            <button
                                type="button"
                                onClick={() => onOpenAdminSection(activeSubTab === 'merit' ? 'treasury' : 'members')}
                                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-amber-500/15 border border-zinc-700 hover:border-amber-500/40 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                            >
                                ⚙️ Thao Tác Quyền Bang Chủ ➔
                            </button>
                        )}
                    </div>
                </div>

                {/* SUMMARY / STATS THEO TỪNG TAB CON */}
                {activeSubTab === 'members' ? (
                    <>
                        {/* 4 THẺ THỐNG KÊ TỨ ĐẠI HỆ PHÁI */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <button
                                type="button"
                                onClick={() => { setSelectedSectFilter('ALL'); setSelectedClassFilter('ALL'); }}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selectedSectFilter === 'ALL'
                                        ? 'bg-zinc-900 border-white/50 shadow-lg'
                                        : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                                }`}
                            >
                                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">🏰 Toàn Tông Môn</div>
                                <div className="text-2xl font-black text-white font-mono mt-1">{membersList.length}</div>
                                <div className="text-[10px] text-zinc-500 mt-0.5">Tất cả hệ phái</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedSectFilter(selectedSectFilter === 'MINH_KIM' ? 'ALL' : 'MINH_KIM'); setSelectedClassFilter('ALL'); }}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selectedSectFilter === 'MINH_KIM'
                                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                        : 'bg-zinc-950/70 border-amber-500/20 hover:border-amber-500/50'
                                }`}
                            >
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">🗡️ Hệ Minh Kim</div>
                                <div className="text-2xl font-black text-amber-300 font-mono mt-1">{sectCounts.MINH_KIM}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">{sectSubtitles.MINH_KIM}</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedSectFilter(selectedSectFilter === 'LIET_THACH' ? 'ALL' : 'LIET_THACH'); setSelectedClassFilter('ALL'); }}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selectedSectFilter === 'LIET_THACH'
                                        ? 'bg-orange-950/40 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                                        : 'bg-zinc-950/70 border-orange-500/20 hover:border-orange-500/50'
                                }`}
                            >
                                <div className="text-[10px] font-black text-orange-400 uppercase tracking-wider">🪓 Hệ Liệt Thạch</div>
                                <div className="text-2xl font-black text-orange-300 font-mono mt-1">{sectCounts.LIET_THACH}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">{sectSubtitles.LIET_THACH}</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedSectFilter(selectedSectFilter === 'KHIEN_TY' ? 'ALL' : 'KHIEN_TY'); setSelectedClassFilter('ALL'); }}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selectedSectFilter === 'KHIEN_TY'
                                        ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                        : 'bg-zinc-950/70 border-emerald-500/20 hover:border-emerald-500/50'
                                }`}
                            >
                                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">☂️ Hệ Khiên Ty</div>
                                <div className="text-2xl font-black text-emerald-300 font-mono mt-1">{sectCounts.KHIEN_TY}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">{sectSubtitles.KHIEN_TY}</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => { setSelectedSectFilter(selectedSectFilter === 'PHA_TRUC' ? 'ALL' : 'PHA_TRUC'); setSelectedClassFilter('ALL'); }}
                                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selectedSectFilter === 'PHA_TRUC'
                                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                        : 'bg-zinc-950/70 border-cyan-500/20 hover:border-cyan-500/50'
                                }`}
                            >
                                <div className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">🎋 Hệ Phá Trúc</div>
                                <div className="text-2xl font-black text-cyan-300 font-mono mt-1">{sectCounts.PHA_TRUC}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">{sectSubtitles.PHA_TRUC}</div>
                            </button>
                        </div>

                        {/* THANH TÌM KIẾM & BỘ LỌC CHI TIẾT */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/80">
                            <div className="md:col-span-5">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="🔍 Tìm theo Tên In-game, @Tên Discord, UID hoặc Võ Học..."
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-medium focus:outline-none"
                                />
                            </div>

                            <div className="md:col-span-4">
                                <select
                                    value={selectedClassFilter}
                                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 focus:outline-none"
                                >
                                    <option value="ALL">⚔️ Lọc theo Nhánh Võ Học (Tất cả {voHocList.length} nhánh)</option>
                                    {voHocList.map((vh) => (
                                        <option key={vh} value={vh}>{vh}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-3">
                                <select
                                    value={selectedGwFilter}
                                    onChange={(e) => setSelectedGwFilter(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-300 focus:outline-none"
                                >
                                    <option value="ALL">🏯 Lịch Bang Chiến (Tất cả)</option>
                                    <option value="Cả 2">🔥 Đi Cả 2 Ngày (T7 &amp; CN)</option>
                                    <option value="T7">⚡ Chỉ đi Thứ 7</option>
                                    <option value="CN">☀️ Chỉ đi Chủ Nhật</option>
                                    <option value="Vắng">💤 Báo Vắng</option>
                                </select>
                            </div>
                        </div>
                    </>
                ) : (
                    /* 4 HIGHLIGHT TILES CÔNG TRẠNG */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-1">
                        <div className="bg-zinc-900/60 border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-3.5">
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

                        <div className="bg-zinc-900/60 border border-amber-500/25 rounded-2xl p-4 flex items-center gap-3.5">
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

                        <div className="bg-zinc-900/60 border border-yellow-500/25 rounded-2xl p-4 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shrink-0">
                                👑
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Phú Hộ</div>
                                <div className="text-sm font-black text-yellow-300 truncate" title={highlights.topPointUser?.name}>
                                    {highlights.topPointUser?.name || '--'}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                    {highlights.topPointUser ? `${highlights.topPointUser.point.toLocaleString('vi-VN')} Xu` : '--'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900/60 border border-rose-500/25 rounded-2xl p-4 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
                                ⚔️
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Công Thần</div>
                                <div className="text-sm font-black text-rose-300 truncate" title={highlights.topTotalUser?.name}>
                                    {highlights.topTotalUser?.name || '--'}
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                    {highlights.topTotalUser ? `${highlights.topTotalUser.total.toLocaleString('vi-VN')} Total` : '--'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ================= NỘI DUNG TAB CON 1: QUÂN SỐ & VÕ HỌC ================= */}
            {activeSubTab === 'members' && (
                viewMode === 'table' ? (
                    <div className="bg-[#090d16]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-950/90 border-b border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">
                                        <th className="py-3.5 px-4 w-14 text-center">#</th>
                                        <th
                                            onClick={() => handleSortClick('ingame')}
                                            className="py-3.5 px-4 cursor-pointer hover:text-amber-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>👤 Cao Thủ In-game &amp; Discord</span>
                                                {sortField === 'ingame' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                            </div>
                                        </th>
                                        <th className="py-3.5 px-4 font-mono">🆔 UID Game</th>
                                        <th
                                            onClick={() => handleSortClick('class')}
                                            className="py-3.5 px-4 cursor-pointer hover:text-emerald-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>⚔️ Nhánh Võ Học</span>
                                                {sortField === 'class' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortClick('gw')}
                                            className="py-3.5 px-4 cursor-pointer hover:text-rose-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>🏯 Bang Chiến</span>
                                                {sortField === 'gw' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortClick('talent')}
                                            className="py-3.5 px-4 cursor-pointer hover:text-cyan-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>👹 Lộ Trình Boss Talent</span>
                                                {sortField === 'talent' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                            </div>
                                        </th>
                                        <th
                                            onClick={() => handleSortClick('point')}
                                            className="py-3.5 px-4 text-right cursor-pointer hover:text-emerald-300 transition-colors"
                                        >
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span>💰 Xu</span>
                                                {sortField === 'point' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-xs">
                                    {filteredAndSortedMembers.map((m, idx) => (
                                        <tr
                                            key={m.discordId}
                                            className="hover:bg-zinc-900/50 transition-colors group"
                                        >
                                            <td className="py-3.5 px-4 text-center font-mono text-zinc-500 font-bold">
                                                {String(idx + 1).padStart(2, '0')}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-base shrink-0 shadow-inner">
                                                        {m.sectMeta.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-amber-300 group-hover:text-amber-200 transition-colors break-words flex items-center gap-1.5 flex-wrap">
                                                            <span>{m.ingame}</span>
                                                            {m.satTuongTitle && <SatTuongBadge titleInfo={m.satTuongTitle} size="xs" />}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                            <a
                                                                href={`https://discord.com/users/${m.discordId}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 transition-colors"
                                                                title={`Discord ID: ${m.discordId}`}
                                                            >
                                                                <span>💬</span>
                                                                <span>@{m.discordName || `ID:${m.discordId.slice(-5)}`}</span>
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-zinc-300">
                                                <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                                                    {m.gameUid}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${m.sectMeta.badgeClass}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${m.sectMeta.dotClass}`} />
                                                    <span>{m.voHoc}</span>
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className={`inline-block px-2.5 py-1 rounded-xl border text-[11px] font-bold ${m.gwBadge.cls}`}>
                                                    {m.gwBadge.label}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 max-w-xs">
                                                {m.talents.length === 0 ? (
                                                    <span className="text-[11px] text-zinc-600 italic">Chưa đăng ký Boss</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {m.talents.map(([bossName, milestones]: [string, any]) => (
                                                            <span
                                                                key={bossName}
                                                                className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-[10px] text-zinc-300"
                                                            >
                                                                <b className="text-amber-300">{bossName.split('(')[0].trim()}:</b>{' '}
                                                                {Array.isArray(milestones) ? milestones.join(', ') : String(milestones)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveSubTab('merit')}
                                                    title="Xem chi tiết trên Bảng Vàng Công Trạng"
                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 font-mono font-black text-emerald-300 text-xs transition-colors cursor-pointer"
                                                >
                                                    {m.currentXu.toLocaleString('vi-VN')} Xu
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredAndSortedMembers.map((m, idx) => (
                            <div
                                key={m.discordId}
                                className="bg-[#090d16]/90 border border-zinc-800/90 hover:border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3 transition-all hover:-translate-y-0.5"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lg shrink-0">
                                                {m.sectMeta.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-black text-amber-300 truncate flex items-center gap-1.5">
                                                    <span className="truncate">{m.ingame}</span>
                                                    {m.satTuongTitle && <SatTuongBadge titleInfo={m.satTuongTitle} size="xs" />}
                                                </div>
                                                <a
                                                    href={`https://discord.com/users/${m.discordId}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:underline truncate"
                                                >
                                                    <span>💬</span>
                                                    <span>@{m.discordName || `ID:${m.discordId.slice(-5)}`}</span>
                                                </a>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                                            #{String(idx + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${m.sectMeta.badgeClass}`}>
                                            {m.voHoc}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${m.gwBadge.cls}`}>
                                            {m.gwBadge.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                                    <span className="font-mono">🆔 UID: <b className="text-zinc-200">{m.gameUid}</b></span>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSubTab('merit')}
                                        className="font-mono font-black text-emerald-400 hover:underline cursor-pointer"
                                    >
                                        💰 {m.currentXu.toLocaleString('vi-VN')} Xu
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ================= NỘI DUNG TAB CON 2: BẢNG VÀNG CÔNG TRẠNG ================= */}
            {activeSubTab === 'merit' && (
                <div className="space-y-8">
                    {/* 👑 BỤC VINH QUANG PHÚ HỘ */}
                    {topRichest.length >= 3 && (
                        <div className="flex flex-col md:flex-row justify-center items-end gap-4 pt-8 md:pt-14 max-w-4xl mx-auto px-2">
                            {/* Hạng 2 */}
                            <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-44 order-2 md:order-1 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                                <div className="absolute -top-10 text-5xl drop-shadow-md">🥈</div>
                                <div className="font-bold text-lg text-zinc-200 truncate w-full text-center">{topRichest[1].name}</div>
                                <div className="text-sm text-zinc-400 mt-2">
                                    Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[1].point.toLocaleString('vi-VN')}</span> Xu
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
                                    Ngân khố: <span className="text-emerald-400 font-black font-mono text-xl">{topRichest[0].point.toLocaleString('vi-VN')}</span> Xu
                                </div>
                            </div>

                            {/* Hạng 3 */}
                            <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-40 order-3 md:order-3 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                                <div className="absolute -top-10 text-5xl drop-shadow-md">🥉</div>
                                <div className="font-bold text-lg text-emerald-200 truncate w-full text-center">{topRichest[2].name}</div>
                                <div className="text-sm text-zinc-400 mt-2">
                                    Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[2].point.toLocaleString('vi-VN')}</span> Xu
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🔍 THANH TÌM KIẾM BẢNG CÔNG TRẠNG */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
                        <div className="relative w-full sm:w-80">
                            <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-xs pointer-events-none">
                                🔍
                            </span>
                            <input
                                type="text"
                                value={meritSearch}
                                onChange={(e) => setMeritSearch(e.target.value)}
                                placeholder="Tìm đại hiệp, UID, võ học..."
                                className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none transition-colors placeholder:text-zinc-600"
                            />
                            {meritSearch && (
                                <button
                                    type="button"
                                    onClick={() => setMeritSearch('')}
                                    className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-zinc-500 font-mono">
                            Hiển thị <b className="text-zinc-300">{sortedMeritList.length}</b> / {rawPointList.length} Đại Hiệp
                        </div>
                    </div>

                    {/* 📜 BẢNG THỐNG KÊ CHI TIẾT CÔNG TRẠNG */}
                    <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md shadow-xl">
                        <table className="w-full text-left border-collapse min-w-[660px]">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                                    <th
                                        onClick={() => handleMeritSort('rank')}
                                        className="px-6 py-4 text-center w-32 cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>Hạng Công Thần</span>
                                            <span className="text-zinc-600 group-hover:text-emerald-400">
                                                {meritSort.key === 'rank' ? (meritSort.direction === 'asc' ? '▲' : '▼') : '↕️'}
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4">Đại Hiệp</th>
                                    <th
                                        onClick={() => handleMeritSort('point')}
                                        className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>💰 Xu Hiện Tại (Point)</span>
                                            <span className="text-zinc-600 group-hover:text-emerald-400">
                                                {meritSort.key === 'point' ? (meritSort.direction === 'asc' ? '▲' : '▼') : '↕️'}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleMeritSort('total')}
                                        className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>🏛️ Tổng Cống Hiến (Total)</span>
                                            <span className="text-zinc-600 group-hover:text-emerald-400">
                                                {meritSort.key === 'total' ? (meritSort.direction === 'asc' ? '▲' : '▼') : '↕️'}
                                            </span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/70 text-sm">
                                {sortedMeritList.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">
                                            🍃 Không tìm thấy đại hiệp nào khớp với từ khóa tìm kiếm...
                                        </td>
                                    </tr>
                                ) : (
                                    sortedMeritList.map((user) => {
                                        const userRank = rankMap[user.id];

                                        return (
                                            <tr key={user.id} className="hover:bg-zinc-900/60 transition-colors">
                                                <td className="px-6 py-4 text-center font-mono font-bold text-zinc-500 text-base">
                                                    {userRank === 1 ? (
                                                        <span className="text-2xl drop-shadow-md">🥇</span>
                                                    ) : userRank === 2 ? (
                                                        <span className="text-2xl drop-shadow-md">🥈</span>
                                                    ) : userRank === 3 ? (
                                                        <span className="text-2xl drop-shadow-md">🥉</span>
                                                    ) : (
                                                        <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 text-xs font-mono">
                                                            #{userRank}
                                                        </span>
                                                    )}
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
                                                            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm shrink-0">
                                                                {user.sectIcon}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-zinc-200 text-sm hover:text-emerald-300 transition-colors">
                                                                    {user.name}
                                                                </span>
                                                                {user.voHoc !== 'Chưa rõ' && (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                                                                        {user.voHoc}
                                                                    </span>
                                                                )}
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

                    {/* 📜 LỊCH SỬ BIẾN ĐỘNG CÔNG ĐỨC GẦN ĐÂY */}
                    <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/80 p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
                                <span>📜</span>
                                <span>Lịch Sử Biến Động Ngân Khố Gần Đây</span>
                            </h3>
                            <span className="text-xs text-zinc-500 font-mono">Đồng bộ từ Firebase</span>
                        </div>

                        {recentPointHistory.length === 0 ? (
                            <div className="text-xs text-zinc-500 italic py-4 text-center">
                                Chưa có giao dịch Công Đức nào được ghi nhận.
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/70">
                                {recentPointHistory.map((item) => (
                                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="flex items-start sm:items-center gap-2.5">
                                            <span
                                                className={`px-2 py-0.5 rounded-lg font-black font-mono border shrink-0 ${
                                                    item.type === 'CỘNG'
                                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                                }`}
                                            >
                                                {item.type === 'CỘNG' ? `+${item.amount}` : `-${item.amount}`} Xu
                                            </span>
                                            <div>
                                                <span className="font-bold text-zinc-200">{item.targetName}</span>
                                                {item.reason && (
                                                    <span className="text-zinc-400"> — {item.reason.split('\n')[0]}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-zinc-500 font-mono shrink-0">
                                            <span>👤 {item.actor}</span>
                                            {item.timeText && <span> • {item.relText || item.timeText}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}
