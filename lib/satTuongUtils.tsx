// lib/satTuongUtils.tsx
'use client';

import React from 'react';

export interface SatTuongTitleInfo {
    level: number;
    title: string;
    cleanTitle: string;
    icon: string;
    badgeStyle: {
        containerClass: string;
        textClass: string;
    };
}

/**
 * Thuật toán đối chiếu Danh Hiệu Sát Tướng chuẩn 100% theo Discord Bot Agent Kyo:
 * - 1 mùa (1đ): 🗡️ ✦ Võ Đạo Độc Tôn ✦
 * - 2 mùa (2đ): 🔥 ✦ Võ Đạo Độc Tôn +1 ✦
 * - 3 mùa (3đ): 🐉 ✦ Võ Đạo Độc Tôn +2 ✦
 * - N mùa (Nđ): 🌌 ✦ Võ Đạo Độc Tôn +(N-1) ✦
 */
export function resolveSatTuongTitle(rawVal: any): SatTuongTitleInfo | null {
    if (!rawVal && rawVal !== 0) return null;

    // 1. Trường hợp rawVal là chuỗi
    if (typeof rawVal === 'string') {
        const str = rawVal.trim();
        if (!str || str.toLowerCase() === 'chưa có' || str.toLowerCase() === 'none' || str.toLowerCase() === 'chưa đạt mốc') {
            return null;
        }

        const plusMatch = str.match(/võ đạo độc tôn\s*\+(\d+)/i);
        if (plusMatch) {
            const plusNum = Number(plusMatch[1]);
            return buildVoDaoTitle(plusNum + 1);
        }

        if (str.toLowerCase().includes('võ đạo độc tôn')) {
            return buildVoDaoTitle(1);
        }

        if (str.toLowerCase().includes('mài kiếm ngàn năm')) {
            return buildCustomTitle(12, '🌌 Mài Kiếm Ngàn Năm', 'Mài Kiếm Ngàn Năm', '🌌', 'bg-gradient-to-r from-purple-950/80 via-pink-950/70 to-indigo-950/80 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)] ring-1 ring-pink-400/50', 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-300 to-cyan-300 font-black');
        }
        if (str.toLowerCase().includes('kiếm mở cổng trời')) {
            return buildCustomTitle(9, '🐉 Kiếm Mở Cổng Trời', 'Kiếm Mở Cổng Trời', '🐉', 'bg-gradient-to-r from-amber-950/80 to-yellow-950/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.45)] ring-1 ring-amber-400/40', 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 font-black');
        }
        if (str.toLowerCase().includes('phi tướng thành long')) {
            return buildCustomTitle(6, '🔥 Phi Tướng Thành Long', 'Phi Tướng Thành Long', '🔥', 'bg-gradient-to-r from-red-950/60 to-orange-950/60 border-orange-500 shadow-[0_0_14px_rgba(239,68,68,0.3)]', 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-300 font-black');
        }

        const num = Number(str);
        if (!isNaN(num) && num > 0) {
            return buildVoDaoTitle(num);
        }
        return null;
    }

    // 2. Trường hợp rawVal là số
    if (typeof rawVal === 'number' && !isNaN(rawVal) && rawVal > 0) {
        return buildVoDaoTitle(rawVal);
    }

    return null;
}

function buildVoDaoTitle(level: number): SatTuongTitleInfo {
    if (level === 1) {
        return {
            level: 1,
            title: '✦ Võ Đạo Độc Tôn ✦',
            cleanTitle: '✦ Võ Đạo Độc Tôn ✦',
            icon: '🗡️',
            badgeStyle: {
                containerClass: 'bg-sky-950/70 border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.3)] ring-1 ring-sky-400/30',
                textClass: 'text-sky-300 font-black'
            }
        };
    }
    if (level === 2) {
        return {
            level: 2,
            title: '✦ Võ Đạo Độc Tôn +1 ✦',
            cleanTitle: '✦ Võ Đạo Độc Tôn +1 ✦',
            icon: '🔥',
            badgeStyle: {
                containerClass: 'bg-gradient-to-r from-orange-950/80 to-red-950/80 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.4)] ring-1 ring-orange-400/40',
                textClass: 'text-transparent bg-clip-text bg-gradient-to-r from-red-300 to-orange-300 font-black'
            }
        };
    }
    if (level === 3) {
        return {
            level: 3,
            title: '✦ Võ Đạo Độc Tôn +2 ✦',
            cleanTitle: '✦ Võ Đạo Độc Tôn +2 ✦',
            icon: '🐉',
            badgeStyle: {
                containerClass: 'bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-900/80 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.55)] ring-1 ring-amber-300/60',
                textClass: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 font-black drop-shadow'
            }
        };
    }
    // level >= 4
    return {
        level,
        title: `✦ Võ Đạo Độc Tôn +${level - 1} ✦`,
        cleanTitle: `✦ Võ Đạo Độc Tôn +${level - 1} ✦`,
        icon: '🌌',
        badgeStyle: {
            containerClass: 'bg-gradient-to-r from-purple-950/90 via-pink-950/80 to-indigo-950/90 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.6)] ring-1 ring-pink-400/50 animate-pulse',
            textClass: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-cyan-300 font-black'
        }
    };
}

function buildCustomTitle(
    level: number,
    title: string,
    cleanTitle: string,
    icon: string,
    containerClass: string,
    textClass: string
): SatTuongTitleInfo {
    return {
        level,
        title,
        cleanTitle,
        icon,
        badgeStyle: { containerClass, textClass }
    };
}

/**
 * Xây dựng map tra cứu Title Sát Tướng nhanh từ satTuongData và danhLuc
 */
export function buildSatTuongTitleMap(
    satTuongData: any,
    danhLucData: any
): Record<string, SatTuongTitleInfo> {
    const map: Record<string, SatTuongTitleInfo> = {};

    // 1. Quét từ satTuongData.seasonRanking
    const seasonRanking = satTuongData?.seasonRanking || satTuongData?.season_ranking || satTuongData?.seasons || {};
    Object.entries(seasonRanking).forEach(([uid, d]: [string, any]) => {
        const raw = typeof d === 'object' && d !== null ? (d.satTuongSeasonPts ?? d.seasonPts ?? d.points ?? d.title) : d;
        const res = resolveSatTuongTitle(raw);
        if (res) {
            map[uid] = res;
            if (typeof d === 'object' && d?.name) map[d.name.trim().toLowerCase()] = res;
            if (typeof d === 'object' && d?.username) map[d.username.trim().toLowerCase()] = res;
        }
    });

    // 2. Quét từ danh_luc_data
    if (danhLucData && typeof danhLucData === 'object') {
        Object.entries(danhLucData).forEach(([uid, info]: [string, any]) => {
            if (!info || typeof info !== 'object') return;
            const titleVal = info.satTuongTitle || info.sat_tuong_title || info.title || info.satTuongSeasonPts;
            const res = resolveSatTuongTitle(titleVal);
            if (res) {
                map[uid] = res;
                if (info.ingame) map[info.ingame.trim().toLowerCase()] = res;
            }
        });
    }

    return map;
}

/**
 * Component render Huy Hiệu Danh Hiệu Sát Tướng
 */
export function SatTuongBadge({
    titleInfo,
    showText = true,
    size = 'sm'
}: {
    titleInfo: SatTuongTitleInfo;
    showText?: boolean;
    size?: 'xs' | 'sm' | 'md';
}) {
    if (!titleInfo) return null;

    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-[9px] gap-1',
        sm: 'px-2 py-0.5 text-[10px] gap-1',
        md: 'px-2.5 py-1 text-xs gap-1.5'
    }[size];

    return (
        <span
            className={`inline-flex items-center rounded-lg border font-black tracking-wide backdrop-blur-sm transition-all hover:scale-105 cursor-default ${sizeClasses} ${titleInfo.badgeStyle.containerClass}`}
            title={`Danh Hiệu Sát Tướng: ${titleInfo.title}`}
        >
            <span className="shrink-0">{titleInfo.icon}</span>
            {showText && <span className={titleInfo.badgeStyle.textClass}>{titleInfo.cleanTitle}</span>}
        </span>
    );
}
