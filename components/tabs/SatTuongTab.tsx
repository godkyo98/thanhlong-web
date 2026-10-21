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
import { normalizeVoHocName } from '@/components/tabs/DanhLucTab';

interface Props {
    data: any;             // sat_tuong_data từ Firebase
    bossRotation?: any;    // boss_rotation từ Firebase
    pointData?: any;       // points_data
    danhLuc: Record<string, any>;
    isMaster?: boolean;
    session?: any;
}

export default function SatTuongTab({
    data,
    bossRotation,
    danhLuc = {},
    isMaster = false,
}: Props) {
    const [activeSubTab, setActiveSubTab] = useState<'season' | 'monthly' | 'history'>('season');
    const [searchQuery, setSearchQuery] = useState('');

    // State sửa điểm Master
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editPts, setEditPts] = useState<number>(0);
    const [editType, setEditType] = useState<'monthly' | 'season'>('monthly');
    const [isSaving, setIsSaving] = useState(false);

    // 1. 🎯 BỐC THĂM CẶP ĐÔI BOSS SÁT PHẠT TUẦN NÀY (ĐỌC TỪ boss_rotation)
    const { targetBoss1, targetBoss2, totalUsed, totalPool } = useMemo(() => {
        const used = Array.isArray(bossRotation?.used) ? bossRotation.used : [];
        const pool = Array.isArray(bossRotation?.pool) ? bossRotation.pool : [];
        
        let b1 = '';
        let b2 = '';

        if (bossRotation?.current && Array.isArray(bossRotation.current)) {
            b1 = bossRotation.current[0] || '';
            b2 = bossRotation.current[1] || '';
        } else if (used.length >= 2) {
            b1 = used[used.length - 2];
            b2 = used[used.length - 1];
        } else if (used.length === 1) {
            b1 = used[0];
        }

        return {
            targetBoss1: b1,
            targetBoss2: b2,
            totalUsed: used.length,
            totalPool: pool.length
        };
    }, [bossRotation]);

    // 2. 🌟 BẢNG VÀNG CHIẾN THẦN PVE (TÍCH LŨY MÙA)
    const seasonList = useMemo(() => {
        const seasonObj = data?.seasonRanking || data?.season_ranking || data?.seasons || {};
        const list: Array<{
            id: string;
            ingame: string;
            discordName: string;
            uid: string;
            class: string;
            seasonPts: number;
            titleInfo: SatTuongTitleInfo | null;
        }> = [];

        Object.entries(seasonObj).forEach(([id, d]: [string, any]) => {
            const pts = Number(typeof d === 'object' ? (d?.satTuongSeasonPts ?? d?.seasonPts ?? d?.points ?? 0) : d) || 0;
            if (pts <= 0) return;

            const member = danhLuc[id] || {};
            const rawTitle = typeof d === 'object' && d?.title ? d.title : pts;
            const titleInfo = resolveSatTuongTitle(rawTitle);

            list.push({
                id,
                ingame: member.ingame || (typeof d === 'object' && d?.name) || `Đại Hiệp #${id.slice(-4)}`,
                discordName: member.discordName || (typeof d === 'object' && d?.username) || '',
                uid: member.uid || '—',
                class: normalizeVoHocName(member.class || 'Lãng Khách'),
                seasonPts: pts,
                titleInfo
            });
        });

        // Quét thêm thành viên từ danh_luc_data nếu có lưu danh hiệu sát tướng
        Object.entries(danhLuc || {}).forEach(([id, info]: [string, any]) => {
            if (!info || typeof info !== 'object') return;
            const pts = Number(info.satTuongSeasonPts || info.satTuongPts || 0);
            const userTitle = info.satTuongTitle || info.title;
            const titleInfo = resolveSatTuongTitle(userTitle || (pts > 0 ? pts : null));

            if (titleInfo && !list.some(item => item.id === id)) {
                list.push({
                    id,
                    ingame: info.ingame || `Đại Hiệp #${id.slice(-4)}`,
                    discordName: info.discordName || '',
                    uid: info.uid || '—',
                    class: normalizeVoHocName(info.class || 'Lãng Khách'),
                    seasonPts: pts > 0 ? pts : titleInfo.level,
                    titleInfo
                });
            }
        });

        return list.sort((a, b) => {
            const levelA = a.titleInfo?.level || a.seasonPts;
            const levelB = b.titleInfo?.level || b.seasonPts;
            if (levelB !== levelA) return levelB - levelA;
            return b.seasonPts - a.seasonPts;
        });
    }, [data, danhLuc]);

    // 3. 🏆 BẢNG PHONG THẦN (TỔNG ĐIỂM THÁNG)
    const monthlyList = useMemo(() => {
        const monthlyObj = data?.monthlyRanking || data?.monthly_ranking || {};
        const list: Array<{
            id: string;
            ingame: string;
            discordName: string;
            uid: string;
            class: string;
            points: number;
            titleInfo: SatTuongTitleInfo | null;
        }> = [];

        Object.entries(monthlyObj).forEach(([id, d]: [string, any]) => {
            const pts = Number(typeof d === 'object' ? (d?.points ?? 0) : d) || 0;
            const member = danhLuc[id] || {};
            const userSeasonTitle = resolveSatTuongTitle(
                data?.seasonRanking?.[id]?.satTuongSeasonPts ??
                data?.seasonRanking?.[id]?.title ??
                member.satTuongSeasonPts ??
                member.satTuongTitle
            );

            list.push({
                id,
                ingame: member.ingame || (typeof d === 'object' && d?.name) || `Hiệp Khách #${id.slice(-4)}`,
                discordName: member.discordName || (typeof d === 'object' && d?.username) || '',
                uid: member.uid || '—',
                class: normalizeVoHocName(member.class || 'Lãng Khách'),
                points: pts,
                titleInfo: userSeasonTitle
            });
        });

        return list.sort((a, b) => b.points - a.points);
    }, [data, danhLuc]);

    // 4. ⚔️ NHẬT KÝ THẢO PHẠT TỐC ĐỘ (Time-Attack History)
    const battleHistory = useMemo(() => {
        const rawHistory = data?.battles || data?.history || data?.records || data?.bossHistory || null;
        if (rawHistory && typeof rawHistory === 'object') {
            return Object.entries(rawHistory).map(([bossTitle, records]: [string, any]) => {
                const recordList = Array.isArray(records) ? records : Object.values(records || {});
                return {
                    bossTitle,
                    records: recordList.map((r: any) => ({
                        name: r?.name || r?.ingame || danhLuc[r?.id]?.ingame || 'Hiệp Khách',
                        time: r?.time || r?.record || '—',
                        rank: r?.rank || 1
                    }))
                };
            });
        }
        return [];
    }, [data, danhLuc]);

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
                        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                            🎲 Bốc Thăm Boss Sát Tướng Tuần Này
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Tuần này Tông môn chúng ta sẽ sát phạt cặp đôi mục tiêu được bốc thăm ngẫu nhiên từ hệ thống:
                        </p>
                    </div>

                    <div className="bg-black/50 border border-zinc-800 rounded-2xl px-4 py-2 text-right shrink-0">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase">Tiến Độ Vòng Xoay Boss</div>
                        <div className="text-sm font-mono font-black text-amber-300 mt-0.5">
                            {totalUsed} Đã Sát Phạt • Còn {totalPool} Trong Bể
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
                        <span>Bảng Phong Thần Tháng ({monthlyList.length})</span>
                    </button>

                    {battleHistory.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setActiveSubTab('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeSubTab === 'history'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow'
                                    : 'bg-black/40 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                        >
                            <span>⚔️</span>
                            <span>Nhật Ký Tốc Độ Boss ({battleHistory.length})</span>
                        </button>
                    )}
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
                        <div className="text-xs font-mono text-zinc-400">
                            Tổng: <b className="text-amber-400">{seasonList.length}</b> cao thủ
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
                                {seasonList
                                    .filter(u => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return u.ingame.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q) || u.class.toLowerCase().includes(q);
                                    })
                                    .map((user, idx) => {
                                        const isEditing = editingUid === user.id && editType === 'season';

                                        return (
                                            <tr key={user.id} className="hover:bg-amber-950/20 transition-colors group">
                                                <td className="py-3.5 px-4 text-center font-mono font-bold">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                                                        <span className="text-zinc-500">#{idx + 1}</span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div>
                                                        <div className="font-black text-amber-200 text-sm group-hover:text-amber-100">
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
                                <span>🏆 Bảng Phong Thần (Tổng Điểm Tháng)</span>
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Mỗi Boss: <b>Top 1 = 3đ</b> | <b>Top 2 = 2đ</b> | <b>Top 3 = 1đ</b> • Xếp hạng Dense Rank tự động từ Discord Bot.
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
                                    <th className="py-3.5 px-4 text-center font-mono">🏆 Điểm Phong Thần Tháng</th>
                                    {isMaster && <th className="py-3.5 px-4 text-right">⚙️ Quản Trị</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-xs font-medium">
                                {monthlyList.length === 0 ? (
                                    <tr>
                                        <td colSpan={isMaster ? 6 : 5} className="py-12 text-center text-zinc-500 italic">
                                            Chưa có dữ liệu điểm phong thần tháng này.
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

            {/* 🔴 3C. BẢNG 3: NHẬT KÝ THỜI GIAN THẢO PHẠT TỪNG TRẬN (TIME-ATTACK RECORD) */}
            {activeSubTab === 'history' && battleHistory.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {battleHistory.map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-[#0b0404]/90 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <span className="font-black text-sm text-amber-300">⚔️ {item.bossTitle}</span>
                                <span className="text-[10px] font-mono text-zinc-500">Record #{idx + 1}</span>
                            </div>
                            <div className="space-y-1.5">
                                {item.records.map((rec: any, rIdx: number) => (
                                    <div
                                        key={rIdx}
                                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800/80"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{rIdx === 0 ? '🥇' : rIdx === 1 ? '🥈' : '🥉'}</span>
                                            <span className="font-bold text-zinc-200">{rec.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-amber-400">⏱️ {rec.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
