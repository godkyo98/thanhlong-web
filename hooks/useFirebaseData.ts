// hooks/useFirebaseData.ts
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore"; 
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
    
    // 🟢 THÊM BIẾN NÀY: Hứng dữ liệu Sát Tướng LIVE từ Bot
    const [satTuongData, setSatTuongData] = useState<any>(null);

    useEffect(() => {
        const unsub1 = onSnapshot(doc(db, 'thanhlong_config', 'danh_luc_data'), (snap) => setDanhLuc(snap.exists() ? snap.data() : {}));
        const unsub2 = onSnapshot(doc(db, 'thanhlong_config', 'talent_data'), (snap) => setTalent(snap.exists() ? snap.data() : {}));
        const unsub3 = onSnapshot(doc(db, 'thanhlong_config', 'wwm_data'), (snap) => setWwmData(snap.exists() ? snap.data() : { VO_HOC_LIST: [], LUNJIAN_RANK_MAP: {} }));
        const unsub4 = onSnapshot(doc(db, 'thanhlong_config', 'player_profiles'), (snap) => setPlayerProfiles(snap.exists() ? snap.data() : {}));
        const unsub5 = onSnapshot(doc(db, 'thanhlong_config', 'chat_rank_data'), (snap) => setTuViData(snap.exists() ? snap.data() : {}));
        const unsub6 = onSnapshot(doc(db, 'thanhlong_config', 'giftcode_data'), (snap) => setGiftcodeData(snap.exists() ? snap.data() : { codes: {} }));
        const unsub7 = onSnapshot(doc(db, 'thanhlong_config', 'giftcode_claims'), (snap) => setGiftcodeClaims(snap.exists() ? snap.data() : {}));
        const unsub8 = onSnapshot(doc(db, 'thanhlong_config', 'points_data'), (snap) => setPointData(snap.exists() ? snap.data() : {}));
        
        // 🟢 ĐƯỜNG TRUYỀN NỐI THẲNG VÀO SÁT TƯỚNG DATA
        const unsub9 = onSnapshot(doc(db, 'thanhlong_config', 'sat_tuong_data'), (snap) => {
            setSatTuongData(snap.exists() ? snap.data() : {});
        });

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); };
    }, []);

    // 🟢 NHỚ XUẤT BIẾN SATTUONGDATA RA NGOÀI ĐỂ PAGE.TS ĐỌC ĐƯỢC
    return { danhLuc, talent, wwmData, playerProfiles, tuViData, giftcodeData, giftcodeClaims, pointData, satTuongData };
}