/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    SatTuongSheetDoc,
    SatTuongMonthSheet,
    SatTuongBossCol,
    SatTuongRow,
    DerivedMonthResult,
    LEGACY_SAT_TUONG_SHEET_ID,
    buildRowsSyncedWithDanhLuc,
    buildSatTuongDataSnapshot,
    exportMonthToCsv,
    normalizeCellTimeInput,
    parseSheetSeconds,
    formatSheetSeconds,
    resolveBossDisplayShortName,
    getNowMs,
    makeUniqueId
} from '@/lib/satTuongSheetUtils';
import { normalizeVoHocName } from '@/components/tabs/DanhLucTab';

interface Props {
    sheetDoc: SatTuongSheetDoc | null;
    selectedMonth: SatTuongMonthSheet | null;
    selectedMonthKey: string;
    onSelectMonthKey: (key: string) => void;
    derived: DerivedMonthResult;
    danhLuc: Record<string, any>;
    satTuongData: any;
    tuViData?: Record<string, any>;
    bossRotation?: any;
    metadata?: any;
    targetBoss1: string;
    targetBoss2: string;
    canEdit: boolean;
    isMaster: boolean;
    actorName: string;
    searchQuery: string;
}

export default function SatTuongSheetView({
    sheetDoc,
    selectedMonth,
    selectedMonthKey,
    onSelectMonthKey,
    derived,
    danhLuc,
    satTuongData,
    tuViData = {},
    bossRotation,
    metadata,
    targetBoss1,
    targetBoss2,
    canEdit,
    isMaster,
    actorName,
    searchQuery
}: Props) {
    const [unlockArchive, setUnlockArchive] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');

    // Add Boss Column UI state
    const [showAddCol, setShowAddCol] = useState(false);
    const [newColBoss, setNewColBoss] = useState('');
    const [newColWeek, setNewColWeek] = useState<number>(1);

    // Add Manual Row UI state
    const [showAddRow, setShowAddRow] = useState(false);
    const [newRowName, setNewRowName] = useState('');

    // Inline editing cell draft
    const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
    const [cellDraft, setCellDraft] = useState<string>('');
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Edit column header inline
    const [editingColId, setEditingColId] = useState<string | null>(null);
    const [colTitleDraft, setColTitleDraft] = useState<string>('');

    const isArchived = Boolean(selectedMonth?.isArchived);
    const isActiveMonth = Boolean(sheetDoc?.activeMonthKey && selectedMonthKey === sheetDoc.activeMonthKey);
    const isEditable = canEdit && (!isArchived || (isMaster && unlockArchive));

    const bossCatalog: string[] = useMemo(() => {
        if (Array.isArray(metadata?.BOSS_SAT_TUONG) && metadata.BOSS_SAT_TUONG.length > 0) {
            return metadata.BOSS_SAT_TUONG;
        }
        return [
            targetBoss1,
            targetBoss2
        ].filter(Boolean);
    }, [metadata, targetBoss1, targetBoss2]);

    const sortedMonthKeys = useMemo(() => {
        if (!sheetDoc?.months) return [];
        return Object.keys(sheetDoc.months).sort((a, b) => {
            const ma = sheetDoc.months[a];
            const mb = sheetDoc.months[b];
            if ((mb?.year || 0) !== (ma?.year || 0)) return (mb?.year || 0) - (ma?.year || 0);
            return (mb?.monthNum || 0) - (ma?.monthNum || 0);
        });
    }, [sheetDoc]);

    const maxWeekInMonth = useMemo(() => {
        if (!selectedMonth?.cols?.length) return 0;
        return selectedMonth.cols.reduce((mx, c) => Math.max(mx, c.week || 0), 0);
    }, [selectedMonth]);

    // Check how many Danh Luc members are missing from current month rows
    const missingDanhLucCount = useMemo(() => {
        if (!selectedMonth || !danhLuc) return 0;
        const presentUids = new Set<string>();
        selectedMonth.rows.forEach((r) => {
            const uid = derived.rowStats[r.rowId]?.resolvedDiscordId || r.discordId;
            if (uid) presentUids.add(uid);
        });
        return Object.keys(danhLuc).filter((uid) => !presentUids.has(uid)).length;
    }, [selectedMonth, danhLuc, derived.rowStats]);

    const filteredRows = useMemo(() => {
        if (!selectedMonth?.rows) return [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return selectedMonth.rows;
        return selectedMonth.rows.filter((r) => {
            const uid = derived.rowStats[r.rowId]?.resolvedDiscordId || r.discordId;
            const member = uid ? danhLuc?.[uid] : null;
            const ingame = String(member?.ingame || r.name || '').toLowerCase();
            const mUid = String(member?.uid || '').toLowerCase();
            const mClass = normalizeVoHocName(member?.class || '').toLowerCase();
            return ingame.includes(q) || mUid.includes(q) || mClass.includes(q);
        });
    }, [selectedMonth, searchQuery, derived.rowStats, danhLuc]);

    const persistMonth = async (
        nextMonth: SatTuongMonthSheet,
        opts?: { setActiveMonthKey?: string; extraMonths?: Record<string, SatTuongMonthSheet>; msg?: string }
    ) => {
        setSaveStatus('saving');
        setSaveMessage(opts?.msg || 'Đang lưu & đồng bộ...');
        try {
            const stamp = getNowMs();
            const cleanMonth: SatTuongMonthSheet = {
                ...nextMonth,
                updatedAt: stamp,
                updatedBy: actorName
            };

            const monthsPatch: Record<string, SatTuongMonthSheet> = {
                ...(opts?.extraMonths || {}),
                [cleanMonth.monthKey]: cleanMonth
            };

            const sheetPatch: Record<string, any> = {
                months: monthsPatch,
                updatedAt: stamp
            };
            if (opts?.setActiveMonthKey) {
                sheetPatch.activeMonthKey = opts.setActiveMonthKey;
            }

            const writes: Promise<void>[] = [
                setDoc(doc(db, 'thanhlong_config', 'sat_tuong_sheet'), sheetPatch, { merge: true })
            ];

            const targetActiveKey = opts?.setActiveMonthKey || sheetDoc?.activeMonthKey;
            if (cleanMonth.monthKey === targetActiveKey) {
                const snapshot = buildSatTuongDataSnapshot(
                    cleanMonth,
                    danhLuc,
                    satTuongData,
                    tuViData,
                    bossRotation
                );
                writes.push(setDoc(doc(db, 'thanhlong_config', 'sat_tuong_data'), snapshot));
            }

            await Promise.all(writes);
            setSaveStatus('saved');
            setSaveMessage(opts?.msg || 'Đã lưu & đồng bộ Firebase + Discord');
            window.setTimeout(() => {
                setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
            }, 2500);
        } catch (err) {
            console.error('Lỗi lưu Sát Tướng Sheet:', err);
            setSaveStatus('error');
            setSaveMessage('❌ Lỗi lưu Firebase! Vui lòng thử lại.');
        }
    };

    const commitCell = async (row: SatTuongRow, colId: string, rawInput: string) => {
        if (!selectedMonth || !isEditable) return;
        const prevVal = (row.cells?.[colId] || '').trim();
        const trimmed = rawInput.trim();
        const normalized = trimmed === '' ? '' : normalizeCellTimeInput(trimmed);

        // If invalid time string and not blank, revert unless user cleared
        if (trimmed !== '' && normalized === '') {
            alert(`Định dạng thời gian "${trimmed}" chưa hợp lệ. Nhập số giây (vd: 45, 65) hoặc mm:ss / 1m05s.`);
            return;
        }

        if (normalized === prevVal) return;

        const nextRows = selectedMonth.rows.map((r) => {
            if (r.rowId !== row.rowId) return r;
            const nextCells = { ...(r.cells || {}) };
            if (normalized === '') {
                delete nextCells[colId];
            } else {
                nextCells[colId] = normalized;
            }
            return { ...r, cells: nextCells };
        });

        await persistMonth({ ...selectedMonth, rows: nextRows }, {
            msg: `Đã lưu ô ${row.name} (${normalized || 'xóa'})`
        });
    };

    const focusCell = (rIdx: number, cIdx: number) => {
        if (rIdx < 0 || rIdx >= filteredRows.length) return;
        const cols = selectedMonth?.cols || [];
        if (cIdx < 0 || cIdx >= cols.length) return;
        const targetRow = filteredRows[rIdx];
        const targetCol = cols[cIdx];
        const key = `${targetRow.rowId}__${targetCol.id}`;
        const el = inputRefs.current[key];
        if (el) {
            el.focus();
            el.select();
        }
    };

    const handleSyncDanhLuc = async () => {
        if (!selectedMonth || !isEditable) return;
        const syncedRows = buildRowsSyncedWithDanhLuc(selectedMonth.rows, danhLuc);
        await persistMonth({ ...selectedMonth, rows: syncedRows }, {
            msg: `Đã đồng bộ ${syncedRows.length} thành viên từ Sổ Danh Lục`
        });
    };

    const handleAddWeeklyPairCols = async () => {
        if (!selectedMonth || !isEditable) return;
        const weekNum = Math.max(1, maxWeekInMonth + 1);
        const candidates = [targetBoss1, targetBoss2].filter(Boolean);
        if (candidates.length === 0) {
            alert('Chưa có cặp Boss mục tiêu trong boss_rotation. Vui lòng thêm cột thủ công.');
            return;
        }

        const existingTitles = new Set(selectedMonth.cols.map((c) => c.title.toLowerCase().trim()));
        const nextCols = [...selectedMonth.cols];
        let added = 0;

        candidates.forEach((bossFull) => {
            const shortName = resolveBossDisplayShortName(bossFull);
            const title = `${shortName} Tuần ${weekNum}`;
            if (!existingTitles.has(title.toLowerCase())) {
                nextCols.push({
                    id: makeUniqueId('c', nextCols.length + 1),
                    title,
                    week: weekNum,
                    bossName: bossFull
                });
                added++;
            }
        });

        if (added === 0) {
            alert(`Các cột Boss Tuần ${weekNum} đã tồn tại trong bảng.`);
            return;
        }

        await persistMonth({ ...selectedMonth, cols: nextCols }, {
            msg: `Đã thêm ${added} cột Boss Tuần ${weekNum}`
        });
    };

    const handleAddCustomCol = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMonth || !isEditable) return;
        const bossInput = newColBoss.trim();
        if (!bossInput) return;
        const shortName = resolveBossDisplayShortName(bossInput);
        const hasTuan = /tuần\s*\d+/i.test(shortName);
        const title = hasTuan ? shortName : `${shortName} Tuần ${newColWeek}`;
        const weekMatch = title.match(/tuần\s*(\d+)/i);
        const week = weekMatch ? parseInt(weekMatch[1], 10) : newColWeek;

        const nextCol: SatTuongBossCol = {
            id: makeUniqueId('c', selectedMonth.cols.length + 1),
            title,
            week,
            bossName: bossInput
        };

        await persistMonth({
            ...selectedMonth,
            cols: [...selectedMonth.cols, nextCol]
        }, {
            msg: `Đã thêm cột "${title}"`
        });
        setNewColBoss('');
        setShowAddCol(false);
    };

    const handleDeleteCol = async (col: SatTuongBossCol) => {
        if (!selectedMonth || !isEditable) return;
        const filledCount = selectedMonth.rows.filter((r) => Boolean(r.cells?.[col.id]?.trim())).length;
        const confirmMsg = filledCount > 0
            ? `Cột "${col.title}" đang có ${filledCount} kỷ lục đã nhập! Bạn chắc chắn muốn xóa vĩnh viễn cột này?`
            : `Xóa cột trống "${col.title}"?`;
        if (!window.confirm(confirmMsg)) return;

        const nextCols = selectedMonth.cols.filter((c) => c.id !== col.id);
        const nextRows = selectedMonth.rows.map((r) => {
            const nextCells = { ...(r.cells || {}) };
            delete nextCells[col.id];
            return { ...r, cells: nextCells };
        });

        await persistMonth({ ...selectedMonth, cols: nextCols, rows: nextRows }, {
            msg: `Đã xóa cột "${col.title}"`
        });
    };

    const handleRenameCol = async (col: SatTuongBossCol) => {
        if (!selectedMonth || !isEditable) {
            setEditingColId(null);
            return;
        }
        const trimmed = colTitleDraft.trim();
        setEditingColId(null);
        if (!trimmed || trimmed === col.title) return;

        const weekMatch = trimmed.match(/tuần\s*(\d+)/i);
        const week = weekMatch ? parseInt(weekMatch[1], 10) : col.week;

        const nextCols = selectedMonth.cols.map((c) =>
            c.id === col.id ? { ...c, title: trimmed, week } : c
        );
        await persistMonth({ ...selectedMonth, cols: nextCols }, {
            msg: `Đã đổi tên cột thành "${trimmed}"`
        });
    };

    const handleAddManualRow = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMonth || !isEditable) return;
        const raw = newRowName.trim();
        if (!raw) return;

        const newRow: SatTuongRow = {
            rowId: makeUniqueId('manual'),
            name: raw,
            cells: {}
        };
        await persistMonth({
            ...selectedMonth,
            rows: [...selectedMonth.rows, newRow]
        }, {
            msg: `Đã thêm thành viên "${raw}" vào bảng`
        });
        setNewRowName('');
        setShowAddRow(false);
    };

    const handleOpenNewMonth = async () => {
        if (!sheetDoc || !canEdit) return;
        const currentActive = sheetDoc.months?.[sheetDoc.activeMonthKey];
        const baseYear = currentActive?.year || new Date().getFullYear();
        const baseMonth = currentActive?.monthNum || (new Date().getMonth() + 1);
        const nextMonthNum = baseMonth === 12 ? 1 : baseMonth + 1;
        const nextYear = baseMonth === 12 ? baseYear + 1 : baseYear;
        const nextKey = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;
        const nextTitle = `THÁNG ${nextMonthNum}`;

        if (sheetDoc.months?.[nextKey]) {
            if (!window.confirm(`${nextTitle} (${nextKey}) đã tồn tại. Chuyển ${nextTitle} thành tháng đang hoạt động?`)) return;
            const targetMonth = { ...sheetDoc.months[nextKey], isArchived: false, applyHandicap: true };
            const extra: Record<string, SatTuongMonthSheet> = {};
            if (currentActive && currentActive.monthKey !== nextKey) {
                const frozen: Record<string, number> = {};
                currentActive.rows.forEach((r) => {
                    const st = derived.rowStats[r.rowId];
                    if (st?.resolvedDiscordId) frozen[st.resolvedDiscordId] = st.penaltySec;
                });
                extra[currentActive.monthKey] = { ...currentActive, isArchived: true, frozenHandicap: frozen };
            }
            await persistMonth(targetMonth, {
                setActiveMonthKey: nextKey,
                extraMonths: extra,
                msg: `Đã kích hoạt ${nextTitle}`
            });
            onSelectMonthKey(nextKey);
            return;
        }

        if (!window.confirm(`Mở ${nextTitle} (${nextKey}) làm tháng Sát Tướng mới và lưu trữ ${currentActive?.title || 'tháng cũ'}?`)) return;

        const seededRows = buildRowsSyncedWithDanhLuc([], danhLuc);
        const initialCols: SatTuongBossCol[] = [];
        [targetBoss1, targetBoss2].filter(Boolean).forEach((b, idx) => {
            const shortName = resolveBossDisplayShortName(b);
            initialCols.push({
                id: makeUniqueId('c', idx + 1),
                title: `${shortName} Tuần 1`,
                week: 1,
                bossName: b
            });
        });

        const nowTs = getNowMs();
        const newMonth: SatTuongMonthSheet = {
            monthKey: nextKey,
            title: nextTitle,
            year: nextYear,
            monthNum: nextMonthNum,
            applyHandicap: true,
            isArchived: false,
            cols: initialCols,
            rows: seededRows,
            updatedAt: nowTs,
            updatedBy: actorName
        };

        const extra: Record<string, SatTuongMonthSheet> = {};
        if (currentActive) {
            const frozen: Record<string, number> = {};
            currentActive.rows.forEach((r) => {
                const uid = r.discordId || r.rowId;
                const pts = Number(tuViData?.[uid]?.satTuongSeasonPts ?? satTuongData?.seasonRanking?.[uid]?.satTuongSeasonPts ?? 0) || 0;
                if (pts > 0) frozen[uid] = pts;
            });
            extra[currentActive.monthKey] = {
                ...currentActive,
                isArchived: true,
                closedAt: nowTs,
                frozenHandicap: frozen
            };
        }

        await persistMonth(newMonth, {
            setActiveMonthKey: nextKey,
            extraMonths: extra,
            msg: `Đã mở ${nextTitle} với ${seededRows.length} thành viên`
        });
        onSelectMonthKey(nextKey);
    };

    const handleDownloadCsv = () => {
        if (!selectedMonth) return;
        const csv = exportMonthToCsv(selectedMonth, danhLuc);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sat-tuong-${selectedMonth.monthKey}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!sheetDoc || !selectedMonth) {
        return (
            <div className="bg-[#0b0404]/90 border border-zinc-800 rounded-3xl p-10 text-center text-zinc-400 text-xs">
                ⏳ Đang tải dữ liệu Bảng Sheet Sát Tướng từ Firebase...
            </div>
        );
    }

    const legacySheetId = sheetDoc.legacySheetId || LEGACY_SAT_TUONG_SHEET_ID;

    return (
        <div className="bg-[#0b0404]/95 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
            {/* HEADER */}
            <div className="bg-zinc-950/90 px-5 py-4 border-b border-zinc-800/80 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-emerald-300 flex items-center gap-2">
                                <span>📊 Bảng Sheet Nhập Liệu: {selectedMonth.title}</span>
                            </h3>
                            {isActiveMonth ? (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase">
                                    Live • Đang mở
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold uppercase">
                                    📜 Lưu Trữ Lịch Sử
                                </span>
                            )}
                            {selectedMonth.applyHandicap ? (
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                    ⚖️ Có tính tạ +1s/Mùa khi xếp hạng
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-bold">
                                    📜 Giữ nguyên giờ gốc lịch sử
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                            {isEditable
                                ? 'Nhập thẳng giờ gốc vào ô (vd: 45, 65 -> 1m05s, 1m20s). Enter xuống dòng, Tab qua cột. Hệ thống tự cộng tạ & đồng bộ Discord.'
                                : canEdit && isArchived
                                    ? 'Tháng lịch sử đang khóa để tránh sửa nhầm. Bang Chủ có thể mở khóa nếu cần hiệu chỉnh.'
                                    : 'Chế độ xem bảng gốc. Chỉ Bang Chủ & Cán Bộ mới có quyền chỉnh sửa trực tiếp các ô.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {saveStatus !== 'idle' && (
                            <span
                                className={`px-3 py-1 rounded-xl text-[11px] font-bold border ${
                                    saveStatus === 'saving'
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                                        : saveStatus === 'saved'
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                }`}
                            >
                                {saveMessage}
                            </span>
                        )}

                        {selectedMonth.legacySheetGid && (
                            <a
                                href={`https://docs.google.com/spreadsheets/d/${legacySheetId}/edit#gid=${selectedMonth.legacySheetGid}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold transition-all"
                            >
                                🔗 Sheet Gốc Cũ
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={handleDownloadCsv}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-bold cursor-pointer transition-all"
                        >
                            📥 Xuất CSV
                        </button>

                        {isMaster && isArchived && (
                            <button
                                type="button"
                                onClick={() => setUnlockArchive((v) => !v)}
                                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                                    unlockArchive
                                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-amber-500/40'
                                }`}
                            >
                                {unlockArchive ? '🔒 Khóa Lại' : '🔓 Mở Khóa Sửa'}
                            </button>
                        )}
                    </div>
                </div>

                {/* THANH CHUYỂN TAB THÁNG (GIỐNG TABS GOOGLE SHEETS) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {sortedMonthKeys.map((mKey) => {
                        const mObj = sheetDoc.months[mKey];
                        const active = mKey === selectedMonthKey;
                        const isLive = mKey === sheetDoc.activeMonthKey;
                        return (
                            <button
                                key={mKey}
                                type="button"
                                onClick={() => {
                                    onSelectMonthKey(mKey);
                                    setUnlockArchive(false);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                    active
                                        ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                        : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-zinc-800'
                                }`}
                            >
                                <span>{mObj?.title || mKey}</span>
                                {isLive && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-zinc-950' : 'bg-emerald-400'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* THANH CÔNG CỤ CÁN BỘ / BANG CHỦ */}
                {isEditable && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                        <button
                            type="button"
                            onClick={handleAddWeeklyPairCols}
                            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold cursor-pointer transition-all"
                        >
                            ⚡ Thêm 2 Boss Tuần {Math.max(1, maxWeekInMonth + 1)}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setNewColWeek(Math.max(1, maxWeekInMonth || 1));
                                setShowAddCol((v) => !v);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer transition-all"
                        >
                            ➕ Thêm Cột Boss
                        </button>

                        <button
                            type="button"
                            onClick={handleSyncDanhLuc}
                            className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-200 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                        >
                            <span>👤 Đồng Bộ Danh Lục</span>
                            {missingDanhLucCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-sky-400 text-zinc-950 text-[10px] font-black">
                                    +{missingDanhLucCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAddRow((v) => !v)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer transition-all"
                        >
                            ✏️ Thêm Tên Ngoài
                        </button>

                        {isActiveMonth && (
                            <button
                                type="button"
                                onClick={handleOpenNewMonth}
                                className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-200 text-xs font-bold cursor-pointer transition-all ml-auto"
                            >
                                📅 Mở Tháng Mới
                            </button>
                        )}
                    </div>
                )}

                {/* FORM THÊM CỘT BOSS THỦ CÔNG */}
                {isEditable && showAddCol && (
                    <form onSubmit={handleAddCustomCol} className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-zinc-900/90 border border-amber-500/30">
                        <input
                            type="text"
                            list="sattuong-boss-datalist"
                            value={newColBoss}
                            onChange={(e) => setNewColBoss(e.target.value)}
                            placeholder="Chọn hoặc gõ tên Boss (vd: Tiểu Thập Thất)"
                            className="flex-1 min-w-[220px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                        <datalist id="sattuong-boss-datalist">
                            {bossCatalog.map((b) => (
                                <option key={b} value={resolveBossDisplayShortName(b)} />
                            ))}
                        </datalist>
                        <select
                            value={newColWeek}
                            onChange={(e) => setNewColWeek(Number(e.target.value))}
                            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold"
                        >
                            {[1, 2, 3, 4, 5].map((w) => (
                                <option key={w} value={w}>Tuần {w}</option>
                            ))}
                        </select>
                        <button type="submit" className="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black cursor-pointer">
                            💾 Tạo Cột
                        </button>
                        <button type="button" onClick={() => setShowAddCol(false)} className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">
                            Hủy
                        </button>
                    </form>
                )}

                {/* FORM THÊM DÒNG THỦ CÔNG */}
                {isEditable && showAddRow && (
                    <form onSubmit={handleAddManualRow} className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-700">
                        <input
                            type="text"
                            value={newRowName}
                            onChange={(e) => setNewRowName(e.target.value)}
                            placeholder="Nhập tên in-game thành viên cần thêm..."
                            className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                        />
                        <button type="submit" className="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black cursor-pointer">
                            ➕ Thêm Dòng
                        </button>
                        <button type="button" onClick={() => setShowAddRow(false)} className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">
                            Hủy
                        </button>
                    </form>
                )}
            </div>

            {/* BẢNG MA TRẬN SHEET */}
            <div className="overflow-x-auto max-h-[72vh]">
                <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-20 bg-zinc-950 shadow-md">
                        <tr className="border-b border-zinc-800 text-[11px] font-black text-zinc-300 select-none">
                            <th className="py-3 px-2.5 w-10 text-center border-r border-zinc-800/80 bg-zinc-950 sticky left-0 z-30">
                                #
                            </th>
                            <th className="py-3 px-3 min-w-[180px] border-r border-zinc-800 bg-zinc-950 sticky left-10 z-30">
                                👤 BANG CHÚNG ({filteredRows.length})
                            </th>
                            <th className="py-3 px-2.5 text-center border-r border-zinc-800/80 w-14 text-amber-400">
                                ⚖️ Tạ
                            </th>
                            <th className="py-3 px-2.5 text-center border-r border-zinc-800 w-16 text-rose-400">
                                🏆 Điểm
                            </th>
                            {selectedMonth.cols.map((col) => {
                                const isEditingHeader = editingColId === col.id;
                                return (
                                    <th
                                        key={col.id}
                                        className="py-2.5 px-2.5 min-w-[130px] border-r border-zinc-800/70 text-center group align-middle"
                                    >
                                        {isEditingHeader ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={colTitleDraft}
                                                onChange={(e) => setColTitleDraft(e.target.value)}
                                                onBlur={() => handleRenameCol(col)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRenameCol(col);
                                                    if (e.key === 'Escape') setEditingColId(null);
                                                }}
                                                className="w-full bg-zinc-900 border border-amber-400 rounded px-1.5 py-0.5 text-[11px] text-white text-center font-bold focus:outline-none"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center gap-1">
                                                <span
                                                    onClick={() => {
                                                        if (!isEditable) return;
                                                        setEditingColId(col.id);
                                                        setColTitleDraft(col.title);
                                                    }}
                                                    title={isEditable ? 'Bấm để sửa tên cột' : col.title}
                                                    className={`text-amber-200 leading-tight ${isEditable ? 'cursor-pointer hover:underline' : ''}`}
                                                >
                                                    {col.title}
                                                </span>
                                                {isEditable && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCol(col)}
                                                        title={`Xóa cột ${col.title}`}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 text-[10px] px-1 cursor-pointer transition-opacity"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-zinc-800/60">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={4 + selectedMonth.cols.length} className="py-12 text-center text-zinc-500 italic">
                                    Không có thành viên nào khớp bộ lọc.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row, rIdx) => {
                                const stats = derived.rowStats[row.rowId] || { penaltySec: 0, monthlyPts: 0 };
                                const uid = stats.resolvedDiscordId || row.discordId;
                                const member = uid ? danhLuc?.[uid] : null;
                                const displayName = member?.ingame ? String(member.ingame).trim() : row.name;

                                return (
                                    <tr key={row.rowId} className="hover:bg-emerald-950/15 transition-colors">
                                        <td className="py-1.5 px-2 text-center font-mono text-[11px] text-zinc-500 border-r border-zinc-800/80 bg-[#0b0404] sticky left-0 z-10">
                                            {rIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-3 border-r border-zinc-800 bg-[#0b0404] sticky left-10 z-10">
                                            <div className="font-bold text-zinc-100 truncate max-w-[180px]" title={displayName}>
                                                {displayName}
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono text-[11px] border-r border-zinc-800/70">
                                            {stats.penaltySec > 0 ? (
                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                                                    +{stats.penaltySec}s
                                                </span>
                                            ) : (
                                                <span className="text-zinc-600">—</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono font-black border-r border-zinc-800">
                                            {stats.monthlyPts > 0 ? (
                                                <span className="text-rose-400">{stats.monthlyPts}đ</span>
                                            ) : (
                                                <span className="text-zinc-700">0</span>
                                            )}
                                        </td>

                                        {selectedMonth.cols.map((col, cIdx) => {
                                            const rawVal = row.cells?.[col.id] || '';
                                            const cellKey = `${row.rowId}__${col.id}`;
                                            const isCellEditing = editingCellKey === cellKey;
                                            const rawSec = parseSheetSeconds(rawVal);
                                            const finalTime = rawSec < 999999 && stats.penaltySec > 0
                                                ? formatSheetSeconds(rawSec + stats.penaltySec)
                                                : '';

                                            return (
                                                <td
                                                    key={col.id}
                                                    className="p-0.5 border-r border-zinc-800/50 text-center align-middle"
                                                >
                                                    {isEditable ? (
                                                        <div className="relative flex items-center justify-center">
                                                            <input
                                                                ref={(el) => {
                                                                    inputRefs.current[cellKey] = el;
                                                                }}
                                                                type="text"
                                                                value={isCellEditing ? cellDraft : rawVal}
                                                                placeholder="—"
                                                                title={finalTime ? `Giờ gốc: ${rawVal} • Sau tạ (+${stats.penaltySec}s): ${finalTime}` : 'Nhập giây (vd: 45, 1m05s)'}
                                                                onFocus={() => {
                                                                    setEditingCellKey(cellKey);
                                                                    setCellDraft(rawVal);
                                                                }}
                                                                onChange={(e) => setCellDraft(e.target.value)}
                                                                onBlur={() => {
                                                                    const draftVal = cellDraft;
                                                                    setEditingCellKey(null);
                                                                    commitCell(row, col.id, draftVal);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        const draftVal = cellDraft;
                                                                        setEditingCellKey(null);
                                                                        commitCell(row, col.id, draftVal);
                                                                        focusCell(rIdx + 1, cIdx);
                                                                    } else if (e.key === 'ArrowDown') {
                                                                        e.preventDefault();
                                                                        e.currentTarget.blur();
                                                                        focusCell(rIdx + 1, cIdx);
                                                                    } else if (e.key === 'ArrowUp') {
                                                                        e.preventDefault();
                                                                        e.currentTarget.blur();
                                                                        focusCell(rIdx - 1, cIdx);
                                                                    } else if (e.key === 'Escape') {
                                                                        setEditingCellKey(null);
                                                                        setCellDraft(rawVal);
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                className={`w-full h-8 px-2 text-center font-mono text-xs rounded-lg border transition-all focus:outline-none ${
                                                                    isCellEditing
                                                                        ? 'bg-zinc-900 border-emerald-400 text-white ring-1 ring-emerald-400/40'
                                                                        : rawVal
                                                                            ? 'bg-amber-500/5 border-transparent hover:border-zinc-700 text-amber-200 font-bold'
                                                                            : 'bg-transparent border-transparent hover:border-zinc-800 text-zinc-600'
                                                                }`}
                                                            />
                                                            {finalTime && !isCellEditing && (
                                                                <span className="pointer-events-none text-[9px] font-mono text-zinc-500 ml-0.5 hidden xl:inline">
                                                                    ({finalTime})
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="py-1.5 px-2 font-mono text-xs"
                                                            title={finalTime ? `Sau tạ (+${stats.penaltySec}s): ${finalTime}` : undefined}
                                                        >
                                                            {rawVal ? (
                                                                <span className="text-amber-200 font-bold">
                                                                    {rawVal}
                                                                    {finalTime && (
                                                                        <span className="text-[10px] text-zinc-500 font-normal ml-1">
                                                                            ({finalTime})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-700">—</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
