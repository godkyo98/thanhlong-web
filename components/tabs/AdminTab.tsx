/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
// components/tabs/AdminTab.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { pushWebNotificationClient } from '@/lib/notifications';
import {
    buildMemberCandidates,
    buildPointAnalytics,
    buildRecentPointHistory,
    getGwBadge,
    getSectStyle,
    normalizeVoHocName,
    resolveVoHocList,
} from '@/lib/pointUtils';

export type AdminSection = 'treasury' | 'members' | 'dictionary';
type TxMode = 'ADD' | 'SUB';

interface AdminTabProps {
    wwmData: any;
    danhLuc?: Record<string, any>;
    pointData?: Record<string, any>;
    tuViData?: Record<string, any>;
    notificationsData?: any;
    session?: any;
    section?: AdminSection;
    onSectionChange?: (next: AdminSection) => void;
    onOpenPublicMerit?: () => void;
}

export default function AdminTab({
    wwmData,
    danhLuc = {},
    pointData = {},
    tuViData = {},
    notificationsData,
    session,
    section,
    onSectionChange,
    onOpenPublicMerit,
}: AdminTabProps) {
    const [internalSection, setInternalSection] = useState<AdminSection>('treasury');
    const activeSection = section ?? internalSection;
    const setActiveSection = (next: AdminSection) => {
        if (onSectionChange) onSectionChange(next);
        else setInternalSection(next);
    };

    // =================== 1. QUẢN LÝ NGÂN KHỐ CÔNG ĐỨC ===================
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [includeOutsideCandidates, setIncludeOutsideCandidates] = useState(false);
    const [txMode, setTxMode] = useState<TxMode>('ADD');
    const [xuAmount, setXuAmount] = useState<string>('10');
    const [reason, setReason] = useState<string>('');
    const [pushToWebNotif, setPushToWebNotif] = useState<boolean>(true);
    const [isSubmittingTx, setIsSubmittingTx] = useState<boolean>(false);
    const [txFeedback, setTxFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    const pointAnalytics = useMemo(() => buildPointAnalytics(pointData, danhLuc), [pointData, danhLuc]);
    const recentPointHistory = useMemo(
        () => buildRecentPointHistory(notificationsData, pointAnalytics.rawPointList, danhLuc, 15),
        [notificationsData, pointAnalytics.rawPointList, danhLuc]
    );

    const memberCandidates = useMemo(
        () => buildMemberCandidates(danhLuc, pointData, includeOutsideCandidates),
        [danhLuc, pointData, includeOutsideCandidates]
    );

    const filteredCandidates = useMemo(() => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return memberCandidates;
        return memberCandidates.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.discordName.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q)
        );
    }, [memberCandidates, memberSearch]);

    const selectedCandidate = useMemo(() => {
        if (!selectedTargetId) return null;
        return memberCandidates.find((c) => c.id === selectedTargetId) || null;
    }, [memberCandidates, selectedTargetId]);

    const parsedPreviewAmount = Math.max(0, parseInt(xuAmount, 10) || 0);
    const previewNextPoints = selectedCandidate
        ? txMode === 'ADD'
            ? selectedCandidate.point + parsedPreviewAmount
            : selectedCandidate.point - parsedPreviewAmount
        : 0;

    const handleSubmitTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTargetId || !selectedCandidate) {
            setTxFeedback({ kind: 'err', text: 'Vui lòng chọn thành viên cần Cộng hoặc Trừ Xu.' });
            return;
        }

        const parsedAmount = parseInt(xuAmount, 10);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setTxFeedback({ kind: 'err', text: 'Số Xu phải là số nguyên lớn hơn 0.' });
            return;
        }

        const existing = (pointData && pointData[selectedTargetId]) || {};
        const prevPoints = Number(existing.points ?? existing.point) || 0;
        const prevTotal =
            existing.total_points !== undefined
                ? Number(existing.total_points) || 0
                : existing.total !== undefined
                  ? Number(existing.total) || 0
                  : prevPoints;

        const nextPoints = txMode === 'ADD' ? prevPoints + parsedAmount : prevPoints - parsedAmount;
        const nextTotal = txMode === 'ADD' ? prevTotal + parsedAmount : prevTotal;

        const executorName = session?.user?.name || 'Bang Chủ';
        const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const cleanReason =
            reason.trim() ||
            (txMode === 'ADD' ? 'Ban thưởng Công Đức Tông Môn' : 'Khấu trừ / Đổi phúc lợi Ngân Khố');

        const nextRecord = {
            ...existing,
            name: selectedCandidate.discordName || existing.name || selectedCandidate.name,
            points: nextPoints,
            total_points: nextTotal,
            last_action: {
                type: txMode === 'ADD' ? 'CỘNG' : 'TRỪ',
                amount: parsedAmount,
                reason: cleanReason,
                by: executorName,
                time: timeStr,
            },
        };

        setIsSubmittingTx(true);
        setTxFeedback(null);

        try {
            await setDoc(
                doc(db, 'thanhlong_config', 'points_data'),
                { [selectedTargetId]: nextRecord },
                { merge: true }
            );

            if (pushToWebNotif) {
                const isRedeem = txMode === 'SUB' && /(mua|đổi|tiêu|nhận|quy đổi|shop)/i.test(cleanReason);
                const categoryLabel =
                    txMode === 'ADD'
                        ? 'Ban Thưởng Công Đức'
                        : isRedeem
                          ? 'Đổi Thưởng Ngân Khố'
                          : 'Khấu Trừ Ngân Khố';

                const title =
                    txMode === 'ADD'
                        ? `💰 +${parsedAmount.toLocaleString('vi-VN')} Xu Công Đức cho ${selectedCandidate.name}`
                        : `${isRedeem ? '🛍️' : '⚡'} -${parsedAmount.toLocaleString('vi-VN')} Xu của ${selectedCandidate.name}`;

                await pushWebNotificationClient({
                    type: 'point',
                    categoryLabel,
                    title,
                    message: `Lý do: ${cleanReason}\nSố dư thay đổi: ${prevPoints.toLocaleString('vi-VN')} ➔ ${nextPoints.toLocaleString('vi-VN')} Xu`,
                    actor: executorName,
                    targetId: selectedTargetId,
                    targetName: selectedCandidate.name,
                    delta: txMode === 'ADD' ? parsedAmount : -parsedAmount,
                    balanceAfter: nextPoints,
                    linkTab: 'point',
                    source: 'web',
                });
            }

            setReason('');
            setTxFeedback({
                kind: 'ok',
                text: `✅ Đã ${txMode === 'ADD' ? 'cộng' : 'trừ'} ${parsedAmount.toLocaleString('vi-VN')} Xu cho ${selectedCandidate.name} (Số dư mới: ${nextPoints.toLocaleString('vi-VN')} Xu).`,
            });
        } catch (err: any) {
            setTxFeedback({
                kind: 'err',
                text: `❌ Lỗi ghi dữ liệu lên Firebase: ${err?.message || 'Không rõ'}`,
            });
        } finally {
            setIsSubmittingTx(false);
        }
    };

    const handleDeleteOutsideUser = async (userId: string, name: string) => {
        if (!window.confirm(`🗑️ Xóa vĩnh viễn [${name}] khỏi points_data?`)) return;
        try {
            await setDoc(
                doc(db, 'thanhlong_config', 'points_data'),
                { [userId]: deleteField() },
                { merge: true }
            );
        } catch {
            alert('❌ Không thể xóa bản ghi khỏi Firebase!');
        }
    };

    // =================== 2. QUẢN TRỊ SỔ DANH LỤC ===================
    const [danhLucSearch, setDanhLucSearch] = useState('');
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        ingame: '',
        discordName: '',
        uid: '',
        class: '',
        gw: '',
    });
    const [isMigrating, setIsMigrating] = useState(false);

    const voHocList = useMemo(() => resolveVoHocList(wwmData), [wwmData]);

    const { adminMembersList, legacyCount } = useMemo(() => {
        const entries = Object.entries(danhLuc || {});
        let oldCount = 0;
        const list = entries.map(([discordId, info]: [string, any]) => {
            const rawClass = info?.class || 'Chưa rõ';
            const voHoc = normalizeVoHocName(rawClass);
            if (rawClass !== voHoc) oldCount++;

            const rankProfile = tuViData?.[discordId];
            const discordName =
                info?.discordName ||
                info?.discordUsername ||
                info?.username ||
                rankProfile?.name ||
                rankProfile?.username ||
                '';
            const pt = pointData?.[discordId];

            return {
                discordId,
                ingame: info?.ingame || info?.ten_game || discordName || `Đệ tử #${discordId.slice(-4)}`,
                discordName,
                gameUid: info?.uid || info?.pid || '—',
                voHoc,
                sectMeta: getSectStyle(voHoc),
                gwRaw: info?.gw || '',
                gwBadge: getGwBadge(info?.gw),
                currentXu: Number(pt?.points ?? pt?.point) || 0,
            };
        });

        list.sort((a, b) => a.ingame.localeCompare(b.ingame, 'vi'));
        return { adminMembersList: list, legacyCount: oldCount };
    }, [danhLuc, tuViData, pointData]);

    const filteredAdminMembers = useMemo(() => {
        const q = danhLucSearch.trim().toLowerCase();
        if (!q) return adminMembersList;
        return adminMembersList.filter(
            (m) =>
                m.ingame.toLowerCase().includes(q) ||
                m.discordName.toLowerCase().includes(q) ||
                m.discordId.toLowerCase().includes(q) ||
                String(m.gameUid).toLowerCase().includes(q) ||
                m.voHoc.toLowerCase().includes(q)
        );
    }, [adminMembersList, danhLucSearch]);

    const handleMigrateAllToNewTranslation = async () => {
        if (
            !window.confirm(
                `🔄 Chuẩn hóa toàn bộ Sổ Danh Lục trên Firebase sang bản dịch Võ Học mới nhất (Minh Kim, Liệt Thạch, Khiên Ty, Phá Trúc) và cập nhật kèm Tên Discord?`
            )
        ) {
            return;
        }

        setIsMigrating(true);
        try {
            const updatedPayload: Record<string, any> = {};
            Object.entries(danhLuc || {}).forEach(([uid, info]: [string, any]) => {
                if (!info || typeof info !== 'object') return;
                const newClass = normalizeVoHocName(info.class);
                const rankProfile = tuViData?.[uid];
                const resolvedDiscordName =
                    info.discordName ||
                    info.username ||
                    rankProfile?.name ||
                    rankProfile?.username ||
                    '';

                updatedPayload[uid] = {
                    ...info,
                    class: newClass,
                    ...(resolvedDiscordName ? { discordName: resolvedDiscordName } : {}),
                };
            });

            await setDoc(doc(db, 'thanhlong_config', 'danh_luc_data'), updatedPayload, { merge: true });
            alert('✅ Đã chuẩn hóa 100% tên Võ Học mới và Tên Discord lên Firebase!');
        } catch (err) {
            console.error('Lỗi chuẩn hóa danh_luc_data:', err);
            alert('❌ Có lỗi khi lưu dữ liệu lên Firebase!');
        } finally {
            setIsMigrating(false);
        }
    };

    const startEditMember = (m: any) => {
        setEditingUid(m.discordId);
        setEditForm({
            ingame: m.ingame,
            discordName: m.discordName || '',
            uid: m.gameUid === '—' ? '' : m.gameUid,
            class: m.voHoc,
            gw: m.gwRaw || '',
        });
    };

    const handleSaveMemberEdit = async (discordId: string) => {
        try {
            const existing = danhLuc?.[discordId] || {};
            const nextRecord = {
                ...existing,
                ingame: editForm.ingame.trim() || existing.ingame,
                discordName: editForm.discordName.trim(),
                uid: editForm.uid.trim() || '?',
                class: normalizeVoHocName(editForm.class),
                gw: editForm.gw,
            };
            await setDoc(
                doc(db, 'thanhlong_config', 'danh_luc_data'),
                { [discordId]: nextRecord },
                { merge: true }
            );
            setEditingUid(null);
        } catch {
            alert('❌ Không thể lưu chỉnh sửa lên Firebase!');
        }
    };

    const handleDeleteMember = async (discordId: string, ingame: string) => {
        if (!window.confirm(`🗑️ Xóa hồ sơ của [${ingame}] khỏi Sổ Danh Lục?`)) return;
        try {
            await setDoc(
                doc(db, 'thanhlong_config', 'danh_luc_data'),
                { [discordId]: deleteField() },
                { merge: true }
            );
        } catch {
            alert('❌ Lỗi khi xóa thành viên!');
        }
    };

    // =================== 3. TỪ ĐIỂN & VÕ HỌC WWM ===================
    const [dictTarget, setDictTarget] = useState('WEAPON_MAP');
    const [dictKey, setDictKey] = useState('');
    const [dictVi, setDictVi] = useState('');
    const [dictEn, setDictEn] = useState('');
    const [dictSearch, setDictSearch] = useState('');
    const [newVoHoc, setNewVoHoc] = useState('');
    const [loadingAdmin, setLoadingAdmin] = useState(false);

    const handleUpdateDictionary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dictTarget || !dictKey.trim() || !dictVi.trim() || !wwmData) return;
        setLoadingAdmin(true);
        try {
            const currentMap = wwmData[dictTarget] || {};
            const updatedMap = {
                ...currentMap,
                [dictKey.trim()]: { vi: dictVi.trim(), en: dictEn.trim() || dictVi.trim() },
            };
            await setDoc(
                doc(db, 'thanhlong_config', 'wwm_data'),
                {
                    ...wwmData,
                    [dictTarget]: updatedMap,
                },
                { merge: true }
            );
            setDictKey('');
            setDictVi('');
            setDictEn('');
            alert(`✅ Khảm thành công cấu hình vào từ điển [${dictTarget}]!`);
        } catch {
            alert('❌ Thất bại khi khảm dữ liệu lên Đám Mây.');
        }
        setLoadingAdmin(false);
    };

    const handleAddVoHoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVoHoc.trim() || !wwmData) return;
        setLoadingAdmin(true);
        try {
            const updatedVoHocList = [...(wwmData.VO_HOC_LIST || []), newVoHoc.trim()];
            await setDoc(
                doc(db, 'thanhlong_config', 'wwm_data'),
                { ...wwmData, VO_HOC_LIST: updatedVoHocList },
                { merge: true }
            );
            setNewVoHoc('');
            alert('✅ Khảm Võ Học mới thành công!');
        } catch {
            alert('❌ Lỗi đẩy dữ liệu!');
        }
        setLoadingAdmin(false);
    };

    const currentDictEntries = useMemo(() => {
        if (!wwmData || !wwmData[dictTarget]) return [];
        const q = dictSearch.toLowerCase();
        return Object.entries(wwmData[dictTarget]).filter(
            ([k, v]: any) =>
                k.toLowerCase().includes(q) ||
                (v?.vi && String(v.vi).toLowerCase().includes(q)) ||
                (v?.en && String(v.en).toLowerCase().includes(q))
        );
    }, [wwmData, dictTarget, dictSearch]);

    const { highlights, outsideRecords } = pointAnalytics;

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* HEADER QUẢN TRỊ TẬP TRUNG */}
            <div className="bg-[#090d16]/90 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-black uppercase tracking-wider mb-2">
                            <span>👑</span>
                            <span>Mật Thất Quyền Bang Chủ · Thao Tác Trực Tiếp Firebase</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black leading-snug py-0.5 text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-amber-300 to-rose-400">
                            ⚙️ Mật Thất Quản Trị Tông Môn
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            Trung tâm điều hành dành riêng cho Bang Chủ: Cộng/Trừ Công Đức Ngân Khố, Sửa Sổ Danh Lục và Cập nhật Từ điển WWM.
                        </p>
                    </div>

                    {onOpenPublicMerit && (
                        <button
                            type="button"
                            onClick={onOpenPublicMerit}
                            className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
                        >
                            💰 Xem Bảng Công Trạng Công Khai ➔
                        </button>
                    )}
                </div>

                {/* 3 TAB QUẢN TRỊ */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800/80">
                    <button
                        type="button"
                        onClick={() => setActiveSection('treasury')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            activeSection === 'treasury'
                                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                    >
                        ⚖️ Ngân Khố Công Đức ({highlights.totalVaultPoints.toLocaleString('vi-VN')} Xu)
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('members')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border flex items-center gap-2 ${
                            activeSection === 'members'
                                ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                    >
                        <span>📜 Quản Trị Danh Lục ({adminMembersList.length})</span>
                        {legacyCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                                {legacyCount} cũ
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('dictionary')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            activeSection === 'dictionary'
                                ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                    >
                        🔮 Từ Điển &amp; Võ Học WWM
                    </button>
                </div>
            </div>

            {/* ================= SECTION 1: NGÂN KHỐ CÔNG ĐỨC ================= */}
            {activeSection === 'treasury' && (
                <div className="space-y-6">
                    {/* BẢNG ĐIỀU KHIỂN CỘNG / TRỪ XU */}
                    <div className="rounded-3xl bg-zinc-900/75 border border-emerald-500/35 p-6 shadow-2xl space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                                    👑 Quyền Bang Chủ · Thao Tác Trực Tiếp Lên Firebase
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-zinc-100 mt-0.5">
                                    ⚖️ Cộng / Trừ Công Đức Ngân Khố
                                </h3>
                            </div>

                            <div className="inline-flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setTxMode('ADD')}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                        txMode === 'ADD'
                                            ? 'bg-emerald-500 text-zinc-950 shadow-md'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    💰 Ban Thưởng (+ Xu)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTxMode('SUB')}
                                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                        txMode === 'SUB'
                                            ? 'bg-rose-500 text-white shadow-md'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    ⚡ Xử Phạt / Đổi Quà (- Xu)
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitTransaction} className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Chọn thành viên */}
                                <div className="lg:col-span-5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                                            1. Chọn Bang Chúng ({filteredCandidates.length} người)
                                        </label>
                                        {outsideRecords.length > 0 && (
                                            <label className="inline-flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={includeOutsideCandidates}
                                                    onChange={(e) => setIncludeOutsideCandidates(e.target.checked)}
                                                    className="accent-amber-400"
                                                />
                                                <span>Gồm ngoài Danh Lục ({outsideRecords.length})</span>
                                            </label>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="🔍 Lọc nhanh tên ingame hoặc ID..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <select
                                        value={selectedTargetId}
                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
                                        required
                                    >
                                        <option value="">-- Chọn đại hiệp --</option>
                                        {filteredCandidates.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} ({c.point.toLocaleString('vi-VN')} Xu)
                                                {c.isOutsideDanhLuc ? ' [Ngoài Danh Lục]' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Số Xu */}
                                <div className="lg:col-span-3 space-y-2">
                                    <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                                        2. Số lượng Xu
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={xuAmount}
                                        onChange={(e) => setXuAmount(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-300 focus:outline-none focus:border-emerald-500/60"
                                        required
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {[5, 10, 20, 50, 100].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setXuAmount(String(preset))}
                                                className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-emerald-500/15 border border-zinc-800 hover:border-emerald-500/40 text-[11px] font-mono font-bold text-zinc-300 cursor-pointer transition-colors"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lý do */}
                                <div className="lg:col-span-4 space-y-2">
                                    <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                                        3. Lý do ghi sổ
                                    </label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder={
                                            txMode === 'ADD'
                                                ? 'VD: Thưởng Bang Chiến, top Sát Tướng...'
                                                : 'VD: Đổi bí kíp, Phạt vắng không phép...'
                                        }
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/60"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {(txMode === 'ADD'
                                            ? ['Thưởng Bang Chiến', 'Thưởng Sát Tướng', 'Đóng góp Tông Môn']
                                            : ['Đổi quà phúc lợi', 'Phạt vắng mặt', 'Điều chỉnh sổ']
                                        ).map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setReason(chip)}
                                                className="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-amber-500/15 border border-zinc-800 hover:border-amber-500/40 text-[11px] text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors"
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-800/80">
                                <div className="space-y-1.5">
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={pushToWebNotif}
                                            onChange={(e) => setPushToWebNotif(e.target.checked)}
                                            className="rounded border-zinc-700 bg-zinc-950 accent-cyan-400 w-4 h-4"
                                        />
                                        <span>📢 Đẩy thông báo biến động lên Bảng Thông Báo Web</span>
                                    </label>

                                    {selectedCandidate && (
                                        <div className="text-xs text-zinc-400 font-mono">
                                            Xem trước: <b className="text-zinc-200">{selectedCandidate.name}</b> •{' '}
                                            <span>{selectedCandidate.point.toLocaleString('vi-VN')} Xu</span>{' '}
                                            <span className="text-zinc-500">➔</span>{' '}
                                            <b className={txMode === 'ADD' ? 'text-emerald-400' : 'text-rose-400'}>
                                                {previewNextPoints.toLocaleString('vi-VN')} Xu
                                            </b>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmittingTx}
                                    className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                                        txMode === 'ADD'
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                                    } disabled:opacity-50`}
                                >
                                    {isSubmittingTx
                                        ? '⏳ Đang lưu lên Firebase...'
                                        : txMode === 'ADD'
                                          ? '✅ Xác Nhận Cộng Xu'
                                          : '⚡ Xác Nhận Trừ Xu'}
                                </button>
                            </div>

                            {txFeedback && (
                                <div
                                    className={`rounded-xl px-4 py-2.5 text-xs font-bold border ${
                                        txFeedback.kind === 'ok'
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                    }`}
                                >
                                    {txFeedback.text}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* DỌN SỔ BẢN GHI NGOÀI DANH LỤC */}
                    {outsideRecords.length > 0 && (
                        <div className="rounded-3xl bg-zinc-900/50 border border-amber-500/30 p-6 shadow-xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm sm:text-base font-black text-amber-300">
                                    👁️ Bản Ghi Trong points_data Ngoài Sổ Danh Lục ({outsideRecords.length})
                                </h3>
                                <span className="text-[11px] text-zinc-400">
                                    Các bản ghi này đã bị ẩn khỏi Bảng Vàng Công Trạng công khai
                                </span>
                            </div>
                            <div className="divide-y divide-zinc-800/70">
                                {outsideRecords.map((u) => (
                                    <div key={u.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                        <div>
                                            <span className="font-bold text-zinc-200">{u.name}</span>
                                            <span className="ml-2 font-mono text-zinc-500">ID: {u.id}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-emerald-400 font-bold">
                                                {u.point.toLocaleString('vi-VN')} Xu / {u.total.toLocaleString('vi-VN')} Total
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteOutsideUser(u.id, u.name)}
                                                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold cursor-pointer"
                                            >
                                                🗑️ Xóa
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* LỊCH SỬ BIẾN ĐỘNG GẦN ĐÂY */}
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

            {/* ================= SECTION 2: QUẢN TRỊ SỔ DANH LỤC ================= */}
            {activeSection === 'members' && (
                <div className="space-y-5">
                    <div className="bg-zinc-900/70 border border-amber-500/30 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                        <div>
                            <h3 className="text-base font-black text-amber-300">
                                📜 Sửa / Xóa Thành Viên &amp; Chuẩn Hóa Bản Dịch Danh Lục
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">
                                Chỉnh sửa trực tiếp tên In-game, Discord, UID, Nhánh Võ Học, lịch Bang Chiến hoặc chuẩn hóa tên phái cũ trên Firebase.
                            </p>
                        </div>

                        <button
                            type="button"
                            disabled={isMigrating}
                            onClick={handleMigrateAllToNewTranslation}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border shrink-0 ${
                                legacyCount > 0
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse'
                                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                            }`}
                        >
                            <span>🔄</span>
                            <span>
                                {isMigrating
                                    ? 'Đang đồng bộ lên Mây...'
                                    : legacyCount > 0
                                      ? `Chuẩn Hóa ${legacyCount} Tên Phái Cũ Sang Bản Dịch Mới`
                                      : 'Đồng Bộ Lại Bản Dịch Võ Học & Tên Discord'}
                            </span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                        <input
                            type="text"
                            value={danhLucSearch}
                            onChange={(e) => setDanhLucSearch(e.target.value)}
                            placeholder="🔍 Tìm thành viên cần sửa/xóa theo In-game, @Discord, UID, Võ Học..."
                            className="w-full sm:w-96 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none"
                        />
                        <div className="text-xs text-zinc-400 font-mono">
                            Đang hiện <b className="text-amber-300">{filteredAdminMembers.length}</b> / {adminMembersList.length} hồ sơ
                        </div>
                    </div>

                    <div className="bg-[#090d16]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-950/90 border-b border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                                        <th className="py-3.5 px-4">Cao Thủ In-game &amp; Discord</th>
                                        <th className="py-3.5 px-4">UID</th>
                                        <th className="py-3.5 px-4">Nhánh Võ Học</th>
                                        <th className="py-3.5 px-4">Bang Chiến</th>
                                        <th className="py-3.5 px-4 text-right">Xu Hiện Tại</th>
                                        <th className="py-3.5 px-4 text-right">⚙️ Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-xs">
                                    {filteredAdminMembers.map((m) => {
                                        const isEditing = editingUid === m.discordId;
                                        return (
                                            <tr key={m.discordId} className="hover:bg-zinc-900/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    {isEditing ? (
                                                        <div className="space-y-1.5">
                                                            <input
                                                                type="text"
                                                                value={editForm.ingame}
                                                                onChange={(e) => setEditForm({ ...editForm, ingame: e.target.value })}
                                                                placeholder="Tên In-game..."
                                                                className="w-full bg-zinc-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={editForm.discordName}
                                                                onChange={(e) => setEditForm({ ...editForm, discordName: e.target.value })}
                                                                placeholder="Tên Discord..."
                                                                className="w-full bg-zinc-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-[11px] text-indigo-300"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="font-bold text-amber-300">{m.ingame}</div>
                                                            <div className="text-[11px] text-indigo-300">
                                                                @{m.discordName || `ID:${m.discordId.slice(-5)}`}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 font-mono">
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editForm.uid}
                                                            onChange={(e) => setEditForm({ ...editForm, uid: e.target.value })}
                                                            placeholder="UID..."
                                                            className="w-28 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200"
                                                        />
                                                    ) : (
                                                        <span className="text-zinc-300">{m.gameUid}</span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {isEditing ? (
                                                        <select
                                                            value={editForm.class}
                                                            onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                                                            className="bg-zinc-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-300"
                                                        >
                                                            <option value="Chưa rõ">-- Chọn Võ Học --</option>
                                                            {voHocList.map((vh) => (
                                                                <option key={vh} value={vh}>{vh}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${m.sectMeta.badgeClass}`}>
                                                            <span>{m.voHoc}</span>
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4">
                                                    {isEditing ? (
                                                        <select
                                                            value={editForm.gw}
                                                            onChange={(e) => setEditForm({ ...editForm, gw: e.target.value })}
                                                            className="bg-zinc-950 border border-rose-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-300"
                                                        >
                                                            <option value="">Chưa báo</option>
                                                            <option value="Cả 2">🔥 Cả 2 Ngày</option>
                                                            <option value="T7">⚡ Thứ 7</option>
                                                            <option value="CN">☀️ Chủ Nhật</option>
                                                            <option value="Vắng">💤 Báo Vắng</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-block px-2.5 py-1 rounded-xl border text-[11px] font-bold ${m.gwBadge.cls}`}>
                                                            {m.gwBadge.label}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                                                    {m.currentXu.toLocaleString('vi-VN')} Xu
                                                </td>

                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    {isEditing ? (
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveMemberEdit(m.discordId)}
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
                                                                    setSelectedTargetId(m.discordId);
                                                                    setTxFeedback(null);
                                                                    setActiveSection('treasury');
                                                                }}
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs cursor-pointer"
                                                                title="Mở Cộng/Trừ Xu cho thành viên này"
                                                            >
                                                                💰 Xu
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditMember(m)}
                                                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs cursor-pointer"
                                                            >
                                                                ✏️ Sửa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteMember(m.discordId, m.ingame)}
                                                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= SECTION 3: TỪ ĐIỂN & VÕ HỌC WWM ================= */}
            {activeSection === 'dictionary' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        {/* TRẬN PHÁP 1: TỪ ĐIỂN BIẾN SỐ TOÀN NĂNG */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                                🔮 Khảm/Sửa Biến Số Từ Điển Hệ Thống WWM
                            </h3>
                            <form onSubmit={handleUpdateDictionary} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                        Chọn nhóm từ điển cần sửa
                                    </label>
                                    <select
                                        value={dictTarget}
                                        onChange={(e) => setDictTarget(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer transition-colors"
                                    >
                                        <option value="SECT_MAP">🗡️ Môn Phái (SECT_MAP)</option>
                                        <option value="WEAPON_MAP">⚔️ Vũ Khí (WEAPON_MAP)</option>
                                        <option value="ARMOR_MAP">🛡️ Giáp Phục (ARMOR_MAP)</option>
                                        <option value="TAM_PHAP_MAP">🧠 Tâm Pháp (TAM_PHAP_MAP)</option>
                                        <option value="KY_THUAT_MAP">✨ Kỳ Thuật (KY_THUAT_MAP)</option>
                                        <option value="AFFIX_MAP">✦ Thuộc Tính Ẩn (AFFIX_MAP)</option>
                                        <option value="LUNJIAN_RANK_MAP">🏆 Cảnh Giới Luận Kiếm (LUNJIAN_RANK_MAP)</option>
                                        <option value="ATTR_MAP">🩸 Chỉ Số Nhân Vật Gốc (ATTR_MAP)</option>
                                        <option value="EQUIP_ATTR_MAP">📊 Chỉ Số Giáp Gốc (EQUIP_ATTR_MAP)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                            Mã ID (Key)
                                        </label>
                                        <input
                                            type="text"
                                            value={dictKey}
                                            onChange={(e) => setDictKey(e.target.value)}
                                            placeholder="Ví dụ: 1101577 hoặc STR"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                            Tên hiển thị Tiếng Việt
                                        </label>
                                        <input
                                            type="text"
                                            value={dictVi}
                                            onChange={(e) => setDictVi(e.target.value)}
                                            placeholder="Ví dụ: Độc Cô Cầu Bại"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                        Tên hiển thị Tiếng Anh (Không bắt buộc)
                                    </label>
                                    <input
                                        type="text"
                                        value={dictEn}
                                        onChange={(e) => setDictEn(e.target.value)}
                                        placeholder="Nếu bỏ trống sẽ tự sao chép Tiếng Việt"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loadingAdmin}
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-800 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
                                >
                                    {loadingAdmin ? '⏳ Đang đồng bộ hóa Đám Mây...' : '🔮 Xác Nhận Cập Nhật Biến Số Web & Bot'}
                                </button>
                            </form>
                        </div>

                        {/* TRẬN PHÁP 2: KHẢM VÕ HỌC DANH LỤC */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                                ⚔️ Khảm Danh Mục Võ Học Lọc Sổ
                            </h3>
                            <form onSubmit={handleAddVoHoc} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                                        Tên võ học/lộ trình mới
                                    </label>
                                    <input
                                        type="text"
                                        value={newVoHoc}
                                        onChange={(e) => setNewVoHoc(e.target.value)}
                                        placeholder="Ví dụ: Tả Đao Pháp (Dame)"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loadingAdmin}
                                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
                                >
                                    {loadingAdmin ? '⏳ Đang khảm dữ liệu...' : '🔮 Thêm Vào Bộ Lọc Danh Lục'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* KHỐI 3: DANH SÁCH XEM TRƯỚC VÀ TRA CỨU NHANH TẠI CHỖ */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
                        <div className="mb-4">
                            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                📂 Kính Chiếu Từ Điển Hiện Tại
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1">
                                Đang soi các biến đã lưu trong nhóm từ điển đang chọn ở bên cạnh.
                            </p>
                        </div>
                        <div className="mb-3">
                            <input
                                type="text"
                                value={dictSearch}
                                onChange={(e) => setDictSearch(e.target.value)}
                                placeholder="🔍 Lọc ID hoặc tên..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 no-scrollbar text-xs">
                            {currentDictEntries.length === 0 ? (
                                <div className="text-zinc-500 italic py-10 text-center">
                                    Trống rỗng hoặc không khớp từ khóa lọc
                                </div>
                            ) : (
                                currentDictEntries.map(([k, v]: any) => (
                                    <div
                                        key={k}
                                        className="p-2 bg-zinc-950/40 border border-zinc-800/60 rounded-lg flex justify-between items-center gap-4 hover:border-zinc-700 transition-colors"
                                    >
                                        <div className="font-mono text-cyan-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
                                            {k}
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-zinc-200">{v?.vi || String(v)}</div>
                                            {v?.en && v.en !== v.vi && (
                                                <div className="text-[10px] text-zinc-500 font-mono">{v.en}</div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
