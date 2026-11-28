/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SatTuongBossCol {
    id: string;
    title: string;
    week: number;
    bossName?: string;
}

export interface SatTuongRow {
    rowId: string;
    discordId?: string;
    name: string;
    cells: Record<string, string>;
}

export interface SatTuongMonthSheet {
    monthKey: string;
    title: string;
    year: number;
    monthNum: number;
    applyHandicap?: boolean;
    isArchived?: boolean;
    closedAt?: number;
    frozenHandicap?: Record<string, number>;
    legacySheetGid?: string;
    cols: SatTuongBossCol[];
    rows: SatTuongRow[];
    updatedAt?: number;
    updatedBy?: string;
}

export interface SatTuongSheetDoc {
    activeMonthKey: string;
    legacySheetId?: string;
    months: Record<string, SatTuongMonthSheet>;
    updatedAt?: number;
}

export interface DerivedBossRecord {
    name: string;
    sheetName: string;
    timeStr: string;
    sec: number;
    rawTimeStr: string;
    rawSec: number;
    penaltySec: number;
    discordId?: string;
}

export interface DerivedMonthResult {
    bossRecords: Record<string, DerivedBossRecord[]>;
    monthlyPoints: Record<string, number>;
    monthlyRanking: Record<string, { name: string; points: number }>;
    history: Record<string, string[]>;
    completedPlayers: string[];
    rowStats: Record<string, { penaltySec: number; monthlyPts: number; resolvedDiscordId?: string }>;
}

export const LEGACY_SAT_TUONG_SHEET_ID = '1c18JU74EA5deT2KVzAxT-f3YP8slibVcXbWeaw07EVg';

export function getNowMs(): number {
    return Date.now();
}

export function makeUniqueId(prefix: string, suffix?: string | number): string {
    return suffix !== undefined ? `${prefix}_${Date.now()}_${suffix}` : `${prefix}_${Date.now()}`;
}

export function parseSheetSeconds(val: unknown): number {
    if (val === null || val === undefined || val === '') return 999999;
    if (typeof val === 'number') {
        if (isNaN(val) || val <= 0) return 999999;
        return Math.round(val);
    }
    if (typeof val !== 'string') return 999999;
    const str = val.trim();
    if (!str || str === '—' || str === '-') return 999999;

    // Pure integer -> seconds
    if (/^\d+$/.test(str)) {
        const parsed = parseInt(str, 10);
        return parsed > 0 ? parsed : 999999;
    }

    // "1:06" / "01:06"
    if (str.includes(':')) {
        const parts = str.split(':').map((p) => Number(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const total = Math.round(parts[0] * 60 + parts[1]);
            return total > 0 ? total : 999999;
        }
    }

    // "1m06s" / "1m6" / "1p06" / "45s"
    const m = str.match(/(\d+)\s*(?:m|p|phút)/i);
    const s = str.match(/(?:m|p|phút)\s*(\d+)|^(\d+)\s*(?:s|g|giây)?$/i);
    let sec = 0;
    if (m) sec += parseInt(m[1], 10) * 60;
    if (s) {
        const secPart = s[1] ?? s[2];
        if (secPart) sec += parseInt(secPart, 10);
    } else {
        const trailingSec = str.match(/(\d+)\s*(?:s|g|giây)/i);
        if (trailingSec && !m) sec += parseInt(trailingSec[1], 10);
    }

    return sec > 0 ? sec : 999999;
}

export function formatSheetSeconds(totalSec: number): string {
    if (!totalSec || totalSec >= 999999 || totalSec <= 0) return '';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
    return `${s}s`;
}

export function normalizeCellTimeInput(rawInput: string): string {
    const trimmed = String(rawInput || '').trim();
    if (!trimmed || trimmed === '-' || trimmed === '—') return '';
    const sec = parseSheetSeconds(trimmed);
    if (sec >= 999999) return '';
    return formatSheetSeconds(sec);
}

export function stripLegacyPenaltyTag(name: string): string {
    return String(name || '').replace(/\+\s*\d+\s*s\b/i, '').trim();
}

export function resolveRowDiscordId(
    row: { discordId?: string; name: string },
    danhLuc: Record<string, any>
): string | undefined {
    if (row.discordId && danhLuc?.[row.discordId]) return row.discordId;
    if (!danhLuc) return row.discordId;

    const clean = stripLegacyPenaltyTag(row.name).toLowerCase();
    if (!clean) return row.discordId;

    // 1. Exact match on ingame / ten_game / discordName
    for (const [uid, info] of Object.entries(danhLuc)) {
        if (!info || typeof info !== 'object') continue;
        const ingame = String(info.ingame || info.ten_game || '').trim().toLowerCase();
        if (ingame && ingame === clean) return uid;
    }

    // 2. Fuzzy substring match
    for (const [uid, info] of Object.entries(danhLuc)) {
        if (!info || typeof info !== 'object') continue;
        const ingame = String(info.ingame || info.ten_game || info.nickname || '').trim().toLowerCase();
        if (ingame && (ingame.includes(clean) || clean.includes(ingame))) return uid;
    }

    return row.discordId;
}

export function resolveBossDisplayShortName(bossFullName: string): string {
    return String(bossFullName || '').split('(')[0].trim();
}

export function extractCompletedPlayersFromRecords(
    bossRecords: Record<string, DerivedBossRecord[]>,
    currentBossName: string,
    danhLuc: Record<string, any>
): string[] {
    if (!bossRecords || !currentBossName) return [];
    const targetClean = currentBossName.toLowerCase();
    const targetVi = resolveBossDisplayShortName(currentBossName).toLowerCase();

    let matchedKey: string | null = null;
    for (const key of Object.keys(bossRecords)) {
        const kClean = key.toLowerCase();
        const kVi = resolveBossDisplayShortName(key).toLowerCase();
        if (kClean === targetClean || kVi === targetVi || kClean.includes(targetVi) || targetVi.includes(kVi)) {
            matchedKey = key;
            break;
        }
    }

    if (!matchedKey || !Array.isArray(bossRecords[matchedKey])) return [];
    const out: string[] = [];
    for (const rec of bossRecords[matchedKey]) {
        const uid = rec.discordId || resolveRowDiscordId({ name: rec.name }, danhLuc);
        if (uid && !out.includes(uid)) out.push(uid);
    }
    return out;
}

export function computeSatTuongMonthDerived(
    monthSheet: SatTuongMonthSheet | null | undefined,
    danhLuc: Record<string, any> = {},
    seasonRanking: Record<string, any> = {},
    tuViData: Record<string, any> = {},
    currentBoss = ''
): DerivedMonthResult {
    const empty: DerivedMonthResult = {
        bossRecords: {},
        monthlyPoints: {},
        monthlyRanking: {},
        history: {},
        completedPlayers: [],
        rowStats: {}
    };
    if (!monthSheet) return empty;

    const cols = Array.isArray(monthSheet.cols) ? monthSheet.cols : [];
    const rows = Array.isArray(monthSheet.rows) ? monthSheet.rows : [];
    const bossRecords: Record<string, DerivedBossRecord[]> = {};
    const monthlyPoints: Record<string, number> = {};
    const history: Record<string, string[]> = {};
    const rowStats: Record<string, { penaltySec: number; monthlyPts: number; resolvedDiscordId?: string }> = {};

    const getPenaltySec = (row: SatTuongRow, resolvedUid?: string): number => {
        if (!monthSheet.applyHandicap) return 0;
        if (monthSheet.frozenHandicap) {
            if (resolvedUid && monthSheet.frozenHandicap[resolvedUid] !== undefined) {
                return Number(monthSheet.frozenHandicap[resolvedUid]) || 0;
            }
            if (monthSheet.frozenHandicap[row.name] !== undefined) {
                return Number(monthSheet.frozenHandicap[row.name]) || 0;
            }
            return 0;
        }
        if (resolvedUid) {
            const pts =
                seasonRanking?.[resolvedUid]?.satTuongSeasonPts ??
                tuViData?.[resolvedUid]?.satTuongSeasonPts ??
                0;
            return Math.max(0, Number(pts) || 0);
        }
        return 0;
    };

    const rowResolvedMap = new Map<string, { uid?: string; displayName: string; penaltySec: number }>();
    for (const row of rows) {
        const uid = resolveRowDiscordId(row, danhLuc);
        const displayName = (uid && danhLuc?.[uid]?.ingame) ? String(danhLuc[uid].ingame).trim() : row.name;
        const penaltySec = getPenaltySec(row, uid);
        rowResolvedMap.set(row.rowId, { uid, displayName, penaltySec });
        rowStats[row.rowId] = { penaltySec, monthlyPts: 0, resolvedDiscordId: uid };
    }

    for (const col of cols) {
        const records: Array<DerivedBossRecord & { _rowId: string }> = [];
        for (const row of rows) {
            const rawCell = (row.cells?.[col.id] || '').trim();
            if (!rawCell) continue;
            const rawSec = parseSheetSeconds(rawCell);
            if (rawSec >= 999999) continue;

            const info = rowResolvedMap.get(row.rowId)!;
            const finalSec = rawSec + info.penaltySec;
            records.push({
                _rowId: row.rowId,
                name: info.displayName,
                sheetName: info.displayName,
                timeStr: formatSheetSeconds(finalSec),
                sec: finalSec,
                rawTimeStr: formatSheetSeconds(rawSec) || rawCell,
                rawSec,
                penaltySec: info.penaltySec,
                ...(info.uid ? { discordId: info.uid } : {})
            });
        }

        records.sort((a, b) => a.sec - b.sec);

        let currentRank = 1;
        let prevSec = -1;
        const colUids: string[] = [];

        records.forEach((rec) => {
            if (prevSec !== -1 && rec.sec > prevSec) {
                currentRank++;
            }
            prevSec = rec.sec;

            if (currentRank <= 3) {
                const pts = currentRank === 1 ? 3 : currentRank === 2 ? 2 : 1;
                monthlyPoints[rec.sheetName] = (monthlyPoints[rec.sheetName] || 0) + pts;
                if (rowStats[rec._rowId]) {
                    rowStats[rec._rowId].monthlyPts += pts;
                }
            }
            if (rec.discordId && !colUids.includes(rec.discordId)) {
                colUids.push(rec.discordId);
            }
        });

        bossRecords[col.title] = records.map((rec) => ({
            name: rec.name,
            sheetName: rec.sheetName,
            timeStr: rec.timeStr,
            sec: rec.sec,
            rawTimeStr: rec.rawTimeStr,
            rawSec: rec.rawSec,
            penaltySec: rec.penaltySec,
            ...(rec.discordId ? { discordId: rec.discordId } : {})
        }));
        history[col.title] = colUids;
    }

    const monthlyRanking: Record<string, { name: string; points: number }> = {};
    for (const [sheetName, pts] of Object.entries(monthlyPoints)) {
        const uid = resolveRowDiscordId({ name: sheetName }, danhLuc);
        monthlyRanking[uid || sheetName] = { name: sheetName, points: pts };
    }

    const completedPlayers = extractCompletedPlayersFromRecords(bossRecords, currentBoss, danhLuc);

    return {
        bossRecords,
        monthlyPoints,
        monthlyRanking,
        history,
        completedPlayers,
        rowStats
    };
}

export function buildRowsSyncedWithDanhLuc(
    existingRows: SatTuongRow[],
    danhLuc: Record<string, any>
): SatTuongRow[] {
    const out: SatTuongRow[] = [];
    const seenDiscordIds = new Set<string>();

    // 1. Keep existing rows first (updating name if matched to Danh Lục)
    for (const row of existingRows || []) {
        const uid = resolveRowDiscordId(row, danhLuc);
        if (uid) {
            if (seenDiscordIds.has(uid)) continue;
            seenDiscordIds.add(uid);
        }
        const memberName = uid && danhLuc?.[uid]?.ingame ? String(danhLuc[uid].ingame).trim() : row.name;
        out.push({
            ...row,
            ...(uid ? { discordId: uid } : {}),
            name: memberName
        });
    }

    // 2. Append missing members currently in Danh Lục (alphabetically by ingame)
    const missingMembers = Object.entries(danhLuc || {})
        .filter(([uid, info]) => info && typeof info === 'object' && !seenDiscordIds.has(uid))
        .sort((a, b) => String(a[1]?.ingame || '').localeCompare(String(b[1]?.ingame || ''), 'vi'));

    for (const [uid, info] of missingMembers) {
        const name = String(info?.ingame || info?.discordName || `Đại Hiệp #${uid.slice(-4)}`).trim();
        out.push({
            rowId: uid,
            discordId: uid,
            name,
            cells: {}
        });
    }

    return out;
}

export function buildSatTuongDataSnapshot(
    monthSheet: SatTuongMonthSheet,
    danhLuc: Record<string, any>,
    existingSatTuongData: Record<string, any> = {},
    tuViData: Record<string, any> = {},
    bossRotation: Record<string, any> = {}
) {
    const seasonRanking = (tuViData && Object.keys(tuViData).length > 0)
        ? tuViData
        : (existingSatTuongData?.seasonRanking || {});

    const targetBosses: string[] = Array.isArray(bossRotation?.pickedBosses) && bossRotation.pickedBosses.length > 0
        ? bossRotation.pickedBosses
        : (Array.isArray(existingSatTuongData?.targetBosses) ? existingSatTuongData.targetBosses : []);

    const currentBoss =
        bossRotation?.currentBoss ||
        targetBosses[0] ||
        existingSatTuongData?.currentBoss ||
        '';

    const derived = computeSatTuongMonthDerived(monthSheet, danhLuc, seasonRanking, tuViData, currentBoss);

    return {
        thang: monthSheet.title,
        month: monthSheet.title,
        activeMonthKey: monthSheet.monthKey,
        currentBoss,
        ...(targetBosses.length > 0 ? { targetBosses } : {}),
        completedPlayers: derived.completedPlayers,
        history: derived.history,
        monthlyRanking: derived.monthlyRanking,
        bossRecords: derived.bossRecords,
        seasonRanking,
        source: 'web_sheet',
        updatedAt: Date.now()
    };
}

export function exportMonthToCsv(monthSheet: SatTuongMonthSheet, danhLuc: Record<string, any> = {}): string {
    const escapeCsv = (v: string) => {
        const s = String(v ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const cols = monthSheet.cols || [];
    const rows = monthSheet.rows || [];

    const row0 = ['BANG CHÚNG', 'SÁT TƯỚNG', ...cols.slice(1).map(() => '')].map(escapeCsv).join(',');
    const row1 = ['', ...cols.map((c) => c.title)].map(escapeCsv).join(',');
    const dataLines = rows.map((r) => {
        const displayName = (r.discordId && danhLuc?.[r.discordId]?.ingame)
            ? String(danhLuc[r.discordId].ingame).trim()
            : r.name;
        const vals = [displayName, ...cols.map((c) => r.cells?.[c.id] || '')];
        return vals.map(escapeCsv).join(',');
    });

    return '\uFEFF' + [row0, row1, ...dataLines].join('\r\n');
}
