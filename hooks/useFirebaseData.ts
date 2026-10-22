/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useFirebaseData.ts
import { useState, useEffect } from "react";
import { doc, collection, onSnapshot } from "firebase/firestore"; 
import { db } from "@/lib/firebase";

export default function useFirebaseData() {
    const [danhLuc, setDanhLuc] = useState<any>(null);
    const [talent, setTalent] = useState<any>(null);
    const [wwmData, setWwmData] = useState<any>(null);
    const [playerProfiles, setPlayerProfiles] = useState<any>(null);
    const [tuViData, setTuViData] = useState<any>(null);
    const [giftcodeData, setGiftcodeData] = useState<any>(null);
    const [giftcodeClaims, setGiftcodeClaims] = useState<any>(null);
    const [pointData, setPointData] = useState<any>(null);
    const [satTuongData, setSatTuongData] = useState<any>(null);
    const [satTuongMeta, setSatTuongMeta] = useState<any>(null);
    const [bossRotation, setBossRotation] = useState<any>(null);
    
    // 🟢 HỨNG DỮ LIỆU TỔNG ĐỒ BUILD (wwm_builds -> Võ học -> ID)
    const [wwmBuilds, setWwmBuilds] = useState<Record<string, any>>({});

    useEffect(() => {
        const unsub1 = onSnapshot(doc(db, 'thanhlong_config', 'danh_luc_data'), (snap) => setDanhLuc(snap.exists() ? snap.data() : {}));
        const unsub2 = onSnapshot(doc(db, 'thanhlong_config', 'talent_data'), (snap) => setTalent(snap.exists() ? snap.data() : {}));
        const unsub3 = onSnapshot(doc(db, 'thanhlong_config', 'wwm_data'), (snap) => setWwmData(snap.exists() ? snap.data() : { VO_HOC_LIST: [], LUNJIAN_RANK_MAP: {} }));
        const unsub4 = onSnapshot(doc(db, 'thanhlong_config', 'player_profiles'), (snap) => setPlayerProfiles(snap.exists() ? snap.data() : {}));
        const unsub5 = onSnapshot(doc(db, 'thanhlong_config', 'chat_rank_data'), (snap) => setTuViData(snap.exists() ? snap.data() : {}));
        const unsub6 = onSnapshot(doc(db, 'thanhlong_config', 'giftcode_data'), (snap) => setGiftcodeData(snap.exists() ? snap.data() : { codes: {} }));
        const unsub7 = onSnapshot(doc(db, 'thanhlong_config', 'giftcode_claims'), (snap) => setGiftcodeClaims(snap.exists() ? snap.data() : {}));
        const unsub8 = onSnapshot(doc(db, 'thanhlong_config', 'points_data'), (snap) => setPointData(snap.exists() ? snap.data() : {}));
        
        // 🟢 SÁT TƯỚNG DATA & METADATA
        const unsub9 = onSnapshot(doc(db, 'thanhlong_config', 'sat_tuong_data'), (snap) => {
            if (snap.exists()) setSatTuongData((prev: any) => ({ ...(prev || {}), ...snap.data() }));
        });
        const unsub9b = onSnapshot(doc(db, 'thanhlong_config', 'sattuong_data'), (snap) => {
            if (snap.exists()) setSatTuongData((prev: any) => ({ ...(prev || {}), ...snap.data() }));
        });
        const unsub9c = onSnapshot(doc(db, 'thanhlong_config', 'sattuong_metadata'), (snap) => {
            setSatTuongMeta(snap.exists() ? snap.data() : null);
        });

        // 🟢 BỐC THĂM BOSS SÁT TƯỚNG (boss_rotation)
        const unsub9d = onSnapshot(doc(db, 'thanhlong_config', 'boss_rotation'), (snap) => {
            setBossRotation(snap.exists() ? snap.data() : null);
        });
        
        // 🟢 ĐƯỜNG TRUYỀN TỔNG ĐỒ BUILD (wwm_builds)
        const unsub11 = onSnapshot(
            collection(db, 'wwm_builds'),
            (querySnap) => {
                const buildsMap: Record<string, any> = {};
                querySnap.forEach((docSnap) => {
                    buildsMap[docSnap.id] = docSnap.data();
                });
                setWwmBuilds(buildsMap);
            },
            (err) => {
                console.warn("⚠️ Chưa mở quyền đọc collection wwm_builds trên Firestore:", err);
            }
        );

        return () => { 
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); 
            unsub6(); unsub7(); unsub8(); unsub9(); unsub9b(); unsub9c(); unsub9d(); unsub11(); 
        };
    }, []);

    return { 
        danhLuc, talent, wwmData, playerProfiles, tuViData, 
        giftcodeData, giftcodeClaims, pointData, satTuongData, satTuongMeta, bossRotation, wwmBuilds 
    };
}
