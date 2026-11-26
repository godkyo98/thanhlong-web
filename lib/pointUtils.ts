/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/pointUtils.ts
import {
    WebNotificationItem,
    formatRelativeVi,
    formatViDateTime,
} from '@/lib/notifications';

export const LEGACY_CLASS_MAP: Record<string, string> = {
    'Tiếng Chuông Vang (Vô Danh)': 'Minh Kim (Vô Danh)',
    'Chung Minh (Vô Danh)': 'Minh Kim (Vô Danh)',
    'Tiếng Chuông Vang (Cửu Kiếm)': 'Minh Kim (Cửu Kiếm)',
    'Chung Minh (Cửu Kiếm)': 'Minh Kim (Cửu Kiếm)',
    'Xé Đá (Tank)': 'Liệt Thạch (Tank)',
    'Xé Đá (Dame)': 'Liệt Thạch (Dame)',
    'Kéo Tơ (Dame)': 'Khiên Ty (Dame)',
    'Kéo Tơ (Heal)': 'Khiên Ty (Heal)',
    'Kéo Tơ (Buff)': 'Khiên Ty (Buff)',
    'Phá Tre (Song Đao)': 'Phá Trúc (Song Đao)',
    'Phá Tre (Dù)': 'Phá Trúc (Dù)',
    'Phá Tre (Quyền)': 'Phá Trúc (Quyền)',
    'Phá Tre (Túy Quyền)': 'Phá Trúc (Túy Quyền)',
};

export const DEFAULT_VO_HOC_LIST = [
    'Minh Kim (Vô Danh)',
    'Minh Kim (Cửu Kiếm)',
    'Minh Kim (Thương)',
    'Liệt Thạch (Tank)',
    'Liệt Thạch (Dame)',
    'Khiên Ty (Dame)',
    'Khiên Ty (Heal)',
    'Phá Trúc (Song Đao)',
    'Phá Trúc (Dù)',
    'Phá Trúc (Quyền)',
    'Phá Trúc (Túy Quyền)',
    'Khiên Ty (Buff)',
];

export function normalizeVoHocName(rawClass?: string): string {
    if (!rawClass || rawClass === 'Chưa rõ') return 'Chưa rõ';
    const trimmed = rawClass.trim();
    if (LEGACY_CLASS_MAP[trimmed]) return LEGACY_CLASS_MAP[trimmed];

    return trimmed
        .replace(/^(Tiếng Chuông Vang|Chung Minh)/i, 'Minh Kim')
        .replace(/^Xé Đá/i, 'Liệt Thạch')
        .replace(/^Kéo Tơ/i, 'Khiên Ty')
        .replace(/^Phá Tre/i, 'Phá Trúc');
}

export function resolveVoHocList(wwmData?: any): string[] {
    const raw = wwmData?.VO_HOC_LIST;
    if (Array.isArray(raw) && raw.length > 0) {
        return raw.filter(Boolean).map(String);
    }
    if (raw && typeof raw === 'object') {
        return Object.keys(raw)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => String(raw[k]))
            .filter(Boolean);
    }
    return DEFAULT_VO_HOC_LIST;
}

export function getSectStyle(voHoc: string) {
    if (voHoc.includes('Minh Kim')) {
        return {
            sectKey: 'MINH_KIM',
            sectName: 'Minh Kim',
            icon: '🗡️',
            badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
            dotClass: 'bg-amber-400',
        };
    }
    if (voHoc.includes('Liệt Thạch')) {
        return {
            sectKey: 'LIET_THACH',
            sectName: 'Liệt Thạch',
            icon: '🪓',
            badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
            dotClass: 'bg-orange-400',
        };
    }
    if (voHoc.includes('Khiên Ty')) {
        return {
            sectKey: 'KHIEN_TY',
            sectName: 'Khiên Ty',
            icon: '☂️',
            badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
            dotClass: 'bg-emerald-400',
        };
    }
    if (voHoc.includes('Phá Trúc')) {
        return {
            sectKey: 'PHA_TRUC',
            sectName: 'Phá Trúc',
            icon: '🎋',
            badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
            dotClass: 'bg-cyan-400',
        };
    }
    return {
        sectKey: 'OTHER',
        sectName: 'Chưa Phân Phái',
        icon: '⚔️',
        badgeClass: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
        dotClass: 'bg-zinc-500',
    };
}

export function getGwBadge(gwStatus?: string) {
    const val = (gwStatus || '').trim();
    if (val === 'Cả 2' || val.toLowerCase().includes('cả')) {
        return { label: '🔥 Cả 2 Ngày (T7 & CN)', code: 'Cả 2', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
    if (val === 'T7' || val.toLowerCase().includes('thứ 7')) {
        return { label: '⚡ Chiến Thứ 7', code: 'T7', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (val === 'CN' || val.toLowerCase().includes('chủ nhật')) {
        return { label: '☀️ Chiến Chủ Nhật', code: 'CN', cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    }
    if (val === 'Vắng' || val.toLowerCase().includes('vắng')) {
        return { label: '💤 Báo Vắng', code: 'Vắng', cls: 'bg-zinc-800/80 text-zinc-500 border-zinc-700' };
    }
    return { label: '⏳ Chưa Báo Danh', code: 'Chưa báo', cls: 'bg-zinc-900 text-zinc-500 border-zinc-800' };
}

export interface PointRecord {
    id: string;
    name: string;
    uid: string;
    avatar: string;
    voHoc: string;
    sectIcon: string;
    point: number;
    total: number;
    lastAction: any;
    hiddenFlag: boolean;
    isOutsideDanhLuc: boolean;
}

export interface MemberCandidate {
    id: string;
    name: string;
    discordName: string;
    uid: string;
    avatar: string;
    point: number;
    total: number;
    isOutsideDanhLuc: boolean;
}

export interface RecentPointTx {
    id: string;
    type: 'CỘNG' | 'TRỪ';
    amount: number;
    targetName: string;
    actor: string;
    reason: string;
    timeText: string;
    relText: string;
    balanceAfter?: number;
}

export function buildPointAnalytics(pointData: any, danhLuc: any) {
    const hasDanhLuc = Boolean(danhLuc && Object.keys(danhLuc).length > 0);
    const allPointRecords: PointRecord[] = [];

    if (pointData && typeof pointData === 'object') {
        Object.entries(pointData).forEach(([id, d]: [string, any]) => {
            const dl = danhLuc?.[id];
            const isOutsideDanhLuc = hasDanhLuc && !dl;
            const voHoc = normalizeVoHocName(dl?.class);
            const sectMeta = getSectStyle(voHoc);

            if (!d || typeof d !== 'object') {
                allPointRecords.push({
                    id,
                    name: dl?.ingame || `Khách (#${id.substring(0, 4)})`,
                    uid: dl?.uid || '',
                    avatar: dl?.avatar || dl?.image || '',
                    voHoc,
                    sectIcon: sectMeta.icon,
                    point: 0,
                    total: 0,
                    lastAction: null,
                    hiddenFlag: false,
                    isOutsideDanhLuc,
                });
                return;
            }

            const officialName =
                dl?.ingame || d.name || d.username || d.displayName || `Khách (#${id.substring(0, 4)})`;

            allPointRecords.push({
                id,
                name: officialName,
                uid: dl?.uid || '',
                avatar: dl?.avatar || dl?.image || '',
                voHoc,
                sectIcon: sectMeta.icon,
                point: Number(d.points ?? d.point) || 0,
                total: Number(d.total_points ?? d.total) || 0,
                lastAction: d.last_action || null,
                hiddenFlag: Boolean(d.hidden),
                isOutsideDanhLuc,
            });
        });
    }

    const rawPointList = allPointRecords.filter((u) => !u.isOutsideDanhLuc && !u.hiddenFlag);
    const outsideRecords = allPointRecords.filter((u) => u.isOutsideDanhLuc || u.hiddenFlag);
    const totalRankedList = [...rawPointList].sort((a, b) => b.total - a.total);
    const rankMap: Record<string, number> = {};
    totalRankedList.forEach((user, index) => {
        rankMap[user.id] = index + 1;
    });

    const topRichest = [...rawPointList].sort((a, b) => b.point - a.point).slice(0, 3);

    let totalVaultPoints = 0;
    let totalHistoricalPoints = 0;
    rawPointList.forEach((u) => {
        totalVaultPoints += u.point;
        totalHistoricalPoints += u.total;
    });

    return {
        allPointRecords,
        rawPointList,
        outsideRecords,
        totalRankedList,
        rankMap,
        topRichest,
        highlights: {
            totalMembers: rawPointList.length,
            totalVaultPoints,
            totalHistoricalPoints,
            topPointUser: topRichest[0],
            topTotalUser: totalRankedList[0],
        },
    };
}

export function buildMemberCandidates(
    danhLuc: any,
    pointData: any,
    includeOutside = false
): MemberCandidate[] {
    const seen = new Set<string>();
    const list: MemberCandidate[] = [];

    if (danhLuc && typeof danhLuc === 'object') {
        Object.entries(danhLuc).forEach(([id, dl]: [string, any]) => {
            seen.add(id);
            const pt = pointData?.[id] || {};
            list.push({
                id,
                name: dl?.ingame || pt?.name || dl?.discordName || `Thành viên #${id.slice(-4)}`,
                discordName: dl?.discordName || pt?.name || '',
                uid: dl?.uid || '',
                avatar: dl?.avatar || dl?.image || '',
                point: Number(pt?.points ?? pt?.point) || 0,
                total: Number(pt?.total_points ?? pt?.total) || 0,
                isOutsideDanhLuc: false,
            });
        });
    }

    if (includeOutside && pointData && typeof pointData === 'object') {
        Object.entries(pointData).forEach(([id, pt]: [string, any]) => {
            if (seen.has(id) || !pt || typeof pt !== 'object') return;
            list.push({
                id,
                name: pt.name || `Khách (#${id.slice(-4)})`,
                discordName: pt.name || '',
                uid: '',
                avatar: '',
                point: Number(pt.points ?? pt.point) || 0,
                total: Number(pt.total_points ?? pt.total) || 0,
                isOutsideDanhLuc: true,
            });
        });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function buildRecentPointHistory(
    notificationsData: any,
    rawPointList: PointRecord[],
    danhLuc: any,
    limit = 15
): RecentPointTx[] {
    const notifItems: WebNotificationItem[] = Array.isArray(notificationsData?.items)
        ? notificationsData.items.filter((it: WebNotificationItem) => it && it.type === 'point')
        : [];

    if (notifItems.length > 0) {
        return notifItems.slice(0, limit).map((it) => ({
            id: it.id,
            type: (it.delta || 0) >= 0 ? 'CỘNG' : 'TRỪ',
            amount: Math.abs(it.delta || 0),
            targetName: (it.targetId && danhLuc?.[it.targetId]?.ingame) || it.targetName || 'Thành viên',
            actor: it.actor || 'Bang Chủ',
            reason: it.message || '',
            timeText: formatViDateTime(it.createdAt),
            relText: formatRelativeVi(it.createdAt),
            balanceAfter: it.balanceAfter,
        }));
    }

    return rawPointList
        .filter((u) => u.lastAction && typeof u.lastAction === 'object')
        .map((u) => ({
            id: `fallback_${u.id}`,
            type: (u.lastAction.type === 'TRỪ' ? 'TRỪ' : 'CỘNG') as 'CỘNG' | 'TRỪ',
            amount: Number(u.lastAction.amount) || 0,
            targetName: u.name,
            actor: u.lastAction.by || 'Hệ thống',
            reason: u.lastAction.reason || '',
            timeText: u.lastAction.time || '',
            relText: '',
            balanceAfter: u.point,
        }))
        .slice(0, limit);
}
