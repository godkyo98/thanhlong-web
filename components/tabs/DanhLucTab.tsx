// components/tabs/DanhLucTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    danhLuc: Record<string, any>;
    talentData?: Record<string, any>;
    tuViData?: Record<string, any>;
    isMaster?: boolean;
    wwmData?: any;
}

type SortField = 'ingame' | 'discord' | 'class' | 'gw' | 'talent';
type SortOrder = 'asc' | 'desc';

// 🟢 BẢNG QUY ĐỔI TỰ ĐỘNG TỪ BẢN DỊCH CŨ SANG BẢN DỊCH CHUẨN MỚI TRONG VO_HOC_LIST
const LEGACY_CLASS_MAP: Record<string, string> = {
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

// Nhận diện 4 Đại Hệ Phái để tô màu & thống kê
function getSectStyle(voHoc: string) {
    if (voHoc.includes('Minh Kim')) {
        return {
            sectKey: 'MINH_KIM',
            sectName: 'Minh Kim',
            icon: '🗡️',
            badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
            dotClass: 'bg-amber-400'
        };
    }
    if (voHoc.includes('Liệt Thạch')) {
        return {
            sectKey: 'LIET_THACH',
            sectName: 'Liệt Thạch',
            icon: '🪓',
            badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
            dotClass: 'bg-orange-400'
        };
    }
    if (voHoc.includes('Khiên Ty')) {
        return {
            sectKey: 'KHIEN_TY',
            sectName: 'Khiên Ty',
            icon: '☂️',
            badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
            dotClass: 'bg-emerald-400'
        };
    }
    if (voHoc.includes('Phá Trúc')) {
        return {
            sectKey: 'PHA_TRUC',
            sectName: 'Phá Trúc',
            icon: '🎋',
            badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
            dotClass: 'bg-cyan-400'
        };
    }
    return {
        sectKey: 'OTHER',
        sectName: 'Chưa Phân Phái',
        icon: '⚔️',
        badgeClass: 'bg-zinc-800/80 text-zinc-400 border-zinc-700',
        dotClass: 'bg-zinc-500'
    };
}

function getGwBadge(gwStatus?: string) {
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

export default function DanhLucTab({ danhLuc, talentData = {}, tuViData = {}, isMaster = false, wwmData }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSectFilter, setSelectedSectFilter] = useState<string>('ALL');
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
    const [selectedGwFilter, setSelectedGwFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [sortField, setSortField] = useState<SortField>('ingame');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // State chỉnh sửa thành viên cho Master
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        ingame: '',
        discordName: '',
        uid: '',
        class: '',
        gw: ''
    });
    const [isMigrating, setIsMigrating] = useState(false);

    // 1. Lấy danh sách VO_HOC_LIST chuẩn từ Firebase wwm_data
    const voHocList: string[] = useMemo(() => {
        const raw = wwmData?.VO_HOC_LIST;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.filter(Boolean).map(String);
        }
        if (raw && typeof raw === 'object') {
            return Object.keys(raw)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => String(raw[k]))
                .filter(Boolean);
        }
        return [
            'Minh Kim (Vô Danh)',
            'Minh Kim (Cửu Kiếm)',
            'Liệt Thạch (Tank)',
            'Liệt Thạch (Dame)',
            'Khiên Ty (Dame)',
            'Khiên Ty (Heal)',
            'Phá Trúc (Song Đao)',
            'Phá Trúc (Dù)',
            'Phá Trúc (Quyền)',
            'Phá Trúc (Túy Quyền)',
            'Khiên Ty (Buff)'
        ];
    }, [wwmData]);

    // 2. Xây dựng danh sách thành viên đã hợp nhất Tên Ingame + Tên Discord + Võ Học mới
    const { membersList, legacyCount, sectCounts } = useMemo(() => {
        const entries = Object.entries(danhLuc || {});
        let oldClassCounter = 0;
        const counts = {
            MINH_KIM: 0,
            LIET_THACH: 0,
            KHIEN_TY: 0,
            PHA_TRUC: 0,
            OTHER: 0
        };

        const list = entries.map(([discordId, info]: [string, any]) => {
            const rawClass = info?.class || 'Chưa rõ';
            const normalizedClass = normalizeVoHocName(rawClass);
            if (rawClass !== normalizedClass) {
                oldClassCounter++;
            }

            const sectMeta = getSectStyle(normalizedClass);
            counts[sectMeta.sectKey as keyof typeof counts] = (counts[sectMeta.sectKey as keyof typeof counts] || 0) + 1;

            // Tra cứu tên Discord từ danh_luc_data hoặc đối chiếu sang chat_rank_data (tuViData)
            const rankProfile = tuViData?.[discordId];
            const discordDisplay =
                info?.discordName ||
                info?.discordUsername ||
                info?.username ||
                rankProfile?.name ||
                rankProfile?.username ||
                '';

            const userTalents = talentData?.[discordId] ? Object.entries(talentData[discordId]) : [];

            return {
                discordId,
                ingame: info?.ingame || info?.ten_game || discordDisplay || `Đệ tử #${discordId.slice(-4)}`,
                discordName: discordDisplay,
                avatar: info?.avatar || rankProfile?.avatar || null,
                gameUid: info?.uid || info?.pid || '—',
                rawClass,
                voHoc: normalizedClass,
                sectMeta,
                gwRaw: info?.gw || '',
                gwBadge: getGwBadge(info?.gw),
                talents: userTalents,
                talentCount: userTalents.length
            };
        });

        return { membersList: list, legacyCount: oldClassCounter, sectCounts: counts };
    }, [danhLuc, tuViData, talentData]);

    // 3. Lọc và Sắp xếp
    const filteredAndSortedMembers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        const filtered = membersList.filter((m) => {
            if (selectedSectFilter !== 'ALL' && m.sectMeta.sectKey !== selectedSectFilter) return false;
            if (selectedClassFilter !== 'ALL' && m.voHoc !== selectedClassFilter) return false;
            if (selectedGwFilter !== 'ALL' && m.gwBadge.code !== selectedGwFilter) return false;

            if (!q) return true;
            return (
                m.ingame.toLowerCase().includes(q) ||
                m.discordName.toLowerCase().includes(q) ||
                m.discordId.toLowerCase().includes(q) ||
                String(m.gameUid).toLowerCase().includes(q) ||
                m.voHoc.toLowerCase().includes(q)
            );
        });

        const gwWeight: Record<string, number> = {
            'Cả 2': 4,
            'T7': 3,
            'CN': 2,
            'Vắng': 1,
            'Chưa báo': 0
        };

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'ingame') {
                cmp = a.ingame.localeCompare(b.ingame, 'vi');
            } else if (sortField === 'discord') {
                cmp = (a.discordName || a.discordId).localeCompare(b.discordName || b.discordId, 'vi');
            } else if (sortField === 'class') {
                cmp = a.voHoc.localeCompare(b.voHoc, 'vi');
            } else if (sortField === 'gw') {
                cmp = (gwWeight[a.gwBadge.code] || 0) - (gwWeight[b.gwBadge.code] || 0);
            } else if (sortField === 'talent') {
                cmp = a.talentCount - b.talentCount;
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });
    }, [membersList, searchQuery, selectedSectFilter, selectedClassFilter, selectedGwFilter, sortField, sortOrder]);

    const handleSortClick = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder(field === 'gw' || field === 'talent' ? 'desc' : 'asc');
        }
    };

    // 🟢 HÀM 1-CLICK: ĐỒNG BỘ TOÀN BỘ TÊN VÕ HỌC CŨ & TÊN DISCORD LÊN FIREBASE
    const handleMigrateAllToNewTranslation = async () => {
        if (!isMaster) return;
        if (!window.confirm(
            `🔄 Chuẩn hóa toàn bộ Sổ Danh Lục trên Firebase sang bản dịch Võ Học mới nhất (Minh Kim, Liệt Thạch, Khiên Ty, Phá Trúc) và cập nhật kèm Tên Discord?`
        )) return;

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
                    ...(resolvedDiscordName ? { discordName: resolvedDiscordName } : {})
                };
            });

            await setDoc(doc(db, 'thanhlong_config', 'danh_luc_data'), updatedPayload, { merge: true });
            alert('✅ Đã chuẩn hóa 100% tên Võ Học mới và Tên Discord lên Firebase! Kênh #sổ-danh-lục trên Discord cũng đang tự động cập nhật theo.');
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
            gw: m.gwRaw || ''
        });
    };

    const handleSaveMemberEdit = async (discordId: string) => {
        if (!isMaster) return;
        try {
            const existing = danhLuc?.[discordId] || {};
            const nextRecord = {
                ...existing,
                ingame: editForm.ingame.trim() || existing.ingame,
                discordName: editForm.discordName.trim(),
                uid: editForm.uid.trim() || '?',
                class: normalizeVoHocName(editForm.class),
                gw: editForm.gw
            };
            await setDoc(doc(db, 'thanhlong_config', 'danh_luc_data'), {
                [discordId]: nextRecord
            }, { merge: true });
            setEditingUid(null);
        } catch {
            alert('❌ Không thể lưu chỉnh sửa lên Firebase!');
        }
    };

    const handleDeleteMember = async (discordId: string, ingame: string) => {
        if (!isMaster) return;
        if (!window.confirm(`🗑️ Xóa hồ sơ của [${ingame}] khỏi Sổ Danh Lục?`)) return;
        try {
            await setDoc(doc(db, 'thanhlong_config', 'danh_luc_data'), {
                [discordId]: deleteField()
            }, { merge: true });
        } catch {
            alert('❌ Lỗi khi xóa thành viên!');
        }
    };

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* 🟢 BANNER ĐẦU & THỐNG KÊ TỨ ĐẠI HỆ PHÁI */}
            <div className="bg-[#090d16]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider mb-2">
                            <span>📜 SỔ ĐĂNG KÝ QUÂN SỐ TÔNG MÔN</span>
                            <span>•</span>
                            <span>ĐỒNG BỘ REAL-TIME VỚI DISCORD</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                            📜 Sổ Danh Lục Bang Chúng ({membersList.length} Đại Hiệp)
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                            Hiển thị song song <b>Tên Nhân Vật In-game</b> và <b>Tài Khoản Discord</b> • Phân loại theo chuẩn dịch thuật mới nhất của <code>VO_HOC_LIST</code>.
                        </p>
                    </div>

                    {/* NÚT CHUẨN HÓA BẢN DỊCH VÕ HỌC LÊN FIREBASE (DÀNH CHO MASTER) */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {isMaster && (
                            <button
                                type="button"
                                disabled={isMigrating}
                                onClick={handleMigrateAllToNewTranslation}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
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
                        )}

                        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                    viewMode === 'table' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                📋 Bảng Chiến Lược
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                    viewMode === 'grid' ? 'bg-cyan-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                🪪 Thẻ Bài RPG
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4 THẺ THỐNG KÊ TỨ ĐẠI HỆ PHÁI (BẤM ĐỂ LỌC NHANH) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <button
                        type="button"
                        onClick={() => { setSelectedSectFilter('ALL'); setSelectedClassFilter('ALL'); }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedSectFilter === 'ALL'
                                ? 'bg-zinc-900 border-white/50 shadow-lg'
                                : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
                        }`}
                    >
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">🏰 Toàn Tông Môn</div>
                        <div className="text-2xl font-black text-white font-mono mt-1">{membersList.length}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Tất cả hệ phái</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedSectFilter(selectedSectFilter === 'MINH_KIM' ? 'ALL' : 'MINH_KIM'); setSelectedClassFilter('ALL'); }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedSectFilter === 'MINH_KIM'
                                ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                : 'bg-zinc-950/70 border-amber-500/20 hover:border-amber-500/50'
                        }`}
                    >
                        <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">🗡️ Hệ Minh Kim</div>
                        <div className="text-2xl font-black text-amber-300 font-mono mt-1">{sectCounts.MINH_KIM}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Vô Danh • Cửu Kiếm</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedSectFilter(selectedSectFilter === 'LIET_THACH' ? 'ALL' : 'LIET_THACH'); setSelectedClassFilter('ALL'); }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedSectFilter === 'LIET_THACH'
                                ? 'bg-orange-950/40 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                                : 'bg-zinc-950/70 border-orange-500/20 hover:border-orange-500/50'
                        }`}
                    >
                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-wider">🪓 Hệ Liệt Thạch</div>
                        <div className="text-2xl font-black text-orange-300 font-mono mt-1">{sectCounts.LIET_THACH}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Tank • Dame Đại Đao</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedSectFilter(selectedSectFilter === 'KHIEN_TY' ? 'ALL' : 'KHIEN_TY'); setSelectedClassFilter('ALL'); }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedSectFilter === 'KHIEN_TY'
                                ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-zinc-950/70 border-emerald-500/20 hover:border-emerald-500/50'
                        }`}
                    >
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">☂️ Hệ Khiên Ty</div>
                        <div className="text-2xl font-black text-emerald-300 font-mono mt-1">{sectCounts.KHIEN_TY}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Dame • Heal • Buff</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedSectFilter(selectedSectFilter === 'PHA_TRUC' ? 'ALL' : 'PHA_TRUC'); setSelectedClassFilter('ALL'); }}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedSectFilter === 'PHA_TRUC'
                                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                : 'bg-zinc-950/70 border-cyan-500/20 hover:border-cyan-500/50'
                        }`}
                    >
                        <div className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">🎋 Hệ Phá Trúc</div>
                        <div className="text-2xl font-black text-cyan-300 font-mono mt-1">{sectCounts.PHA_TRUC}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Song Đao • Dù • Quyền</div>
                    </button>
                </div>

                {/* THANH TÌM KIẾM & BỘ LỌC CHI TIẾT */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/80">
                    <div className="md:col-span-5">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Tìm theo Tên In-game, @Tên Discord, UID hoặc Võ Học..."
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-medium focus:outline-none"
                        />
                    </div>

                    <div className="md:col-span-4">
                        <select
                            value={selectedClassFilter}
                            onChange={(e) => setSelectedClassFilter(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-300 focus:outline-none"
                        >
                            <option value="ALL">⚔️ Lọc theo Nhánh Võ Học (Tất cả {voHocList.length} nhánh)</option>
                            {voHocList.map((vh) => (
                                <option key={vh} value={vh}>{vh}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <select
                            value={selectedGwFilter}
                            onChange={(e) => setSelectedGwFilter(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-400 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-300 focus:outline-none"
                        >
                            <option value="ALL">🏯 Lịch Bang Chiến (Tất cả)</option>
                            <option value="Cả 2">🔥 Đi Cả 2 Ngày (T7 & CN)</option>
                            <option value="T7">⚡ Chỉ đi Thứ 7</option>
                            <option value="CN">☀️ Chỉ đi Chủ Nhật</option>
                            <option value="Vắng">💤 Báo Vắng</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 🟢 CHẾ ĐỘ 1: BẢNG CHIẾN LƯỢC (TABLE VIEW) */}
            {viewMode === 'table' ? (
                <div className="bg-[#090d16]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-950/90 border-b border-zinc-800 text-[11px] font-black uppercase tracking-wider text-zinc-400 select-none">
                                    <th className="py-3.5 px-4 w-14 text-center">#</th>
                                    <th
                                        onClick={() => handleSortClick('ingame')}
                                        className="py-3.5 px-4 cursor-pointer hover:text-amber-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>👤 Cao Thủ In-game & Discord</span>
                                            {sortField === 'ingame' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-4 font-mono">🆔 UID Game</th>
                                    <th
                                        onClick={() => handleSortClick('class')}
                                        className="py-3.5 px-4 cursor-pointer hover:text-emerald-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>⚔️ Nhánh Võ Học (Chuẩn Mới)</span>
                                            {sortField === 'class' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSortClick('gw')}
                                        className="py-3.5 px-4 cursor-pointer hover:text-rose-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>🏯 Bang Chiến</span>
                                            {sortField === 'gw' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSortClick('talent')}
                                        className="py-3.5 px-4 cursor-pointer hover:text-cyan-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>👹 Lộ Trình Boss Talent</span>
                                            {sortField === 'talent' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </div>
                                    </th>
                                    {isMaster && <th className="py-3.5 px-4 text-right">⚙️ Quản Trị</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 text-xs">
                                {filteredAndSortedMembers.map((m, idx) => {
                                    const isEditing = editingUid === m.discordId;

                                    return (
                                        <tr
                                            key={m.discordId}
                                            className="hover:bg-zinc-900/50 transition-colors group"
                                        >
                                            <td className="py-3.5 px-4 text-center font-mono text-zinc-500 font-bold">
                                                {String(idx + 1).padStart(2, '0')}
                                            </td>

                                            {/* CỘT KÉP: TÊN IN-GAME + HUY HIỆU TÊN DISCORD */}
                                            <td className="py-3.5 px-4">
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
                                                            placeholder="Tên hiển thị Discord..."
                                                            className="w-full bg-zinc-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-[11px] text-indigo-300"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-base shrink-0 shadow-inner">
                                                            {m.sectMeta.icon}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-black text-amber-300 group-hover:text-amber-200 transition-colors break-words">
                                                                {m.ingame}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                                <a
                                                                    href={`https://discord.com/users/${m.discordId}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 transition-colors"
                                                                    title={`Discord ID: ${m.discordId}`}
                                                                >
                                                                    <span>💬</span>
                                                                    <span>@{m.discordName || `ID:${m.discordId.slice(-5)}`}</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* UID GAME */}
                                            <td className="py-3.5 px-4 font-mono text-zinc-300">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.uid}
                                                        onChange={(e) => setEditForm({ ...editForm, uid: e.target.value })}
                                                        placeholder="UID Game..."
                                                        className="w-28 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-zinc-200"
                                                    />
                                                ) : (
                                                    <span className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                                                        {m.gameUid}
                                                    </span>
                                                )}
                                            </td>

                                            {/* NHÁNH VÕ HỌC (CHUẨN BẢN DỊCH MỚI) */}
                                            <td className="py-3.5 px-4">
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
                                                        <span className={`w-1.5 h-1.5 rounded-full ${m.sectMeta.dotClass}`} />
                                                        <span>{m.voHoc}</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* BANG CHIẾN */}
                                            <td className="py-3.5 px-4">
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

                                            {/* BOSS TALENT */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                {m.talents.length === 0 ? (
                                                    <span className="text-[11px] text-zinc-600 italic">Chưa đăng ký Boss</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {m.talents.map(([bossName, milestones]: [string, any]) => (
                                                            <span
                                                                key={bossName}
                                                                className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700/80 text-[10px] text-zinc-300"
                                                            >
                                                                <b className="text-amber-300">{bossName.split('(')[0].trim()}:</b>{' '}
                                                                {Array.isArray(milestones) ? milestones.join(', ') : String(milestones)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            {/* CỘT QUẢN TRỊ CHO MASTER */}
                                            {isMaster && (
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* 🟢 CHẾ ĐỘ 2: THẺ BÀI CAO THỦ (RPG CARD GRID VIEW) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAndSortedMembers.map((m, idx) => (
                        <div
                            key={m.discordId}
                            className="bg-[#090d16]/90 border border-zinc-800/90 hover:border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between gap-3 transition-all hover:-translate-y-0.5"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-lg shrink-0">
                                            {m.sectMeta.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-black text-amber-300 truncate">{m.ingame}</div>
                                            <a
                                                href={`https://discord.com/users/${m.discordId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-300 hover:underline truncate"
                                            >
                                                <span>💬</span>
                                                <span>@{m.discordName || `ID:${m.discordId.slice(-5)}`}</span>
                                            </a>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-400">
                                        #{String(idx + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold ${m.sectMeta.badgeClass}`}>
                                        {m.voHoc}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-xl border text-[10px] font-bold ${m.gwBadge.cls}`}>
                                        {m.gwBadge.label}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                                <span className="font-mono">🆔 UID: <b className="text-zinc-200">{m.gameUid}</b></span>
                                {isMaster && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('table');
                                            startEditMember(m);
                                        }}
                                        className="text-amber-400 hover:underline font-bold cursor-pointer"
                                    >
                                        ✏️ Sửa
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
