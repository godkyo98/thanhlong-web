/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
// components/tabs/PointTab.tsx
'use client';

import React, { useMemo, useRef, useState } from 'react';
import { deleteField, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    WebNotificationItem,
    formatRelativeVi,
    formatViDateTime,
    pushWebNotificationClient,
} from '@/lib/notifications';

type SortKey = 'rank' | 'point' | 'total';
type TxMode = 'ADD' | 'SUB';

interface Props {
    data: any;
    danhLuc: any;
    session?: any;
    isMaster?: boolean;
    notificationsData?: any;
}

interface MemberCandidate {
    id: string;
    name: string;
    discordName: string;
    uid: string;
    avatar: string;
    point: number;
    total: number;
    isOutsideDanhLuc: boolean;
}

export default function PointTab({
    data,
    danhLuc,
    session,
    isMaster = false,
    notificationsData,
}: Props) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
        key: 'total',
        direction: 'desc',
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [showOutsideDanhLuc, setShowOutsideDanhLuc] = useState(false);

    // Master Treasury Form State
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [txMode, setTxMode] = useState<TxMode>('ADD');
    const [xuAmount, setXuAmount] = useState<string>('10');
    const [reason, setReason] = useState<string>('');
    const [pushToWebNotif, setPushToWebNotif] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [txFeedback, setTxFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    const formRef = useRef<HTMLDivElement | null>(null);

    const hasDanhLuc = Boolean(danhLuc && Object.keys(danhLuc).length > 0);

    // Enrich point data with Danh Luc
    const allPointRecords = useMemo(() => {
        if (!data || typeof data !== 'object') return [];

        return Object.entries(data).map(([id, d]: any) => {
            const dl = danhLuc?.[id];
            const isOutsideDanhLuc = hasDanhLuc && !dl;

            if (!d || typeof d !== 'object') {
                return {
                    id,
                    name: dl?.ingame || `Khách (#${id.substring(0, 4)})`,
                    uid: dl?.uid || '',
                    avatar: dl?.avatar || dl?.image || '',
                    point: 0,
                    total: 0,
                    lastAction: null,
                    hiddenFlag: false,
                    isOutsideDanhLuc,
                };
            }

            const officialName =
                dl?.ingame || d.name || d.username || d.displayName || `Khách (#${id.substring(0, 4)})`;

            return {
                id,
                name: officialName,
                uid: dl?.uid || '',
                avatar: dl?.avatar || dl?.image || '',
                point: Number(d.points ?? d.point) || 0,
                total: Number(d.total_points ?? d.total) || 0,
                lastAction: d.last_action || null,
                hiddenFlag: Boolean(d.hidden),
                isOutsideDanhLuc,
            };
        });
    }, [data, danhLuc, hasDanhLuc]);

    // Danh sách công khai: ẩn toàn bộ người ngoài Danh Lục (và người bị đánh dấu ẩn)
    const rawPointList = useMemo(() => {
        return allPointRecords.filter((u) => !u.isOutsideDanhLuc && !u.hiddenFlag);
    }, [allPointRecords]);

    const outsideRecords = useMemo(() => {
        return allPointRecords.filter((u) => u.isOutsideDanhLuc || u.hiddenFlag);
    }, [allPointRecords]);

    // Rank strictly by Total Points for permanent rank index (chỉ tính người trong Danh Lục)
    const totalRankedList = useMemo(() => {
        return [...rawPointList].sort((a, b) => b.total - a.total);
    }, [rawPointList]);

    const rankMap = useMemo(() => {
        const map: Record<string, number> = {};
        totalRankedList.forEach((user, index) => {
            map[user.id] = index + 1;
        });
        return map;
    }, [totalRankedList]);

    // Top 3 Richest by current points
    const topRichest = useMemo(() => {
        return [...rawPointList].sort((a, b) => b.point - a.point).slice(0, 3);
    }, [rawPointList]);

    // Highlights for Hero Banner
    const highlights = useMemo(() => {
        let totalVaultPoints = 0;
        let totalHistoricalPoints = 0;
        const topPointUser = topRichest[0];
        const topTotalUser = totalRankedList[0];

        rawPointList.forEach((u) => {
            totalVaultPoints += u.point;
            totalHistoricalPoints += u.total;
        });

        return {
            totalMembers: rawPointList.length,
            totalVaultPoints,
            totalHistoricalPoints,
            topPointUser,
            topTotalUser,
        };
    }, [rawPointList, topRichest, totalRankedList]);

    // Filter and Sort
    const sortedPoints = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const activeRows = rawPointList
            .filter((user) => {
                if (!q) return true;
                return (
                    user.name.toLowerCase().includes(q) ||
                    user.uid.toLowerCase().includes(q) ||
                    user.id.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                if (sortConfig.key === 'rank') {
                    return sortConfig.direction === 'asc'
                        ? rankMap[a.id] - rankMap[b.id]
                        : rankMap[b.id] - rankMap[a.id];
                }
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });

        if (isMaster && showOutsideDanhLuc) {
            const extraRows = outsideRecords.filter((user) => {
                if (!q) return true;
                return (
                    user.name.toLowerCase().includes(q) ||
                    user.uid.toLowerCase().includes(q) ||
                    user.id.toLowerCase().includes(q)
                );
            });
            return [...activeRows, ...extraRows];
        }

        return activeRows;
    }, [rawPointList, outsideRecords, isMaster, showOutsideDanhLuc, searchQuery, sortConfig, rankMap]);

    // Danh sách tất cả bang chúng để Master chọn cộng/trừ (kể cả người đang 0 Xu)
    const memberCandidates: MemberCandidate[] = useMemo(() => {
        const seen = new Set<string>();
        const list: MemberCandidate[] = [];

        if (danhLuc && typeof danhLuc === 'object') {
            Object.entries(danhLuc).forEach(([id, dl]: any) => {
                seen.add(id);
                const pt = data?.[id] || {};
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

        if (showOutsideDanhLuc && data && typeof data === 'object') {
            Object.entries(data).forEach(([id, pt]: any) => {
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
    }, [danhLuc, data, showOutsideDanhLuc]);

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

    // Lịch sử biến động điểm từ web_notifications + fallback last_action trong points_data
    const recentPointHistory = useMemo(() => {
        const notifItems: WebNotificationItem[] = Array.isArray(notificationsData?.items)
            ? notificationsData.items.filter((it: WebNotificationItem) => it && it.type === 'point')
            : [];

        if (notifItems.length > 0) {
            return notifItems.slice(0, 15).map((it) => ({
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

        // Fallback đọc last_action cũ nếu chưa có bản ghi trên web_notifications
        return rawPointList
            .filter((u) => u.lastAction && typeof u.lastAction === 'object')
            .map((u) => ({
                id: `fallback_${u.id}`,
                type: u.lastAction.type === 'TRỪ' ? 'TRỪ' : 'CỘNG',
                amount: Number(u.lastAction.amount) || 0,
                targetName: u.name,
                actor: u.lastAction.by || 'Hệ thống',
                reason: u.lastAction.reason || '',
                timeText: u.lastAction.time || '',
                relText: '',
                balanceAfter: u.point,
            }))
            .slice(0, 12);
    }, [notificationsData, rawPointList, danhLuc]);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleQuickPickMember = (userId: string, mode: TxMode) => {
        setSelectedTargetId(userId);
        setTxMode(mode);
        setTxFeedback(null);
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleSubmitTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isMaster) return;

        if (!selectedTargetId || !selectedCandidate) {
            setTxFeedback({ kind: 'err', text: 'Vui lòng chọn thành viên cần Cộng hoặc Trừ Xu.' });
            return;
        }

        const parsedAmount = parseInt(xuAmount, 10);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setTxFeedback({ kind: 'err', text: 'Số Xu phải là số nguyên lớn hơn 0.' });
            return;
        }

        const existing = (data && data[selectedTargetId]) || {};
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

        setIsSubmitting(true);
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
            setIsSubmitting(false);
        }
    };

    const handleDeleteOutsideUser = async (userId: string, name: string) => {
        if (!isMaster) return;
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

    const parsedPreviewAmount = Math.max(0, parseInt(xuAmount, 10) || 0);
    const previewNextPoints = selectedCandidate
        ? txMode === 'ADD'
            ? selectedCandidate.point + parsedPreviewAmount
            : selectedCandidate.point - parsedPreviewAmount
        : 0;

    return (
        <section className="space-y-8 animate-fadeIn pb-16">
            {/* 💰 HERO BANNER: BẢNG CÔNG TRẠNG */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                            <span>💰</span>
                            <span>Bảng Vàng · Công Trạng & Ngân Khố Độc Quyền Web</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide leading-snug py-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-amber-300 to-emerald-400">
                            BẢNG VÀNG CÔNG TRẠNG
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            Nơi quản lý Ngân khố và Điểm Cống Hiến chính thức của Bang Thanh Long.{' '}
                            <b className="text-emerald-400">Điểm (Point)</b> dùng để đổi quà phúc lợi,{' '}
                            <b className="text-rose-400">Tổng Cống Hiến (Total)</b> lưu danh sử sách.
                        </p>
                    </div>
                </div>

                {/* 4 HIGHLIGHT TILES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
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

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
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

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shrink-0">
                            👑
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Phú Hộ</div>
                            <div className="text-sm font-black text-yellow-300 truncate max-w-[130px]" title={highlights.topPointUser?.name}>
                                {highlights.topPointUser?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topPointUser ? `${highlights.topPointUser.point.toLocaleString('vi-VN')} Pt` : '--'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shrink-0">
                            ⚔️
                        </div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đệ Nhất Công Thần</div>
                            <div className="text-sm font-black text-rose-300 truncate max-w-[130px]" title={highlights.topTotalUser?.name}>
                                {highlights.topTotalUser?.name || '--'}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {highlights.topTotalUser ? `${highlights.topTotalUser.total.toLocaleString('vi-VN')} Total` : '--'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 👑 BẢNG ĐIỀU KHIỂN CỘNG / TRỪ XU DÀNH RIÊNG CHO BANG CHỦ */}
            {isMaster && (
                <div
                    ref={formRef}
                    className="rounded-3xl bg-zinc-900/75 border border-emerald-500/35 p-6 shadow-2xl space-y-5"
                >
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
                                <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                                    1. Chọn Bang Chúng ({filteredCandidates.length} người)
                                </label>
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
                                disabled={isSubmitting}
                                className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                                    txMode === 'ADD'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                                        : 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                                } disabled:opacity-50`}
                            >
                                {isSubmitting
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
            )}

            {/* 👑 BỤC VINH QUANG PHÚ HỘ */}
            {topRichest.length >= 3 && (
                <div className="flex flex-col md:flex-row justify-center items-end gap-4 mb-12 mt-12 md:mt-20 max-w-4xl mx-auto px-2">
                    {/* Hạng 2 */}
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-44 order-2 md:order-1 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥈</div>
                        <div className="font-bold text-lg text-zinc-200 truncate w-full text-center">{topRichest[1].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">
                            Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[1].point.toLocaleString('vi-VN')}</span> Pt
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
                            Ngân khố: <span className="text-emerald-400 font-black font-mono text-xl">{topRichest[0].point.toLocaleString('vi-VN')}</span> Pt
                        </div>
                    </div>

                    {/* Hạng 3 */}
                    <div className="bg-zinc-900/80 border border-emerald-700/50 rounded-t-3xl p-6 flex flex-col items-center justify-end relative shadow-lg w-full md:w-64 h-40 order-3 md:order-3 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500">
                        <div className="absolute -top-10 text-5xl drop-shadow-md">🥉</div>
                        <div className="font-bold text-lg text-emerald-200 truncate w-full text-center">{topRichest[2].name}</div>
                        <div className="text-sm text-zinc-400 mt-2">
                            Ngân khố: <span className="text-emerald-400 font-bold font-mono">{topRichest[2].point.toLocaleString('vi-VN')}</span> Pt
                        </div>
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
                        placeholder="Tìm đại hiệp, UID..."
                        className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-4 py-2.5 border border-zinc-800 focus:border-emerald-500/60 focus:outline-none transition-colors placeholder:text-zinc-600"
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

                <div className="flex flex-wrap items-center gap-3">
                    {isMaster && outsideRecords.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowOutsideDanhLuc((v) => !v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                showOutsideDanhLuc
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                        >
                            {showOutsideDanhLuc
                                ? `🙈 Ẩn ngoài Danh Lục (${outsideRecords.length})`
                                : `👁️ Hiện ngoài Danh Lục (${outsideRecords.length})`}
                        </button>
                    )}

                    <div className="text-xs text-zinc-500 font-mono">
                        Hiển thị <b className="text-zinc-300">{sortedPoints.length}</b> / {rawPointList.length} Đại Hiệp
                    </div>
                </div>
            </div>

            {/* 📜 BẢNG THỐNG KÊ CHI TIẾT */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-md shadow-xl">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider select-none">
                            <th onClick={() => handleSort('rank')} className="px-6 py-4 text-center w-28 cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>Hạng Công Thần</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th className="px-6 py-4">Đại Hiệp</th>
                            <th onClick={() => handleSort('point')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>💰 Điểm Hiện Tại (Point)</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'point' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            <th onClick={() => handleSort('total')} className="px-6 py-4 text-center cursor-pointer hover:bg-zinc-800/40 hover:text-emerald-300 transition-colors group">
                                <div className="flex items-center justify-center gap-1.5">
                                    <span>🏛️ Tổng Cống Hiến (Total)</span>
                                    <span className="text-zinc-600 group-hover:text-emerald-400">{sortConfig.key === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</span>
                                </div>
                            </th>
                            {isMaster && <th className="px-6 py-4 text-right">⚙️ Quản Trị</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 text-sm">
                        {sortedPoints.length === 0 ? (
                            <tr>
                                <td colSpan={isMaster ? 5 : 4} className="px-6 py-12 text-center text-zinc-500 italic">
                                    🍃 Không tìm thấy đại hiệp nào khớp với từ khóa tìm kiếm...
                                </td>
                            </tr>
                        ) : (
                            sortedPoints.map((user) => {
                                const userRank = rankMap[user.id];
                                const isOutside = user.isOutsideDanhLuc || user.hiddenFlag;

                                return (
                                    <tr
                                        key={user.id}
                                        className={`hover:bg-zinc-900/60 transition-colors ${isOutside ? 'opacity-65 bg-zinc-950/40' : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center font-mono font-bold text-zinc-500 text-base">
                                            {isOutside ? (
                                                <span className="bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 text-[10px] font-mono text-zinc-500">
                                                    ẨN
                                                </span>
                                            ) : userRank === 1 ? (
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
                                                    <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs text-emerald-400 shrink-0">
                                                        💰
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-zinc-200 text-sm hover:text-emerald-300 transition-colors">
                                                            {user.name}
                                                        </span>
                                                        {isOutside && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                                Ngoài Danh Lục
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

                                        {isMaster && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickPickMember(user.id, 'ADD')}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-black cursor-pointer"
                                                        title="Cộng Xu"
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickPickMember(user.id, 'SUB')}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-black cursor-pointer"
                                                        title="Trừ Xu"
                                                    >
                                                        −
                                                    </button>
                                                    {isOutside && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteOutsideUser(user.id, user.name)}
                                                            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 text-xs cursor-pointer"
                                                            title="Xóa khỏi Sổ Điểm"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
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
        </section>
    );
}
