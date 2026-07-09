// components/tabs/AdminTab.tsx
import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function AdminTab({ wwmData }: { wwmData: any }) {
    const [dictTarget, setDictTarget] = useState("WEAPON_MAP");
    const [dictKey, setDictKey] = useState("");
    const [dictVi, setDictVi] = useState("");
    const [dictEn, setDictEn] = useState("");
    const [dictSearch, setDictSearch] = useState("");
    
    const [newVoHoc, setNewVoHoc] = useState("");
    const [loadingAdmin, setLoadingAdmin] = useState(false);

    // 🟢 CẬP NHẬT TỪ ĐIỂN
    const handleUpdateDictionary = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dictTarget || !dictKey.trim() || !dictVi.trim() || !wwmData) return;
        setLoadingAdmin(true);
        try {
            const currentMap = wwmData[dictTarget] || {};
            const updatedMap = {
                ...currentMap,
                [dictKey.trim()]: { vi: dictVi.trim(), en: dictEn.trim() || dictVi.trim() }
            };
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                ...wwmData,
                [dictTarget]: updatedMap
            }, { merge: true });
            setDictKey(""); setDictVi(""); setDictEn("");
            alert(`✅ Khảm thành công cấu hình vào từ điển [${dictTarget}]!`);
        } catch (err) { alert("❌ Thất bại khi khảm dữ liệu lên Đám Mây."); }
        setLoadingAdmin(false);
    };

    // 🟢 THÊM VÕ HỌC
    const handleAddVoHoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVoHoc.trim() || !wwmData) return;
        setLoadingAdmin(true);
        try {
            const updatedVoHocList = [...(wwmData.VO_HOC_LIST || []), newVoHoc.trim()];
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), { ...wwmData, VO_HOC_LIST: updatedVoHocList }, { merge: true });
            setNewVoHoc(""); alert("✅ Khảm Võ Học mới thành công!");
        } catch (err) { alert("❌ Lỗi đẩy dữ liệu!"); }
        setLoadingAdmin(false);
    };

    // Lọc danh sách xem trước
    const getDictEntries = () => {
        if (!wwmData || !wwmData[dictTarget]) return [];
        return Object.entries(wwmData[dictTarget]);
    };
    
    const currentDictEntries = getDictEntries().filter(([k, v]: any) => 
        k.toLowerCase().includes(dictSearch.toLowerCase()) || 
        (v?.vi && v.vi.toLowerCase().includes(dictSearch.toLowerCase())) ||
        (v?.en && v.en.toLowerCase().includes(dictSearch.toLowerCase()))
    );

    return (
        <section className="space-y-8 animate-in fade-in duration-300">
            <div>
                <h2 className="text-2xl font-bold text-red-400">⚙️ Thiết Các Quản Trị Hệ Thống Dịch Thuật WWM</h2>
                <p className="text-sm text-zinc-400 mt-1">Bang Chủ có quyền nhập trực tiếp các chỉ số, ID để cập nhật cho cả Web và Bot Discord theo thời gian thực mà không cần viết lại file js.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* TRẬN PHÁP 1: TỪ ĐIỂN BIẾN SỐ TOÀN NĂNG */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">🔮 Khảm/Sửa Biến Số Từ Điển Hệ Thống WWM</h3>
                        <form onSubmit={handleUpdateDictionary} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Chọn nhóm từ điển cần sửa</label>
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
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Mã ID (Key)</label>
                                    <input type="text" value={dictKey} onChange={(e) => setDictKey(e.target.value)} placeholder="Ví dụ: 1101577 hoặc STR" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tên hiển thị Tiếng Việt</label>
                                    <input type="text" value={dictVi} onChange={(e) => setDictVi(e.target.value)} placeholder="Ví dụ: Độc Cô Cầu Bại" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tên hiển thị Tiếng Anh (Không bắt buộc)</label>
                                <input type="text" value={dictEn} onChange={(e) => setDictEn(e.target.value)} placeholder="Nếu bỏ trống sẽ tự sao chép Tiếng Việt" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors" />
                            </div>

                            <button type="submit" disabled={loadingAdmin} className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-800 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer">
                                {loadingAdmin ? "⏳ Đang đồng bộ hóa Đám Mây..." : "🔮 Xác Nhận Cập Nhật Biến Số Web & Bot"}
                            </button>
                        </form>
                    </div>

                    {/* TRẬN PHÁP 2: KHẢM VÕ HỌC DANH LỤC */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">⚔️ Khảm Danh Mục Võ Học Lọc Sổ</h3>
                        <form onSubmit={handleAddVoHoc} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tên võ học/lộ trình mới</label>
                                <input type="text" value={newVoHoc} onChange={(e) => setNewVoHoc(e.target.value)} placeholder="Ví dụ: Tả Đao Pháp (Dame)" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 transition-colors" required />
                            </div>
                            <button type="submit" disabled={loadingAdmin} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer">
                                {loadingAdmin ? "⏳ Đang khảm dữ liệu..." : "🔮 Thêm Vào Bộ Lọc Danh Lục"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* KHỐI 3: DANH SÁCH XEM TRƯỚC VÀ TRA CỨU NHANH TẠI CHỖ */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col h-[520px]">
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">📂 Kính Chiếu Từ Điển Hiện Tại</h3>
                        <p className="text-xs text-zinc-400 mt-1">Đang soi các biến đã lưu trong nhóm từ điển đang chọn ở bên cạnh.</p>
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
                            <div className="text-zinc-500 italic py-10 text-center">Trống rỗng hoặc không khớp từ khóa lọc</div>
                        ) : (
                            currentDictEntries.map(([k, v]: any) => (
                                <div key={k} className="p-2 bg-zinc-950/40 border border-zinc-800/60 rounded-lg flex justify-between items-center gap-4 hover:border-zinc-700 transition-colors">
                                    <div className="font-mono text-cyan-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">{k}</div>
                                    <div className="text-right">
                                        <div className="font-semibold text-zinc-200">{v?.vi || String(v)}</div>
                                        {v?.en && v.en !== v.vi && <div className="text-[10px] text-zinc-500 font-mono">{v.en}</div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}