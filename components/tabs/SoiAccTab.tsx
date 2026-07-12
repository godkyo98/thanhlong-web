// components/tabs/SoiAccTab.tsx
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 🔮 TUYỆT KỸ LỘT MẶT NẠ CHUỖI JSON
const safeParse = (val: any) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return {}; }
};

function warmBangHoi(name: string) {
    if (name && (name.includes("Thanh Long") || name.toLowerCase() === "thanhlong")) return "🐉 Thanh Long Sơn Trang";
    return name;
}

interface Props {
    profiles: any;
    wwmData: any;
    lang: 'vi' | 'en';
}

export default function SoiAccTab({ profiles, wwmData, lang }: Props) {
    const [soiQuery, setSoiQuery] = useState("");
    const [isSoiLoading, setIsSoiLoading] = useState(false);
    const [expandedEquip, setExpandedEquip] = useState<Record<string, boolean>>({});
    const [editingDict, setEditingDict] = useState<{ id: string, mapName: string, valVi: string, valEn: string } | null>(null);

    // 🟢 BIẾN QUẢN LÝ THANH TÌM KIẾM TRONG HỒ SƠ ĐÃ LƯU
    const [filterText, setFilterText] = useState("");

    const toggleEquip = (uid: string) => {
        setExpandedEquip(prev => ({ ...prev, [uid]: !prev[uid] }));
    };

    const handleSoiOnWeb = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!soiQuery.trim()) return;
        setIsSoiLoading(true);
        try {
            const response = await fetch('/api/soi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: soiQuery, type: 'acc' }) });
            const result = await response.json();
            if (result.error) alert(`❌ Lỗi: ${result.error}`);
            else { alert(`✅ Đã soi thành công và lưu hồ sơ lên mây!`); setSoiQuery(""); }
        } catch (error) { alert("❌ Hệ thống API Netease không phản hồi."); }
        setIsSoiLoading(false);
    };

    const handleInlineDictSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDict) return;

        const viText = editingDict.valVi.trim();
        const enText = editingDict.valEn.trim();

        if (!viText && !enText) {
            alert("Đại hiệp phải nhập bản dịch cho ít nhất một ngôn ngữ chứ!");
            return;
        }

        try {
            const targetMapName = editingDict.mapName;
            const currentMap = wwmData?.[targetMapName] || {};
            const oldData = currentMap[editingDict.id] || {};

            const finalVi = viText || oldData.vi || enText;
            const finalEn = enText || oldData.en || viText;

            const updatedMap = {
                ...currentMap,
                [editingDict.id]: { vi: finalVi, en: finalEn }
            };
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                ...wwmData,
                [targetMapName]: updatedMap
            }, { merge: true });

            setEditingDict(null);
        } catch (err) {
            alert("❌ Lỗi khi khảm từ điển lên Mây!");
        }
    };

    const renderTranslable = (id: string | number | undefined, mapNames: string[], fallbackText: string, extraVal?: string) => {
        if (!id) return <span>{fallbackText}</span>;
        const strId = String(id);

        let translated = "";
        let targetMap = mapNames[0];

        for (const m of mapNames) {
            if (wwmData?.[m]?.[strId]?.[lang]) {
                translated = wwmData[m][strId][lang];
                targetMap = m;
                break;
            } else if (wwmData?.[m]?.[strId]?.vi) {
                translated = wwmData[m][strId].vi;
                targetMap = m;
                break;
            }
        }

        if (translated) {
            return (
                <span>
                    {translated}
                    {extraVal && <span className="text-indigo-400/70 font-mono ml-1 font-bold">({extraVal})</span>}
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1.5 group">
                <span className="text-zinc-500 italic border-b border-dashed border-zinc-700 pb-0.5">
                    {fallbackText} [{strId}] {extraVal && <span className="font-mono text-zinc-600">({extraVal})</span>}
                </span>
                <button
                    onClick={() => setEditingDict({ id: strId, mapName: targetMap, valVi: "", valEn: "" })}
                    className="opacity-0 group-hover:opacity-100 text-[10px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 cursor-pointer transition-all flex-shrink-0"
                    title="Bổ sung bản dịch"
                >
                    ✍️ Dịch
                </button>
            </span>
        );
    };

    const renderEquipment = (raw: any) => {
        let cpChiTiet = safeParse(raw.combat_plan_chi_tiet);
        if (Object.keys(cpChiTiet).length === 0 && raw.combat_plan) cpChiTiet = raw;

        const equips = safeParse(cpChiTiet.wear_equips) || safeParse(raw.wear_equips) || safeParse(raw.equipment) || {};
        const equipKeys = Object.keys(equips);

        if (equipKeys.length === 0) return <div className="text-zinc-500 text-xs py-6 text-center italic">🍃 Tàng y các trống rỗng.</div>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipKeys.map(key => {
                    const eq = safeParse(equips[key]);
                    if (!eq || typeof eq !== 'object') return null;

                    const itemId = eq.No || eq.equip_id || eq.item_id || eq.base_id;
                    if (!itemId) return null;

                    const ex = safeParse(eq.ex) || {};
                    const affixes = ex.base_affixes || ex.affix_list || eq.affix_list || eq.random_attrs || eq.affixes || [];

                    return (
                        <div key={key} className="bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 rounded-xl p-4 transition-all duration-200 shadow-md">
                            <div className="font-bold text-amber-400 text-sm flex justify-between items-center border-b border-zinc-800/80 pb-2 mb-2">
                                <span className="flex items-center gap-1.5">
                                    🛡️ {renderTranslable(itemId, ['ARMOR_MAP', 'WEAPON_MAP'], 'Trang bị')}
                                </span>
                                {ex.suffix && <span className="text-zinc-500 text-[11px] font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 shrink-0">Lv.{ex.suffix}</span>}
                            </div>

                            {affixes.length > 0 ? (
                                <ul className="space-y-1.5">
                                    {affixes.map((affix: any, idx: number) => {
                                        let affixId = affix;
                                        let valText = "";

                                        if (Array.isArray(affix)) {
                                            affixId = affix[0];
                                            const affVal = affix[1];
                                            if (affVal === 1 && parseInt(affixId) > 260000) valText = "";
                                            else if (affVal < 1) valText = `+${(affVal * 100).toFixed(2)}%`;
                                            else valText = `+${Number(affVal).toFixed(2)}`;
                                        } else if (typeof affix === 'object') {
                                            affixId = affix.affix_id || affix.id;
                                        }

                                        return (
                                            <li key={idx} className="text-xs text-indigo-300 flex items-center gap-2 leading-relaxed bg-indigo-950/20 px-2 py-1 rounded border border-indigo-950/40">
                                                <span className="text-indigo-400 shrink-0">✦</span>
                                                {renderTranslable(affixId, ['AFFIX_MAP'], 'Dòng ẩn', valText)}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="text-[11px] text-zinc-600 italic pl-1">Không khảm dòng ẩn</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // 🟢 ĐOẠN LỌC VÀ SẮP XẾP TỐI THƯỢNG: AI MỚI SOI PHẢI LÊN ĐẦU
    const filteredProfiles = Object.entries(profiles || {})
        .filter(([uid, data]: any) => {
            const tuKhoa = (filterText || "").toLowerCase().trim();
            if (!tuKhoa) return true; // Trống thì không lọc

            let raw: any = {};
            try { raw = typeof data.full_raw_data === 'string' ? JSON.parse(data.full_raw_data) : data.full_raw_data; } catch (e) { }
            const base = safeParse(raw?.base);

            const name1 = String(base?.role_name || "").toLowerCase();
            const name2 = String(base?.name || "").toLowerCase();
            const name3 = String(data.playerName || "").toLowerCase();
            const name4 = String(data.name || "").toLowerCase();

            const uid1 = String(uid || "").toLowerCase();
            const uid2 = String(data.id || "").toLowerCase();

            return name1.includes(tuKhoa) || name2.includes(tuKhoa) || name3.includes(tuKhoa) || name4.includes(tuKhoa) || uid1.includes(tuKhoa) || uid2.includes(tuKhoa);
        })
        .sort((a: any, b: any) => {
            const dataA = a[1];
            const dataB = b[1];

            // ⏳ Tuyệt kỹ bóc tách thời gian: Tìm xem acc nào vừa được Firebase cập nhật
            const getTime = (d: any) => {
                if (!d) return 0;
                // 1. Ưu tiên thời gian Bot/Web lưu (nếu có)
                if (d.updatedAt?.seconds) return d.updatedAt.seconds;
                if (typeof d.updatedAt === 'number') return d.updatedAt;
                if (d.timestamp?.seconds) return d.timestamp.seconds;
                if (typeof d.timestamp === 'number') return d.timestamp;

                // 2. Không có thì lôi thời gian nhân vật online cuối cùng của Netease ra đọ
                let raw: any = {};
                try { raw = typeof d.full_raw_data === 'string' ? JSON.parse(d.full_raw_data) : d.full_raw_data; } catch (e) { }
                const base = safeParse(raw?.base);
                return base?.last_logoff_time || base?.create_time || 0;
            };

            // Thằng nào thời gian bự hơn (gần hiện tại hơn) thì bị đá lên trên cùng!
            return getTime(dataB) - getTime(dataA);
        });

    return (
        <section className="animate-in fade-in duration-300">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-400">🔮 Đài Soi Căn Cốt & Đại Kho Trang Bị</h2>
                <p className="text-sm text-zinc-400 mt-1">
                    Chuyển ngôn ngữ ở góc trên bên phải để xem bản tiếng Anh.
                    <br />Nhấn vào nút <b className="text-amber-400 px-1 bg-amber-500/20 rounded mx-1">✍️ Dịch</b> cạnh các chỉ số chưa biết để đóng góp cho từ điển chung của Bang!
                </p>
            </div>

            {/* FORM GỌI API NETEASE ĐỂ KÉO NGƯỜI MỚI */}
            <form onSubmit={handleSoiOnWeb} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-10 shadow-lg flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tra cứu mới từ Netease (Nhập UID hoặc Tên)</label>
                    <input
                        type="text"
                        value={soiQuery}
                        onChange={(e) => setSoiQuery(e.target.value)}
                        placeholder="Ví dụ: 10101002 hoặc KyoĐaoPháp"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSoiLoading}
                    className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-800 text-zinc-950 font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
                >
                    {isSoiLoading ? "⏳ Đang triệu hồi Netease API..." : "🔍 Khởi Động Thiên Nhãn"}
                </button>
            </form>

            {/* 🟢 KHU VỰC SỔ ĐIỆP CHỈ SỐ ĐÃ LƯU TRÊN MÂY */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-3 border-b border-zinc-800/50 gap-4">
                <h3 className="text-lg font-bold text-zinc-100 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span>📂 Sổ Điệp Chỉ Số Đã Lưu</span>
                    <span className="text-xs font-normal text-zinc-500">(Dữ liệu đồng bộ trực tiếp cùng Discord Bot)</span>
                </h3>

                {/* 🟢 THANH TÌM KIẾM HỒ SƠ */}
                <div className="relative w-full md:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">🔍</span>
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Lọc Tên hoặc UID..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {!profiles ? (
                    <div className="col-span-full text-center py-10 text-zinc-500">🔮 Đang lột mật bùa Thiên Thư...</div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                        {filterText ? "🍃 Không tìm thấy đại hiệp nào khớp với từ khóa tìm kiếm." : "🍃 Chưa có dữ liệu căn cốt nào trên mây. Hãy soi ai đó trên Discord hoặc Web!"}
                    </div>
                ) : (
                    filteredProfiles.map(([uid, data]: any) => {
                        // 🌟 1. KHỞI TẠO VÀ ÉP KIỂU RAW DATA CHUẨN XỊN
                        let raw: any = {};
                        try {
                            raw = typeof data.full_raw_data === 'string' ? JSON.parse(data.full_raw_data) : data.full_raw_data;
                        } catch (e) {
                            console.error(e);
                        }

                        // 🌟 2. BÓC TÁCH CƠ SỞ VÀ BANG HỘI TỪ NETEASE API (ĐÃ ĐỔI TÊN ĐỂ TRÁNH ĐỤNG BIẾN CŨ)
                        const baseInfo = safeParse((raw as any)?.base);
                        const clubInfoTop = safeParse((raw as any)?.club);

                        const capDo = baseInfo?.level || data.level || 0;
                        const lucChien = baseInfo?.max_xiuwei_kungfu || data.luc_chien || 0;

                        // 🌟 3. ĐẢ THÔNG BIẾN TÊN THẬT VÀ BANG THẬT
                        const tenNhanVat = data.playerName || baseInfo?.role_name || baseInfo?.name || data.name || 'Mật Danh';

                        const schoolId = baseInfo?.school || 100;
                        const monPhai = wwmData?.SECT_MAP?.[schoolId]?.[lang] || wwmData?.SECT_MAP?.[String(schoolId)]?.[lang] || wwmData?.SECT_MAP?.[schoolId]?.vi || wwmData?.SECT_MAP?.[String(schoolId)]?.vi || `Ẩn Thế Phái (${schoolId})`;

                        // Logic tính toán chức vụ và bang hội được đả thông toàn cục:
                        const clubInfo = safeParse(raw.club || baseInfo?.club || {});

                        // 🐉 CHUỖI ƯU TIÊN THẦN THÁNH: Quét sạch mọi ngóc ngách lưu tên Bang
                        let bangHoi = clubInfoTop?.club_name ||
                            clubInfo?.club_name ||
                            data.bangHoi ||
                            data.club_name ||
                            baseInfo?.club_name ||
                            "Không môn không phái";

                        let chucVu = "Tự do";

                        if (clubInfo.club_id || baseInfo?.club_name || clubInfoTop?.club_name || data.bangHoi) {
                            if (bangHoi === "Không môn không phái") bangHoi = "Có Bang Hội";

                            if (clubInfo.post && clubInfo.post.length > 0) {
                                const postMap: Record<number, string> = { 1: "Bang Chủ 👑", 2: "Bang Phó 🎖️", 5: "Trưởng Lão 摸", 7: "Bông Hồng 🌸" };
                                const gwPostMap: Record<number, string> = { 10000: "Chỉ Huy 🚩", 10002: "Tiên Phong ⚔️", 10004: "Nửa Bước 🛡️" };
                                let mainRole = "Thành Viên", gwRoles = [];
                                for (const id of clubInfo.post) {
                                    if (id < 10000 && postMap[id]) mainRole = postMap[id];
                                    else if (id >= 10000 && gwPostMap[id]) gwRoles.push(gwPostMap[id]);
                                }
                                chucVu = gwRoles.length > 0 ? `${mainRole} (${gwRoles.join(', ')})` : mainRole;
                            } else if (clubInfo.member_info?.post_name || clubInfo.post_name) {
                                chucVu = clubInfo.member_info?.post_name || clubInfo.post_name;
                            } else { chucVu = "Thành Viên"; }
                        }

                        const gender = (baseInfo?.body_type ?? baseInfo?.gender) === 1 ? "Nam 🚹" : "Nữ 🚺";
                        const thietBi = baseInfo?.device_name ? baseInfo.device_name.toUpperCase() : "Ẩn Dấu";
                        const trangThai = baseInfo?.is_online === 1 ? `🟢 Đang chơi (${thietBi})` : `🔴 Ngoại tuyến (${thietBi})`;

                        const kyLuat = safeParse(raw.school)?.rule?.jl ?? 100;
                        const kyLuatText = kyLuat < 100 ? "Vi phạm môn quy" : "Nghiêm chỉnh";

                        const thoiTrang = safeParse(raw.fashion)?.score || safeParse(raw.fashion)?.fashion_score || 0;
                        const onlineTime = baseInfo?.online_time ? (baseInfo.online_time / 3600).toFixed(1) : "0";
                        const daysInJianghu = baseInfo?.create_time ? Math.floor((Math.floor(Date.now() / 1000) - baseInfo.create_time) / 86400) : 0;
                        const serverHost = baseInfo?.hostnum || baseInfo?.server_hostnum || "Bí ẩn";

                        const attrData = safeParse(raw.attr);
                        const str = attrData.STR || 0; const con = attrData.CON || 0; const agi = attrData.AGI || 0; const bas = attrData.BAS || 0; const cri = attrData.CRI || 0;

                        const exploreData = safeParse(raw.common_score_data);
                        const th = exploreData.scores?.["58"] || 0; const kp = exploreData.scores?.["59"] || 0; const ht = exploreData.scores?.["60"] || 0;
                        const tuViKP = attrData.XIUWEI_EXPLORE || 0; const tuViNghe = (attrData.XIUWEI_TRADE3 || 0) + (attrData.XIUWEI_TRADE4 || 0);

                        const kongfu = safeParse(raw.kongfu);

                        const lunjian = safeParse(raw.lunjian);
                        const rankGrade = lunjian.grade || 0;
                        const rankName = wwmData?.LUNJIAN_RANK_MAP?.[rankGrade]?.[lang] || wwmData?.LUNJIAN_RANK_MAP?.[String(rankGrade)]?.[lang] || wwmData?.LUNJIAN_RANK_MAP?.[rankGrade]?.vi || wwmData?.LUNJIAN_RANK_MAP?.[String(rankGrade)]?.vi || `Bậc Thầy (${rankGrade})`;

                        const gameplayTrail = safeParse(raw.gameplay_trail);
                        const pvpData = gameplayTrail.played?.find((p: any) => p.gp_no === 6) || {};
                        const winRate = pvpData.win_rate ? (pvpData.win_rate * 100).toFixed(1) + "%" : "0%";
                        const matches = pvpData.total_num || 0;
                        const streak = lunjian.max_winning_streak || pvpData.continue_win || 0;

                        // 🟢 TÌM KIẾM ĐIỂM VÔ NGÃ (WUWO SCORE) TRÊN WEB
                        const wuwoScore = lunjian.max_wuwo_score || 0;

                        let cpChiTiet = safeParse(raw.combat_plan_chi_tiet);
                        if (Object.keys(cpChiTiet).length === 0 && raw.combat_plan) cpChiTiet = raw;

                        const cPlan = safeParse(cpChiTiet.combat_plan) || {};
                        const xinfa = safeParse(cPlan.xinfa) || {};
                        const tpArr = xinfa.passive_slots || [];
                        const qsArr = Object.entries(safeParse(cPlan.battle_qs || {}));

                        return (
                            <div key={uid} className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all duration-300 shadow-xl flex flex-col h-full">
                                <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-5 border-b border-zinc-800 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                        <div>
                                            {/* DÒNG 1: TÊN VÀ UID */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h4 className="font-extrabold text-2xl text-cyan-400 tracking-wide">{tenNhanVat}</h4>
                                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-mono rounded border border-zinc-700">Máy chủ: {serverHost} | UID: {uid}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800 font-medium text-zinc-400">{trangThai}</span>
                                            </div>

                                            {/* DÒNG 2: CẤP, PHÁI, GIỚI TÍNH (Đã chặt bỏ phần Bang hội thừa ở cuối dòng này) */}
                                            <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-3 mt-2">
                                                <span>Cấp: <b className="text-zinc-200 font-mono">{capDo}</b></span>
                                                <span>•</span>
                                                <span>Phái: <b className="text-amber-400">{monPhai}</b></span>
                                                <span>•</span>
                                                <span>Giới: <b className="text-zinc-200">{gender}</b></span>
                                            </div>

                                            {/* DÒNG 3: KHUNG BANG HỘI HOÀNG KIM (Nằm riêng biệt, bôi sáng Xanh Dương) */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-900 rounded-md text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                    Môn Phái
                                                </span>
                                                <span className="text-sm font-black text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                                                    {warmBangHoi(bangHoi)}
                                                </span>
                                                {chucVu !== "Thành Viên" && chucVu !== "Tự do" && (
                                                    <span className="px-2 py-0.5 bg-sky-900/30 border border-sky-800/50 rounded-md text-[10px] text-sky-300 font-medium">
                                                        {chucVu}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* KHỐI HIỂN THỊ LỰC CHIẾN BÊN GÓC PHẢI */}
                                        <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl text-center md:text-right shrink-0">
                                            <div className="text-[10px] text-rose-400 uppercase tracking-wider font-bold">Lực Chiến Võ Học</div>
                                            <div className="text-xl font-black text-rose-500 font-mono tracking-tight mt-0.5">⚔️ {lucChien.toLocaleString('vi-VN')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 bg-zinc-950/20 space-y-5">
                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold tracking-wider">🩸 Ngũ Hành Căn Cốt</div>
                                            <div className="text-[10px] text-rose-500/80 font-bold">Kỷ luật: {kyLuat}/100 ({kyLuatText})</div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            {[[str, "Kình (STR)"], [con, "Thể (CON)"], [agi, "Ngự (AGI)"], [bas, "Thế (BAS)"], [cri, "Mẫn (CRI)"]].map(([val, label]: any, i) => (
                                                <div key={i} className="bg-zinc-900/60 border border-zinc-800/60 p-2 rounded-xl text-center">
                                                    <div className="text-[11px] text-zinc-400">{label.split(' ')[0]}</div>
                                                    <div className="text-sm font-bold text-zinc-200 mt-0.5 font-mono">{val}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-800/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">⚔️ Song Binh Khí</div>
                                            <div className="text-xs text-zinc-300 space-y-1">
                                                <div className="flex items-center gap-1">Chính: <span className="text-amber-200 font-medium">{renderTranslable(kongfu.kongfu_main, ['WEAPON_MAP'], 'Bí Pháp')}</span></div>
                                                <div className="flex items-center gap-1">Phụ: <span className="text-amber-300/80 font-medium">{renderTranslable(kongfu.kongfu_sub, ['WEAPON_MAP'], 'Đoản Binh')}</span></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">🏆 1v1 Luận Kiếm Đài</div>
                                            <div className="text-xs text-zinc-300">
                                                <div>Cảnh giới: <span className="text-indigo-400 font-bold">{rankName}</span></div>
                                                <div className="text-zinc-400 mt-0.5 font-mono text-[11px]">
                                                    Trận: <span className="text-zinc-200 font-bold">{matches}</span> | Thắng: <span className="text-emerald-400 font-bold">{winRate}</span> {streak > 1 && <span className="text-rose-400 font-bold bg-rose-950/40 px-1 rounded ml-1">🔥 Chuỗi {streak}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {/* 🟢 KHẢM HIỂN THỊ VÔ NGÃ VÀO ĐÂY */}
                                        <div className="mt-1.5 pt-1.5 border-t border-zinc-800/50 flex items-center justify-between">
                                            <span>Điểm Vô Ngã (Wuwo):</span>
                                            <span className="text-cyan-400 font-bold">
                                                {wuwoScore > 0 ? wuwoScore.toLocaleString('vi-VN') : (lang === 'vi' ? "Chưa tham ngộ" : "Not comprehended")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-800/60 pt-4 space-y-3">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">🔮 Tuyệt Kỹ Kỳ Thuật Thiết Lập</div>
                                            {qsArr.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {qsArr.map(([slot, id]: any, i: number) => {
                                                        return <span key={i} className="px-2 py-1 bg-cyan-950/40 text-cyan-300 border border-cyan-800/30 rounded-lg text-[11px] font-medium flex items-center gap-1">✨ [{slot}] {renderTranslable(id, ['KY_THUAT_MAP'], 'Kỳ Thuật')}</span>
                                                    })}
                                                </div>
                                            ) : <div className="text-xs text-zinc-600 italic pl-1">Chưa thiết lập bí kíp chủ động</div>}
                                        </div>

                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">📜 Trận Pháp Tâm Pháp Đang Khảm</div>
                                            {tpArr.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {tpArr.map((id: any, i: number) => {
                                                        return <span key={i} className="px-2 py-1 bg-indigo-950/50 text-indigo-300 border border-indigo-800/30 rounded-lg text-[11px] font-medium flex items-center gap-1">🧠 {renderTranslable(id, ['TAM_PHAP_MAP'], 'Tâm Pháp')}</span>
                                                    })}
                                                </div>
                                            ) : <div className="text-xs text-zinc-600 italic pl-1">Chưa trang bị tâm pháp bị động</div>}
                                        </div>
                                    </div>

                                    <div className="border-t border-zinc-800/60 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">🗺️ Khám Phá & Tu Vi Phụ</div>
                                            <div className="text-xs text-zinc-400 space-y-0.5">
                                                <div>TH: <span className="text-zinc-300 font-mono">{th.toLocaleString('vi-VN')}</span> | KP: <span className="text-zinc-300 font-mono">{kp.toLocaleString('vi-VN')}</span> | HT: <span className="text-zinc-300 font-mono">{ht.toLocaleString('vi-VN')}</span></div>
                                                <div>KP: <span className="text-amber-300 font-mono">{tuViKP.toLocaleString('vi-VN')}</span> | Nghề: <span className="text-amber-300 font-mono">{tuViNghe.toLocaleString('vi-VN')}</span></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">🌞 Hành Tẩu Giang Hồ</div>
                                            <div className="text-xs text-zinc-400 space-y-0.5">
                                                <div>Thời trang: <span className="text-rose-300 font-mono font-bold">{thoiTrang.toLocaleString('vi-VN')}</span></div>
                                                <div>Hành tẩu: <span className="text-emerald-300 font-mono">{daysInJianghu} ngày</span> | <span className="text-sky-300 font-mono">{onlineTime}h</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-zinc-800/60 bg-zinc-950 flex gap-2 relative z-20">
                                    <button onClick={() => toggleEquip(uid)} className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all border cursor-pointer ${expandedEquip[uid] ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' : 'bg-zinc-900 text-cyan-400 border-zinc-800 hover:border-cyan-500/30'}`}>
                                        {expandedEquip[uid] ? '🔼 Thu Gọn Hòm Đồ' : '👕 Khai Triển Kho Trang Bị Dòng Ẩn'}
                                    </button>
                                    <details className="flex-1 group relative">
                                        <summary className="text-xs text-zinc-500 hover:text-amber-400 cursor-pointer list-none text-center font-bold py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors select-none">💻 Payload Gốc JSON</summary>
                                        <div className="absolute bottom-full mb-2 right-0 w-80 md:w-96 max-h-64 overflow-y-auto text-[10px] text-zinc-500 font-mono no-scrollbar bg-black/95 p-4 border border-zinc-700 rounded-xl shadow-2xl z-50">
                                            <pre>{JSON.stringify(data, null, 2)}</pre>
                                        </div>
                                    </details>
                                </div>

                                {expandedEquip[uid] && (
                                    <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 animate-in slide-in-from-top-2 duration-300">
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-bold flex items-center gap-2 border-b border-zinc-900 pb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            Bảng Thống Kê Thuộc Tính Ẩn Khảm Trên Giáp Phục
                                        </div>
                                        {renderEquipment(raw)}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 🟢 POPUP ĐIỀN TỪ ĐIỂN SONG NGỮ THÔNG MINH */}
            {editingDict && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-amber-400 mb-2">✍️ Đóng Góp Bản Dịch</h3>
                        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                            Đại hiệp đang thêm tên cho Mã ID <b className="text-cyan-400 font-mono text-sm bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{editingDict.id}</b> vào nhóm <b className="text-zinc-200 font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">{editingDict.mapName}</b>.
                        </p>
                        <form onSubmit={handleInlineDictSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                                    Tên Tiếng Việt {lang === 'vi' ? '(*)' : '(Tùy chọn)'}
                                </label>
                                <input
                                    autoFocus={lang === 'vi'}
                                    type="text"
                                    value={editingDict.valVi}
                                    onChange={(e) => setEditingDict({ ...editingDict, valVi: e.target.value })}
                                    placeholder="Ví dụ: Phá Trận Thập Phương"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                    required={lang === 'vi'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                                    Tên Tiếng Anh {lang === 'en' ? '(*)' : '(Tùy chọn)'}
                                </label>
                                <input
                                    autoFocus={lang === 'en'}
                                    type="text"
                                    value={editingDict.valEn}
                                    onChange={(e) => setEditingDict({ ...editingDict, valEn: e.target.value })}
                                    placeholder="Ví dụ: Phalanxbane Blade"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                                    required={lang === 'en'}
                                />
                                <p className="text-[10px] text-zinc-500 mt-1 italic">
                                    Nếu bỏ trống ngôn ngữ còn lại, hệ thống sẽ tự động dùng bản {lang === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'} đắp chéo sang để tránh bị khuyết!
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingDict(null)} className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold rounded-xl transition-colors cursor-pointer">Hủy Bỏ</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-sm font-bold rounded-xl transition-colors cursor-pointer">Lưu Trữ Khí Khẩu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}