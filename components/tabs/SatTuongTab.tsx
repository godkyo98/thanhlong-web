/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/SatTuongTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    resolveSatTuongTitle,
    SatTuongBadge,
    SatTuongTitleInfo
} from '@/lib/satTuongUtils';
import {
    SatTuongSheetDoc,
    SatTuongMonthSheet,
    computeSatTuongMonthDerived
} from '@/lib/satTuongSheetUtils';
import SatTuongSheetView from '@/components/tabs/SatTuongSheetView';
import { normalizeVoHocName } from '@/components/tabs/DanhLucTab';

export interface ParsedRecord {
    name: string;
    time: string;
    seconds: number;
    class?: string;
}

/**
 * Chuyển đổi thời gian dạng số (giây hoặc mili-giây) hoặc chuỗi sang số giây (number) để sắp xếp
 */
function parseSeconds(val: any): number {
    if (val === null || val === undefined || val === '') return 999999;
    
    // Nếu là số:
    if (typeof val === 'number') {
        if (isNaN(val) || val <= 0) return 999999;
        // Nếu là mili-giây (ví dụ 59000ms = 59s)
        if (val >= 10000 && val < 3600000) return Math.round(val / 1000);
        return Math.round(val);
    }

    if (typeof val !== 'string') return 999999;
    const str = val.trim();
    if (!str || str === '—' || str === '-') return 999999;

    // Định dạng "1m06s", "1m6s", "1m 6s", "1 phút 6 giây"
    const mMatch = str.match(/(\d+)\s*(?:m|phút|p)\s*(\d+)?\s*(?:s|giây|g)?/i);
    if (mMatch) {
        const mins = parseInt(mMatch[1], 10) || 0;
        const secs = parseInt(mMatch[2], 10) || 0;
        return mins * 60 + secs;
    }

    // Định dạng "01:06" hoặc "1:06" hoặc "01:06.5"
    if (str.includes(':')) {
        const parts = str.split(':').map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return Math.round(parts[0] * 60 + parts[1]);
        }
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
        }
    }

    // Định dạng "59s", "59 giây", "59.5s"
    const sMatch = str.match(/([\d.]+)\s*(?:s|giây|g)?/i);
    if (sMatch) {
        const num = parseFloat(sMatch[1]);
        if (!isNaN(num)) return Math.round(num);
    }

    return 999999;
}

/**
 * Định dạng số giây thành chuỗi thời gian hiển thị: "59s", "1m06s", "2m15s"
 */
function formatSeconds(sec: number, originalStr?: string): string {
    if (sec <= 0 || sec >= 999999) {
        if (originalStr && originalStr.trim() && originalStr !== '—' && originalStr !== '-') {
            return originalStr.trim();
        }
        return '—';
    }
    if (sec < 60) {
        return `${sec}s`;
    }
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m${secs < 10 ? '0' : ''}${secs}s`;
}

/**
 * Tìm thông tin thành viên chuẩn nhất từ danhLuc theo Tên Ingame, Discord Name hoặc UID
 */
function findMemberInDanhLuc(nameOrId: string, danhLuc: Record<string, any>) {
    if (!nameOrId || !danhLuc) return null;
    const clean = nameOrId.trim().toLowerCase();

    // 1. Khớp trực tiếp key (Discord ID)
    if (danhLuc[nameOrId]) return danhLuc[nameOrId];

    // 2. Quét các thành viên trong danhLuc
    const cleanNoSpecial = clean.replace(/[》《\[\]\(\)\s_]/g, '');

    for (const [dId, member] of Object.entries(danhLuc)) {
        if (!member || typeof member !== 'object') continue;
        const ingame = (member.ingame || '').trim().toLowerCase();
        const discordName = (member.discordName || '').trim().toLowerCase();
        const username = (member.username || '').trim().toLowerCase();
        const uid = (member.uid || '').trim().toLowerCase();

        if (ingame === clean || discordName === clean || username === clean || uid === clean || dId === clean) {
            return member;
        }

        const ingameNoSpecial = ingame.replace(/[》《\[\]\(\)\s_]/g, '');
        const discordNoSpecial = discordName.replace(/[》《\[\]\(\)\s_]/g, '');
        if (cleanNoSpecial && (ingameNoSpecial === cleanNoSpecial || discordNoSpecial === cleanNoSpecial)) {
            return member;
        }
    }
    return null;
}

/**
 * Trích xuất số tuần từ tiêu đề Boss (ví dụ "Rết Thiết Tâm Tuần 2" -> 2)
 */
function extractWeekNumber(bossTitle: string): number {
    const match = bossTitle.match(/tuần\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}

function parseBossRecords(bossData: any, danhLuc: Record<string, any>): ParsedRecord[] {
    if (!bossData) return [];

    const list: ParsedRecord[] = [];

    // Trường hợp 1: bossData là Array (Danh sách chiến báo hoặc danh sách Discord ID)
    if (Array.isArray(bossData)) {
        let hasAnyRealTime = false;

        bossData.forEach((item, idx) => {
            if (typeof item === 'object' && item !== null) {
                const rawName = String(item.name || item.ingame || item.sheetName || item.playerName || item.username || item.id || item.uid || '').trim();
                const member = findMemberInDanhLuc(rawName, danhLuc) || (item.id ? danhLuc[item.id] : null);
                
                const officialName = member?.ingame || member?.name || rawName || `Hiệp Khách #${idx + 1}`;
                const playerClass = member?.class 
                    ? normalizeVoHocName(member.class) 
                    : (item.class ? normalizeVoHocName(item.class) : undefined);

                // Ưu tiên timeStr (vd "59s", "1m05s"), rồi đến sec (59), time, record
                const rawTime = item.timeStr ?? item.time ?? item.sec ?? item.seconds ?? item.record ?? item.duration;
                
                let timeStr = '—';
                let sec = idx;

                if (rawTime !== undefined && rawTime !== null && rawTime !== '') {
                    const isSnowflake = /^\d{16,21}$/.test(String(rawTime));
                    if (!isSnowflake) {
                        sec = typeof item.sec === 'number' ? item.sec : parseSeconds(rawTime);
                        timeStr = typeof item.timeStr === 'string' && item.timeStr.trim() 
                            ? item.timeStr.trim() 
                            : formatSeconds(sec, String(rawTime));
                        hasAnyRealTime = true;
                    } else {
                        timeStr = '✅ Đã Hạ Gục';
                    }
                } else {
                    timeStr = '✅ Đã Hạ Gục';
                }

                list.push({
                    name: officialName,
                    time: timeStr,
                    seconds: sec,
                    class: playerClass
                });
            } else if (typeof item === 'string' || typeof item === 'number') {
                const strItem = String(item).trim();
                const isSnowflake = /^\d{16,21}$/.test(strItem);

                if (isSnowflake) {
                    const member = findMemberInDanhLuc(strItem, danhLuc);
                    const name = member?.ingame || member?.name || member?.discordName || `Hiệp Khách #${strItem.slice(-4)}`;
                    const memberClass = member?.class ? normalizeVoHocName(member.class) : undefined;
                    list.push({
                        name,
                        time: '✅ Đã Hạ Gục',
                        seconds: idx,
                        class: memberClass
                    });
                } else {
                    const parsed = parseSeconds(strItem);
                    if (parsed < 999999) {
                        hasAnyRealTime = true;
                        list.push({
                            name: `Hiệp Khách #${idx + 1}`,
                            time: formatSeconds(parsed, strItem),
                            seconds: parsed
                        });
                    } else {
                        const member = findMemberInDanhLuc(strItem, danhLuc);
                        list.push({
                            name: member?.ingame || strItem,
                            time: '✅ Đã Hạ Gục',
                            seconds: idx,
                            class: member?.class ? normalizeVoHocName(member.class) : undefined
                        });
                    }
                }
            }
        });

        // Chỉ sắp xếp lại theo thời gian nếu thực sự có thông số giây speedrun
        if (hasAnyRealTime) {
            return list.sort((a, b) => a.seconds - b.seconds);
        }
        return list; // Giữ nguyên thứ tự thảo phạt
    }

    // Trường hợp 2: bossData là một object
    if (typeof bossData === 'object' && bossData !== null) {
        const nestedList = bossData.records || bossData.list || bossData.top || bossData.ranking || bossData.history || bossData.players || bossData.battles;
        if (nestedList && (Array.isArray(nestedList) || typeof nestedList === 'object')) {
            return parseBossRecords(nestedList, danhLuc);
        }

        // Kiểm tra xem bossData có phải là chính MỘT kỷ lục đơn lẻ không
        const hasDirectTime = bossData.timeStr !== undefined || bossData.sec !== undefined || bossData.time !== undefined || bossData.record !== undefined;
        const hasDirectName = bossData.name !== undefined || bossData.ingame !== undefined || bossData.player !== undefined;
        
        if (hasDirectTime && hasDirectName) {
            const rawName = String(bossData.name || bossData.ingame || '').trim();
            const member = findMemberInDanhLuc(rawName, danhLuc);
            const rawTime = bossData.timeStr ?? bossData.time ?? bossData.sec;
            const sec = typeof bossData.sec === 'number' ? bossData.sec : parseSeconds(rawTime);
            return [{
                name: member?.ingame || rawName,
                time: typeof bossData.timeStr === 'string' ? bossData.timeStr : formatSeconds(sec, String(rawTime || '')),
                seconds: sec,
                class: member?.class ? normalizeVoHocName(member.class) : undefined
            }];
        }

        // Dictionary { [idOrName]: val }
        let hasAnyRealTime = false;
        Object.entries(bossData).forEach(([key, val]: [string, any], entryIdx: number) => {
            if (['boss', 'title', 'date', 'updatedat', 'timestamp', 'week', 'season'].includes(key.toLowerCase())) {
                return;
            }

            const cleanKey = key.trim();
            const member = findMemberInDanhLuc(cleanKey, danhLuc);
            const name = member?.ingame || cleanKey;
            let playerClass = member?.class ? normalizeVoHocName(member.class) : undefined;
            let timeStr = '✅ Đã Hạ Gục';
            let sec = entryIdx;

            if (val && typeof val === 'object') {
                const rawTime = val.timeStr ?? val.time ?? val.sec ?? val.record ?? val.seconds;
                if (rawTime !== undefined && !/^\d{16,21}$/.test(String(rawTime))) {
                    sec = typeof val.sec === 'number' ? val.sec : parseSeconds(rawTime);
                    timeStr = typeof val.timeStr === 'string' ? val.timeStr : formatSeconds(sec, String(rawTime));
                    hasAnyRealTime = true;
                }
                if (val.class) playerClass = normalizeVoHocName(val.class);
            } else if (typeof val === 'string' || typeof val === 'number') {
                const strVal = String(val).trim();
                const isValSnowflake = /^\d{16,21}$/.test(strVal);
                if (!isValSnowflake) {
                    const parsed = parseSeconds(val);
                    if (parsed < 999999) {
                        sec = parsed;
                        timeStr = formatSeconds(sec, strVal);
                        hasAnyRealTime = true;
                    }
                }
            }

            list.push({
                name,
                time: timeStr,
                seconds: sec,
                class: playerClass
            });
        });

        if (hasAnyRealTime) {
            return list.sort((a, b) => a.seconds - b.seconds);
        }
        return list;
    }

    return [];
}

interface SeasonPlayerItem {
    id: string;
    ingame: string;
    discordName: string;
    uid: string;
    class: string;
    seasonPts: number;
    titleInfo: SatTuongTitleInfo | null;
    isManualHidden: boolean;
    isOutsideDanhLuc: boolean;
    isHidden: boolean;
}

interface Props {
    data: any;             // sat_tuong_data từ Firebase
    metadata?: any;        // sattuong_metadata từ Firebase
    sheetDoc?: SatTuongSheetDoc | null; // sat_tuong_sheet từ Firebase
    bossRotation?: any;    // boss_rotation từ Firebase
    pointData?: any;       // points_data
    tuViData?: Record<string, Record<string, unknown>>; // chat_rank_data (chứa anBangVang live từ Discord Bot)
    danhLuc: Record<string, any>;
    isMaster?: boolean;
    isOfficer?: boolean;
    session?: any;
}

export default function SatTuongTab({
    data,
    metadata,
    sheetDoc = null,
    bossRotation,
    tuViData = {},
    danhLuc = {},
    isMaster = false,
    isOfficer = false,
    session,
}: Props) {
    const canManageSheet = Boolean(isMaster || isOfficer);
    const [activeSubTab, setActiveSubTab] = useState<'history' | 'sheet' | 'monthly' | 'season'>('history');
    const [userSelectedMonthKey, setUserSelectedMonthKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'ALL'>('ALL');
    const [showHiddenSeason, setShowHiddenSeason] = useState(false);

    // State sửa điểm & ẩn/hiện Master
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editPts, setEditPts] = useState<number>(0);
    const [editType, setEditType] = useState<'monthly' | 'season'>('monthly');
    const [isSaving, setIsSaving] = useState(false);
    const [togglingHideId, setTogglingHideId] = useState<string | null>(null);

    // 1. 🎯 BỐC THĂM CẶP ĐÔI BOSS SÁT PHẠT TUẦN NÀY (ĐỌC TỪ boss_rotation & sat_tuong_data)
    const { targetBoss1, targetBoss2, totalUsed, totalPool } = useMemo(() => {
        const used = Array.isArray(bossRotation?.used) ? bossRotation.used : [];
        const pool = Array.isArray(bossRotation?.pool) ? bossRotation.pool : [];
        
        let b1 = '';
        let b2 = '';

        const picked = Array.isArray(bossRotation?.pickedBosses)
            ? bossRotation.pickedBosses
            : (Array.isArray(bossRotation?.current)
                ? bossRotation.current
                : (Array.isArray(data?.targetBosses) ? data.targetBosses : []));

        if (picked.length >= 2) {
            b1 = picked[0] || '';
            b2 = picked[1] || '';
        } else if (picked.length === 1) {
            b1 = picked[0] || '';
        } else if (used.length >= 2) {
            b1 = used[used.length - 2];
            b2 = used[used.length - 1];
        } else if (used.length === 1) {
            b1 = used[0];
        }

        const remainingCount = pool.length > 0
            ? pool.filter((b: string) => !used.includes(b)).length
            : Math.max(0, 10 - used.length);

        return {
            targetBoss1: b1,
            targetBoss2: b2,
            totalUsed: used.length,
            totalPool: remainingCount
        };
    }, [bossRotation, data]);

    const sortedMonthKeys = useMemo(() => {
        if (!sheetDoc?.months) return [];
        return Object.keys(sheetDoc.months).sort((a, b) => {
            const ma = sheetDoc.months[a];
            const mb = sheetDoc.months[b];
            if ((mb?.year || 0) !== (ma?.year || 0)) return (mb?.year || 0) - (ma?.year || 0);
            return (mb?.monthNum || 0) - (ma?.monthNum || 0);
        });
    }, [sheetDoc]);

    const selectedMonthKey = useMemo(() => {
        if (userSelectedMonthKey && sheetDoc?.months?.[userSelectedMonthKey]) {
            return userSelectedMonthKey;
        }
        if (sheetDoc?.activeMonthKey && sheetDoc?.months?.[sheetDoc.activeMonthKey]) {
            return sheetDoc.activeMonthKey;
        }
        return sortedMonthKeys[0] || '';
    }, [userSelectedMonthKey, sheetDoc, sortedMonthKeys]);

    const selectedMonthSheet: SatTuongMonthSheet | null = useMemo(() => {
        if (!selectedMonthKey || !sheetDoc?.months) return null;
        return sheetDoc.months[selectedMonthKey] || null;
    }, [selectedMonthKey, sheetDoc]);

    const sheetDerived = useMemo(() => {
        return computeSatTuongMonthDerived(
            selectedMonthSheet,
            danhLuc,
            data?.seasonRanking || {},
            tuViData,
            targetBoss1
        );
    }, [selectedMonthSheet, danhLuc, data?.seasonRanking, tuViData, targetBoss1]);

    const activeMonthTitle = selectedMonthSheet?.title || data?.thang || data?.month || 'Tháng';
    const isViewingActiveMonth = Boolean(!sheetDoc?.activeMonthKey || !selectedMonthKey || selectedMonthKey === sheetDoc.activeMonthKey);

    // 2. 🌟 BẢNG VÀNG CHIẾN THẦN PVE (TÍCH LŨY MÙA)
    const { seasonList, hiddenSeasonList, visibleRankMap } = useMemo(() => {
        const seasonObj = data?.seasonRanking || data?.season_ranking || data?.seasons || {};
        const hasDanhLuc = Boolean(danhLuc && Object.keys(danhLuc).length > 0);
        const list: SeasonPlayerItem[] = [];

        const resolveManualHidden = (id: string, seasonEntry: unknown, danhLucEntry: unknown) => {
            const rankEntry = tuViData?.[id];
            if (rankEntry && typeof rankEntry === 'object' && rankEntry.anBangVang !== undefined) {
                return Boolean(rankEntry.anBangVang);
            }
            if (seasonEntry && typeof seasonEntry === 'object') {
                const entry = seasonEntry as Record<string, unknown>;
                if (entry.anBangVang !== undefined) return Boolean(entry.anBangVang);
                if (entry.hidden !== undefined) return Boolean(entry.hidden);
            }
            if (danhLucEntry && typeof danhLucEntry === 'object') {
                const entry = danhLucEntry as Record<string, unknown>;
                if (entry.anBangVang !== undefined) return Boolean(entry.anBangVang);
            }
            return false;
        };

        Object.entries(seasonObj).forEach(([id, d]: [string, any]) => {
            const pts = Number(typeof d === 'object' ? (d?.satTuongSeasonPts ?? d?.seasonPts ?? d?.points ?? 0) : d) || 0;
            if (pts <= 0) return;

            const member = danhLuc?.[id];
            const isOutsideDanhLuc = hasDanhLuc && !member;
            const isManualHidden = resolveManualHidden(id, d, member);
            const rawTitle = typeof d === 'object' && d?.title ? d.title : pts;
            const titleInfo = resolveSatTuongTitle(rawTitle);

            list.push({
                id,
                ingame: member?.ingame || (typeof d === 'object' && d?.name) || `Đại Hiệp #${id.slice(-4)}`,
                discordName: member?.discordName || (typeof d === 'object' && d?.username) || '',
                uid: member?.uid || '—',
                class: normalizeVoHocName(member?.class || 'Lãng Khách'),
                seasonPts: pts,
                titleInfo,
                isManualHidden,
                isOutsideDanhLuc,
                isHidden: isManualHidden || isOutsideDanhLuc
            });
        });

        // Quét thêm thành viên từ danh_luc_data nếu có lưu danh hiệu sát tướng
        Object.entries(danhLuc || {}).forEach(([id, info]: [string, any]) => {
            if (!info || typeof info !== 'object') return;
            const pts = Number(info.satTuongSeasonPts || info.satTuongPts || 0);
            const userTitle = info.satTuongTitle || info.title;
            const titleInfo = resolveSatTuongTitle(userTitle || (pts > 0 ? pts : null));

            if (titleInfo && !list.some(item => item.id === id)) {
                const isManualHidden = resolveManualHidden(id, seasonObj?.[id], info);
                list.push({
                    id,
                    ingame: info.ingame || `Đại Hiệp #${id.slice(-4)}`,
                    discordName: info.discordName || '',
                    uid: info.uid || '—',
                    class: normalizeVoHocName(info.class || 'Lãng Khách'),
                    seasonPts: pts > 0 ? pts : titleInfo.level,
                    titleInfo,
                    isManualHidden,
                    isOutsideDanhLuc: false,
                    isHidden: isManualHidden
                });
            }
        });

        const sorted = list.sort((a, b) => {
            const levelA = a.titleInfo?.level || a.seasonPts;
            const levelB = b.titleInfo?.level || b.seasonPts;
            if (levelB !== levelA) return levelB - levelA;
            return b.seasonPts - a.seasonPts;
        });

        const visible = sorted.filter(u => !u.isHidden);
        const hidden = sorted.filter(u => u.isHidden);
        const rankMap: Record<string, number> = {};
        visible.forEach((u, idx) => {
            rankMap[u.id] = idx;
        });

        return {
            seasonList: visible,
            hiddenSeasonList: hidden,
            visibleRankMap: rankMap
        };
    }, [data, danhLuc, tuViData]);

    const displayedSeasonList = useMemo(() => {
        if (isMaster && showHiddenSeason) {
            return [...seasonList, ...hiddenSeasonList];
        }
        return seasonList;
    }, [isMaster, showHiddenSeason, seasonList, hiddenSeasonList]);

    // 3. 🏆 BẢNG PHONG THẦN (TỔNG ĐIỂM THÁNG)
    const monthlyList = useMemo(() => {
        const monthlyObj = selectedMonthSheet
            ? sheetDerived.monthlyRanking
            : (data?.monthlyRanking || data?.monthly_ranking || {});
        const playerMap = new Map<string, {
            id: string;
            ingame: string;
            discordName: string;
            uid: string;
            class: string;
            points: number;
            titleInfo: SatTuongTitleInfo | null;
        }>();

        Object.entries(monthlyObj).forEach(([rawKey, d]: [string, any]) => {
            const pts = Number(typeof d === 'object' ? (d?.points ?? 0) : d) || 0;
            if (pts <= 0) return;

            const cleanKey = rawKey.trim();
            const dName = typeof d === 'object' ? (d?.name || d?.username || d?.ingame || '') : '';
            
            // Tìm thông tin thành viên trong danhLuc
            const member = danhLuc[cleanKey] || findMemberInDanhLuc(cleanKey, danhLuc) || (dName ? findMemberInDanhLuc(dName, danhLuc) : null);
            
            // Khóa định danh chuẩn (ưu tiên Discord ID Snowflake 17-21 chữ số)
            const isSnowflake = /^\d{16,21}$/.test(cleanKey);
            const officialId = isSnowflake 
                ? cleanKey 
                : (member?.discordId || (Object.keys(danhLuc).find(k => danhLuc[k] === member)) || cleanKey);
            
            const officialName = member?.ingame || member?.name || dName || cleanKey;
            const officialDiscord = member?.discordName || (typeof d === 'object' && d?.username) || '';
            const officialUid = member?.uid || '—';
            const officialClass = normalizeVoHocName(member?.class || 'Lãng Khách');

            const userSeasonTitle = resolveSatTuongTitle(
                data?.seasonRanking?.[officialId]?.satTuongSeasonPts ??
                data?.seasonRanking?.[officialId]?.title ??
                member?.satTuongSeasonPts ??
                member?.satTuongTitle
            );

            // Khóa gộp chống trùng lặp theo tên Ingame (hoặc ID)
            const dedupKey = officialName.toLowerCase().trim();

            if (playerMap.has(dedupKey)) {
                const existing = playerMap.get(dedupKey)!;
                const bestPts = Math.max(existing.points, pts);
                const bestId = (/^\d{16,21}$/.test(existing.id)) ? existing.id : officialId;
                const bestUid = existing.uid !== '—' ? existing.uid : officialUid;
                const bestDiscord = existing.discordName || officialDiscord;
                const bestClass = existing.class !== 'Lãng Khách' ? existing.class : officialClass;

                playerMap.set(dedupKey, {
                    ...existing,
                    id: bestId,
                    uid: bestUid,
                    discordName: bestDiscord,
                    class: bestClass,
                    points: bestPts,
                    titleInfo: existing.titleInfo || userSeasonTitle
                });
            } else {
                playerMap.set(dedupKey, {
                    id: officialId,
                    ingame: officialName,
                    discordName: officialDiscord,
                    uid: officialUid,
                    class: officialClass,
                    points: pts,
                    titleInfo: userSeasonTitle
                });
            }
        });

        return Array.from(playerMap.values()).sort((a, b) => b.points - a.points);
    }, [data, danhLuc, selectedMonthSheet, sheetDerived.monthlyRanking]);

    // 4. ⚔️ NHẬT KÝ CHIẾN BÁO & TỐC ĐỘ DIỆT BOSS
    const battleHistory = useMemo(() => {
        if (selectedMonthSheet) {
            return (selectedMonthSheet.cols || []).map((col) => {
                const rawRecords = sheetDerived.bossRecords[col.title] || [];
                const parsedRecords = parseBossRecords(rawRecords, danhLuc);
                return {
                    bossTitle: col.title,
                    week: col.week || extractWeekNumber(col.title),
                    records: parsedRecords
                };
            });
        }

        const historyObj = (data?.history && typeof data.history === 'object') ? data.history : {};
        const recordsObj = (data?.bossRecords && typeof data.bossRecords === 'object') ? data.bossRecords : {};
        const battlesObj = (data?.battles && typeof data.battles === 'object') ? data.battles : {};
        const metaObj = (metadata?.battles && typeof metadata.battles === 'object') ? metadata.battles : {};
        // Gộp toàn bộ, ưu tiên recordsObj / battlesObj vì chứa sec và timeStr speedrun
        const merged: Record<string, any> = { ...historyObj, ...metaObj, ...recordsObj, ...battlesObj };

        return Object.entries(merged).map(([bossTitle, recordsData]: [string, any]) => {
            const parsedRecords = parseBossRecords(recordsData, danhLuc);
            const week = extractWeekNumber(bossTitle);
            return {
                bossTitle,
                week,
                records: parsedRecords
            };
        });
    }, [data, metadata, danhLuc, selectedMonthSheet, sheetDerived.bossRecords]);

    // Gom nhóm theo Tuần và sắp xếp từ Tuần mới nhất (4 -> 3 -> 2 -> 1)
    const bossWeekGroups = useMemo(() => {
        const groupsMap: Record<number, {
            week: number;
            weekLabel: string;
            bosses: Array<{
                bossTitle: string;
                week: number;
                records: ParsedRecord[];
            }>;
        }> = {};

        battleHistory.forEach((item) => {
            const w = item.week;
            if (!groupsMap[w]) {
                groupsMap[w] = {
                    week: w,
                    weekLabel: w > 0 ? `Chiến Báo Tuần ${w}` : 'Chiến Báo Khác',
                    bosses: []
                };
            }
            groupsMap[w].bosses.push(item);
        });

        return Object.values(groupsMap).sort((a, b) => b.week - a.week);
    }, [battleHistory]);

    // Danh sách các tuần có dữ liệu để làm nút bấm lọc
    const availableWeeks = useMemo(() => {
        return bossWeekGroups.map(g => g.week).filter(w => w > 0).sort((a, b) => b - a);
    }, [bossWeekGroups]);

    // Lọc theo Tuần và theo Thanh Tìm Kiếm
    const filteredWeekGroups = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        return bossWeekGroups
            .filter(group => {
                if (selectedWeekFilter !== 'ALL' && group.week !== selectedWeekFilter) {
                    return false;
                }
                return true;
            })
            .map(group => {
                const filteredBosses = group.bosses.filter(boss => {
                    if (!q) return true;
                    return (
                        boss.bossTitle.toLowerCase().includes(q) ||
                        boss.records.some(r =>
                            r.name.toLowerCase().includes(q) ||
                            (r.class && r.class.toLowerCase().includes(q))
                        )
                    );
                });
                return {
                    ...group,
                    bosses: filteredBosses
                };
            })
            .filter(group => group.bosses.length > 0);
    }, [bossWeekGroups, selectedWeekFilter, searchQuery]);

    // Xử lý ẩn / hiện thành viên khỏi Bảng Vàng Chiến Thần (đồng bộ Firebase + Discord Bot qua anBangVang)
    const handleToggleHideSeason = async (user: SeasonPlayerItem) => {
        if (!isMaster) return;
        setTogglingHideId(user.id);
        const nextHidden = !user.isManualHidden;
        try {
            const writes: Promise<void>[] = [
                setDoc(
                    doc(db, 'thanhlong_config', 'sat_tuong_data'),
                    {
                        seasonRanking: {
                            [user.id]: { anBangVang: nextHidden }
                        }
                    },
                    { merge: true }
                )
            ];

            if (tuViData && tuViData[user.id] && typeof tuViData[user.id] === 'object') {
                writes.push(
                    setDoc(
                        doc(db, 'thanhlong_config', 'chat_rank_data'),
                        {
                            [user.id]: { anBangVang: nextHidden }
                        },
                        { merge: true }
                    )
                );
            }

            await Promise.all(writes);
        } catch {
            alert('❌ Lỗi khi cập nhật trạng thái Ẩn/Hiện lên Firebase!');
        } finally {
            setTogglingHideId(null);
        }
    };

    // Xử lý lưu điểm Master
    const handleSavePts = async (uid: string) => {
        if (!isMaster) return;
        setIsSaving(true);
        try {
            if (editType === 'monthly') {
                await setDoc(doc(db, 'thanhlong_config', 'sat_tuong_data'), {
                    monthlyRanking: {
                        [uid]: { points: editPts }
                    }
                }, { merge: true });
            } else {
                await setDoc(doc(db, 'thanhlong_config', 'sat_tuong_data'), {
                    seasonRanking: {
                        [uid]: { satTuongSeasonPts: editPts }
                    }
                }, { merge: true });
            }
            setEditingUid(null);
            alert(`✅ Đã lưu ${editPts} điểm thành công!`);
        } catch {
            alert('❌ Lỗi khi cập nhật điểm lên Firebase!');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-20 text-zinc-100">
            {/* 🔴 1. KHUNG BỐC THĂM BOSS SÁT TƯỚNG TUẦN NÀY (ĐỒNG BỘ 100% DISCORD) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c0808] via-[#0d0303] to-[#050101] border-2 border-rose-600/60 p-6 sm:p-7 shadow-[0_0_30px_rgba(225,29,72,0.2)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-900/40 pb-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-[11px] font-black uppercase tracking-wider">
                            <span>🎲 LỆNH BỐC THĂM ĐẦU TUẦN ĐÃ ĐỊNH</span>
                            <span>•</span>
                            <span className="text-amber-400">2 MỤC TIÊU SÁT TƯỚNG</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black leading-snug py-0.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                            🎲 Bốc Thăm Boss Sát Tướng Tuần Này
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Tuần này Tông môn chúng ta sẽ sát phạt cặp đôi mục tiêu được bốc thăm ngẫu nhiên từ hệ thống:
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {canManageSheet && (
                            <button
                                type="button"
                                onClick={() => setActiveSubTab('sheet')}
                                className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/60 text-emerald-200 text-xs font-black cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                                📝 Mở Bảng Sheet Nhập Liệu
                            </button>
                        )}
                        <div className="bg-black/50 border border-zinc-800 rounded-2xl px-4 py-2 text-right shrink-0">
                            <div className="text-[10px] text-zinc-400 font-bold uppercase">Tiến Độ Vòng Xoay Boss</div>
                            <div className="text-sm font-mono font-black text-amber-300 mt-0.5">
                                {totalUsed} Đã Sát Phạt • Còn {totalPool} Trong Bể
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2 THẺ BOSS MỤC TIÊU TUẦN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                    {/* MỤC TIÊU 1 */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#2a0e0e] to-[#170505] border border-amber-500/50 p-4 flex items-center gap-4 shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-2xl font-black text-zinc-950 shadow shrink-0">
                            1️⃣
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                                Mục Tiêu 1
                            </div>
                            <div className="text-lg font-black text-white truncate mt-0.5">
                                🔥 {targetBoss1 || 'Đang chờ bốc thăm...'} 🔥
                            </div>
                        </div>
                    </div>

                    {/* MỤC TIÊU 2 */}
                    <div className="relative rounded-2xl bg-gradient-to-r from-[#2a0e0e] to-[#170505] border border-amber-500/50 p-4 flex items-center gap-4 shadow-lg">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-2xl font-black text-zinc-950 shadow shrink-0">
                            2️⃣
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                                Mục Tiêu 2
                            </div>
                            <div className="text-lg font-black text-white truncate mt-0.5">
                                🔥 {targetBoss2 || 'Đang chờ bốc thăm...'} 🔥
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔴 2. THANH ĐIỀU HƯỚNG TAB & TÌM KIẾM */}
            <div className="bg-[#0c0404] border border-rose-900/50 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('history')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeSubTab === 'history'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                                : 'bg-black/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <span>⚔️</span>
                        <span>Chiến Báo Tuần &amp; Tốc Độ Boss ({battleHistory.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSubTab('sheet')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeSubTab === 'sheet'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                : canManageSheet
                                    ? 'bg-emerald-950/40 text-emerald-300 hover:text-white border border-emerald-500/40'
                                    : 'bg-black/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <span>📊</span>
                        <span>Bảng Sheet ({activeMonthTitle})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSubTab('monthly')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeSubTab === 'monthly'
                                ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                                : 'bg-black/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <span>🏆</span>
                        <span>Bảng Phong Thần {activeMonthTitle} ({monthlyList.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSubTab('season')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            activeSubTab === 'season'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                : 'bg-black/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <span>🌟</span>
                        <span>Chiến Thần PVE (Tích Lũy Mùa: {seasonList.length})</span>
                    </button>
                </div>

                <div className="w-full md:w-80">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Tìm theo Tên In-game, UID, Phái..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none"
                    />
                </div>
            </div>

            {/* 🔴 2B. BỘ CHỌN THÁNG LỊCH SỬ CHO CHIẾN BÁO & BẢNG PHONG THẦN */}
            {activeSubTab !== 'season' && activeSubTab !== 'sheet' && sortedMonthKeys.length > 0 && (
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-zinc-400 tracking-wider mr-1">
                        🗓️ Xem Tháng:
                    </span>
                    {sortedMonthKeys.map((mKey) => {
                        const mObj = sheetDoc?.months?.[mKey];
                        const isSel = mKey === selectedMonthKey;
                        const isLive = mKey === sheetDoc?.activeMonthKey;
                        return (
                            <button
                                key={mKey}
                                type="button"
                                onClick={() => {
                                    setUserSelectedMonthKey(mKey);
                                    setSelectedWeekFilter('ALL');
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                                    isSel
                                        ? 'bg-amber-500 text-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                }`}
                            >
                                <span>{mObj?.title || mKey}</span>
                                {isLive && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-zinc-950' : 'bg-emerald-400'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* 🔴 3S. BẢNG SHEET NHẬP LIỆU TRỰC TIẾP TRÊN WEB */}
            {activeSubTab === 'sheet' && (
                <SatTuongSheetView
                    sheetDoc={sheetDoc}
                    selectedMonth={selectedMonthSheet}
                    selectedMonthKey={selectedMonthKey}
                    onSelectMonthKey={(k) => {
                        setUserSelectedMonthKey(k);
                        setSelectedWeekFilter('ALL');
                    }}
                    derived={sheetDerived}
                    danhLuc={danhLuc}
                    satTuongData={data}
                    tuViData={tuViData}
                    bossRotation={bossRotation}
                    metadata={metadata}
                    targetBoss1={targetBoss1}
                    targetBoss2={targetBoss2}
                    canEdit={canManageSheet}
                    isMaster={isMaster}
                    actorName={session?.user?.name || (isMaster ? 'Bang Chủ' : 'Cán Bộ')}
                    searchQuery={searchQuery}
                    onClearSearch={() => setSearchQuery('')}
                />
            )}

            {/* 🔴 3A. BẢNG 1: BẢNG VÀNG CHIẾN THẦN PVE (TÍCH LŨY MÙA - VÕ ĐẠO ĐỘC TÔN) */}
            {activeSubTab === 'season' && (
                <div className="bg-[#0b0404]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-zinc-950/80 px-6 py-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-lg font-black text-amber-300 flex items-center gap-2">
                                <span>🌟 Bảng Vàng Chiến Thần PVE (Tích Lũy Mùa)</span>
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Vinh danh mốc danh hiệu chuẩn <b>✦ Võ Đạo Độc Tôn ✦</b> tăng tiến theo số mùa chinh phục.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {isMaster && hiddenSeasonList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowHiddenSeason(prev => !prev)}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                        showHiddenSeason
                                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                                            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                                    }`}
                                >
                                    {showHiddenSeason
                                        ? `👁️ Đang hiện cả ${hiddenSeasonList.length} người đã ẩn`
                                        : `🙈 Đã ẩn ${hiddenSeasonList.length} người (Xem)`}
                                </button>
                            )}
                            <div className="text-xs font-mono text-zinc-400">
                                Tổng: <b className="text-amber-400">{seasonList.length}</b> cao thủ
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">
                                    <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                                    <th className="py-3.5 px-4">👤 Hiệp Khách In-game & UID</th>
                                    <th className="py-3.5 px-4">⚔️ Môn Phái</th>
                                    <th className="py-3.5 px-4">🎖️ Danh Hiệu Sát Tướng Đã Đạt</th>
                                    <th className="py-3.5 px-4 text-center font-mono">🌟 Tích Lũy Mùa</th>
                                    {isMaster && <th className="py-3.5 px-4 text-right">⚙️ Quản Trị</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-xs font-medium">
                                {displayedSeasonList
                                    .filter(u => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return u.ingame.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q) || u.class.toLowerCase().includes(q);
                                    })
                                    .map((user) => {
                                        const isEditing = editingUid === user.id && editType === 'season';
                                        const rankIdx = visibleRankMap[user.id];

                                        return (
                                            <tr
                                                key={user.id}
                                                className={`transition-colors group ${
                                                    user.isHidden
                                                        ? 'bg-zinc-950/60 opacity-65 hover:opacity-100 hover:bg-zinc-900/60'
                                                        : 'hover:bg-amber-950/20'
                                                }`}
                                            >
                                                <td className="py-3.5 px-4 text-center font-mono font-bold">
                                                    {user.isHidden ? (
                                                        <span title="Đang bị ẩn khỏi bảng công khai">🙈</span>
                                                    ) : rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : rankIdx === 2 ? '🥉' : (
                                                        <span className="text-zinc-500">#{rankIdx + 1}</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div>
                                                        <div className="font-black text-amber-200 text-sm group-hover:text-amber-100 flex flex-wrap items-center gap-1.5">
                                                            <span>{user.ingame}</span>
                                                            {user.isManualHidden && (
                                                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                                                                    Đã ẩn
                                                                </span>
                                                            )}
                                                            {user.isOutsideDanhLuc && (
                                                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold">
                                                                    Ngoài Danh Lục
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                                                            <span>UID: {user.uid}</span>
                                                            {user.discordName && (
                                                                <span className="text-indigo-400">@{user.discordName}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-bold">
                                                        {user.class}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {user.titleInfo ? (
                                                        <SatTuongBadge titleInfo={user.titleInfo} size="sm" />
                                                    ) : (
                                                        <span className="text-[11px] text-zinc-600 italic">Chưa đạt mốc</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-center font-mono font-black text-amber-400 text-sm">
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={editPts}
                                                            onChange={(e) => setEditPts(Number(e.target.value))}
                                                            className="w-16 bg-zinc-950 border border-amber-400 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold"
                                                        />
                                                    ) : (
                                                        `${user.seasonPts} Mùa`
                                                    )}
                                                </td>

                                                {isMaster && (
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        {isEditing ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    disabled={isSaving}
                                                                    onClick={() => handleSavePts(user.id)}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-black text-xs cursor-pointer"
                                                                >
                                                                    💾 Lưu
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingUid(null)}
                                                                    className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
                                                                >
                                                                    Hủy
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingUid(user.id);
                                                                        setEditPts(user.seasonPts);
                                                                        setEditType('season');
                                                                    }}
                                                                    className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs cursor-pointer"
                                                                >
                                                                    ✏️ Sửa Mùa
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={togglingHideId === user.id}
                                                                    onClick={() => handleToggleHideSeason(user)}
                                                                    title={
                                                                        user.isOutsideDanhLuc && !user.isManualHidden
                                                                            ? 'Đang tự động ẩn vì đã rời Sổ Danh Lục (bấm để đánh dấu ẩn đồng bộ Discord)'
                                                                            : user.isManualHidden
                                                                                ? 'Hiện lại trên Bảng Vàng (đồng bộ Web & Discord)'
                                                                                : 'Ẩn khỏi Bảng Vàng (giữ nguyên số mùa, đồng bộ Web & Discord)'
                                                                    }
                                                                    className={`px-2 py-1 rounded-lg border font-bold text-xs cursor-pointer disabled:opacity-50 ${
                                                                        user.isManualHidden
                                                                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                                                                            : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-300'
                                                                    }`}
                                                                >
                                                                    {togglingHideId === user.id
                                                                        ? '⏳...'
                                                                        : user.isManualHidden
                                                                            ? '👁️ Hiện'
                                                                            : '🙈 Ẩn'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🔴 3B. BẢNG 2: BẢNG PHONG THẦN THÁNG (ĐIỂM DENSE RANK) */}
            {activeSubTab === 'monthly' && (
                <div className="bg-[#0b0404]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="bg-zinc-950/80 px-6 py-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-lg font-black text-rose-400 flex items-center gap-2">
                                <span>🏆 Bảng Phong Thần ({activeMonthTitle})</span>
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Mỗi Boss: <b>Top 1 = 3đ</b> | <b>Top 2 = 2đ</b> | <b>Top 3 = 1đ</b> • Xếp hạng Dense Rank tự động từ Bảng Sheet Web.
                            </p>
                        </div>
                        <div className="text-xs font-mono text-zinc-400">
                            Tổng: <b className="text-rose-400">{monthlyList.length}</b> hiệp khách
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950 border-b border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">
                                    <th className="py-3.5 px-4 w-16 text-center">Hạng</th>
                                    <th className="py-3.5 px-4">👤 Hiệp Khách In-game & UID</th>
                                    <th className="py-3.5 px-4">⚔️ Môn Phái</th>
                                    <th className="py-3.5 px-4">🎖️ Danh Hiệu Mùa Hiện Tại</th>
                                    <th className="py-3.5 px-4 text-center font-mono">🏆 Điểm Phong Thần {activeMonthTitle}</th>
                                    {isMaster && isViewingActiveMonth && <th className="py-3.5 px-4 text-right">⚙️ Quản Trị</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-xs font-medium">
                                {monthlyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={isMaster && isViewingActiveMonth ? 6 : 5} className="py-12 text-center text-zinc-500 italic">
                                            Chưa có dữ liệu điểm phong thần {activeMonthTitle.toLowerCase()}.
                                        </td>
                                    </tr>
                                ) : (
                                    monthlyList
                                        .filter(u => {
                                            if (!searchQuery) return true;
                                            const q = searchQuery.toLowerCase();
                                            return u.ingame.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q) || u.class.toLowerCase().includes(q);
                                        })
                                        .map((user, idx) => {
                                            const isEditing = editingUid === user.id && editType === 'monthly';

                                            return (
                                                <tr key={user.id} className="hover:bg-rose-950/20 transition-colors group">
                                                    <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                                                        {idx === 0 ? '👑' : idx === 1 ? '🌟' : idx === 2 ? '⭐' : idx < 5 ? '🏅' : '🥉'}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <div>
                                                            <div className="font-black text-rose-300 text-sm group-hover:text-rose-200">
                                                                {user.ingame}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                                                                <span>UID: {user.uid}</span>
                                                                {user.discordName && (
                                                                    <span className="text-indigo-400">@{user.discordName}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-bold">
                                                            {user.class}
                                                        </span>
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {user.titleInfo ? (
                                                            <SatTuongBadge titleInfo={user.titleInfo} size="sm" />
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-600 italic">—</span>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center font-mono font-black text-rose-400 text-base">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={editPts}
                                                                onChange={(e) => setEditPts(Number(e.target.value))}
                                                                className="w-16 bg-zinc-950 border border-rose-400 rounded px-1.5 py-0.5 text-xs text-center font-mono font-bold"
                                                            />
                                                        ) : (
                                                            `${user.points} điểm`
                                                        )}
                                                    </td>

                                                    {isMaster && isViewingActiveMonth && (
                                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                            {isEditing ? (
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isSaving}
                                                                        onClick={() => handleSavePts(user.id)}
                                                                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-black text-xs cursor-pointer"
                                                                    >
                                                                        💾 Lưu
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setEditingUid(null)}
                                                                        className="px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-bold text-xs cursor-pointer"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingUid(user.id);
                                                                        setEditPts(user.points);
                                                                        setEditType('monthly');
                                                                    }}
                                                                    className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer"
                                                                >
                                                                    ✏️ Bù/Sửa Điểm
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🔴 3C. BẢNG 3: NHẬT KÝ CHIẾN BÁO & TỐC ĐỘ DIỆT BOSS THEO TUẦN */}
            {activeSubTab === 'history' && battleHistory.length === 0 && (
                <div className="bg-[#0b0404]/90 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs italic">
                    Chưa có dữ liệu chiến báo &amp; tốc độ diệt boss trong tuần.
                </div>
            )}
            {activeSubTab === 'history' && battleHistory.length > 0 && (
                <div className="space-y-6">
                    {/* THANH ĐIỀU HƯỚNG LỌC THEO TUẦN */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3 px-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 mr-1">
                                <span>📅</span>
                                <span>Lọc Theo Tuần:</span>
                            </span>

                            <button
                                type="button"
                                onClick={() => setSelectedWeekFilter('ALL')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    selectedWeekFilter === 'ALL'
                                        ? 'bg-amber-500 text-zinc-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                }`}
                            >
                                Tất Cả ({availableWeeks.length} Tuần)
                            </button>

                            {availableWeeks.map(w => (
                                <button
                                    key={w}
                                    type="button"
                                    onClick={() => setSelectedWeekFilter(w)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        selectedWeekFilter === w
                                            ? 'bg-amber-500 text-zinc-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                    }`}
                                >
                                    Tuần {w}
                                </button>
                            ))}
                        </div>

                        <div className="text-xs font-mono text-zinc-400">
                            Hiển thị: <b className="text-amber-400">{filteredWeekGroups.reduce((acc, g) => acc + g.bosses.length, 0)}</b> Boss
                        </div>
                    </div>

                    {filteredWeekGroups.length === 0 ? (
                        <div className="bg-[#0b0404]/90 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                            {searchQuery ? 'Không tìm thấy nhật ký boss khớp với từ khóa tìm kiếm.' : 'Chưa có nhật ký thảo phạt boss nào trong tuần này.'}
                        </div>
                    ) : (
                        filteredWeekGroups.map(group => {
                            const totalKillsInWeek = group.bosses.reduce((acc, b) => acc + b.records.length, 0);

                            return (
                                <div
                                    key={group.week}
                                    className="rounded-3xl bg-gradient-to-b from-[#140606] to-[#090202] border border-rose-950/60 p-4 sm:p-5 shadow-xl space-y-4"
                                >
                                    {/* TIÊU ĐỀ TUẦN */}
                                    <div className="flex items-center justify-between border-b border-rose-900/30 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                <span>📅</span>
                                                <span>{group.weekLabel.toUpperCase()}</span>
                                            </span>
                                            <span className="text-xs text-zinc-400 font-bold hidden sm:inline">
                                                • Cặp Đôi Mục Tiêu Sát Tướng
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono text-amber-400/90 font-bold bg-black/40 px-3 py-1 rounded-xl border border-zinc-800">
                                            {totalKillsInWeek} Kỷ Lục
                                        </span>
                                    </div>

                                    {/* DANH SÁCH BOSS CỦA TUẦN (MỖI TUẦN 2 CỘT CÂN ĐỐI NẰM CẠNH NHAU TRÊN 1 DÒNG) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {group.bosses.map((boss, bIdx) => (
                                            <div
                                                key={bIdx}
                                                className="bg-black/60 border border-zinc-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3"
                                            >
                                                <div>
                                                    {/* HEADER BOSS */}
                                                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-2.5">
                                                        <span className="font-black text-sm text-amber-300 truncate pr-2">
                                                            ⚔️ {boss.bossTitle}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-zinc-400 shrink-0 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                                                            {boss.records.length} Kỷ Lục
                                                        </span>
                                                    </div>

                                                    {/* DANH SÁCH NGƯỜI CHƠI & THỜI GIAN */}
                                                    <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                                                        {boss.records.length === 0 ? (
                                                            <div className="text-[11px] text-zinc-500 italic py-4 text-center">
                                                                Chưa có dữ liệu chiến báo...
                                                            </div>
                                                        ) : (
                                                            boss.records.map((rec, rIdx) => {
                                                                let denseRank = 1;
                                                                for (let prevI = 0; prevI < rIdx; prevI++) {
                                                                    if (boss.records[prevI].seconds < rec.seconds) {
                                                                        denseRank++;
                                                                    }
                                                                    // Note: increment only when strict step increases among unique times
                                                                }
                                                                const uniqueBetterTimes = new Set(
                                                                    boss.records.slice(0, rIdx).filter(p => p.seconds < rec.seconds).map(p => p.seconds)
                                                                ).size;
                                                                denseRank = uniqueBetterTimes + 1;

                                                                return (
                                                                <div
                                                                    key={rIdx}
                                                                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/70 hover:border-zinc-700/80 transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className="text-sm shrink-0">
                                                                            {denseRank === 1 ? '🥇' : denseRank === 2 ? '🥈' : denseRank === 3 ? '🥉' : (
                                                                                <span className="font-mono text-zinc-500 font-bold text-xs">#{rIdx + 1}</span>
                                                                            )}
                                                                        </span>
                                                                        <span className="font-bold text-zinc-200 truncate">
                                                                            {rec.name}
                                                                        </span>
                                                                        {rec.class && rec.class !== 'Chưa rõ' && (
                                                                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-medium shrink-0">
                                                                                {rec.class}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* THỜI GIAN HOÀN THÀNH */}
                                                                    {rec.time && rec.time !== '—' && rec.time !== '✅ Đã Hạ Gục' ? (
                                                                        <span className="font-mono font-bold text-amber-300 text-xs shrink-0 ml-2 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/25">
                                                                            ⏱️ {rec.time.replace(/^⏱️\s*/, '')}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[11px] font-bold text-emerald-400 shrink-0 ml-2 inline-flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                                                                            <span>✅</span>
                                                                            <span>Đã Hạ Gục</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </section>
    );
}
