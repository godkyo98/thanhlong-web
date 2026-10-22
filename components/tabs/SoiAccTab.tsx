/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/SoiAccTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
    SlotKey,
    GearItem,
    CharacterBaseline,
    SLOTS_CONFIG,
    DEFAULT_STAT_OPTIONS,
    DEFAULT_GEAR_SETS,
    DEFAULT_WEAPON_TYPES,
    DEFAULT_ATTUNEMENT_OPTIONS,
    resolveStatGroupForSpec,
    TIER_BADGE_PREFIX,
    stripHardcodedTierPrefix,
    StatOption
} from './WwmBuildsTab';

interface Props {
    wwmBuilds: Record<string, any>;
    danhLuc: any;
    wwmData: any;
    session?: any;
    lang: 'vi' | 'en';
    setActiveTab?: (tab: any) => void;
}

interface BuildCardData {
    id: string;
    userId: string;
    spec: string;
    ingame: string;
    uid: string;
    avatar: string;
    discordName: string;
    baseline: CharacterBaseline;
    equipped: Record<SlotKey, GearItem>;
    arsenal96: any;
    innerWays: any;
    updatedAt: string;
    totalT0: number;
    totalT1: number;
    totalT2: number;
    totalT3: number;
    godLinesCount: number;
    buildScore: number;
    tierRank: {
        titleVi: string;
        titleEn: string;
        color: string;
        badgeClass: string;
        icon: string;
    };
    activeSets: { key: string; name: string; count: number }[];
    attunementSummary: { okCount: number; trapCount: number };
}

export default function SoiAccTab({
    wwmBuilds,
    danhLuc,
    wwmData,
    session,
    lang,
    setActiveTab
}: Props) {
    const isVi = lang === 'vi';

    // Filters and sorting
    const [selectedSpecFilter, setSelectedSpecFilter] = useState<string>('ALL');
    const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<string>('SCORE_DESC');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [inspectingBuild, setInspectingBuild] = useState<BuildCardData | null>(null);
    const [copiedBuildId, setCopiedBuildId] = useState<string | null>(null);

    // Dynamic stat lookup dictionary (combining local defaults and wwmData)
    const statDict = useMemo(() => {
        const dict: Record<string, StatOption> = {};
        DEFAULT_STAT_OPTIONS.forEach(s => {
            dict[s.key] = s;
        });

        // Also incorporate any custom stat definitions from wwmData if present
        if (wwmData?.STAT_MAP && typeof wwmData.STAT_MAP === 'object') {
            Object.entries(wwmData.STAT_MAP).forEach(([key, val]: any) => {
                if (!dict[key]) {
                    dict[key] = {
                        key,
                        labelVi: val.vi || val.label || key,
                        labelEn: val.en || val.label || key,
                        group: val.group || 'T2',
                        defaultVal: Number(val.defaultVal) || 0,
                        unit: val.unit || ''
                    };
                }
            });
        }
        return dict;
    }, [wwmData]);

    // Format stat label with effective tier badge for a specific spec
    const formatLineForSpec = (statKey: string, spec: string) => {
        const stat = statDict[statKey] || {
            key: statKey,
            labelVi: stripHardcodedTierPrefix(statKey),
            labelEn: stripHardcodedTierPrefix(statKey),
            group: 'T2',
            defaultVal: 0,
            unit: ''
        };
        const effTier = resolveStatGroupForSpec(stat, spec);
        const label = isVi ? stat.labelVi : (stat.labelEn || stat.labelVi);
        return {
            tier: effTier,
            badge: TIER_BADGE_PREFIX[effTier],
            label: stripHardcodedTierPrefix(label),
            unit: stat.unit || ''
        };
    };

    // Helper to get weapon or slot display title & icon
    const getSlotDisplay = (slotKey: SlotKey, item?: GearItem) => {
        const slotMeta = SLOTS_CONFIG.find(s => s.key === slotKey);
        if (!slotMeta) return { icon: '🛡️', title: slotKey };
        if (!slotMeta.isWeaponSlot) {
            return {
                icon: slotMeta.icon,
                title: isVi ? slotMeta.labelVi : slotMeta.labelEn
            };
        }
        const wp = DEFAULT_WEAPON_TYPES.find(w => w.key === item?.weaponType);
        if (wp) {
            return {
                icon: wp.icon,
                title: isVi ? `${slotMeta.labelVi} (${wp.labelVi})` : `${slotMeta.labelEn} (${wp.labelEn})`
            };
        }
        return {
            icon: slotMeta.icon,
            title: isVi ? slotMeta.labelVi : slotMeta.labelEn
        };
    };

    // Parse and enrich all builds from Firestore wwm_builds
    const allBuilds: BuildCardData[] = useMemo(() => {
        if (!wwmBuilds || typeof wwmBuilds !== 'object') return [];
        const result: BuildCardData[] = [];

        Object.entries(wwmBuilds).forEach(([specKey, specUsersMap]: any) => {
            if (!specUsersMap || typeof specUsersMap !== 'object') return;

            Object.entries(specUsersMap).forEach(([userId, rawBuild]: any) => {
                if (!rawBuild || typeof rawBuild !== 'object') return;

                // Match with Danh Lục for player details
                const dlEntry = danhLuc?.[userId] || {};
                const ingame = dlEntry.ingame || rawBuild.ingame || `Cao thủ #${userId.slice(0, 5)}`;
                const uid = dlEntry.uid || rawBuild.uid || '';
                const avatar = dlEntry.avatar || dlEntry.image || '';
                const discordName = dlEntry.discordName || '';

                const baseline: CharacterBaseline = rawBuild.baseline || {
                    agility: 0,
                    reqAgility: 0,
                    minPhysical: 0,
                    reqMinPhysical: 0,
                    minSilkbind: 0,
                    reqMinSilkbind: 0,
                    critRate: 0,
                    precisionRate: 0,
                    affinityRate: 0,
                    simulate23: false,
                    agiThreshold23: 0,
                    silkThreshold23: 0,
                    arsenal96Active: false
                };

                const equipped: Record<SlotKey, GearItem> = rawBuild.equipped || {};

                // Count lines and tiers
                let totalT0 = 0;
                let totalT1 = 0;
                let totalT2 = 0;
                let totalT3 = 0;
                let godLinesCount = 0;
                let attunementOk = 0;
                let attunementTrap = 0;
                const setCounts: Record<string, number> = {};

                SLOTS_CONFIG.forEach(slotMeta => {
                    const item = equipped[slotMeta.key];
                    if (!item) return;

                    // Set counting
                    if (item.gearSet) {
                        setCounts[item.gearSet] = (setCounts[item.gearSet] || 0) + 1;
                    }

                    // Attunement analysis
                    if (item.attunementKey) {
                        if (item.attunementKey === 'PHYS_PEN' || item.attunementKey === 'UMBRELLA_PROJECTILE_BOOST') {
                            attunementOk++;
                        } else if (item.attunementKey.startsWith('TRAP_')) {
                            attunementTrap++;
                        }
                    }

                    // Tuning lines analysis
                    const lines = Array.isArray(item.tuningLines) ? item.tuningLines : [];
                    lines.forEach(line => {
                        if (!line?.statKey) return;
                        const stat = statDict[line.statKey] || {
                            key: line.statKey,
                            labelVi: line.statKey,
                            labelEn: line.statKey,
                            group: 'T2',
                            defaultVal: 0,
                            unit: ''
                        };
                        const effTier = resolveStatGroupForSpec(stat, specKey);
                        if (effTier === 'T0') totalT0++;
                        else if (effTier === 'T1') totalT1++;
                        else if (effTier === 'T2') totalT2++;
                        else if (effTier === 'T3') totalT3++;

                        // Slot-specific BiS God line match
                        if (slotMeta.godLineKey && line.statKey === slotMeta.godLineKey) {
                            godLinesCount++;
                        }
                    });
                });

                // Calculate Build Score
                const buildScore = (totalT0 * 120) + (totalT1 * 35) + (totalT2 * 10) - (totalT3 * 15) + (attunementOk * 20) - (attunementTrap * 30);

                // Tier classification
                let tierRank = {
                    titleVi: '🛡️ Tiên Phong Nhập Đạo',
                    titleEn: '🛡️ Adept Pioneer',
                    color: 'text-zinc-400 border-zinc-700 bg-zinc-900/60',
                    badgeClass: 'from-zinc-700 to-zinc-900 border-zinc-600 text-zinc-300',
                    icon: '🛡️'
                };

                if (totalT0 >= 5) {
                    tierRank = {
                        titleVi: '🌌 Tuyệt Thế Thần Khí',
                        titleEn: '🌌 Supreme Godly Relic',
                        color: 'text-amber-300 border-amber-500/60 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
                        badgeClass: 'from-amber-500/30 via-yellow-500/20 to-amber-900/40 border-amber-400 text-amber-300',
                        icon: '🌌'
                    };
                } else if (totalT0 >= 3) {
                    tierRank = {
                        titleVi: '👑 Đỉnh Phong Tông Sư',
                        titleEn: '👑 Peak Grandmaster',
                        color: 'text-yellow-400 border-yellow-500/50 bg-yellow-950/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
                        badgeClass: 'from-yellow-500/25 via-amber-600/20 to-zinc-900 border-yellow-500 text-yellow-300',
                        icon: '👑'
                    };
                } else if (totalT0 >= 1 || totalT1 >= 8) {
                    tierRank = {
                        titleVi: '⚔️ Danh Môn Xuất Thế',
                        titleEn: '⚔️ Renowned Master',
                        color: 'text-purple-300 border-purple-500/40 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
                        badgeClass: 'from-purple-500/25 to-zinc-900 border-purple-400 text-purple-300',
                        icon: '⚔️'
                    };
                }

                // Active sets
                const activeSets: { key: string; name: string; count: number }[] = [];
                Object.entries(setCounts).forEach(([setKey, cnt]) => {
                    if (cnt >= 2) {
                        const setOpt = DEFAULT_GEAR_SETS.find(s => s.key === setKey);
                        const cleanName = setOpt ? (isVi ? setOpt.labelVi.split('(')[0].trim() : setOpt.labelEn) : setKey;
                        activeSets.push({ key: setKey, name: cleanName, count: cnt });
                    }
                });

                result.push({
                    id: `${specKey}__${userId}`,
                    userId,
                    spec: specKey,
                    ingame,
                    uid,
                    avatar,
                    discordName,
                    baseline,
                    equipped,
                    arsenal96: rawBuild.arsenal96,
                    innerWays: rawBuild.innerWays,
                    updatedAt: rawBuild.updatedAt || '',
                    totalT0,
                    totalT1,
                    totalT2,
                    totalT3,
                    godLinesCount,
                    buildScore,
                    tierRank,
                    activeSets,
                    attunementSummary: { okCount: attunementOk, trapCount: attunementTrap }
                });
            });
        });

        return result;
    }, [wwmBuilds, danhLuc, statDict, isVi]);

    // Available specs from data
    const availableSpecs = useMemo(() => {
        const set = new Set<string>();
        allBuilds.forEach(b => set.add(b.spec));
        if (wwmData?.VO_HOC_LIST && Array.isArray(wwmData.VO_HOC_LIST)) {
            wwmData.VO_HOC_LIST.forEach((s: string) => set.add(s));
        }
        return Array.from(set).filter(Boolean);
    }, [allBuilds, wwmData]);

    // Overall Highlights / Hall of Fame Stats
    const hallOfFame = useMemo<{
        totalBuilds: number;
        totalT0All: number;
        maxCritBuild: BuildCardData | null;
        maxMinPhysBuild: BuildCardData | null;
    }>(() => {
        let maxCritBuild: BuildCardData | null = null;
        let maxMinPhysBuild: BuildCardData | null = null;
        let totalT0All = 0;

        allBuilds.forEach(b => {
            totalT0All += b.totalT0;
            if (!maxCritBuild || (b.baseline.critRate || 0) > (maxCritBuild.baseline.critRate || 0)) {
                maxCritBuild = b;
            }
            if (!maxMinPhysBuild || (b.baseline.minPhysical || 0) > (maxMinPhysBuild.baseline.minPhysical || 0)) {
                maxMinPhysBuild = b;
            }
        });

        return {
            totalBuilds: allBuilds.length,
            totalT0All,
            maxCritBuild,
            maxMinPhysBuild
        };
    }, [allBuilds]);

    // Filter and Sort Builds
    const filteredBuilds = useMemo(() => {
        return allBuilds.filter(b => {
            // Spec filter
            if (selectedSpecFilter !== 'ALL') {
                if (selectedSpecFilter === 'SECT_SILKBIND' && !b.spec.includes('Khiên Ty') && !b.spec.includes('Kéo Tơ')) return false;
                if (selectedSpecFilter === 'SECT_BELLSTRIKE' && !b.spec.includes('Minh Kim') && !b.spec.includes('Chuông')) return false;
                if (selectedSpecFilter === 'SECT_STONESPLIT' && !b.spec.includes('Liệt Thạch') && !b.spec.includes('Xé Đá')) return false;
                if (selectedSpecFilter === 'SECT_BAMBOOCUT' && !b.spec.includes('Phá Trúc') && !b.spec.includes('Phá Tre')) return false;
                if (selectedSpecFilter === 'SECT_CUUKIEM' && !b.spec.includes('Cửu Kiếm')) return false;
                if (!selectedSpecFilter.startsWith('SECT_') && b.spec !== selectedSpecFilter) return false;
            }

            // Quality filter
            if (selectedTierFilter === 'T0_GE_5' && b.totalT0 < 5) return false;
            if (selectedTierFilter === 'T0_GE_3' && b.totalT0 < 3) return false;
            if (selectedTierFilter === 'T0_GE_1' && b.totalT0 < 1) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = b.ingame.toLowerCase().includes(q);
                const matchUid = b.uid.toLowerCase().includes(q);
                const matchDiscord = b.discordName.toLowerCase().includes(q);
                const matchSpec = b.spec.toLowerCase().includes(q);
                const matchSet = b.activeSets.some(s => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
                if (!matchName && !matchUid && !matchDiscord && !matchSpec && !matchSet) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'SCORE_DESC') return b.buildScore - a.buildScore;
            if (sortBy === 'CRIT_DESC') return (b.baseline.critRate || 0) - (a.baseline.critRate || 0);
            if (sortBy === 'PHYS_DESC') return (b.baseline.minPhysical || 0) - (a.baseline.minPhysical || 0);
            if (sortBy === 'PRECISION_DESC') return (b.baseline.precisionRate || 0) - (a.baseline.precisionRate || 0);
            if (sortBy === 'AFFINITY_DESC') return (b.baseline.affinityRate || 0) - (a.baseline.affinityRate || 0);
            if (sortBy === 'AGILITY_DESC') return (b.baseline.agility || 0) - (a.baseline.agility || 0);
            if (sortBy === 'DATE_DESC') return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
            return 0;
        });
    }, [allBuilds, selectedSpecFilter, selectedTierFilter, searchQuery, sortBy]);

    // Handle Transfer to Simulator in Thần Khí Các
    const handleOpenInSimulator = (build: BuildCardData) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('wwm_target_spec', build.spec);
            sessionStorage.setItem('wwm_target_user', build.userId);
        }
        if (setActiveTab) {
            setActiveTab('builds');
        }
    };

    // Handle Copy Build Code
    const handleCopyBuildData = (build: BuildCardData) => {
        const exportObj = {
            ingame: build.ingame,
            spec: build.spec,
            baseline: build.baseline,
            equipped: build.equipped,
            arsenal96: build.arsenal96,
            innerWays: build.innerWays,
            exportedAt: new Date().toISOString()
        };
        navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
        setCopiedBuildId(build.id);
        setTimeout(() => setCopiedBuildId(null), 3000);
    };

    // Format relative time helper
    const formatTimeAgo = (isoDate: string) => {
        if (!isoDate) return isVi ? 'Chưa cập nhật' : 'No date';
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        const diffMs = Date.now() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffHours < 1) return isVi ? 'Vừa xong' : 'Just now';
        if (diffHours < 24) return isVi ? `${diffHours} giờ trước` : `${diffHours}h ago`;
        if (diffDays < 30) return isVi ? `${diffDays} ngày trước` : `${diffDays}d ago`;
        return d.toLocaleDateString('vi-VN');
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* 👑 HERO BANNER: ĐÀI CHIẾU YÊU · THẦN KHÍ VẠN TƯỢNG */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                            <span>🪞</span>
                            <span>{isVi ? 'Đài Chiếu Yêu · Khoe Build & Chỉ Số Thần Khí' : 'Spirit Mirror · Build & Stat Showcase'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                            {isVi ? 'VẠN TƯỢNG THẦN KHÍ BẢNG' : 'PANTHEON OF LEGENDARY BUILDS'}
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            {isVi
                                ? 'Nơi quần hùng Thanh Long Sơn Trang phô diễn kỳ công tạo tác, khoe chỉ số đỉnh cao và chia sẻ bộ build thần khí (Đồng bộ thời gian thực với Thần Khí Các).'
                                : 'Where Thanh Long disciples showcase their mastercrafted gear, god-tier stat thresholds, and optimized builds (Synchronized real-time with Thần Khí Các).'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <button
                            type="button"
                            onClick={() => setActiveTab && setActiveTab('builds')}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <span>🔨</span>
                            <span>{isVi ? 'Vào Thần Khí Các Tạo/Chỉnh Build' : 'Open Thần Khí Các Simulator'}</span>
                        </button>
                    </div>
                </div>

                {/* 🌟 4 HERO STAT TILES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                            ⚔️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">{isVi ? 'Tổng Thần Khí' : 'Total Builds'}</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-400">{hallOfFame.totalBuilds}</div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shrink-0">
                            🌟
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">{isVi ? 'Dòng Thần T0 Toàn Bang' : 'Guild T0 God Lines'}</div>
                            <div className="text-xl sm:text-2xl font-black text-yellow-300">{hallOfFame.totalT0All}</div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
                            🎯
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">{isVi ? 'Đỉnh Phong Chí Mạng' : 'Peak Crit Rate'}</div>
                            <div className="text-xl sm:text-2xl font-black text-rose-400">
                                {hallOfFame.maxCritBuild?.baseline?.critRate ? `${hallOfFame.maxCritBuild.baseline.critRate.toFixed(1)}%` : '--%'}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                                {hallOfFame.maxCritBuild ? `👑 ${hallOfFame.maxCritBuild.ingame}` : ''}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
                            🗡️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">{isVi ? 'Đỉnh Phong Ngoại Công' : 'Peak Min Phys'}</div>
                            <div className="text-xl sm:text-2xl font-black text-cyan-400">
                                {hallOfFame.maxMinPhysBuild?.baseline?.minPhysical ? Number(hallOfFame.maxMinPhysBuild.baseline.minPhysical).toFixed(0) : '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                                {hallOfFame.maxMinPhysBuild ? `👑 ${hallOfFame.maxMinPhysBuild.ingame}` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔍 FILTER & SEARCH CONTROLS */}
            <div className="space-y-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 sm:p-5 shadow-lg">
                {/* Sect Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 pb-3">
                    <span className="text-xs text-zinc-400 font-bold mr-1 flex items-center gap-1">
                        <span>🥋</span>
                        <span>{isVi ? 'Môn Phái:' : 'Sect:'}</span>
                    </span>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'ALL'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        {isVi ? 'Tất Cả Môn Phái' : 'All Sects'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('SECT_SILKBIND')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'SECT_SILKBIND'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        ☂️ {isVi ? 'Khiên Ty (Kéo Tơ)' : 'Silkbind'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('SECT_BELLSTRIKE')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'SECT_BELLSTRIKE'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        🔔 {isVi ? 'Minh Kim (Chuông)' : 'Bellstrike'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('SECT_STONESPLIT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'SECT_STONESPLIT'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        🪨 {isVi ? 'Liệt Thạch (Xé Đá)' : 'Stonesplit'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('SECT_BAMBOOCUT')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'SECT_BAMBOOCUT'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        🎋 {isVi ? 'Phá Trúc (Phá Tre)' : 'Bamboocut'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedSpecFilter('SECT_CUUKIEM')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSpecFilter === 'SECT_CUUKIEM'
                                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                    >
                        🗡️ {isVi ? 'Cửu Kiếm' : 'Nine Swords'}
                    </button>

                    {/* Specific Spec Dropdown */}
                    <select
                        value={selectedSpecFilter}
                        onChange={(e) => setSelectedSpecFilter(e.target.value)}
                        className="bg-zinc-950 text-zinc-300 text-xs border border-zinc-800 rounded-xl px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                    >
                        <option value="ALL">🔍 {isVi ? '-- Chọn Nhánh Cụ Thể --' : '-- Specific Spec --'}</option>
                        {availableSpecs.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Sub-Filters: Search, Tier, Sorting */}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                    <div className="relative w-full sm:w-80">
                        <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-xs pointer-events-none">
                            🔍
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isVi ? 'Tìm tên đại hiệp, UID, bộ set...' : 'Search player, UID, gear set...'}
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

                    <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                        {/* Quality filter */}
                        <select
                            value={selectedTierFilter}
                            onChange={(e) => setSelectedTierFilter(e.target.value)}
                            className="bg-zinc-950 text-zinc-300 text-xs border border-zinc-800 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                        >
                            <option value="ALL">🌌 {isVi ? 'Tất Cả Phẩm Cấp' : 'All Tiers'}</option>
                            <option value="T0_GE_5">🌌 {isVi ? 'Thần Khí (≥ 5 Dòng T0)' : 'Godly (≥ 5 T0)'}</option>
                            <option value="T0_GE_3">👑 {isVi ? 'Tông Sư (≥ 3 Dòng T0)' : 'Master (≥ 3 T0)'}</option>
                            <option value="T0_GE_1">⚔️ {isVi ? 'Xuất Thế (≥ 1 Dòng T0)' : 'Adept (≥ 1 T0)'}</option>
                        </select>

                        {/* Sort by */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-zinc-950 text-amber-300 font-bold text-xs border border-zinc-800 rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                        >
                            <option value="SCORE_DESC">👑 {isVi ? 'Xếp: Điểm Thần Khí' : 'Sort: Build Score'}</option>
                            <option value="CRIT_DESC">🎯 {isVi ? 'Xếp: Tỉ Lệ Chí Mạng' : 'Sort: Critical Rate'}</option>
                            <option value="PHYS_DESC">🗡️ {isVi ? 'Xếp: Ngoại Công Min' : 'Sort: Min Physical'}</option>
                            <option value="PRECISION_DESC">⚡ {isVi ? 'Xếp: Chính Xác' : 'Sort: Precision'}</option>
                            <option value="AFFINITY_DESC">🔮 {isVi ? 'Xếp: Hiểu Ý' : 'Sort: Affinity'}</option>
                            <option value="AGILITY_DESC">🌪️ {isVi ? 'Xếp: Nhanh Nhẹn' : 'Sort: Agility'}</option>
                            <option value="DATE_DESC">🕒 {isVi ? 'Xếp: Mới Nhất' : 'Sort: Newest'}</option>
                        </select>

                        <div className="text-xs text-zinc-500 px-2 font-mono">
                            {filteredBuilds.length} / {allBuilds.length} {isVi ? 'Bộ' : 'Builds'}
                        </div>
                    </div>
                </div>
            </div>

            {/* 📜 SHOWCASE CARDS GRID */}
            {filteredBuilds.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBuilds.map((build) => {
                        const isOwn = session?.user && (build.userId === session.user.id || build.ingame === session.user.name);

                        return (
                            <div
                                key={build.id}
                                className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 ${
                                    build.totalT0 >= 5
                                        ? 'bg-gradient-to-b from-amber-950/30 via-zinc-950 to-zinc-950 border-amber-500/50 hover:border-amber-400'
                                        : build.totalT0 >= 3
                                        ? 'bg-gradient-to-b from-yellow-950/20 via-zinc-950 to-zinc-950 border-yellow-500/40 hover:border-yellow-400'
                                        : 'bg-zinc-950/80 border-zinc-800 hover:border-amber-500/40'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="p-5 pb-4 border-b border-zinc-800/80">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                {build.avatar ? (
                                                    <img
                                                        src={build.avatar}
                                                        alt={build.ingame}
                                                        className="w-12 h-12 rounded-xl object-cover border border-amber-500/40 shadow-md"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl text-amber-400 shadow-md">
                                                        🐉
                                                    </div>
                                                )}
                                                {isOwn && (
                                                    <span className="absolute -bottom-1 -right-1 text-[9px] bg-emerald-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full border border-zinc-900">
                                                        YOU
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="font-black text-sm sm:text-base text-zinc-100 group-hover:text-amber-300 transition-colors">
                                                        {build.ingame}
                                                    </h3>
                                                    {build.uid && (
                                                        <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                                            #{build.uid}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
                                                        🥋 {build.spec}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 font-mono">
                                                        {formatTimeAgo(build.updatedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rank Ribbon */}
                                        <div className={`text-[10px] font-black px-2.5 py-1 rounded-xl border bg-gradient-to-r shadow-sm shrink-0 flex items-center gap-1 ${build.tierRank.badgeClass}`}>
                                            <span>{build.tierRank.icon}</span>
                                            <span className="hidden xs:inline">{isVi ? build.tierRank.titleVi.replace(/^[^\s]+\s*/, '') : build.tierRank.titleEn.replace(/^[^\s]+\s*/, '')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Core Stat Showcase */}
                                <div className="p-5 py-4 space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">🎯 {isVi ? 'Chí Mạng' : 'Crit Rate'}</div>
                                            <div className="text-sm font-black text-rose-400 mt-0.5">
                                                {build.baseline.critRate ? `${Number(build.baseline.critRate).toFixed(1)}%` : '0%'}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">⚡ {isVi ? 'Chính Xác' : 'Precision'}</div>
                                            <div className="text-sm font-black text-amber-400 mt-0.5">
                                                {build.baseline.precisionRate ? `${Number(build.baseline.precisionRate).toFixed(1)}%` : '0%'}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">🔮 {isVi ? 'Hiểu Ý' : 'Affinity'}</div>
                                            <div className="text-sm font-black text-indigo-400 mt-0.5">
                                                {build.baseline.affinityRate ? `${Number(build.baseline.affinityRate).toFixed(1)}%` : '0%'}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">🌪️ {isVi ? 'Nhanh Nhẹn' : 'Agility'}</div>
                                            <div className="text-sm font-black text-sky-400 mt-0.5">
                                                {build.baseline.agility ? Number(build.baseline.agility).toFixed(0) : '0'}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">🗡️ {isVi ? 'Ngoại Min' : 'Min Phys'}</div>
                                            <div className="text-sm font-black text-emerald-400 mt-0.5">
                                                {build.baseline.minPhysical ? Number(build.baseline.minPhysical).toFixed(0) : '0'}
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 text-center">
                                            <div className="text-[10px] text-zinc-400 uppercase font-semibold">💫 {isVi ? 'Công Phái' : 'Spec Atk'}</div>
                                            <div className="text-sm font-black text-yellow-300 mt-0.5">
                                                {build.baseline.minSilkbind ? Number(build.baseline.minSilkbind).toFixed(0) : '--'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 8-Slot Equipment Mini Overview */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                                            <span className="font-semibold flex items-center gap-1">
                                                <span>🛡️</span>
                                                <span>{isVi ? 'Bát Đại Trang Bị' : '8 Equipped Pieces'}</span>
                                            </span>
                                            <span className="text-zinc-500 font-mono">
                                                {Object.keys(build.equipped).length} / 8 {isVi ? 'món' : 'pcs'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/60">
                                            {SLOTS_CONFIG.map(slot => {
                                                const eq = build.equipped[slot.key];
                                                const disp = getSlotDisplay(slot.key, eq);
                                                const hasItem = !!eq;

                                                return (
                                                    <div
                                                        key={slot.key}
                                                        title={`${disp.title}: ${eq?.name || (hasItem ? 'Đã trang bị' : 'Trống')}`}
                                                        className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                                                            hasItem
                                                                ? 'bg-zinc-950 border-amber-500/30 text-amber-300'
                                                                : 'bg-zinc-950/40 border-zinc-800 text-zinc-600 opacity-60'
                                                        }`}
                                                    >
                                                        <span className="text-sm sm:text-base">{disp.icon}</span>
                                                        <span className="text-[9px] font-mono mt-0.5 text-zinc-400">
                                                            {eq?.tier ? `Lv.${eq.tier}` : slot.slotNumber}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Set Bonuses and God Lines summary chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {/* God lines count */}
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                                            <span>🌟</span>
                                            <span>{build.totalT0} {isVi ? 'Dòng T0' : 'T0 Lines'}</span>
                                        </span>

                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                            <span>⚔️</span>
                                            <span>{build.totalT1} {isVi ? 'Dòng T1' : 'T1 Lines'}</span>
                                        </span>

                                        {/* Active Set Badges */}
                                        {build.activeSets.map(st => (
                                            <span
                                                key={st.key}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-700"
                                            >
                                                <span>🪷</span>
                                                <span>{st.count}x {st.name}</span>
                                            </span>
                                        ))}

                                        {/* Trap Warning if any */}
                                        {build.attunementSummary.trapCount > 0 && (
                                            <span
                                                title={isVi ? 'Có định âm bị bẫy' : 'Has trap attunements'}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                            >
                                                <span>⚠️</span>
                                                <span>{build.attunementSummary.trapCount} {isVi ? 'Dòng Bẫy' : 'Traps'}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="p-4 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setInspectingBuild(build)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <span>👁️</span>
                                        <span>{isVi ? 'Khai Triển Thiên Nhãn' : 'Deep Inspect'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenInSimulator(build)}
                                        title={isVi ? 'Thử nghiệm & Tối ưu hóa build này ở Thần Khí Các' : 'Load this build into Thần Khí Các Simulator'}
                                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <span>🚀</span>
                                        <span className="hidden sm:inline">{isVi ? 'Thần Khí Các' : 'Simulator'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCopyBuildData(build)}
                                        title={isVi ? 'Sao chép dữ liệu build dạng JSON' : 'Copy build JSON'}
                                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 text-xs transition-all cursor-pointer"
                                    >
                                        {copiedBuildId === build.id ? '✅' : '📋'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Empty state */
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-12 text-center space-y-4">
                    <div className="text-6xl animate-bounce">🪞</div>
                    <h3 className="text-xl font-bold text-amber-400">
                        {isVi ? 'Chưa Tìm Thấy Bộ Thần Khí Nào Khớp Bộ Lọc' : 'No Builds Found Matching Filters'}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                        {isVi
                            ? 'Chư vị đại hiệp có thể bấm xóa bộ lọc hoặc là người đầu tiên khảm nạm thần khí của mình lên Đài Chiếu Yêu thông qua Thần Khí Các!'
                            : 'You can reset the filters or be the first disciple to forge and showcase your build via Thần Khí Các!'}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedSpecFilter('ALL');
                                setSelectedTierFilter('ALL');
                                setSearchQuery('');
                            }}
                            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                        >
                            {isVi ? '🔄 Đặt Lại Bộ Lọc' : 'Reset Filters'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab && setActiveTab('builds')}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                        >
                            🔨 {isVi ? 'Vào Thần Khí Các Tạo Ngay' : 'Create Build in Simulator'}
                        </button>
                    </div>
                </div>
            )}

            {/* 👁️ DEEP INSPECTION MODAL: KHAI TRIỂN THIÊN NHÃN */}
            {inspectingBuild && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="relative w-full max-w-5xl max-h-[90vh] bg-zinc-950 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 sm:p-6 bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950/30 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-3.5">
                                <div className="text-3xl">🪞</div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg sm:text-xl font-black text-amber-300">
                                            {isVi ? 'KHAI TRIỂN THIÊN NHÃN · THẦN KHÍ CHI TIẾT' : 'DIVINE INSPECTION · GEAR DETAILS'}
                                        </h2>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border bg-gradient-to-r ${inspectingBuild.tierRank.badgeClass}`}>
                                            {isVi ? inspectingBuild.tierRank.titleVi : inspectingBuild.tierRank.titleEn}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        {isVi ? 'Chủ nhân:' : 'Owner:'} <b className="text-zinc-200">{inspectingBuild.ingame}</b>
                                        {inspectingBuild.uid && <span className="font-mono text-zinc-500 ml-1">({inspectingBuild.uid})</span>}
                                        {' · '}
                                        <span className="text-amber-400 font-bold">{inspectingBuild.spec}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenInSimulator(inspectingBuild)}
                                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs transition-all shadow-md cursor-pointer"
                                >
                                    <span>🚀</span>
                                    <span>{isVi ? 'Thử Nghiệm Ở Thần Khí Các' : 'Open in Simulator'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInspectingBuild(null)}
                                    className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Scrollable */}
                        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {/* Summary Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                                <div className="text-center">
                                    <div className="text-[11px] text-zinc-400 uppercase font-semibold">🎯 {isVi ? 'Tỉ Lệ Chí Mạng' : 'Critical Rate'}</div>
                                    <div className="text-lg font-black text-rose-400 mt-0.5">
                                        {inspectingBuild.baseline.critRate ? `${Number(inspectingBuild.baseline.critRate).toFixed(1)}%` : '0%'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[11px] text-zinc-400 uppercase font-semibold">⚡ {isVi ? 'Chính Xác' : 'Precision Rate'}</div>
                                    <div className="text-lg font-black text-amber-400 mt-0.5">
                                        {inspectingBuild.baseline.precisionRate ? `${Number(inspectingBuild.baseline.precisionRate).toFixed(1)}%` : '0%'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[11px] text-zinc-400 uppercase font-semibold">🗡️ {isVi ? 'Ngoại Công Min' : 'Min Physical Atk'}</div>
                                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                                        {inspectingBuild.baseline.minPhysical ? Number(inspectingBuild.baseline.minPhysical).toFixed(0) : '0'}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[11px] text-zinc-400 uppercase font-semibold">🌟 {isVi ? 'Tổng Dòng T0' : 'Total T0 Lines'}</div>
                                    <div className="text-lg font-black text-yellow-300 mt-0.5">
                                        {inspectingBuild.totalT0} {isVi ? 'Dòng' : 'Lines'}
                                    </div>
                                </div>
                            </div>

                            {/* Dual Column Gear Display: Left (Weapons + Jewelry) & Right (Armor) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side: 4 Binh Khí & Trang Sức */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-black text-amber-400 uppercase tracking-wider">
                                        <span>⚔️</span>
                                        <span>{isVi ? 'Binh Khí & Trang Sức (Tả Dực)' : 'Weapons & Jewelry (Left Side)'}</span>
                                    </div>

                                    {SLOTS_CONFIG.filter(s => s.side === 'left').map(slot => {
                                        const item = inspectingBuild.equipped[slot.key];
                                        const disp = getSlotDisplay(slot.key, item);
                                        const setOpt = DEFAULT_GEAR_SETS.find(s => s.key === item?.gearSet);
                                        const setName = setOpt ? (isVi ? setOpt.labelVi.split('(')[0].trim() : setOpt.labelEn) : (item?.gearSet || 'Mặc định');

                                        return (
                                            <div
                                                key={slot.key}
                                                className="bg-zinc-900/60 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-md"
                                            >
                                                {/* Slot Header */}
                                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{disp.icon}</span>
                                                        <span className="font-black text-sm text-zinc-200">{disp.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                                            {item?.tier ? `Bậc ${item.tier}` : 'Bậc 100'}
                                                        </span>
                                                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
                                                            {setName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Attunement Line */}
                                                {item?.attunementKey && (
                                                    <div className="text-xs bg-indigo-950/20 border border-indigo-950/40 rounded-xl p-2.5 flex items-center justify-between">
                                                        <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                                                            <span>✨</span>
                                                            <span>{isVi ? 'Khai Khiếu:' : 'Attunement:'}</span>
                                                            <b className="text-indigo-200">
                                                                {DEFAULT_ATTUNEMENT_OPTIONS.find(a => a.key === item.attunementKey)?.labelVi.replace(/^(\[.*?\]|🚨|✅)\s*/g, '') || item.attunementKey}
                                                            </b>
                                                        </span>
                                                        {item.attunementValue > 0 && (
                                                            <span className="text-indigo-400 font-mono font-black">
                                                                +{item.attunementValue}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 4 Tuning Lines */}
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                                                        {isVi ? 'Dòng Tẩy Luyện (Tuning Lines):' : 'Tuning Lines:'}
                                                    </div>

                                                    {Array.isArray(item?.tuningLines) && item.tuningLines.length > 0 ? (
                                                        item.tuningLines.map((line, idx) => {
                                                            const formatted = formatLineForSpec(line.statKey, inspectingBuild.spec);
                                                            const isSlotGod = slot.godLineKey === line.statKey;

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                                                        formatted.tier === 'T0'
                                                                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 font-bold'
                                                                            : formatted.tier === 'T1'
                                                                            ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                                                                            : formatted.tier === 'T2'
                                                                            ? 'bg-sky-500/5 border-sky-500/20 text-sky-300'
                                                                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="shrink-0 font-mono text-[10px]">{formatted.badge}</span>
                                                                        <span className="truncate">{formatted.label}</span>
                                                                        {isSlotGod && (
                                                                            <span className="text-[9px] bg-yellow-400 text-zinc-950 font-black px-1 rounded shrink-0">
                                                                                GOD
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-mono font-bold shrink-0 ml-2">
                                                                        +{line.value}{formatted.unit}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="text-xs text-zinc-600 italic py-1">
                                                            {isVi ? 'Chưa khảm nạm dòng tẩy luyện' : 'No tuning lines'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Right Side: 4 Phòng Cụ (Mũ, Áo, Giáp Chân, Hộ Uyển) */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-black text-amber-400 uppercase tracking-wider">
                                        <span>🛡️</span>
                                        <span>{isVi ? 'Phòng Cụ & Giáp Trụ (Hữu Dực)' : 'Armor & Defense (Right Side)'}</span>
                                    </div>

                                    {SLOTS_CONFIG.filter(s => s.side === 'right').map(slot => {
                                        const item = inspectingBuild.equipped[slot.key];
                                        const disp = getSlotDisplay(slot.key, item);
                                        const setOpt = DEFAULT_GEAR_SETS.find(s => s.key === item?.gearSet);
                                        const setName = setOpt ? (isVi ? setOpt.labelVi.split('(')[0].trim() : setOpt.labelEn) : (item?.gearSet || 'Mặc định');

                                        return (
                                            <div
                                                key={slot.key}
                                                className="bg-zinc-900/60 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl p-4 space-y-3 transition-all shadow-md"
                                            >
                                                {/* Slot Header */}
                                                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{disp.icon}</span>
                                                        <span className="font-black text-sm text-zinc-200">{disp.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                                            {item?.tier ? `Bậc ${item.tier}` : 'Bậc 100'}
                                                        </span>
                                                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
                                                            {setName}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Attunement Line */}
                                                {item?.attunementKey && (
                                                    <div className={`text-xs rounded-xl p-2.5 flex items-center justify-between border ${
                                                        item.attunementKey.startsWith('TRAP_')
                                                            ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                                                            : 'bg-indigo-950/20 border-indigo-950/40 text-indigo-300'
                                                    }`}>
                                                        <span className="font-medium flex items-center gap-1.5">
                                                            <span>{item.attunementKey.startsWith('TRAP_') ? '🚨' : '✨'}</span>
                                                            <span>{isVi ? 'Định Âm:' : 'Attunement:'}</span>
                                                            <b className="text-zinc-200">
                                                                {DEFAULT_ATTUNEMENT_OPTIONS.find(a => a.key === item.attunementKey)?.labelVi.replace(/^(\[.*?\]|🚨|✅)\s*/g, '') || item.attunementKey}
                                                            </b>
                                                        </span>
                                                        {item.attunementValue > 0 && (
                                                            <span className="font-mono font-black">
                                                                +{item.attunementValue}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* 4 Tuning Lines */}
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] text-zinc-500 uppercase font-semibold">
                                                        {isVi ? 'Dòng Tẩy Luyện (Tuning Lines):' : 'Tuning Lines:'}
                                                    </div>

                                                    {Array.isArray(item?.tuningLines) && item.tuningLines.length > 0 ? (
                                                        item.tuningLines.map((line, idx) => {
                                                            const formatted = formatLineForSpec(line.statKey, inspectingBuild.spec);
                                                            const isSlotGod = slot.godLineKey === line.statKey;

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                                                        formatted.tier === 'T0'
                                                                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300 font-bold'
                                                                            : formatted.tier === 'T1'
                                                                            ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                                                                            : formatted.tier === 'T2'
                                                                            ? 'bg-sky-500/5 border-sky-500/20 text-sky-300'
                                                                            : 'bg-zinc-950/40 border-zinc-800 text-zinc-400'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="shrink-0 font-mono text-[10px]">{formatted.badge}</span>
                                                                        <span className="truncate">{formatted.label}</span>
                                                                        {isSlotGod && (
                                                                            <span className="text-[9px] bg-yellow-400 text-zinc-950 font-black px-1 rounded shrink-0">
                                                                                GOD
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-mono font-bold shrink-0 ml-2">
                                                                        +{line.value}{formatted.unit}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="text-xs text-zinc-600 italic py-1">
                                                            {isVi ? 'Chưa khảm nạm dòng tẩy luyện' : 'No tuning lines'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleCopyBuildData(inspectingBuild)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
                            >
                                <span>{copiedBuildId === inspectingBuild.id ? '✅' : '📋'}</span>
                                <span>{copiedBuildId === inspectingBuild.id ? (isVi ? 'Đã Sao Chép Mã' : 'Copied!') : (isVi ? 'Sao Chép Mã Build (JSON)' : 'Copy Build JSON')}</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenInSimulator(inspectingBuild)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-black text-xs transition-all shadow-md cursor-pointer"
                                >
                                    <span>🚀</span>
                                    <span>{isVi ? 'Thử Nghiệm Ở Thần Khí Các' : 'Load in Simulator'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInspectingBuild(null)}
                                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                                >
                                    {isVi ? 'Đóng Thiên Nhãn' : 'Close'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
