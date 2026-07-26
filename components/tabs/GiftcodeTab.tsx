// components/tabs/GiftcodeTab.tsx
import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    giftcodeData: any;
    giftcodeClaims: any;
    danhLuc: any;
    session: any;
    isMaster: boolean;
}

export default function GiftcodeTab({ giftcodeData, giftcodeClaims, danhLuc, session, isMaster }: Props) {
    const [newCode, setNewCode] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // 🟢 NÚT GẠT ẨN/HIỆN MÃ HẾT HẠN DÀNH CHO HUYNH ĐỆ THÍCH GỌN GÀNG
    const [hideExpired, setHideExpired] = useState(false);

    // 🔮 Xác định ID người dùng hiện tại (Trích xuất siêu chuẩn từ Discord)
    const currentUserId = (() => {
        if (!session?.user) return "Lãng Khách";
        if (session.user.id) return String(session.user.id);
        if (session.user.image?.includes('avatars/')) {
            const idMatch = session.user.image.match(/avatars\/(\d+)\//);
            if (idMatch && idMatch[1]) return idMatch[1];
        }
        if (danhLuc) {
            const match = Object.entries(danhLuc).find(([_, v]: any) => v.ingame === session.user.name);
            if (match) return match[0];
        }
        return session.user.name || "Ẩn Danh";
    })();

    const codeList = giftcodeData?.codes ? Object.entries(giftcodeData.codes) : [];
    const allClaims = giftcodeClaims || {};
    const userClaims = allClaims[currentUserId] || {};

    // 📊 Thống kê số lượng mã
    const totalCodes = codeList.length;
    const expiredCount = codeList.filter(([_, data]: any) => Boolean(data?.isExpired || data?.expired)).length;
    const activeCodes = codeList.filter(([_, data]: any) => !Boolean(data?.isExpired || data?.expired));
    const claimedCount = activeCodes.filter(([codeKey]) => userClaims[codeKey]).length;
    const unclaimedCount = activeCodes.length - claimedCount;

    // 🟢 THUẬT TOÁN ĐỌC THỜI GIAN ĐỂ SẮP XẾP
    const getTimeForSort = (data: any) => {
        const val = data?.createdAt || data?.time || data?.date;
        if (!val) return 0;
        if (val.seconds) return val.seconds * 1000;
        if (typeof val === 'string' && val.includes('/')) {
            const [d, m, y] = val.split('/');
            return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        }
        const parsed = new Date(val).getTime();
        return isNaN(parsed) ? 0 : parsed;
    };

    // 🟢 HÀM ĐÁNH DẤU HẾT HẠN GIFTCODE (Mọi huynh đệ đều có thể bấm báo hết hạn)
    const handleMarkExpired = async (rawCodeKey: string) => {
        const confirmed = window.confirm(`Đại hiệp chắc chắn mã [${rawCodeKey}] đã HẾT HẠN trong game chứ?`);
        if (!confirmed) return;

        try {
            const codeRef = doc(db, 'thanhlong_config', 'giftcodes');
            await setDoc(codeRef, {
                codes: {
                    [rawCodeKey]: {
                        isExpired: true,
                        expiredBy: currentUserId,
                        expiredAt: new Date().toISOString()
                    }
                }
            }, { merge: true });

            alert(`⚠️ Đã chuyển mã [${rawCodeKey}] sang trạng thái HẾT HẠN! Cảm ơn đại hiệp đã báo!`);
        } catch (err) {
            console.error("⛔ Lỗi khi đánh dấu hết hạn:", err);
            alert("❌ Không thể cập nhật trạng thái hết hạn!");
        }
    };

    // 🟢 HÀM KHÔI PHỤC MÃ VỀ LẠI CÒN HẠN (Nếu lỡ bấm nhầm)
    const handleRestoreCode = async (rawCodeKey: string) => {
        try {
            const codeRef = doc(db, 'thanhlong_config', 'giftcodes');
            await setDoc(codeRef, {
                codes: {
                    [rawCodeKey]: {
                        isExpired: false
                    }
                }
            }, { merge: true });

            alert(`✅ Đã khôi phục mã [${rawCodeKey}] về trạng thái CÒN HẠN!`);
        } catch (err) {
            console.error("⛔ Lỗi khôi phục:", err);
        }
    };

    // 🟢 MA TRẬN LỌC VÀ SẮP XẾP TỐI THƯỢNG:
    // 1. Mã CÒN HẠN & CHƯA NHẬN -> Đẩy lên Top 1
    // 2. Mã CÒN HẠN & ĐÃ NHẬN -> Nhảy xuống vị trí tiếp theo
    // 3. Mã HẾT HẠN -> Bị phong ấn và tống cổ xuống ĐÁY BẢNG!
    const filteredAndSortedCodes = [...codeList]
        .filter(([codeKey, data]: any) => {
            const isExpired = Boolean(data?.isExpired || data?.expired);
            if (hideExpired && isExpired) return false;

            const displayCodeString = String(data?.code || codeKey || "");
            return displayCodeString.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort(([codeA, dataA]: any, [codeB, dataB]: any) => {
            const isExpiredA = Boolean(dataA?.isExpired || dataA?.expired);
            const isExpiredB = Boolean(dataB?.isExpired || dataB?.expired);

            // Ưu tiên 1: Mã HẾT HẠN tống thẳng xuống đáy bảng!
            if (isExpiredA !== isExpiredB) {
                return isExpiredA ? 1 : -1;
            }

            // Ưu tiên 2: Mã CHƯA HÚP lên trên, ĐÃ HÚP xuống dưới
            const isClaimedA = userClaims[codeA];
            const isClaimedB = userClaims[codeB];
            if (isClaimedA !== isClaimedB) {
                return isClaimedA ? 1 : -1;
            }

            // Ưu tiên 3: Mã MỚI HƠN lên trước
            const timeA = getTimeForSort(dataA);
            const timeB = getTimeForSort(dataB);
            return timeB - timeA; 
        });

    // 🟢 HÀM PHÁT MÃ PHÚC LỢI MỚI (CỦA BANG CHỦ)
    const handleAddCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCode.trim()) return;
        setLoading(true);

        try {
            const safeCode = newCode.trim().toUpperCase();
            const today = new Date();
            const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

            const codeRef = doc(db, 'thanhlong_config', 'giftcodes');
            
            const payload = {
                codes: {
                    [safeCode]: {
                        code: safeCode,
                        date: dateStr,
                        isExpired: false,
                        createdAt: new Date().toISOString()
                    }
                }
            };

            await setDoc(codeRef, payload, { merge: true });
            setNewCode("");
            alert(`✅ Đã phát mã phúc lợi [${safeCode}] thành công!`);
        } catch (err) {
            console.error("⛔ [Firebase Error] Thất bại khi phát mã:", err);
            alert("❌ Lỗi khi khắc mã quà tặng lên Mây!");
        } finally {
            setLoading(false);
        }
    };

    // 🚀 Ghi nhận trạng thái đã nhận code
    const handleCopy = async (rawCodeKey: string, actualCodeString: string) => {
        const safeCodeKey = String(rawCodeKey || "").trim();
        const safeCodeString = String(actualCodeString || "").trim();

        if (!safeCodeKey || safeCodeKey === "undefined") return;

        navigator.clipboard.writeText(safeCodeString);
        setCopiedId(safeCodeString);
        setTimeout(() => setCopiedId(null), 2000);

        if (currentUserId !== "Lãng Khách" && currentUserId !== "Ẩn Danh") {
            try {
                const claimsRef = doc(db, 'thanhlong_config', 'giftcode_claims');
                const payloadData: Record<string, any> = {};
                payloadData[currentUserId] = {};
                payloadData[currentUserId][safeCodeKey] = true;

                await setDoc(claimsRef, payloadData, { merge: true });
            } catch (err) {
                console.error("⛔ [Firebase Error] Lỗi ghi nhận copy:", err);
            }
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "Vô Định Thời Gian";
        const dateObj = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return dateObj.toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        }).replace(',', ' ·');
    };

    const getDisplayDate = (dateStr: string) => {
        if (!dateStr) return "Vô thời hạn";
        if (dateStr.includes('/')) return dateStr;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
    };

    return (
        <section className="space-y-6 animate-fade-in pb-12">
            
            {/* CLAN STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tổng Số Bùa Chú</span>
                    <span className="text-3xl font-black font-mono mt-2 text-zinc-200">{totalCodes} <span className="text-xs font-normal text-zinc-500">mã</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">📜</div>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider">Chưa Chạm Tay</span>
                    <span className="text-3xl font-black font-mono mt-2 text-amber-500 animate-pulse">{unclaimedCount} <span className="text-xs font-normal text-zinc-500">mã</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">🔥</div>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Đã Giải Ấn (Bạn Đã Nhận)</span>
                    <span className="text-3xl font-black font-mono mt-2 text-emerald-500">{claimedCount} <span className="text-xs font-normal text-zinc-500">/{activeCodes.length}</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">✅</div>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-red-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-red-400/80 uppercase tracking-wider">Đã Hết Hạn</span>
                    <span className="text-3xl font-black font-mono mt-2 text-red-400">{expiredCount} <span className="text-xs font-normal text-zinc-500">mã</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">⚠️</div>
                </div>
            </div>

            {/* INPUT CONTROLS & BỘ LỌC ẨN MÃ HẾT HẠN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className={`${isMaster ? 'lg:col-span-1' : 'lg:col-span-3'} flex flex-col justify-end space-y-2`}>
                    <div className="flex gap-2">
                        <div className="relative w-full">
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm kiếm mã lệnh nhanh..."
                                className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 font-medium transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                        </div>

                        {/* NÚT BẤM CÔNG TẮC ẨN MÃ HẾT HẠN */}
                        <button
                            type="button"
                            onClick={() => setHideExpired(!hideExpired)}
                            className={`px-4 py-3 rounded-2xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                hideExpired 
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                            title="Ẩn hoàn toàn đống mã đã hết hạn cho sạch mắt"
                        >
                            {hideExpired ? '👁️ Đang Ẩn Hết Hạn' : '👁️ Hiện Tất Cả'}
                        </button>
                    </div>
                </div>

                {/* KHU VỰC PHÁT MÃ CỦA BANG CHỦ */}
                {isMaster && (
                    <div className="lg:col-span-2">
                        <form onSubmit={handleAddCode} className="bg-zinc-900/60 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-600 to-amber-400"></div>
                            <div className="flex-1 w-full">
                                <input 
                                    type="text" 
                                    value={newCode} 
                                    onChange={(e) => setNewCode(e.target.value)} 
                                    placeholder="NHẬP GIFTCODE MỚI TẠI ĐÂY..." 
                                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none focus:border-amber-500/50 font-mono font-black uppercase tracking-widest placeholder:text-zinc-700 transition-all" 
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={loading || !newCode.trim()}
                                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)] cursor-pointer"
                            >
                                {loading ? "⏳ Đang khắc..." : "⚡ PHÁT MÃ PHÚC LỢI"}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* GIFTCODE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
                {filteredAndSortedCodes.map(([codeKey, data]: any) => {
                    const safeCodeKey = String(codeKey || "");
                    const isExpired = Boolean(data?.isExpired || data?.expired);
                    const isClaimed = userClaims[safeCodeKey];
                    const displayCodeString = String(data?.code || safeCodeKey);

                    let realClaimsCount = 0;
                    if (allClaims && typeof allClaims === 'object') {
                        Object.values(allClaims).forEach((userClaimBlock: any) => {
                            if (userClaimBlock && userClaimBlock[safeCodeKey]) {
                                realClaimsCount++;
                            }
                        });
                    }

                    return (
                        <div 
                            key={safeCodeKey} 
                            className={`relative group rounded-2xl overflow-hidden transition-all duration-300 border 
                            ${isExpired 
                                ? 'bg-zinc-950/20 border-red-900/30 opacity-40 grayscale-[80%]' 
                                : isClaimed 
                                    ? 'bg-zinc-950/30 border-zinc-900/60 opacity-60' 
                                    : 'bg-zinc-900/50 backdrop-blur-md border-zinc-800 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(245,158,11,0.15)]'
                            }`}
                        >
                            {!isClaimed && !isExpired && (
                                <div className="absolute -inset-x-20 -top-20 bottom-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            )}

                            <div className="p-5 flex flex-col h-full relative z-10 justify-between space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-4 gap-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-[11px] font-mono font-bold text-zinc-300 shadow-inner group-hover:border-zinc-700 transition-colors shrink-0">
                                            <span className="text-amber-500 animate-pulse">⏰</span>
                                            <span>{data?.date ? getDisplayDate(data.date) : formatTime(data?.createdAt || data?.time)}</span>
                                        </div>
                                        
                                        {/* NHÃN TRẠNG THÁI: HẾT HẠN | ĐÃ HÚP | SẴN SÀNG */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isExpired ? (
                                                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-xl border bg-red-500/10 text-red-400 border-red-500/30">
                                                    ⚠️ Hết Hạn
                                                </span>
                                            ) : (
                                                <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-xl border ${isClaimed ? 'bg-zinc-900 text-zinc-600 border-zinc-800' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    {isClaimed ? 'Đã Húp' : 'Sẵn Sàng'}
                                                </span>
                                            )}

                                            {/* NÚT BÁO HẾT HẠN DÀNH CHO ANH EM TEST CODE */}
                                            {!isExpired ? (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleMarkExpired(safeCodeKey)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg text-xs"
                                                    title="Bấm nếu thử trong game báo mã hết hạn"
                                                >
                                                    ⚠️
                                                </button>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRestoreCode(safeCodeKey)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 rounded-lg text-xs"
                                                    title="Khôi phục mã về trạng thái còn hạn"
                                                >
                                                    🔄
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 mb-4 font-mono text-center group-hover:border-amber-500/20 transition-colors">
                                        <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mb-1 text-left">Mã Lệnh Quà Tặng:</div>
                                        <h3 className={`text-xl font-black tracking-widest break-all ${isExpired ? 'text-red-500/60 line-through' : isClaimed ? 'text-zinc-600 line-through' : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600'}`}>
                                            {displayCodeString}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 mb-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-500">Giới hạn phát:</span>
                                            <span className="text-zinc-300 font-mono">{data?.limit || 'Vô biên'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-500">Sơn môn đã cào:</span>
                                            <span className="text-amber-500 font-bold font-mono">{realClaimsCount} / {data?.limit || '∞'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* NÚT COPY HOẶC BÁO NÚT HẾT HẠN */}
                                {isExpired ? (
                                    <div className="w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-black text-red-500/60 bg-red-950/20 border border-red-900/30 flex items-center justify-center gap-2 cursor-not-allowed">
                                        🚫 Mã Đã Hết Hạn
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleCopy(safeCodeKey, displayCodeString)}
                                        className={`w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-black transition-all flex items-center justify-center gap-2 cursor-pointer
                                        ${isClaimed 
                                            ? 'bg-zinc-900/40 text-zinc-600 hover:text-zinc-300 border border-zinc-900' 
                                            : 'bg-zinc-800 text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                        }`}
                                    >
                                        {copiedId === displayCodeString ? (
                                            <><span className="text-sm">✅</span> Đã thu vào bộ nhớ!</>
                                        ) : (
                                            <><span className="text-sm">📋</span> {isClaimed ? 'Sao Chép Lại' : 'Copy Mã Quà Tặng'}</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredAndSortedCodes.length === 0 && (
                <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm text-zinc-500 mt-2">Không tìm thấy mã bùa chú nào phù hợp!</p>
                </div>
            )}
        </section>
    );
}