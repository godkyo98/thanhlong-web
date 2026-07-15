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

    const totalCodes = codeList.length;
    const claimedCount = codeList.filter(([codeKey]) => userClaims[codeKey]).length;
    const unclaimedCount = totalCodes - claimedCount;

    // 🟢 THUẬT TOÁN ĐỌC THỜI GIAN ĐỂ SẮP XẾP (Đọc được cả chuẩn Tây lẫn chuẩn 14/7/2026 của Đại Việt)
    const getTimeForSort = (data: any) => {
        const val = data?.createdAt || data?.time || data?.date;
        if (!val) return 0;
        
        // Dạng 1: Firebase Timestamp
        if (val.seconds) return val.seconds * 1000;
        
        // Dạng 2: Gõ tay ngày tháng Đại Việt (VD: "14/7/2026")
        if (typeof val === 'string' && val.includes('/')) {
            const [d, m, y] = val.split('/');
            return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
        }
        
        // Dạng 3: Định dạng tự động chuẩn
        const parsed = new Date(val).getTime();
        return isNaN(parsed) ? 0 : parsed;
    };

    // 🟢 MA TRẬN LỌC VÀ SẮP XẾP TỐI THƯỢNG
    const filteredAndSortedCodes = [...codeList]
        .filter(([codeKey, data]: any) => {
            const displayCodeString = String(data?.code || codeKey || "");
            return displayCodeString.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort(([codeA, dataA], [codeB, dataB]) => {
            const isClaimedA = userClaims[codeA];
            const isClaimedB = userClaims[codeB];
            
            // Ưu tiên 1: Mã chưa húp đẩy lên đầu, mã húp rồi tống xuống đáy
            if (isClaimedA !== isClaimedB) {
                return isClaimedA ? 1 : -1;
            }
            
            // Ưu tiên 2: Cùng trạng thái (cùng chưa húp hoặc cùng húp rồi) -> Đẩy mã mới nhất lên trên
            const timeA = getTimeForSort(dataA);
            const timeB = getTimeForSort(dataB);
            return timeB - timeA; 
        });

    // 🚀 ĐÃ SỬA ĐƯỜNG DẪN: Khai thông kinh mạch, ghi đúng vào lòng đất thanhlong_config
    const handleCopy = async (rawCodeKey: string, actualCodeString: string) => {
        const safeCodeKey = String(rawCodeKey || "").trim();
        const safeCodeString = String(actualCodeString || "").trim();

        if (!safeCodeKey || safeCodeKey === "undefined") {
            console.error("⛔ [Hệ Thống] Mã bùa chú bị rỗng!");
            return;
        }

        // Thực hiện copy vào bộ nhớ tạm
        navigator.clipboard.writeText(safeCodeString);
        setCopiedId(safeCodeString);
        setTimeout(() => setCopiedId(null), 2000);

        // Khắc ghi vào sổ sinh tử nằm trong thanhlong_config
        if (currentUserId !== "Lãng Khách" && currentUserId !== "Ẩn Danh") {
            try {
                // 🎯 ĐÚNG ĐƯỜNG DẪN HOÀNG KIM CỦA BANG CHỦ
                const claimsRef = doc(db, 'thanhlong_config', 'giftcode_claims');
                
                const payloadData: Record<string, any> = {};
                payloadData[currentUserId] = {};
                payloadData[currentUserId][safeCodeKey] = true;

                await setDoc(claimsRef, payloadData, { merge: true });
            } catch (err) {
                console.error("⛔ [Firebase Error] Thất bại khi khắc ghi vào thanhlong_config:", err);
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

    // 🟢 THUẬT TOÁN ĐỌC NGÀY THÁNG CHUẨN ĐẠI VIỆT ĐỂ HIỂN THỊ
    const getDisplayDate = (dateStr: string) => {
        if (!dateStr) return "Vô thời hạn";
        if (dateStr.includes('/')) return dateStr;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN');
    };

    return (
        <section className="space-y-6 animate-fade-in pb-12">
            
            {/* CLAN STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tổng Số Bùa Chú</span>
                    <span className="text-3xl font-black font-mono mt-2 text-zinc-200">{totalCodes} <span className="text-xs font-normal text-zinc-500">mã</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">📜</div>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Đã Giải Ấn (Bạn Đã Nhận)</span>
                    <span className="text-3xl font-black font-mono mt-2 text-emerald-500">{claimedCount} <span className="text-xs font-normal text-zinc-500">/{totalCodes}</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">✅</div>
                </div>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <span className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider">Chưa Chạm Tay</span>
                    <span className="text-3xl font-black font-mono mt-2 text-amber-500 animate-pulse">{unclaimedCount} <span className="text-xs font-normal text-zinc-500">mã</span></span>
                    <div className="absolute right-4 bottom-4 text-2xl opacity-20">🔥</div>
                </div>
            </div>

            {/* INPUT CONTROLS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className={`${isMaster ? 'lg:col-span-1' : 'lg:col-span-3'} flex flex-col justify-end`}>
                    <div className="relative w-full">
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm mã lệnh nhanh..."
                            className="w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 placeholder:text-zinc-600 font-medium transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                    </div>
                </div>

                {isMaster && (
                    <div className="lg:col-span-2">
                        <div className="bg-zinc-900/60 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
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
                                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(245,158,11,0.2)]"
                            >
                                {loading ? "⏳ Đang khắc..." : "⚡ PHÁT MÃ PHÚC LỢI"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* GIFTCODE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
                {filteredAndSortedCodes.map(([codeKey, data]: any) => {
                    const safeCodeKey = String(codeKey || "");
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
                            ${isClaimed 
                                ? 'bg-zinc-950/30 border-zinc-900/60 opacity-50 grayscale-[40%]' 
                                : 'bg-zinc-900/50 backdrop-blur-md border-zinc-800 hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(245,158,11,0.15)]'
                            }`}
                        >
                            {!isClaimed && (
                                <div className="absolute -inset-x-20 -top-20 bottom-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            )}

                            <div className="p-5 flex flex-col h-full relative z-10 justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-4 gap-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-[11px] font-mono font-bold text-zinc-300 shadow-inner group-hover:border-zinc-700 transition-colors shrink-0">
                                            <span className="text-amber-500 animate-pulse">⏰</span>
                                            {/* Sửa lại hiển thị ngày tháng dùng hàm Đại Việt cho đẹp */}
                                            <span>{data?.date ? getDisplayDate(data.date) : formatTime(data?.createdAt || data?.time)}</span>
                                        </div>
                                        
                                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-xl border shrink-0 ${isClaimed ? 'bg-zinc-900 text-zinc-600 border-zinc-800' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                            {isClaimed ? 'Đã Húp' : 'Sẵn Sàng'}
                                        </span>
                                    </div>

                                    <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 mb-4 font-mono text-center group-hover:border-amber-500/20 transition-colors">
                                        <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mb-1 text-left">Mã Lệnh Quà Tặng:</div>
                                        <h3 className={`text-xl font-black tracking-widest break-all ${isClaimed ? 'text-zinc-600 line-through' : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600'}`}>
                                            {displayCodeString}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 mb-5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-500">Giới hạn phát:</span>
                                            <span className="text-zinc-300 font-mono">{data?.limit || 'Vô biên'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-zinc-500">Sơn môn đã cào:</span>
                                            <span className="text-amber-500 font-bold font-mono">{realClaimsCount} / {data?.limit || '∞'}</span>
                                        </div>
                                        
                                        {data?.limit && (
                                            <div className="w-full bg-zinc-950 rounded-full h-1 mt-1 overflow-hidden border border-zinc-900">
                                                <div 
                                                    className={`h-1 rounded-full ${isClaimed ? 'bg-zinc-700' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                                                    style={{ width: `${Math.min(100, (realClaimsCount / data.limit) * 100)}%` }}
                                                ></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleCopy(safeCodeKey, displayCodeString)}
                                    className={`w-full py-2.5 rounded-xl text-xs uppercase tracking-wider font-black transition-all flex items-center justify-center gap-2 
                                    ${isClaimed 
                                        ? 'bg-zinc-900/40 text-zinc-600 cursor-not-allowed border border-zinc-900' 
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                    }`}
                                >
                                    {copiedId === displayCodeString ? (
                                        <><span className="text-sm">✅</span> Đã thu vào bộ nhớ!</>
                                    ) : (
                                        <><span className="text-sm">📋</span> {isClaimed ? 'Sao Chép Lại' : 'Copy Mã Quà Tặng'}</>
                                    )}
                                </button>
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