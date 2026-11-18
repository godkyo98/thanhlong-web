/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tabs/ThongBaoTab.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
    WebNotificationItem,
    WebNotificationType,
    WebTabKey,
    formatRelativeVi,
    formatViDateTime,
    pushWebNotificationClient,
    updateWebNotificationItems,
} from '@/lib/notifications';

interface Props {
    data: any;
    danhLuc: any;
    session: any;
    isMaster: boolean;
    setActiveTab: (tab: any) => void;
    onMarkAllRead?: () => void;
}

type FilterCategory = 'ALL' | 'ANNOUNCEMENT' | 'POINT' | 'ACTIVITY';

const TYPE_BADGE: Record<WebNotificationType, { icon: string; label: string; cls: string }> = {
    announcement: {
        icon: '🔥',
        label: 'Truyền Âm / Cáo Thị',
        cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
    },
    point: {
        icon: '💰',
        label: 'Công Đức / Ngân Khố',
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    },
    guild_war: {
        icon: '⚔️',
        label: 'Bang Chiến',
        cls: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    },
    boss: {
        icon: '👹',
        label: 'Boss Sát Tướng',
        cls: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
    },
    pvp: {
        icon: '🏆',
        label: 'Võ Lâm Tranh Bá',
        cls: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
    },
    event: {
        icon: '📢',
        label: 'Hoạt Động Bang',
        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
    },
    boat: {
        icon: '🏮',
        label: 'Du Thuyền',
        cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/35',
    },
    system: {
        icon: '⚙️',
        label: 'Hệ Thống',
        cls: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
    },
};

const TAB_LINK_LABELS: Partial<Record<WebTabKey, string>> = {
    point: '💰 Xem Bảng Công Trạng',
    danhluc: '📜 Mở Sổ Danh Lục',
    sattuong: '👹 Xem Sát Tướng Đài',
    pvp: '🏆 Xem Sơ Đồ PvP',
    talent: '👹 Mở Thiên Phú Boss',
    giftcode: '🎁 Mở Tàng Bảo Các',
    tuvi: '🏆 Mở Tháp Phong Thần',
    builds: '⚔️ Mở Thần Khí Các',
};

export default function ThongBaoTab({
    data,
    danhLuc,
    session,
    isMaster,
    setActiveTab,
    onMarkAllRead,
}: Props) {
    const [filterCat, setFilterCat] = useState<FilterCategory>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Form đăng thông báo mới (Master Only)
    const [showComposer, setShowComposer] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [notifType, setNotifType] = useState<WebNotificationType>('announcement');
    const [linkTab, setLinkTab] = useState<string>('');
    const [pinned, setPinned] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

    const allItems: WebNotificationItem[] = useMemo(() => {
        const raw = Array.isArray(data?.items) ? data.items : [];
        return [...raw]
            .filter((it) => it && typeof it === 'object')
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [data]);

    const stats = useMemo(() => {
        let pinnedCount = 0;
        let pointCount = 0;
        let activityCount = 0;
        allItems.forEach((it) => {
            if (it.pinned) pinnedCount++;
            if (it.type === 'point') pointCount++;
            if (['guild_war', 'boss', 'pvp', 'event', 'boat'].includes(it.type)) activityCount++;
        });
        return {
            total: allItems.length,
            pinnedCount,
            pointCount,
            activityCount,
        };
    }, [allItems]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return allItems.filter((it) => {
            if (filterCat === 'ANNOUNCEMENT' && !['announcement', 'system'].includes(it.type)) return false;
            if (filterCat === 'POINT' && it.type !== 'point') return false;
            if (filterCat === 'ACTIVITY' && !['guild_war', 'boss', 'pvp', 'event', 'boat'].includes(it.type)) return false;

            if (!q) return true;
            const targetInDl = it.targetId ? (danhLuc?.[it.targetId]?.ingame || '') : '';
            const haystack = `${it.title || ''} ${it.message || ''} ${it.actor || ''} ${it.targetName || ''} ${targetInDl} ${it.categoryLabel || ''}`.toLowerCase();
            return haystack.includes(q);
        });
    }, [allItems, filterCat, searchQuery, danhLuc]);

    const pinnedItems = useMemo(() => filteredItems.filter((it) => it.pinned), [filteredItems]);
    const regularItems = useMemo(() => filteredItems.filter((it) => !it.pinned), [filteredItems]);

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isMaster) return;
        if (!title.trim() || !message.trim()) {
            setFeedback({ kind: 'err', text: 'Vui lòng nhập đầy đủ Tiêu đề và Nội dung thông báo.' });
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        try {
            const categoryLabel = TYPE_BADGE[notifType]?.label || 'Thông Báo';
            await pushWebNotificationClient({
                type: notifType,
                categoryLabel,
                title: title.trim(),
                message: message.trim(),
                actor: session?.user?.name || 'Bang Chủ',
                linkTab: linkTab ? (linkTab as WebTabKey) : undefined,
                pinned,
                source: 'web',
            });
            setTitle('');
            setMessage('');
            setPinned(false);
            setLinkTab('');
            setShowComposer(false);
            setFeedback({ kind: 'ok', text: '✅ Đã đăng thông báo lên Web Thanh Long!' });
            onMarkAllRead?.();
        } catch (err: any) {
            setFeedback({ kind: 'err', text: `❌ Không thể đăng thông báo: ${err?.message || 'Lỗi Firebase'}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTogglePin = async (id: string) => {
        if (!isMaster) return;
        try {
            await updateWebNotificationItems((items) =>
                items.map((it) => (it.id === id ? { ...it, pinned: !it.pinned } : it))
            );
        } catch {
            alert('❌ Lỗi cập nhật ghim thông báo!');
        }
    };

    const handleDeleteItem = async (id: string, itemTitle: string) => {
        if (!isMaster) return;
        if (!window.confirm(`🗑️ Xóa thông báo "${itemTitle}"?`)) return;
        try {
            await updateWebNotificationItems((items) => items.filter((it) => it.id !== id));
        } catch {
            alert('❌ Không thể xóa thông báo!');
        }
    };

    const renderNotificationCard = (it: WebNotificationItem, highlightPinned = false) => {
        const badge = TYPE_BADGE[it.type] || TYPE_BADGE.announcement;
        const resolvedTargetName =
            (it.targetId && danhLuc?.[it.targetId]?.ingame) || it.targetName || '';

        return (
            <div
                key={it.id}
                className={`rounded-2xl p-5 border transition-all backdrop-blur-md ${
                    highlightPinned
                        ? 'bg-gradient-to-br from-amber-950/30 via-zinc-900/90 to-rose-950/20 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.1)]'
                        : 'bg-zinc-950/65 border-zinc-800/80 hover:border-zinc-700/90'
                }`}
            >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        {it.pinned && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                📌 ĐÃ GHIM
                            </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                            <span>{badge.icon}</span>
                            <span>{it.categoryLabel || badge.label}</span>
                        </span>
                        {typeof it.delta === 'number' && it.delta !== 0 && (
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono border ${
                                    it.delta > 0
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                        : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                                }`}
                            >
                                {it.delta > 0 ? `+${it.delta}` : it.delta} Xu
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span title={formatViDateTime(it.createdAt)}>{formatRelativeVi(it.createdAt)}</span>
                        <span>•</span>
                        <span>{formatViDateTime(it.createdAt)}</span>
                    </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-zinc-100 leading-snug mb-1.5">
                    {it.title}
                </h3>

                {it.message && (
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                        {it.message}
                    </p>
                )}

                <div className="mt-4 pt-3 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                        {it.actor && (
                            <span>
                                👤 Đăng bởi: <b className="text-zinc-200">{it.actor}</b>
                            </span>
                        )}
                        {resolvedTargetName && (
                            <span>
                                🎯 Đối tượng: <b className="text-amber-300">{resolvedTargetName}</b>
                            </span>
                        )}
                        {typeof it.balanceAfter === 'number' && (
                            <span>
                                💰 Số dư mới: <b className="text-emerald-400 font-mono">{it.balanceAfter.toLocaleString('vi-VN')} Xu</b>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {it.linkTab && TAB_LINK_LABELS[it.linkTab] && (
                            <button
                                type="button"
                                onClick={() => setActiveTab(it.linkTab)}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors cursor-pointer"
                            >
                                {TAB_LINK_LABELS[it.linkTab]} ➔
                            </button>
                        )}
                        {isMaster && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleTogglePin(it.id)}
                                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-amber-500/15 text-zinc-400 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                                    title={it.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                >
                                    {it.pinned ? 'Bỏ ghim' : '📌 Ghim'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteItem(it.id, it.title)}
                                    className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                                    title="Xóa thông báo"
                                >
                                    🗑️
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section className="space-y-6 animate-fadeIn pb-16">
            {/* HERO BANNER */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-2 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                            <span>📢</span>
                            <span>Đài Truyền Âm · Thông Báo & Nhật Ký Web</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-wide leading-snug py-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-amber-400">
                            CÁO THỊ & THÔNG BÁO TÔNG MÔN
                        </h2>
                        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                            Trung tâm tiếp nhận trực tiếp mọi cáo thị từ Bang Chủ, biến động Công Đức Ngân Khố, lịch hoạt động Bang, Sát Tướng và kết quả giải đấu theo thời gian thực.
                        </p>
                    </div>

                    {isMaster && (
                        <button
                            type="button"
                            onClick={() => setShowComposer((v) => !v)}
                            className="shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-zinc-950 font-black text-xs sm:text-sm shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                        >
                            {showComposer ? '✖ Đóng Khung Soạn' : '✍️ Đăng Thông Báo Mới'}
                        </button>
                    )}
                </div>

                {/* 4 THẺ THỐNG KÊ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-7 pt-5 border-t border-zinc-800/80">
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">📢</div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Tổng Bản Tin</div>
                            <div className="text-xl font-black text-amber-300">{stats.total}</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-xl">📌</div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Đang Ghim</div>
                            <div className="text-xl font-black text-rose-300">{stats.pinnedCount}</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl">💰</div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Biến Động Xu</div>
                            <div className="text-xl font-black text-emerald-400">{stats.pointCount}</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl">⚔️</div>
                        <div>
                            <div className="text-[11px] text-zinc-400 font-semibold uppercase">Sự Kiện & PvP</div>
                            <div className="text-xl font-black text-cyan-300">{stats.activityCount}</div>
                        </div>
                    </div>
                </div>
            </div>

            {feedback && (
                <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold border ${
                        feedback.kind === 'ok'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                >
                    {feedback.text}
                </div>
            )}

            {/* KHUNG SOẠN THÔNG BÁO (MASTER ONLY) */}
            {isMaster && showComposer && (
                <form
                    onSubmit={handlePublish}
                    className="rounded-3xl bg-zinc-900/80 border border-amber-500/40 p-6 shadow-2xl space-y-4"
                >
                    <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                        <span>📜</span>
                        <span>SOẠN CÁO THỊ ĐẨY LÊN WEB THANH LONG</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">Tiêu đề thông báo</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="VD: Lệnh triệu tập Bang Chiến tối Thứ 7..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/60"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">Phân loại</label>
                            <select
                                value={notifType}
                                onChange={(e) => setNotifType(e.target.value as WebNotificationType)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                            >
                                <option value="announcement">🔥 Truyền Âm / Cáo Thị</option>
                                <option value="event">📢 Hoạt Động Bang</option>
                                <option value="guild_war">⚔️ Bang Chiến</option>
                                <option value="boss">👹 Sát Tướng</option>
                                <option value="pvp">🏆 Võ Lâm Tranh Bá</option>
                                <option value="system">⚙️ Hệ Thống</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">Nội dung chi tiết</label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Nhập nội dung thông báo gửi toàn thể bang chúng..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/60"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div className="flex flex-wrap items-center gap-4">
                            <select
                                value={linkTab}
                                onChange={(e) => setLinkTab(e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                            >
                                <option value="">🔗 Không gắn link chuyển tab</option>
                                <option value="point">💰 Trỏ tới Bảng Công Trạng</option>
                                <option value="danhluc">📜 Trỏ tới Sổ Danh Lục</option>
                                <option value="sattuong">👹 Trỏ tới Sát Tướng</option>
                                <option value="pvp">🏆 Trỏ tới Võ Lâm Tranh Bá</option>
                                <option value="talent">👹 Trỏ tới Thiên Phú Boss</option>
                                <option value="giftcode">🎁 Trỏ tới Giftcode</option>
                            </select>

                            <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={pinned}
                                    onChange={(e) => setPinned(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-950 accent-amber-400 w-4 h-4"
                                />
                                <span>📌 Ghim cáo thị lên đầu bảng</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 text-zinc-950 font-black text-xs sm:text-sm cursor-pointer transition-all"
                        >
                            {isSaving ? '⏳ Đang phát lên Web...' : '📢 Phát Thông Báo Ngay'}
                        </button>
                    </div>
                </form>
            )}

            {/* BỘ LỌC & TÌM KIẾM */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { key: 'ALL', label: `Tất cả (${allItems.length})` },
                        { key: 'ANNOUNCEMENT', label: '🔥 Cáo Thị' },
                        { key: 'POINT', label: `💰 Công Đức (${stats.pointCount})` },
                        { key: 'ACTIVITY', label: `⚔️ Sự Kiện (${stats.activityCount})` },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setFilterCat(tab.key as FilterCategory)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                filterCat === tab.key
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-zinc-950/70 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-xs pointer-events-none">🔍</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tiêu đề, tên thành viên..."
                        className="w-full bg-zinc-950 text-xs text-zinc-200 rounded-xl pl-9 pr-8 py-2.5 border border-zinc-800 focus:border-amber-500/50 focus:outline-none placeholder:text-zinc-600"
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
            </div>

            {/* DANH SÁCH GHIM */}
            {pinnedItems.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-widest text-amber-400 pl-1">
                        📌 Cáo Thị Đang Ghim
                    </div>
                    <div className="space-y-3">
                        {pinnedItems.map((it) => renderNotificationCard(it, true))}
                    </div>
                </div>
            )}

            {/* DANH SÁCH THÔNG BÁO THƯỜNG */}
            <div className="space-y-3">
                {pinnedItems.length > 0 && regularItems.length > 0 && (
                    <div className="text-xs font-black uppercase tracking-widest text-zinc-400 pl-1 pt-2">
                        🕒 Dòng Thời Gian Mới Nhất
                    </div>
                )}

                {filteredItems.length === 0 ? (
                    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/50 p-12 text-center space-y-2">
                        <div className="text-4xl">🕊️</div>
                        <div className="text-sm font-bold text-zinc-300">Chưa có thông báo nào phù hợp</div>
                        <div className="text-xs text-zinc-500">
                            Mọi biến động Công Đức, Cáo Thị và Sự Kiện Bang Hội sẽ tự động hiển thị tại đây.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {regularItems.map((it) => renderNotificationCard(it, false))}
                    </div>
                )}
            </div>
        </section>
    );
}
