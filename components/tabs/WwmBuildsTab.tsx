// components/tabs/WwmBuildsTab.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Props {
    wwmBuilds: Record<string, any>;
    wwmData: any;
    danhLuc: any;
    playerProfiles: any;
    session: any;
    lang: 'vi' | 'en';
    isMaster: boolean;
}

export type SlotKey = 'umbrella' | 'fan' | 'disc' | 'pendant' | 'helm' | 'chest' | 'greaves' | 'bracers';

// 🗡️ DANH MỤC LOẠI VŨ KHÍ ĐA HỆ PHÁI
export interface WeaponTypeOption {
    key: string;
    labelVi: string;
    labelEn: string;
    icon: string;
}

const DEFAULT_WEAPON_TYPES: WeaponTypeOption[] = [
    { key: 'UMBRELLA', labelVi: 'Dù (Tản)', labelEn: 'Umbrella', icon: '☂️' },
    { key: 'FAN', labelVi: 'Quạt (Phiến)', labelEn: 'Fan', icon: '🪭' },
    { key: 'SWORD', labelVi: 'Kiếm (Trường Kiếm)', labelEn: 'Sword', icon: '🗡️' },
    { key: 'SPEAR', labelVi: 'Thương / Giáo', labelEn: 'Spear', icon: '🔱' },
    { key: 'MO_BLADE', labelVi: 'Mạch Đao / Đại Đao', labelEn: 'Mo Blade / Glaive', icon: '🪓' },
    { key: 'DUAL_BLADES', labelVi: 'Song Đao', labelEn: 'Dual Blades', icon: '⚔️' },
    { key: 'ROPE_DART', labelVi: 'Thằng Tiêu (Dây Phi Tiêu)', labelEn: 'Rope Dart', icon: '⛓️' },
    { key: 'GAUNTLETS', labelVi: 'Quyền / Thủ Giáp', labelEn: 'Gauntlets / Fist', icon: '🥊' },
    { key: 'HENGDAO', labelVi: 'Hoành Đao / Đường Đao', labelEn: 'Hengdao', icon: '🔪' },
    { key: 'WAIST_DRUM', labelVi: 'Trống Eo (Yêu Cổ 2.3)', labelEn: 'Waist Drum', icon: '🥁' },
];

// 🛡️ DANH MỤC BỘ SET TRANG BỊ ĐA HỆ
export interface GearSetOption {
    key: string;
    labelVi: string;
    labelEn: string;
    side: 'left' | 'right' | 'both';
    warningText?: string;
}

const DEFAULT_GEAR_SETS: GearSetOption[] = [
    { key: 'Mistwillow', labelVi: 'Mistwillow (Bộ Thời Vũ - 4 Trái)', labelEn: 'Mistwillow Set', side: 'left' },
    { key: 'BeyondTheChill', labelVi: 'Beyond the Chill (Bộ Hàn Ngoại - 4 Phải)', labelEn: 'Beyond the Chill Set', side: 'right' },
    { key: 'Ivorybloom', labelVi: 'Ivorybloom (Bộ Tượng Hoa - Heal/Kéo Tơ)', labelEn: 'Ivorybloom Set', side: 'left' },
    { key: 'Rainwhisper', labelVi: 'Rainwhisper (Bộ Vũ Ngữ - Giáp Phải)', labelEn: 'Rainwhisper Set', side: 'right' },
    { key: 'Jadeware', labelVi: 'Jadeware (Bộ Ngọc Khí - Hệ Chuông)', labelEn: 'Jadeware Set', side: 'left' },
    { key: 'Formbend', labelVi: 'Formbend (Bộ Định Hình - Giáp Phải)', labelEn: 'Formbend Set', side: 'right' },
    { key: 'SwallowCall', labelVi: 'Swallow Call (Bộ Yến Minh - Phá Tre)', labelEn: 'Swallow Call Set', side: 'left' },
    { key: 'Ironclad', labelVi: 'Ironclad (Bộ Thiết Giáp - Xé Đá / Tank)', labelEn: 'Ironclad Set', side: 'right' },
    {
        key: 'Hawkwing',
        labelVi: 'Hawkwing (Bộ Ưng Dực - Đổi sang Bellstrike 2.3)',
        labelEn: 'Hawkwing Set',
        side: 'left',
        warningText: '⚠️ Lưu ý 2.3: Hiệu ứng Hawkwing đã đổi sang cộng Bellstrike Attack (Chỉ hợp hệ Chuông, 0% tác dụng với Kéo Tơ)!'
    },
    {
        key: 'SilkbindWings',
        labelVi: 'Silkbind: Wings (Bộ Nhánh Trống Eo 2.3)',
        labelEn: 'Silkbind: Wings Set',
        side: 'both',
        warningText: '⚠️ Lưu ý 2.3: Đây là bộ nhánh mới Silkbind: Wings (Trống Eo + Quạt) ở Qingzhou!'
    },
    { key: 'Other', labelVi: 'Bộ Khác / Tùy Chỉnh', labelEn: 'Other Set', side: 'both' }
];

// 🔥 DANH MỤC BẬC TRANG BỊ (TIER) ĐỘNG
export interface TierOption {
    tier: number;
    labelVi: string;
    isArsenal?: boolean;
}

const DEFAULT_TIER_OPTIONS: TierOption[] = [
    { tier: 100, labelVi: '🔥 Bậc 100 (Patch 2.3 Mới)', isArsenal: false },
    { tier: 96, labelVi: '📦 Bậc 96 (Kho Vũ Khí / Arsenal)', isArsenal: true },
    { tier: 91, labelVi: '🛡️ Bậc 91 (Đồ Cũ)', isArsenal: true },
    { tier: 86, labelVi: '🛡️ Bậc 86 (Đồ Cũ)', isArsenal: true },
];

interface SlotMeta {
    key: SlotKey;
    slotNumber: number;
    labelVi: string;
    labelEn: string;
    icon: string;
    side: 'left' | 'right';
    isWeaponSlot?: boolean;
    defaultWeaponKey?: string;
    recommendedSet: string;
    godLineKey: string | null;
    godLineName: string;
    requiredAttunementKey: string;
    requiredAttunementName: string;
}

const SLOTS_CONFIG: SlotMeta[] = [
    {
        key: 'umbrella',
        slotNumber: 1,
        labelVi: '1. Vũ Khí Chính',
        labelEn: '1. Main Weapon',
        icon: '⚔️',
        side: 'left',
        isWeaponSlot: true,
        defaultWeaponKey: 'UMBRELLA',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ART_UMBRELLA_BOOST',
        godLineName: 'Dòng T0 Võ Học Vũ Khí Chính',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'fan',
        slotNumber: 2,
        labelVi: '2. Vũ Khí Phụ',
        labelEn: '2. Sub Weapon',
        icon: '🗡️',
        side: 'left',
        isWeaponSlot: true,
        defaultWeaponKey: 'FAN',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: null,
        godLineName: 'Max Physical Attack / Dòng T0 Vũ Khí Phụ',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'disc',
        slotNumber: 3,
        labelVi: '3. Dây Chuyền (Hình Tròn)',
        labelEn: '3. Disc (Necklace)',
        icon: '📿',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'All Martial Arts Boost (Tất cả võ học tăng ST)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'pendant',
        slotNumber: 4,
        labelVi: '4. Ngọc Bội',
        labelEn: '4. Pendant (Jade)',
        icon: '玉',
        side: 'left',
        recommendedSet: 'Mistwillow (Thời Vũ)',
        godLineKey: 'ALL_MARTIAL_ARTS_BOOST',
        godLineName: 'All Martial Arts Boost (Tất cả võ học tăng ST)',
        requiredAttunementKey: 'PHYS_PEN',
        requiredAttunementName: 'Xuyên phá ngoại công (Physical Penetration)'
    },
    {
        key: 'helm',
        slotNumber: 5,
        labelVi: '5. Nón (Mũ Giáp)',
        labelEn: '5. Helm (Headgear)',
        icon: '🪖',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Max Physical / Power / Crit + Mystic DMG (Dòng Gộp 2.3)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'chest',
        slotNumber: 6,
        labelVi: '6. Áo Giáp',
        labelEn: '6. Chest Armor',
        icon: '🥋',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: null,
        godLineName: 'Max Physical / Power / Crit + Mystic DMG (Dòng Gộp 2.3)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'greaves',
        slotNumber: 7,
        labelVi: '7. Giáp Chân (Greaves)',
        labelEn: '7. Greaves (Leg Armor)',
        icon: '🥾',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Combat Boost Against Boss Units (Tăng ST lên Thủ lĩnh)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    },
    {
        key: 'bracers',
        slotNumber: 8,
        labelVi: '8. Hộ Uyển (Tay)',
        labelEn: '8. Bracers (Wrists)',
        icon: '🧤',
        side: 'right',
        recommendedSet: 'Beyond the Chill',
        godLineKey: 'BOSS_DMG_BOOST',
        godLineName: 'Combat Boost Against Boss Units (Tăng ST lên Thủ lĩnh)',
        requiredAttunementKey: 'UMBRELLA_PROJECTILE_BOOST',
        requiredAttunementName: 'Tăng ST Kỹ năng chủ lực (+4.2%~7.0%)'
    }
];

export interface StatOption {
    key: string;
    labelVi: string;
    labelEn: string;
    group: 'T0' | 'T1' | 'T2' | 'T3';
    defaultVal: number;
    unit: string;
    crossSpecHint?: string;
}

const DEFAULT_STAT_OPTIONS: StatOption[] = [
    { key: 'ART_UMBRELLA_BOOST', labelVi: '🌟 [T0] Võ học Cửu Trùng Xuân Sắc tăng ST', labelEn: 'Art of Umbrella Boost', group: 'T0', defaultVal: 6.5, unit: '%' },
    { key: 'ALL_MARTIAL_ARTS_BOOST', labelVi: '🌟 [T0] Tất cả võ học tăng sát thương', labelEn: 'All Martial Arts Boost', group: 'T0', defaultVal: 4.8, unit: '%' },
    { key: 'BOSS_DMG_BOOST', labelVi: '🌟 [T0] Tăng sát thương lên Thủ lĩnh (Boss)', labelEn: 'Combat Boost Against Boss Units', group: 'T0', defaultVal: 5.2, unit: '%' },
    { key: 'MAX_PHYS_ATK', labelVi: '⚔️ [T1] Tấn công ngoại công tối đa (Max Physical)', labelEn: 'Max Physical Attack', group: 'T1', defaultVal: 48, unit: '' },
    { key: 'POWER', labelVi: '💪 [T1] Lực đạo / Kình (Power / STR)', labelEn: 'Power', group: 'T1', defaultVal: 28, unit: '' },
    { key: 'PRECISION_RATE', labelVi: '🎯 [T1] Tỷ lệ Chính xác (Precision Rate)', labelEn: 'Precision Rate', group: 'T1', defaultVal: 4.5, unit: '%' },
    { key: 'CRIT_RATE', labelVi: '💥 [T1] Tỷ lệ Chí mạng (Critical Rate)', labelEn: 'Critical Rate', group: 'T1', defaultVal: 4.2, unit: '%' },
    { key: 'MYSTIC_DMG_23', labelVi: '🔥 [T1] Tăng ST Kỳ thuật (Dòng Gộp Nón/Áo 2.3)', labelEn: 'Mystic Skill DMG Boost (2.3 Merged)', group: 'T1', defaultVal: 6.0, unit: '%' },
    { key: 'AGILITY', labelVi: '🌪️ [T2] Nhanh nhẹn / Ngự (Agility / AGI)', labelEn: 'Agility', group: 'T2', defaultVal: 28, unit: '' },
    { key: 'MIN_SILKBIND_ATK', labelVi: '🕸️ [T2] Tấn công Kéo Tơ nhỏ nhất (Min Silkbind)', labelEn: 'Min Silkbind Attack', group: 'T2', defaultVal: 26, unit: '' },
    { key: 'MAX_SILKBIND_ATK', labelVi: '🕸️ [T2] Tấn công Kéo Tơ tối đa (Max Silkbind)', labelEn: 'Max Silkbind Attack', group: 'T2', defaultVal: 42, unit: '' },
    { key: 'MOMENTUM', labelVi: '⚡ [T2] Thế (Momentum / BAS)', labelEn: 'Momentum', group: 'T2', defaultVal: 25, unit: '' },
    { key: 'FORMLESS_ATK', labelVi: '🌀 [T2] Vô Tướng Công (Formless Attack)', labelEn: 'Formless Attack', group: 'T2', defaultVal: 30, unit: '' },
    { key: 'MIN_PHYS_ATK', labelVi: '⚠️ [T3] Tấn công ngoại công tối thiểu (Min Physical)', labelEn: 'Min Physical Attack', group: 'T3', defaultVal: 32, unit: '' },
    { key: 'AFFINITY_RATE', labelVi: '⚠️ [T3] Tỉ lệ Hiểu ý (Affinity Rate)', labelEn: 'Affinity Rate', group: 'T3', defaultVal: 4.0, unit: '%', crossSpecHint: 'Hợp với Cửu Kiếm / Xuất Huyết' },
    { key: 'BELLSTRIKE_ATK', labelVi: '🔔 [T2/T3] Tấn công Tiếng Chuông (Bellstrike Attack)', labelEn: 'Bellstrike Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Tiếng Chuông Vang (Vô Danh / Cửu Kiếm)' },
    { key: 'BAMBOOCUT_ATK', labelVi: '🎋 [T2/T3] Tấn công Phá Tre (Bamboocut Attack)', labelEn: 'Bamboocut Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Phá Tre (Song Đao / Quyền)' },
    { key: 'STONESPLIT_ATK', labelVi: '🪨 [T2/T3] Tấn công Xé Đá (Stonesplit Attack)', labelEn: 'Stonesplit Attack', group: 'T3', defaultVal: 40, unit: '', crossSpecHint: 'Thuộc hệ Xé Đá (Tank / Dame)' },
    { key: 'DEFENSE_HP_BODY', labelVi: '🛡️ [T2/T3] Thể phách / Phòng ngự / Khí huyết (CON/DEF/HP)', labelEn: 'HP / Body / Defense', group: 'T3', defaultVal: 28, unit: '' },
];

export interface AttunementOption {
    key: string;
    labelVi: string;
    labelEn: string;
    side: 'left' | 'right' | 'both';
    isBiS: boolean;
    trapWarning?: string;
}

const DEFAULT_ATTUNEMENT_OPTIONS: AttunementOption[] = [
    {
        key: 'PHYS_PEN',
        labelVi: '✅ [Chuẩn Trái] Xuyên phá ngoại công (Physical Penetration)',
        labelEn: 'Physical Penetration',
        side: 'left',
        isBiS: true
    },
    {
        key: 'UMBRELLA_PROJECTILE_BOOST',
        labelVi: '✅ [Chuẩn Giáp Phải] Cửu Trùng Xuân Sắc · Tăng ST đạn đạo tần suất cao (+4.2%~7.0%)',
        labelEn: 'Vernal Umbrella: Frequent Projectile DMG Boost',
        side: 'right',
        isBiS: true
    },
    {
        key: 'TRAP_LIGHT_HEAVY',
        labelVi: '🚨 [BẪY 1] Cửu Trùng Xuân Sắc · Đòn nhẹ, Trọng kích & Phái sinh tăng ST',
        labelEn: 'Trap: Light/Heavy Attack & Varied Combo DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY NẶNG NHẤT: Đánh Boss PvE hệ Dù không dùng đòn đánh thường/trọng kích! Phải Định âm lại (Re-attune) ngay!'
    },
    {
        key: 'TRAP_MARTIAL_SKILL',
        labelVi: '🚨 [BẪY 2] Cửu Trùng Xuân Sắc · Kỹ năng võ học tăng sát thương',
        labelEn: 'Trap: Martial Art Skill DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Chỉ tăng chiêu lẻ Spring Sorrow, tỷ trọng DPS rất nhỏ so với Đạn Đạo Tần Suất Cao!'
    },
    {
        key: 'TRAP_FAN_SPECIAL',
        labelVi: '🚨 [BẪY 3] Thanh Sơn Chấp Bút · Kỹ năng đặc biệt & truy kích tăng ST',
        labelEn: 'Trap: Inkwell Fan Special & Follow-up DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Quạt chỉ dùng dựng Tường Gió & gắn debuff [Lingering Bone] 5s, tuyệt đối không dồn định âm vào Quạt!'
    },
    {
        key: 'TRAP_FAN_CHARGED',
        labelVi: '🚨 [BẪY 4] Thanh Sơn Chấp Bút · Kỹ năng tích lực tăng sát thương',
        labelEn: 'Trap: Inkwell Fan Charged Skill DMG Boost',
        side: 'right',
        isBiS: false,
        trapWarning: 'BẪY ĐỊNH ÂM: Chỉ tăng lốc xoáy của Quạt, không dùng tối ưu Boss PvE!'
    },
    {
        key: 'TRAP_SILKBIND_WINGS',
        labelVi: '🚨 [BẪY 2.3] Định âm nhánh mới Silkbind: Wings (Trống Eo + Quạt)',
        labelEn: 'Trap: Silkbind Wings Attunement',
        side: 'both',
        isBiS: false,
        trapWarning: 'NHẦM NHÁNH 2.3: Đây là định âm của nhánh Trống Eo (Qingzhou), 0% tác dụng cho Cửu Trùng Xuân Sắc!'
    }
];

// 🟢 CẤU TRÚC ĐỘNG CHO TỪNG Ô THIÊN PHÚ VÕ HỌC (KHÔNG GÁN CHẾT KÉO TƠ)
export interface TalentCardMeta {
    badgeText: string;         // VD: "THIÊN PHÚ 1 · DIRECT CRIT (+9.1%)"
    statTitle: string;         // VD: "Nhanh Nhẹn (Agility)"
    linkedStatKey: string;     // Mã stat trên đồ liên kết (VD: 'AGILITY', 'POWER', 'MIN_PHYS_ATK', 'MIN_SILKBIND_ATK', 'BELLSTRIKE_ATK'...)
    recommendedLines: number;  // Số dòng khuyến nghị giữ trên đồ (VD: 3, 0, 1...)
    reqLabel: string;          // VD: "Mốc yêu cầu:" hoặc "Đỉnh mùa:"
    noteTemplate: string;      // Ghi chú hướng dẫn riêng cho thiên phú này
}

export interface SpecTalentsTemplate {
    t1: TalentCardMeta;
    t2: TalentCardMeta;
    t3: TalentCardMeta;
    defaultVals: {
        val1: number; req1: number; req1_23: number;
        val2: number; req2: number;
        val3: number; req3: number; req3_23: number;
    };
}

// 🟢 BỘ KHUNG THIÊN PHÚ GỢI Ý BAN ĐẦU THEO NHÁNH VÕ HỌC (CÓ THỂ SỬA TRỰC TIẾP TRÊN WEB & LƯU VÀO wwm_data.SPEC_TALENTS_MAP)
const getDefaultSpecTalentsTemplate = (specName: string): SpecTalentsTemplate => {
    if (specName.includes('Tiếng Chuông Vang')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · TĂNG SÁT THƯƠNG KỸ NĂNG / HIỂU Ý',
                statTitle: 'Lực Đạo / Kình (Power / STR)',
                linkedStatKey: 'POWER',
                recommendedLines: 4,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên giữ các dòng Lực đạo (Power) trên trang bị để đạt 100% Thiên phú 1 hệ Chuông.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · KÍCH HOẠT NGOẠI CÔNG HỆ CHUÔNG',
                statTitle: 'Ngoại Công Tối Đa (Max Physical)',
                linkedStatKey: 'MAX_PHYS_ATK',
                recommendedLines: 8,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Tối đa hóa Ngoại công tối đa trên cả 8 món để chạm trần sát thương kiếm khí.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU TIẾNG CHUÔNG (BELLSTRIKE)',
                statTitle: 'Tấn Công Tiếng Chuông (Bellstrike Attr)',
                linkedStatKey: 'BELLSTRIKE_ATK',
                recommendedLines: 1,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Tiếng Chuông Vang để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 360, req1: 300, req1_23: 365, val2: 2450, req2: 1800, val3: 460, req3: 352, req3_23: 440 }
        };
    }

    if (specName.includes('Xé Đá')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · KIÊN ĐỊNH & GIẢM THƯƠNG / BẠO KÍCH',
                statTitle: 'Thể Phách / Phòng Ngự (Body / CON)',
                linkedStatKey: 'DEFENSE_HP_BODY',
                recommendedLines: 3,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Hệ Xé Đá chuyển hóa Thể phách / Phòng ngự thành hiệu ứng Thiên phú 1.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · UY LỰC TRỌNG BINH',
                statTitle: 'Lực Đạo / Ngoại Công (Power / Phys)',
                linkedStatKey: 'POWER',
                recommendedLines: 5,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Đảm bảo đủ mốc Lực đạo / Ngoại công để kích hoạt tối đa sát thương trọng kích.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU XÉ ĐÁ (STONESPLIT)',
                statTitle: 'Tấn Công Xé Đá (Stonesplit Attr)',
                linkedStatKey: 'STONESPLIT_ATK',
                recommendedLines: 1,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Xé Đá để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 380, req1: 300, req1_23: 365, val2: 1600, req2: 1000, val3: 450, req3: 352, req3_23: 440 }
        };
    }

    if (specName.includes('Phá Tre')) {
        return {
            t1: {
                badgeText: 'THIÊN PHÚ 1 · TỐC ĐÁNH & BẠO KÍCH LIÊN HOÀN',
                statTitle: 'Nhanh Nhẹn / Ngự (Agility / AGI)',
                linkedStatKey: 'AGILITY',
                recommendedLines: 3,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Giữ đủ mốc Nhanh nhẹn để đạt 100% Thiên phú 1 của hệ Phá Tre.'
            },
            t2: {
                badgeText: 'THIÊN PHÚ 2 · SÁT THƯƠNG TRUY KÍCH',
                statTitle: 'Ngoại Công / Lực Đạo (Physical / Power)',
                linkedStatKey: 'MAX_PHYS_ATK',
                recommendedLines: 8,
                reqLabel: 'Đỉnh mùa:',
                noteTemplate: 'Dồn dòng Ngoại công tối đa & Lực đạo để tối ưu sát thương chuỗi combo.'
            },
            t3: {
                badgeText: 'THIÊN PHÚ 3 · XUYÊN THẤU PHÁ TRE (BAMBOOCUT)',
                statTitle: 'Tấn Công Phá Tre (Bamboocut Attr)',
                linkedStatKey: 'BAMBOOCUT_ATK',
                recommendedLines: 1,
                reqLabel: 'Mốc yêu cầu:',
                noteTemplate: 'Ưu tiên lắp Kho Vũ Khí (Arsenal) hệ Phá Tre để lấy điểm thuộc tính cộng thẳng.'
            },
            defaultVals: { val1: 385, req1: 300, req1_23: 365, val2: 1850, req2: 1200, val3: 465, req3: 352, req3_23: 440 }
        };
    }

    // Mặc định nhánh Kéo Tơ (Dame / Heal / Buff)
    return {
        t1: {
            badgeText: 'THIÊN PHÚ 1 · DIRECT CRIT (+9.1%)',
            statTitle: 'Nhanh Nhẹn (Agility)',
            linkedStatKey: 'AGILITY',
            recommendedLines: 3,
            reqLabel: 'Mốc yêu cầu:',
            noteTemplate: 'Khuyến nghị giữ 3 dòng Nhanh nhẹn trên đồ (Vũ khí phụ, Nón, Hộ uyển).'
        },
        t2: {
            badgeText: 'THIÊN PHÚ 2 · +36% PROJECTILE CRIT DMG',
            statTitle: 'Ngoại Công Tối Thiểu (Min Phys)',
            linkedStatKey: 'MIN_PHYS_ATK',
            recommendedLines: 0,
            reqLabel: 'Đỉnh mùa:',
            noteTemplate: 'Khi đã đạt đỉnh mùa 750 thì không cần lấy thêm dòng Min Physical trên đồ.'
        },
        t3: {
            badgeText: 'THIÊN PHÚ 3 · +23.6 XUYÊN THẤU KÉO TƠ',
            statTitle: 'Kéo Tơ Nhỏ Nhất (Min Silkbind)',
            linkedStatKey: 'MIN_SILKBIND_ATK',
            recommendedLines: 0,
            reqLabel: 'Mốc yêu cầu:',
            noteTemplate: 'Ưu tiên số 1: Dùng Kho Vũ Khí (Arsenal) để lấy điểm cộng thẳng.'
        },
        defaultVals: { val1: 381, req1: 300, req1_23: 365, val2: 1513.2, req2: 750, val3: 469.9, req3: 352, req3_23: 440 }
    };
};

export interface TuningLine {
    statKey: string;
    value: number;
}

export interface GearItem {
    slot: SlotKey;
    name: string;
    weaponType?: string;
    tier: number;
    gearSet: string;
    slot1: TuningLine;
    tuningLines: TuningLine[];
    attunementKey: string;
    attunementValue: number;
}

export interface CharacterBaseline {
    agility: number;
    reqAgility: number;
    minPhysical: number;
    reqMinPhysical: number;
    minSilkbind: number;
    reqMinSilkbind: number;
    precisionRate: number;
    critRate: number;
    affinityRate: number;
    simulate23: boolean;
    agiThreshold23: number;
    silkThreshold23: number;
    arsenal96Active: boolean;
    customTalentsMeta?: {
        t1: TalentCardMeta;
        t2: TalentCardMeta;
        t3: TalentCardMeta;
    };
}

const DEFAULT_BASELINE: CharacterBaseline = {
    agility: 381,
    reqAgility: 300,
    minPhysical: 1513.2,
    reqMinPhysical: 750,
    minSilkbind: 469.9,
    reqMinSilkbind: 352,
    precisionRate: 99.6,
    critRate: 78.5,
    affinityRate: 12.0,
    simulate23: false,
    agiThreshold23: 365,
    silkThreshold23: 440,
    arsenal96Active: true
};

const getDefaultWeaponForSpec = (specName: string, slot: SlotKey): string => {
    if (slot !== 'umbrella' && slot !== 'fan') return '';
    if (specName.includes('Cửu Kiếm') || specName.includes('Vô Danh')) {
        return slot === 'umbrella' ? 'SWORD' : 'SPEAR';
    }
    if (specName.includes('Xé Đá')) {
        return slot === 'umbrella' ? 'MO_BLADE' : 'SPEAR';
    }
    if (specName.includes('Song Đao')) {
        return slot === 'umbrella' ? 'DUAL_BLADES' : 'ROPE_DART';
    }
    if (specName.includes('Quyền')) {
        return slot === 'umbrella' ? 'GAUNTLETS' : 'ROPE_DART';
    }
    return slot === 'umbrella' ? 'UMBRELLA' : 'FAN';
};

const createSampleBiSGear = (slot: SlotKey, specName = ""): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi} Bậc 100`,
        weaponType: getDefaultWeaponForSpec(specName, slot),
        tier: 100,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: {
            statKey: meta.godLineKey || 'MAX_PHYS_ATK',
            value: meta.godLineKey ? 5.5 : 48
        },
        tuningLines: [
            { statKey: 'MAX_PHYS_ATK', value: 46 },
            { statKey: 'POWER', value: 27 },
            { statKey: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 'AGILITY' : 'PRECISION_RATE', value: slot === 'fan' || slot === 'helm' || slot === 'bracers' ? 28 : 4.5 },
            { statKey: 'CRIT_RATE', value: 4.2 }
        ],
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 5.8
    };
};

const createBlankGear = (slot: SlotKey, specName = ""): GearItem => {
    const meta = SLOTS_CONFIG.find(s => s.key === slot)!;
    return {
        slot,
        name: `${meta.labelVi} (Chưa nhập)`,
        weaponType: getDefaultWeaponForSpec(specName, slot),
        tier: 96,
        gearSet: meta.side === 'left' ? 'Mistwillow' : 'BeyondTheChill',
        slot1: { statKey: 'MAX_PHYS_ATK', value: 0 },
        tuningLines: [
            { statKey: 'MAX_PHYS_ATK', value: 0 },
            { statKey: 'POWER', value: 0 },
            { statKey: 'CRIT_RATE', value: 0 },
            { statKey: 'AGILITY', value: 0 }
        ],
        attunementKey: meta.requiredAttunementKey,
        attunementValue: 0
    };
};

export default function WwmBuildsTab({ wwmBuilds, wwmData, danhLuc, playerProfiles, session }: Props) {
    // 🟢 1. KÉO TRỰC TIẾP VO_HOC_LIST TỪ FIREBASE: thanhlong_config -> wwm_data -> VO_HOC_LIST (KHÔNG HARDCODE GÁN CHẾT)
    const voHocList: string[] = useMemo(() => {
        const rawList = wwmData?.VO_HOC_LIST;
        if (!rawList) return [];
        if (Array.isArray(rawList)) {
            return rawList.filter(Boolean).map(String);
        }
        if (typeof rawList === 'object') {
            return Object.keys(rawList)
                .sort((a, b) => Number(a) - Number(b))
                .map(k => String(rawList[k]))
                .filter(Boolean);
        }
        return [];
    }, [wwmData]);

    // 2. HỢP NHẤT DANH SÁCH DÒNG TẨY LUYỆN TỪ FIREBASE
    const statOptions: StatOption[] = useMemo(() => {
        const customMap = wwmData?.CUSTOM_TUNING_STATS || {};
        const merged = DEFAULT_STAT_OPTIONS.map(item => customMap[item.key] ? { ...item, ...customMap[item.key] } : item);
        Object.entries(customMap).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    group: val.group || 'T1',
                    defaultVal: Number(val.defaultVal) || 30,
                    unit: val.unit || '',
                    crossSpecHint: val.crossSpecHint || ''
                });
            }
        });
        return merged;
    }, [wwmData]);

    // 3. HỢP NHẤT DANH SÁCH ĐỊNH ÂM TỪ FIREBASE
    const attunementOptions: AttunementOption[] = useMemo(() => {
        const customAttMap = wwmData?.CUSTOM_ATTUNEMENTS || {};
        const merged = DEFAULT_ATTUNEMENT_OPTIONS.map(item => customAttMap[item.key] ? { ...item, ...customAttMap[item.key] } : item);
        Object.entries(customAttMap).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    side: val.side || 'both',
                    isBiS: Boolean(val.isBiS),
                    trapWarning: val.trapWarning || ''
                });
            }
        });
        return merged;
    }, [wwmData]);

    // 4. HỢP NHẤT DANH SÁCH BỘ SET TRANG BỊ TỪ FIREBASE
    const gearSetOptions: GearSetOption[] = useMemo(() => {
        const customSets = wwmData?.CUSTOM_GEAR_SETS || {};
        const merged = DEFAULT_GEAR_SETS.map(item => customSets[item.key] ? { ...item, ...customSets[item.key] } : item);
        Object.entries(customSets).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    side: val.side || 'both',
                    warningText: val.warningText || ''
                });
            }
        });
        return merged;
    }, [wwmData]);

    // 5. HỢP NHẤT DANH SÁCH BẬC TRANG BỊ (TIER) TỪ FIREBASE
    const tierOptions: TierOption[] = useMemo(() => {
        const customTiers = wwmData?.CUSTOM_TIERS || {};
        const merged = DEFAULT_TIER_OPTIONS.map(item => customTiers[String(item.tier)] ? { ...item, ...customTiers[String(item.tier)] } : item);
        Object.entries(customTiers).forEach(([k, val]: any) => {
            const numTier = Number(k);
            if (!isNaN(numTier) && !merged.some(m => m.tier === numTier) && val && typeof val === 'object') {
                merged.push({
                    tier: numTier,
                    labelVi: val.labelVi || `🔥 Bậc ${numTier}`,
                    isArsenal: Boolean(val.isArsenal)
                });
            }
        });
        return merged.sort((a, b) => b.tier - a.tier);
    }, [wwmData]);

    // 6. HỢP NHẤT DANH SÁCH LOẠI VŨ KHÍ TỪ FIREBASE
    const weaponTypeOptions: WeaponTypeOption[] = useMemo(() => {
        const customWeapons = wwmData?.CUSTOM_WEAPON_TYPES || {};
        const merged = DEFAULT_WEAPON_TYPES.map(item => customWeapons[item.key] ? { ...item, ...customWeapons[item.key] } : item);
        Object.entries(customWeapons).forEach(([k, val]: any) => {
            if (!merged.some(m => m.key === k) && val && typeof val === 'object') {
                merged.push({
                    key: k,
                    labelVi: val.labelVi || k,
                    labelEn: val.labelEn || k,
                    icon: val.icon || '⚔️'
                });
            }
        });
        return merged;
    }, [wwmData]);

    // STATE CHO MODAL TÀNG KINH CÁC (QUẢN LÝ 6 HẠNG MỤC: TUNING, ĐỊNH ÂM, SET, BẬC ĐỒ, VŨ KHÍ, VO_HOC_LIST)
    const [showStatDictModal, setShowStatDictModal] = useState(false);
    const [dictTab, setDictTab] = useState<'tuning' | 'attunement' | 'gearset' | 'tier' | 'weapon' | 'vohoc'>('tuning');

    const [editingStatItem, setEditingStatItem] = useState<StatOption>({
        key: '', labelVi: '', labelEn: '', group: 'T1', defaultVal: 40, unit: '', crossSpecHint: ''
    });
    const [editingAttuneItem, setEditingAttuneItem] = useState<AttunementOption>({
        key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: ''
    });
    const [editingSetItem, setEditingSetItem] = useState<GearSetOption>({
        key: '', labelVi: '', labelEn: '', side: 'both', warningText: ''
    });
    const [editingTierItem, setEditingTierItem] = useState<TierOption>({
        tier: 105, labelVi: '🔥 Bậc 105 (Mới)', isArsenal: false
    });
    const [editingWeaponItem, setEditingWeaponItem] = useState<WeaponTypeOption>({
        key: '', labelVi: '', labelEn: '', icon: '⚔️'
    });
    const [newVoHocName, setNewVoHocName] = useState("");
    const [editingVoHocIndex, setEditingVoHocIndex] = useState<number | null>(null);

    // Chế độ mở khóa chỉnh sửa tên / quy tắc của 3 Thẻ Thiên Phú ngay trên giao diện
    const [isEditingTalentMeta, setIsEditingTalentMeta] = useState(false);

    const currentUserId = useMemo(() => {
        if (!session?.user) return "guest";
        if (session.user.id) return String(session.user.id);
        if (session.user.image?.includes('avatars/')) {
            const m = session.user.image.match(/avatars\/(\d+)\//);
            if (m && m[1]) return m[1];
        }
        if (danhLuc) {
            const found = Object.entries(danhLuc).find(([_, v]: any) => v.ingame === session.user.name || v.discordName === session.user.name);
            if (found) return found[0];
        }
        return session.user.name || "guest";
    }, [session, danhLuc]);

    const currentIngame = useMemo(() => {
        if (danhLuc && danhLuc[currentUserId]?.ingame) return danhLuc[currentUserId].ingame;
        return session?.user?.name || "Đại Hiệp";
    }, [danhLuc, currentUserId, session]);

    const [selectedSpec, setSelectedSpec] = useState<string>("");
    const [viewingUserId, setViewingUserId] = useState<string>(currentUserId);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [editorMode, setEditorMode] = useState<'edit_equipped' | 'compare_new'>('edit_equipped');

    // Khi VO_HOC_LIST từ Firebase tải xong, tự động chọn hệ Võ Học của người dùng trong Danh Lục (hoặc phần tử đầu tiên trong VO_HOC_LIST)
    useEffect(() => {
        if (voHocList.length === 0) return;
        if (selectedSpec && voHocList.includes(selectedSpec)) return;

        const userClass = danhLuc?.[currentUserId]?.class;
        if (userClass && voHocList.includes(userClass)) {
            setSelectedSpec(userClass);
        } else {
            setSelectedSpec(voHocList[0]);
        }
    }, [danhLuc, currentUserId, voHocList, selectedSpec]);

    useEffect(() => {
        setViewingUserId(currentUserId);
    }, [currentUserId]);

    const [baseline, setBaseline] = useState<CharacterBaseline>(DEFAULT_BASELINE);
    const [equipped, setEquipped] = useState<Record<SlotKey, GearItem>>(() => ({
        umbrella: createSampleBiSGear('umbrella'),
        fan: createSampleBiSGear('fan'),
        disc: createSampleBiSGear('disc'),
        pendant: createSampleBiSGear('pendant'),
        helm: createSampleBiSGear('helm'),
        chest: createSampleBiSGear('chest'),
        greaves: createSampleBiSGear('greaves'),
        bracers: createSampleBiSGear('bracers'),
    }));
    const [arsenal96, setArsenal96] = useState<GearItem[]>([]);
    const [innerWays, setInnerWays] = useState({
        slot1: { name: 'Morale Chant (Dịch Thủy Ca)', tier: 6 },
        slot2: { name: 'Blossom Barrage (Hoa Vũ Mãn Thiên)', tier: 6 },
        slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 },
        slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 },
        bossStyle: 'flex23' as 'flex23' | 'flying' | 'standing'
    });

    const [activeSlot, setActiveSlot] = useState<SlotKey>('umbrella');
    const [candidateGear, setCandidateGear] = useState<GearItem>(() => createSampleBiSGear('umbrella'));
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [geminiApiKey, setGeminiApiKey] = useState<string>("");
    const [webhookUrl, setWebhookUrl] = useState<string>("");
    const [isScanning, setIsScanning] = useState(false);
    const [isSavingCloud, setIsSavingCloud] = useState(false);
    const [statusBanner, setStatusBanner] = useState<string | null>(null);

    const loadedProfileKeyRef = useRef<string>("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setGeminiApiKey(localStorage.getItem('tl_gemini_key') || '');
            setWebhookUrl(localStorage.getItem('tl_discord_webhook') || '');
        }
    }, []);

    // 🟢 LẤY BỘ KHUNG 3 THIÊN PHÚ THEO ĐÚNG VÕ HỌC ĐANG CHỌN (ƯU TIÊN TỪ wwm_data.SPEC_TALENTS_MAP HOẶC HỒ SƠ CÁ NHÂN)
    const activeTalentsMeta = useMemo(() => {
        const specTemplateFromCloud = wwmData?.SPEC_TALENTS_MAP?.[selectedSpec];
        const fallbackTemplate = getDefaultSpecTalentsTemplate(selectedSpec);
        return {
            t1: baseline.customTalentsMeta?.t1 || specTemplateFromCloud?.t1 || fallbackTemplate.t1,
            t2: baseline.customTalentsMeta?.t2 || specTemplateFromCloud?.t2 || fallbackTemplate.t2,
            t3: baseline.customTalentsMeta?.t3 || specTemplateFromCloud?.t3 || fallbackTemplate.t3,
        };
    }, [wwmData, selectedSpec, baseline.customTalentsMeta]);

    // Đồng bộ hồ sơ khi chuyển Hệ Võ Học hoặc đổi Người Xem
    useEffect(() => {
        if (!selectedSpec) return;
        const profileKey = `${selectedSpec}__${viewingUserId}`;
        const specDoc = wwmBuilds?.[selectedSpec];
        const userRecord = specDoc?.[viewingUserId];

        if (loadedProfileKeyRef.current === profileKey && hasUnsavedChanges) {
            return;
        }

        const specTemplate = wwmData?.SPEC_TALENTS_MAP?.[selectedSpec] || getDefaultSpecTalentsTemplate(selectedSpec);
        const specDefaultBaseline: CharacterBaseline = {
            ...DEFAULT_BASELINE,
            agility: specTemplate.defaultVals?.val1 ?? 381,
            reqAgility: specTemplate.defaultVals?.req1 ?? 300,
            agiThreshold23: specTemplate.defaultVals?.req1_23 ?? 365,
            minPhysical: specTemplate.defaultVals?.val2 ?? 1513.2,
            reqMinPhysical: specTemplate.defaultVals?.req2 ?? 750,
            minSilkbind: specTemplate.defaultVals?.val3 ?? 469.9,
            reqMinSilkbind: specTemplate.defaultVals?.req3 ?? 352,
            silkThreshold23: specTemplate.defaultVals?.req3_23 ?? 440,
            customTalentsMeta: {
                t1: specTemplate.t1,
                t2: specTemplate.t2,
                t3: specTemplate.t3
            }
        };

        if (userRecord) {
            if (userRecord.baseline) setBaseline({ ...specDefaultBaseline, ...userRecord.baseline });
            else setBaseline(specDefaultBaseline);
            if (userRecord.equipped) setEquipped(prev => ({ ...prev, ...userRecord.equipped }));
            if (Array.isArray(userRecord.arsenal96)) setArsenal96(userRecord.arsenal96);
            if (userRecord.innerWays) setInnerWays(prev => ({ ...prev, ...userRecord.innerWays }));
            loadedProfileKeyRef.current = profileKey;
            setHasUnsavedChanges(false);
        } else if (typeof window !== 'undefined' && viewingUserId === currentUserId) {
            const localRaw = localStorage.getItem(`wwm_build_${selectedSpec}_${currentUserId}`);
            if (localRaw) {
                try {
                    const parsed = JSON.parse(localRaw);
                    if (parsed.baseline) setBaseline({ ...specDefaultBaseline, ...parsed.baseline });
                    if (parsed.equipped) setEquipped(prev => ({ ...prev, ...parsed.equipped }));
                    if (Array.isArray(parsed.arsenal96)) setArsenal96(parsed.arsenal96);
                    loadedProfileKeyRef.current = profileKey;
                    return;
                } catch {}
            }
            // Nếu hệ võ học này chưa có hồ sơ thì khởi tạo theo khung chuẩn của hệ đó
            setBaseline(specDefaultBaseline);
            setEquipped({
                umbrella: createSampleBiSGear('umbrella', selectedSpec),
                fan: createSampleBiSGear('fan', selectedSpec),
                disc: createSampleBiSGear('disc', selectedSpec),
                pendant: createSampleBiSGear('pendant', selectedSpec),
                helm: createSampleBiSGear('helm', selectedSpec),
                chest: createSampleBiSGear('chest', selectedSpec),
                greaves: createSampleBiSGear('greaves', selectedSpec),
                bracers: createSampleBiSGear('bracers', selectedSpec),
            });
            loadedProfileKeyRef.current = profileKey;
        }
    }, [wwmBuilds, wwmData, selectedSpec, viewingUserId, currentUserId, hasUnsavedChanges]);

    const updateBaselineField = (patch: Partial<CharacterBaseline>) => {
        setHasUnsavedChanges(true);
        setBaseline(prev => ({ ...prev, ...patch }));
    };

    const updateTalentCardMeta = (slot: 't1' | 't2' | 't3', patch: Partial<TalentCardMeta>) => {
        setHasUnsavedChanges(true);
        setBaseline(prev => ({
            ...prev,
            customTalentsMeta: {
                t1: slot === 't1' ? { ...activeTalentsMeta.t1, ...patch } : activeTalentsMeta.t1,
                t2: slot === 't2' ? { ...activeTalentsMeta.t2, ...patch } : activeTalentsMeta.t2,
                t3: slot === 't3' ? { ...activeTalentsMeta.t3, ...patch } : activeTalentsMeta.t3,
            }
        }));
    };

    // Lưu cấu hình 3 Thiên Phú làm chuẩn chung cho Hệ Võ Học đang chọn vào thanhlong_config/wwm_data
    const handleSaveSpecTalentTemplateToCloud = async () => {
        if (!selectedSpec) return;
        try {
            const currentMap = wwmData?.SPEC_TALENTS_MAP || {};
            const updatedSpecTemplate: SpecTalentsTemplate = {
                t1: activeTalentsMeta.t1,
                t2: activeTalentsMeta.t2,
                t3: activeTalentsMeta.t3,
                defaultVals: {
                    val1: baseline.agility,
                    req1: baseline.reqAgility || 300,
                    req1_23: baseline.agiThreshold23 || 365,
                    val2: baseline.minPhysical,
                    req2: baseline.reqMinPhysical || 750,
                    val3: baseline.minSilkbind,
                    req3: baseline.reqMinSilkbind || 352,
                    req3_23: baseline.silkThreshold23 || 440
                }
            };
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                SPEC_TALENTS_MAP: {
                    ...currentMap,
                    [selectedSpec]: updatedSpecTemplate
                }
            }, { merge: true });
            setIsEditingTalentMeta(false);
            alert(`✅ Đã lưu khung 3 Thiên Phú chuẩn cho hệ [${selectedSpec}] vào thanhlong_config/wwm_data!`);
        } catch {
            alert("❌ Không thể lưu mẫu Thiên Phú lên wwm_data!");
        }
    };

    const activeEditingGear: GearItem = editorMode === 'edit_equipped' ? equipped[activeSlot] : candidateGear;

    const updateActiveEditingGear = (updater: (prev: GearItem) => GearItem) => {
        setHasUnsavedChanges(true);
        if (editorMode === 'edit_equipped') {
            setEquipped(prev => ({
                ...prev,
                [activeSlot]: updater(prev[activeSlot])
            }));
        } else {
            setCandidateGear(prev => updater(prev));
        }
    };

    const handleSelectSlot = (slot: SlotKey) => {
        setActiveSlot(slot);
        if (editorMode === 'compare_new') {
            setCandidateGear(createSampleBiSGear(slot, selectedSpec));
        }
    };

    const getSlotDisplayInfo = (slotMeta: SlotMeta, item?: GearItem) => {
        if (!slotMeta.isWeaponSlot) {
            return { icon: slotMeta.icon, title: slotMeta.labelVi };
        }
        const wKey = item?.weaponType || getDefaultWeaponForSpec(selectedSpec, slotMeta.key);
        const wObj = weaponTypeOptions.find(w => w.key === wKey);
        if (wObj) {
            return {
                icon: wObj.icon,
                title: `${slotMeta.labelVi} (${wObj.labelVi})`
            };
        }
        return { icon: slotMeta.icon, title: slotMeta.labelVi };
    };

    // 🟢 HÀM THÊM / SỬA / XÓA TRỰC TIẾP MẢNG VO_HOC_LIST TRONG thanhlong_config/wwm_data
    const handleSaveVoHocList = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newVoHocName.trim();
        if (!trimmed) return;

        let nextList = [...voHocList];
        if (editingVoHocIndex !== null && editingVoHocIndex >= 0 && editingVoHocIndex < nextList.length) {
            nextList[editingVoHocIndex] = trimmed;
        } else {
            if (nextList.includes(trimmed)) {
                alert("⚠️ Tên Võ Học này đã có trong danh sách!");
                return;
            }
            nextList.push(trimmed);
        }

        try {
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                VO_HOC_LIST: nextList
            }, { merge: true });
            setNewVoHocName("");
            setEditingVoHocIndex(null);
            alert(`✅ Đã cập nhật VO_HOC_LIST trong thanhlong_config/wwm_data thành công!`);
        } catch {
            alert("❌ Lỗi khi cập nhật VO_HOC_LIST lên Firebase!");
        }
    };

    const handleDeleteVoHoc = async (idx: number) => {
        const target = voHocList[idx];
        if (!window.confirm(`Xóa nhánh võ học [${target}] khỏi wwm_data.VO_HOC_LIST?`)) return;
        const nextList = voHocList.filter((_, i) => i !== idx);
        try {
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                VO_HOC_LIST: nextList
            }, { merge: true });
        } catch {
            alert("❌ Lỗi khi xóa Võ Học!");
        }
    };

    // LƯU DÒNG TẨY LUYỆN MỚI / SỬA CHỮ LÊN FIREBASE
    const handleSaveCustomTuningStat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStatItem.labelVi.trim()) return;
        const safeKey = editingStatItem.key.trim()
            ? editingStatItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `CUSTOM_${Date.now()}`;

        const prefixMap: Record<'T0' | 'T1' | 'T2' | 'T3', string> = {
            T0: '🌟 [T0]',
            T1: '⚔️ [T1]',
            T2: '🌪️ [T2]',
            T3: '⚠️ [T3]'
        };

        let formattedLabelVi = editingStatItem.labelVi.trim();
        if (!formattedLabelVi.includes('[T0]') && !formattedLabelVi.includes('[T1]') && !formattedLabelVi.includes('[T2]') && !formattedLabelVi.includes('[T3]')) {
            formattedLabelVi = `${prefixMap[editingStatItem.group]} ${formattedLabelVi}`;
        }

        const newStatObj: StatOption = {
            key: safeKey,
            labelVi: formattedLabelVi,
            labelEn: editingStatItem.labelEn.trim() || formattedLabelVi,
            group: editingStatItem.group,
            defaultVal: Number(editingStatItem.defaultVal) || 30,
            unit: editingStatItem.unit.trim(),
            crossSpecHint: editingStatItem.crossSpecHint?.trim() || ''
        };

        try {
            const currentCustom = wwmData?.CUSTOM_TUNING_STATS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_TUNING_STATS: { ...currentCustom, [safeKey]: newStatObj }
            }, { merge: true });
            setEditingStatItem({ key: '', labelVi: '', labelEn: '', group: 'T1', defaultVal: 40, unit: '', crossSpecHint: '' });
            alert(`✅ Đã lưu dòng tẩy luyện [${newStatObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu dòng tẩy luyện lên Firebase!");
        }
    };

    const handleSaveCustomAttunement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttuneItem.labelVi.trim()) return;
        const safeKey = editingAttuneItem.key.trim()
            ? editingAttuneItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `ATTUNE_${Date.now()}`;

        const newAttObj: AttunementOption = {
            key: safeKey,
            labelVi: editingAttuneItem.labelVi.trim(),
            labelEn: editingAttuneItem.labelEn.trim() || editingAttuneItem.labelVi.trim(),
            side: editingAttuneItem.side,
            isBiS: editingAttuneItem.isBiS,
            trapWarning: editingAttuneItem.trapWarning?.trim() || ''
        };

        try {
            const currentAtt = wwmData?.CUSTOM_ATTUNEMENTS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_ATTUNEMENTS: { ...currentAtt, [safeKey]: newAttObj }
            }, { merge: true });
            setEditingAttuneItem({ key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: '' });
            alert(`✅ Đã lưu dòng Định Âm [${newAttObj.labelVi}] thành công!`);
        } catch {
            alert("❌ Lỗi khi lưu dòng Định Âm!");
        }
    };

    const handleSaveCustomGearSet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSetItem.labelVi.trim()) return;
        const safeKey = editingSetItem.key.trim()
            ? editingSetItem.key.trim().replace(/\s+/g, '_')
            : `SET_${Date.now()}`;

        const newSetObj: GearSetOption = {
            key: safeKey,
            labelVi: editingSetItem.labelVi.trim(),
            labelEn: editingSetItem.labelEn.trim() || editingSetItem.labelVi.trim(),
            side: editingSetItem.side,
            warningText: editingSetItem.warningText?.trim() || ''
        };

        try {
            const currentSets = wwmData?.CUSTOM_GEAR_SETS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_GEAR_SETS: { ...currentSets, [safeKey]: newSetObj }
            }, { merge: true });
            setEditingSetItem({ key: '', labelVi: '', labelEn: '', side: 'both', warningText: '' });
            alert(`✅ Đã lưu Bộ Trang Bị [${newSetObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Bộ Trang Bị!");
        }
    };

    const handleSaveCustomTier = async (e: React.FormEvent) => {
        e.preventDefault();
        const numTier = Number(editingTierItem.tier);
        if (!numTier || numTier <= 0) return;

        const newTierObj: TierOption = {
            tier: numTier,
            labelVi: editingTierItem.labelVi.trim() || `🔥 Bậc ${numTier}`,
            isArsenal: Boolean(editingTierItem.isArsenal)
        };

        try {
            const currentTiers = wwmData?.CUSTOM_TIERS || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_TIERS: { ...currentTiers, [String(numTier)]: newTierObj }
            }, { merge: true });
            alert(`✅ Đã lưu [${newTierObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Bậc Trang Bị!");
        }
    };

    const handleSaveCustomWeapon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWeaponItem.labelVi.trim()) return;
        const safeKey = editingWeaponItem.key.trim()
            ? editingWeaponItem.key.trim().toUpperCase().replace(/\s+/g, '_')
            : `WEAPON_${Date.now()}`;

        const newWeaponObj: WeaponTypeOption = {
            key: safeKey,
            labelVi: editingWeaponItem.labelVi.trim(),
            labelEn: editingWeaponItem.labelEn.trim() || editingWeaponItem.labelVi.trim(),
            icon: editingWeaponItem.icon.trim() || '⚔️'
        };

        try {
            const currentWeapons = wwmData?.CUSTOM_WEAPON_TYPES || {};
            await setDoc(doc(db, 'thanhlong_config', 'wwm_data'), {
                CUSTOM_WEAPON_TYPES: { ...currentWeapons, [safeKey]: newWeaponObj }
            }, { merge: true });
            setEditingWeaponItem({ key: '', labelVi: '', labelEn: '', icon: '⚔️' });
            alert(`✅ Đã lưu Loại Vũ Khí [${newWeaponObj.icon} ${newWeaponObj.labelVi}] lên hệ thống!`);
        } catch {
            alert("❌ Lỗi khi lưu Loại Vũ Khí!");
        }
    };

    const handleClearAll8Slots = () => {
        if (!window.confirm("🧹 Đại hiệp muốn làm trống cả 8 món đang mặc về 0 để tự nhập thông số đồ thực tế của mình chứ?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createBlankGear('umbrella', selectedSpec),
            fan: createBlankGear('fan', selectedSpec),
            disc: createBlankGear('disc', selectedSpec),
            pendant: createBlankGear('pendant', selectedSpec),
            helm: createBlankGear('helm', selectedSpec),
            chest: createBlankGear('chest', selectedSpec),
            greaves: createBlankGear('greaves', selectedSpec),
            bracers: createBlankGear('bracers', selectedSpec),
        });
    };

    const handleLoadSampleBiS8Slots = () => {
        if (!window.confirm("✨ Nạp bộ khung 8 món Chuẩn BiS Bậc 100 (Patch 2.3) làm mẫu tham khảo?")) return;
        setHasUnsavedChanges(true);
        setEquipped({
            umbrella: createSampleBiSGear('umbrella', selectedSpec),
            fan: createSampleBiSGear('fan', selectedSpec),
            disc: createSampleBiSGear('disc', selectedSpec),
            pendant: createSampleBiSGear('pendant', selectedSpec),
            helm: createSampleBiSGear('helm', selectedSpec),
            chest: createSampleBiSGear('chest', selectedSpec),
            greaves: createSampleBiSGear('greaves', selectedSpec),
            bracers: createSampleBiSGear('bracers', selectedSpec),
        });
    };

    const saveBuildToCloud = async (
        nextBaseline = baseline,
        nextEquipped = equipped,
        nextArsenal = arsenal96,
        nextInnerWays = innerWays
    ) => {
        if (!selectedSpec) return;
        if (viewingUserId !== currentUserId) {
            alert("⚠️ Đại hiệp đang xem hồ sơ của đồng môn, không thể ghi đè! Hãy chuyển về hồ sơ của chính mình trước.");
            return;
        }
        setIsSavingCloud(true);
        try {
            const payload = {
                ingame: currentIngame,
                baseline: nextBaseline,
                equipped: nextEquipped,
                arsenal96: nextArsenal,
                innerWays: nextInnerWays,
                updatedAt: new Date().toISOString()
            };

            if (typeof window !== 'undefined') {
                localStorage.setItem(`wwm_build_${selectedSpec}_${currentUserId}`, JSON.stringify(payload));
            }

            const specRef = doc(db, 'wwm_builds', selectedSpec);
            await setDoc(specRef, {
                [currentUserId]: payload
            }, { merge: true });

            setHasUnsavedChanges(false);
            setStatusBanner(`✅ Đã lưu & đồng bộ hồ sơ [${selectedSpec}] của ${currentIngame} lên Firebase (wwm_builds)!`);
            setTimeout(() => setStatusBanner(null), 4000);
        } catch (err) {
            console.error("Lỗi lưu wwm_builds:", err);
            alert("⚠️ Đã lưu vào trình duyệt (Local), nhưng chưa ghi được lên Firebase. Hãy kiểm tra Rules của collection wwm_builds!");
        } finally {
            setIsSavingCloud(false);
        }
    };

    const handleSyncFromSoiAcc = () => {
        if (!playerProfiles) {
            alert("Chưa tải được dữ liệu Đài Chiếu Yêu!");
            return;
        }
        const matchEntry = Object.entries(playerProfiles).find(([_, d]: any) => {
            const pName = String(d?.playerName || d?.name || '').toLowerCase();
            return pName === currentIngame.toLowerCase();
        });

        if (!matchEntry) {
            alert(`Không tìm thấy hồ sơ /soi_acc của [${currentIngame}]. Đại hiệp có thể gõ trực tiếp con số vào các ô bên dưới!`);
            return;
        }

        try {
            const data: any = matchEntry[1];
            const raw = typeof data.full_raw_data === 'string' ? JSON.parse(data.full_raw_data) : data.full_raw_data;
            const attr = typeof raw?.attr === 'string' ? JSON.parse(raw.attr) : (raw?.attr || {});
            const agiFromGame = Number(attr.AGI || baseline.agility);
            const nextBase = { ...baseline, agility: agiFromGame };
            setBaseline(nextBase);
            saveBuildToCloud(nextBase, equipped, arsenal96, innerWays);
        } catch {
            alert("❌ Không bóc tách được chỉ số từ hồ sơ Soi Acc!");
        }
    };

    // ĐẾM SỐ LƯỢNG DÒNG TRÊN 8 MÓN ĐANG MẶC (BAO GỒM CẢ SỐ DÒNG LIÊN KẾT VỚI 3 THIÊN PHÚ ĐỘNG)
    const loadoutSummary = useMemo(() => {
        let maxPhysLines = 0;
        let powerLines = 0;
        let agiLines = 0;
        let critLines = 0;
        let precisionLines = 0;
        let godLines = 0;
        const byKeyCount: Record<string, number> = {};

        Object.values(equipped).forEach((item) => {
            if (!item) return;
            const allLines = [item.slot1, ...(item.tuningLines || [])];
            allLines.forEach((l) => {
                if (!l || Number(l.value) <= 0) return;
                byKeyCount[l.statKey] = (byKeyCount[l.statKey] || 0) + 1;

                const opt = statOptions.find(o => o.key === l.statKey);
                if (opt?.group === 'T0' || ['ART_UMBRELLA_BOOST', 'ALL_MARTIAL_ARTS_BOOST', 'BOSS_DMG_BOOST'].includes(l.statKey)) {
                    godLines++;
                }
                if (l.statKey === 'MAX_PHYS_ATK') maxPhysLines++;
                if (l.statKey === 'POWER') powerLines++;
                if (l.statKey === 'AGILITY') agiLines++;
                if (l.statKey === 'CRIT_RATE') critLines++;
                if (l.statKey === 'PRECISION_RATE') precisionLines++;
            });
        });

        return { maxPhysLines, powerLines, agiLines, critLines, precisionLines, godLines, byKeyCount };
    }, [equipped, statOptions]);

    const reqAgi = baseline.simulate23 ? baseline.agiThreshold23 : (baseline.reqAgility || 300);
    const reqPhys = baseline.reqMinPhysical || 750;
    const reqSilk = baseline.simulate23 ? baseline.silkThreshold23 : (baseline.reqMinSilkbind || 352);

    const evaluateGear = (item: GearItem) => {
        const slotMeta = SLOTS_CONFIG.find(s => s.key === item.slot)!;
        let badPoints = 0;
        const lineEvaluations: { line: TuningLine; isSlot1: boolean; badPt: number; tier: string; note: string }[] = [];
        const retunePriorities: string[] = [];
        const crossSpecHints: string[] = [];

        const t1Key = activeTalentsMeta.t1.linkedStatKey;
        const t2Key = activeTalentsMeta.t2.linkedStatKey;
        const t3Key = activeTalentsMeta.t3.linkedStatKey;

        const needT1Stat = (loadoutSummary.byKeyCount[t1Key] || 0) <= activeTalentsMeta.t1.recommendedLines || baseline.agility < reqAgi + 25;
        const needT2Stat = baseline.minPhysical < reqPhys;
        const needT3Stat = !baseline.arsenal96Active || baseline.minSilkbind < reqSilk;

        const allLines = [item.slot1, ...(item.tuningLines || [])];
        let hasValidGodLine = false;

        allLines.forEach((line, idx) => {
            const isSlot1 = idx === 0;
            const opt = statOptions.find(o => o.key === line.statKey);
            if (!opt) return;

            let pt = 0;
            const tierLabel: string = opt.group;
            let note = "Chuẩn";

            if (opt.group === 'T0') {
                pt = 0;
                hasValidGodLine = true;
                note = "🔥 GOD LINE T0 (>2 dòng Ngoại Công)";
            } else if (line.statKey === t1Key) {
                pt = needT1Stat ? 0 : 0.5;
                note = needT1Stat ? `✅ Giữ mốc 100% Thiên phú 1 (${activeTalentsMeta.t1.statTitle})` : `⚠️ Dư định mức Thiên phú 1 (+0.5 xấu)`;
            } else if (line.statKey === t3Key) {
                pt = needT3Stat ? 0 : 0.5;
                note = needT3Stat ? `✅ Bù mốc 100% Thiên phú 3 (${activeTalentsMeta.t3.statTitle})` : `⚠️ Đã đủ Thiên phú 3 từ Arsenal (+0.5 xấu)`;
            } else if (line.statKey === t2Key) {
                if (activeTalentsMeta.t2.recommendedLines > 0 || needT2Stat) {
                    pt = 0;
                    note = `✅ Kích Thiên phú 2 (${activeTalentsMeta.t2.statTitle})`;
                } else {
                    pt = 1.0;
                    note = `⚠️ Đã dư mốc Thiên phú 2 (+1.0 xấu)`;
                    retunePriorities.push(opt.labelVi);
                }
            } else if (opt.group === 'T1') {
                if (line.statKey === 'CRIT_RATE' && baseline.critRate > 80.5) {
                    pt = 0.5;
                    note = "⚠️ Overcap >80% Crit số vàng";
                } else {
                    pt = 0;
                    note = "✅ Chỉ số T1 Tối ưu";
                }
            } else if (opt.group === 'T2') {
                pt = 0.5;
                note = "Chỉ số T2 Tình huống (+0.5 điểm xấu)";
            } else {
                pt = 1.0;
                note = "❌ Dòng Rác / Lệch hệ (+1.0 điểm xấu)";
                retunePriorities.push(opt.labelVi);
                if (opt.crossSpecHint) {
                    crossSpecHints.push(`${opt.labelVi.split(']')[1]?.trim() || opt.labelVi}: ${opt.crossSpecHint}`);
                }
            }

            badPoints += pt;
            lineEvaluations.push({ line, isSlot1, badPt: pt, tier: tierLabel, note });
        });

        const missingRequiredGodLine = Boolean(slotMeta.godLineKey && !hasValidGodLine);

        const setOpt = gearSetOptions.find(s => s.key === item.gearSet);
        let setWarning: string | null = null;
        if (setOpt?.warningText && selectedSpec.includes('Kéo Tơ (Dame)')) {
            setWarning = setOpt.warningText;
        }

        const attuneOpt = attunementOptions.find(a => a.key === item.attunementKey);
        const attuneTrap = attuneOpt && !attuneOpt.isBiS ? attuneOpt.trapWarning || "Sai dòng Định Âm chuẩn!" : null;

        let verdictTitle = "";
        let verdictColor: 'emerald' | 'amber' | 'rose' = 'emerald';
        let verdictAction = "";

        if (setWarning) {
            verdictTitle = "🚫 CẢNH BÁO BỘ SET TRANG BỊ 2.3";
            verdictColor = 'rose';
            verdictAction = setWarning;
        } else if (hasValidGodLine && badPoints > 2.0) {
            verdictTitle = `🔥 GIỮ PHÔI T0 & DÙNG [GEAR TUNING RESET] (ĐỒ BẬC ${item.tier})`;
            verdictColor = 'amber';
            verdictAction = `Phôi sở hữu dòng Thần Cấp T0 nhưng các dòng phụ bị ${badPoints.toFixed(1)} điểm xấu (>2.0). Tuyệt đối KHÔNG vứt! Hãy dùng tính năng [Gear Tuning Reset] để tẩy lại!`;
        } else if (badPoints <= 0.5) {
            verdictTitle = "💎 CỰC PHẨM (GOD ROLL / BiS) - MẶC NGAY!";
            verdictColor = 'emerald';
            verdictAction = missingRequiredGodLine
                ? `Chỉ số cực đẹp (${badPoints.toFixed(1)} điểm xấu), lưu ý vị trí này có thể săn thêm dòng T0 [${slotMeta.godLineName}].`
                : `Hoàn mỹ (${badPoints.toFixed(1)} điểm xấu)! Đạt chuẩn T0/T1 cho hệ [${selectedSpec}].`;
        } else if (badPoints <= 2.0) {
            verdictTitle = "✨ DÙNG TỐT - TẨY LẠI (RETUNE) DÒNG RÁC";
            verdictColor = 'amber';
            verdictAction = retunePriorities.length > 0
                ? `Điểm xấu: ${badPoints.toFixed(1)}/2.0. Ưu tiên dùng đá Retune tẩy dòng: ${retunePriorities[0]} trước!`
                : `Điểm xấu: ${badPoints.toFixed(1)}/2.0. Phôi dùng tốt, có thể tinh chỉnh thêm 1 dòng phụ.`;
        } else {
            const tierMeta = tierOptions.find(t => t.tier === item.tier);
            if (item.tier <= 96 || tierMeta?.isArsenal) {
                verdictTitle = `📦 KHÔNG TẨY THÊM - CẤT VÀO KHO VŨ KHÍ (BẬC ${item.tier})`;
                verdictColor = 'amber';
                verdictAction = `Đồ Bậc ${item.tier} có ${badPoints.toFixed(1)} điểm xấu. Tuyệt đối KHÔNG phân tách và KHÔNG tốn nguyên liệu retune. Hãy chuyển vào Kho Vũ Khí (Arsenal) để lấy chỉ số cộng thẳng!`;
            } else {
                verdictTitle = "🗑️ PHÔI NHIỀU DÒNG XẤU (>2.0 ĐIỂM XẤU) - CÂN NHẮC RESET TUNING";
                verdictColor = 'rose';
                verdictAction = `Tổng điểm xấu ${badPoints.toFixed(1)} > 2.0 và chưa có dòng God Line T0.`;
            }
        }

        return {
            badPoints,
            lineEvaluations,
            hasValidGodLine,
            missingRequiredGodLine,
            setWarning,
            attuneTrap,
            verdictTitle,
            verdictColor,
            verdictAction,
            retunePriorities,
            crossSpecHints
        };
    };

    const currentSlotEquipped = equipped[activeSlot];
    const activeGearEval = useMemo(
        () => evaluateGear(activeEditingGear),
        [activeEditingGear, baseline, loadoutSummary, reqAgi, reqPhys, reqSilk, statOptions, attunementOptions, gearSetOptions, tierOptions, selectedSpec, activeTalentsMeta]
    );

    const comparisonDelta = useMemo(() => {
        const sumStat = (item: GearItem, key: string) => {
            const lines = [item.slot1, ...(item.tuningLines || [])];
            return lines.filter(l => l.statKey === key).reduce((acc, cur) => acc + (Number(cur.value) || 0), 0);
        };

        const targetGear = editorMode === 'compare_new' ? candidateGear : currentSlotEquipped;
        const t1Key = activeTalentsMeta.t1.linkedStatKey;
        const t3Key = activeTalentsMeta.t3.linkedStatKey;

        const deltaAgi = sumStat(targetGear, t1Key) - sumStat(currentSlotEquipped, t1Key);
        const deltaSilk = sumStat(targetGear, t3Key) - sumStat(currentSlotEquipped, t3Key);
        const deltaMaxPhys = sumStat(targetGear, 'MAX_PHYS_ATK') - sumStat(currentSlotEquipped, 'MAX_PHYS_ATK');
        const deltaPower = sumStat(targetGear, 'POWER') - sumStat(currentSlotEquipped, 'POWER');
        const deltaPrec = sumStat(targetGear, 'PRECISION_RATE') - sumStat(currentSlotEquipped, 'PRECISION_RATE');
        const deltaCrit = sumStat(targetGear, 'CRIT_RATE') - sumStat(currentSlotEquipped, 'CRIT_RATE');

        const newTotalAgi = +(baseline.agility + deltaAgi).toFixed(1);
        const newTotalSilk = +(baseline.minSilkbind + deltaSilk).toFixed(1);
        const newTotalPrec = +(baseline.precisionRate + deltaPrec).toFixed(2);
        const newTotalCrit = +(baseline.critRate + deltaCrit).toFixed(2);

        const breaksTalent1 = newTotalAgi < reqAgi;
        const breaksTalent3 = newTotalSilk < reqSilk;
        const dropsPrecision = newTotalPrec < 98.0;

        return {
            deltaAgi, deltaSilk, deltaMaxPhys, deltaPower, deltaPrec, deltaCrit,
            newTotalAgi, newTotalSilk, newTotalPrec, newTotalCrit,
            reqAgi, reqSilk, breaksTalent1, breaksTalent3, dropsPrecision
        };
    }, [candidateGear, currentSlotEquipped, baseline, editorMode, reqAgi, reqSilk, activeTalentsMeta]);

    const runGeminiOcr = async (base64DataUrl: string) => {
        setPreviewImage(base64DataUrl);
        setIsScanning(true);

        try {
            const base64Clean = base64DataUrl.split(',')[1];
            const statKeysCatalog = statOptions.map(o => `${o.key}: ${o.labelVi} / ${o.labelEn}`).join('\n');
            const setKeysCatalog = gearSetOptions.map(s => `${s.key}: ${s.labelVi}`).join('\n');

            const promptText = `Bạn là AI OCR chuyên đọc ảnh chụp màn hình trang bị game Where Winds Meet (Yến Vân Thập Lục Thanh - Bản 2.3).
Hãy đọc ảnh trang bị và trả về DUY NHẤT 1 JSON object theo cấu trúc sau (không bọc markdown):
{
  "name": "Tên món đồ trong ảnh",
  "slot": "umbrella | fan | disc | pendant | helm | chest | greaves | bracers",
  "tier": 100,
  "gearSet": "MÃ_SET",
  "slot1": { "statKey": "MÃ_STAT", "value": 48 },
  "tuningLines": [
    { "statKey": "MÃ_STAT", "value": 47.3 },
    { "statKey": "MÃ_STAT", "value": 44.6 },
    { "statKey": "MÃ_STAT", "value": 85 },
    { "statKey": "MÃ_STAT", "value": 41.5 }
  ],
  "attunementKey": "PHYS_PEN | UMBRELLA_PROJECTILE_BOOST | TRAP_LIGHT_HEAVY | TRAP_MARTIAL_SKILL | TRAP_FAN_SPECIAL | TRAP_FAN_CHARGED",
  "attunementValue": 5.8
}
Danh mục MÃ_SET:
${setKeysCatalog}
Danh mục MÃ_STAT:
${statKeysCatalog}`;

            if (!geminiApiKey.trim()) {
                alert("💡 Để AI tự động điền thông số từ ảnh, đại hiệp hãy dán Gemini API Key vào ô cấu hình góc phải trên cùng (hoặc chỉnh trực tiếp bằng menu bên dưới)!");
                setIsScanning(false);
                return;
            }

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey.trim()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: promptText },
                            { inlineData: { mimeType: 'image/png', data: base64Clean } }
                        ]
                    }]
                })
            });

            const json = await res.json();
            const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanedJson = rawText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);

            const targetSlot: SlotKey = (parsed.slot && SLOTS_CONFIG.some(s => s.key === parsed.slot)) ? parsed.slot : activeSlot;
            setActiveSlot(targetSlot);

            updateActiveEditingGear(prev => ({
                ...prev,
                name: parsed.name || prev.name,
                slot: targetSlot,
                tier: Number(parsed.tier) || prev.tier,
                gearSet: parsed.gearSet || prev.gearSet,
                slot1: parsed.slot1 || prev.slot1,
                tuningLines: Array.isArray(parsed.tuningLines) && parsed.tuningLines.length > 0 ? parsed.tuningLines : prev.tuningLines,
                attunementKey: parsed.attunementKey || prev.attunementKey,
                attunementValue: Number(parsed.attunementValue) || prev.attunementValue
            }));
        } catch (err) {
            console.error("Lỗi AI OCR:", err);
            alert("⚠️ AI không đọc rõ chữ trong ảnh. Đại hiệp hãy chọn nhanh các dòng bằng Dropdown bên dưới nhé!");
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            if (typeof ev.target?.result === 'string') {
                                runGeminiOcr(ev.target.result);
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [geminiApiKey, activeSlot, editorMode, statOptions, gearSetOptions]);

    const handleEquipCandidate = () => {
        if (editorMode === 'edit_equipped') {
            saveBuildToCloud(baseline, equipped, arsenal96, innerWays);
            return;
        }

        if (comparisonDelta.breaksTalent1 || comparisonDelta.breaksTalent3) {
            const confirmBreak = window.confirm("🚨 BÁO ĐỘNG ĐỎ: Thay món đồ này sẽ làm GÃY MỐC 100% THIÊN PHÚ VÕ HỌC! Đại hiệp vẫn muốn ép mặc chứ?");
            if (!confirmBreak) return;
        }

        const oldItem = equipped[activeSlot];
        let nextArsenal = [...arsenal96];

        if (oldItem && oldItem.tier <= 96) {
            nextArsenal = [oldItem, ...nextArsenal];
        }

        const nextEquipped = {
            ...equipped,
            [activeSlot]: { ...candidateGear, slot: activeSlot }
        };

        const nextBaseline: CharacterBaseline = {
            ...baseline,
            agility: comparisonDelta.newTotalAgi,
            minSilkbind: comparisonDelta.newTotalSilk,
            precisionRate: comparisonDelta.newTotalPrec,
            critRate: comparisonDelta.newTotalCrit
        };

        setEquipped(nextEquipped);
        setArsenal96(nextArsenal);
        setBaseline(nextBaseline);
        saveBuildToCloud(nextBaseline, nextEquipped, nextArsenal, innerWays);
    };

    const handleSendDiscordWebhook = async () => {
        if (!webhookUrl.trim()) {
            alert("Hãy dán Discord Webhook URL vào ô cấu hình phía trên trước!");
            return;
        }
        const slotMeta = SLOTS_CONFIG.find(s => s.key === activeSlot)!;
        const slotDisp = getSlotDisplayInfo(slotMeta, activeEditingGear);
        const colorInt = activeGearEval.verdictColor === 'emerald' ? 0x10b981 : activeGearEval.verdictColor === 'amber' ? 0xf59e0b : 0xef4444;

        const embed = {
            title: `${slotDisp.icon} GIÁM ĐỊNH THẦN KHÍ 2.3: ${activeEditingGear.name} (Bậc ${activeEditingGear.tier})`,
            description: `**Đại hiệp:** \`${currentIngame}\` • **Hệ phái:** \`${selectedSpec}\`\n**Phán quyết:** **${activeGearEval.verdictTitle}**\n> ${activeGearEval.verdictAction}`,
            color: colorInt,
            fields: [
                {
                    name: `📌 Vị Trí & Bộ Set (${slotDisp.title})`,
                    value: `Bộ: **${gearSetOptions.find(s => s.key === activeEditingGear.gearSet)?.labelVi || activeEditingGear.gearSet}** - Điểm xấu: **${activeGearEval.badPoints.toFixed(1)} / 2.0**`,
                    inline: false
                },
                {
                    name: '🌟 Dòng 1 (Slot 1)',
                    value: `${statOptions.find(o => o.key === activeEditingGear.slot1.statKey)?.labelVi || activeEditingGear.slot1.statKey}: **+${activeEditingGear.slot1.value}**`,
                    inline: true
                },
                {
                    name: '🔮 Dòng Định Âm (Slot Cuối)',
                    value: `${attunementOptions.find(a => a.key === activeEditingGear.attunementKey)?.labelVi || activeEditingGear.attunementKey}`,
                    inline: true
                }
            ],
            footer: { text: 'Thanh Long Sơn Trang • WWM 2.3 Gear Optimizer Hub' },
            timestamp: new Date().toISOString()
        };

        try {
            await fetch(webhookUrl.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
            alert("✅ Đã bắn Báo Cáo Giám Định Rich Embed vào kênh Discord thành công!");
        } catch {
            alert("❌ Không gửi được Webhook Discord, vui lòng kiểm tra lại URL!");
        }
    };

    const savedUsersInSpec = useMemo(() => {
        const specDoc = wwmBuilds?.[selectedSpec] || {};
        return Object.entries(specDoc).map(([uid, data]: any) => ({
            uid,
            ingame: danhLuc?.[uid]?.ingame || data?.ingame || `Cao thủ #${uid.slice(0, 5)}`,
            updatedAt: data?.updatedAt
        }));
    }, [wwmBuilds, selectedSpec, danhLuc]);

    const currentSlotMeta = SLOTS_CONFIG.find(s => s.key === activeSlot)!;
    const currentSlotDisplay = getSlotDisplayInfo(currentSlotMeta, activeEditingGear);

    const t1LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t1.linkedStatKey] || 0;
    const t2LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t2.linkedStatKey] || 0;
    const t3LineCount = loadoutSummary.byKeyCount[activeTalentsMeta.t3.linkedStatKey] || 0;

    return (
        <section className="space-y-6 animate-in fade-in duration-300 pb-16">
            {statusBanner && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg">
                    <span>{statusBanner}</span>
                    <button onClick={() => setStatusBanner(null)} className="text-emerald-400 hover:text-white">✕</button>
                </div>
            )}

            {/* THANH CHỌN HỆ VÕ HỌC (ĐỌC TRỰC TIẾP TỪ thanhlong_config -> wwm_data -> VO_HOC_LIST) */}
            <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-2">
                            <span>🐉 wwm_builds</span>
                            <span>•</span>
                            <span>NGUỒN VÕ HỌC: thanhlong_config/wwm_data.VO_HOC_LIST ({voHocList.length} hệ)</span>
                        </div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-amber-300 to-amber-500">
                            ⚔️ Thần Khí Các · Giám Định & Tối Ưu Đồ Võ Học
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                            Đang chỉnh sửa: <b className="text-emerald-400 font-mono">wwm_builds ➔ {selectedSpec || "Đang tải..."} ➔ {currentIngame}</b>
                            {hasUnsavedChanges && <span className="ml-2 text-amber-400 font-bold animate-pulse">● (Có thay đổi chưa lưu lên Mây)</span>}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setShowStatDictModal(true)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                        >
                            <span>⚙️ Tàng Kinh Các (Dòng / Set / Bậc / Vũ Khí / VO_HOC_LIST)</span>
                        </button>

                        <select
                            value={viewingUserId}
                            onChange={(e) => {
                                setHasUnsavedChanges(false);
                                setViewingUserId(e.target.value);
                            }}
                            className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-emerald-500"
                        >
                            <option value={currentUserId}>👤 Hồ sơ của tôi: {currentIngame}</option>
                            {savedUsersInSpec.filter(u => u.uid !== currentUserId).map(u => (
                                <option key={u.uid} value={u.uid}>👀 Xem đồng môn: {u.ingame}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={handleSyncFromSoiAcc}
                            className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                            title="Lấy nhanh chỉ số từ Đài Chiếu Yêu (/soi_acc)"
                        >
                            🔮 Kéo Chỉ Số Từ Soi Acc
                        </button>

                        <button
                            type="button"
                            disabled={isSavingCloud || viewingUserId !== currentUserId}
                            onClick={() => saveBuildToCloud()}
                            className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                                hasUnsavedChanges
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce'
                                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            }`}
                        >
                            {isSavingCloud ? "⏳ Đang lưu..." : "☁️ Lưu Hồ Sơ Lên Mây"}
                        </button>
                    </div>
                </div>

                {/* DANH SÁCH VÕ HỌC KÉO TRỰC TIẾP TỪ FIREBASE wwm_data.VO_HOC_LIST */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            Chọn Nhánh Võ Học (Trích xuất trực tiếp từ <code className="text-amber-300">thanhlong_config/wwm_data ➔ VO_HOC_LIST</code>):
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setDictTab('vohoc');
                                setShowStatDictModal(true);
                            }}
                            className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                        >
                            + Thêm / Sửa VO_HOC_LIST trên Firebase
                        </button>
                    </div>

                    {voHocList.length === 0 ? (
                        <div className="text-xs text-amber-400 py-2 animate-pulse">
                            🔮 Đang kéo danh sách VO_HOC_LIST từ thanhlong_config/wwm_data...
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {voHocList.map((specName) => {
                                const isSelected = selectedSpec === specName;
                                const countInSpec = Object.keys(wwmBuilds?.[specName] || {}).length;

                                return (
                                    <button
                                        key={specName}
                                        type="button"
                                        onClick={() => {
                                            setHasUnsavedChanges(false);
                                            setSelectedSpec(specName);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                                            isSelected
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                                : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>{specName.includes('Kéo Tơ') ? '☂️' : specName.includes('Chuông') ? '🗡️' : specName.includes('Xé Đá') ? '🪓' : '⚔️'}</span>
                                        <span>{specName}</span>
                                        {countInSpec > 0 && (
                                            <span className="px-1.5 py-0.2 bg-zinc-950 text-amber-400 rounded-full text-[10px] font-mono">
                                                {countInSpec}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 🟢 KHU VỰC 1: 3 THIÊN PHÚ VÕ HỌC ĐỘNG THEO TỪNG HỆ PHÁI (CHO PHÉP SỬA CẢ TÊN THIÊN PHÚ, TÊN CHỈ SỐ, DÒNG LIÊN KẾT & GHI CHÚ) */}
            <div className="bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div>
                        <h3 className="text-base font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            🔒 Quy Tắc #1: Khóa Cứng 100% Thiên Phú Võ Học — Hệ [{selectedSpec}]
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Mỗi hệ trong <code className="text-emerald-400">VO_HOC_LIST</code> có bộ 3 Thiên Phú riêng. Bạn có thể bấm nút <b>✏️ Sửa Khung 3 Thiên Phú</b> để tùy biến tên chỉ số & điều kiện cho từng hệ!
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setIsEditingTalentMeta(!isEditingTalentMeta)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                                isEditingTalentMeta
                                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                    : 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-amber-500/15'
                            }`}
                        >
                            {isEditingTalentMeta ? '✅ Xong Chỉnh Sửa Khung' : `✏️ Sửa Tên & Quy Tắc 3 Thiên Phú [${selectedSpec}]`}
                        </button>

                        {isEditingTalentMeta && (
                            <button
                                type="button"
                                onClick={handleSaveSpecTalentTemplateToCloud}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black cursor-pointer shadow-md"
                            >
                                💾 Lưu Làm Chuẩn Chung Cho Hệ [{selectedSpec}]
                            </button>
                        )}

                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.simulate23}
                                onChange={(e) => updateBaselineField({ simulate23: e.target.checked })}
                                className="accent-amber-400"
                            />
                            <span>🔥 Mô phỏng &lt;Mười Chiếu Chín Cấp U ·&gt; 2.3</span>
                        </label>

                        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={baseline.arsenal96Active}
                                onChange={(e) => updateBaselineField({ arsenal96Active: e.target.checked })}
                                className="accent-emerald-400"
                            />
                            <span>📦 Đã lắp Kho Vũ Khí (Arsenal)</span>
                        </label>
                    </div>
                </div>

                {/* 3 THẺ TIẾN TRÌNH THIÊN PHÚ VÕ HỌC (ĐỘNG 100% THEO TỪNG VÕ HỌC) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* THIÊN PHÚ 1 */}
                    <div className={`p-4 rounded-2xl border ${baseline.agility >= reqAgi ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t1.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t1', { badgeText: e.target.value })}
                                            placeholder="Nhãn hiệu ứng Thiên Phú 1..."
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t1.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t1', { statTitle: e.target.value })}
                                            placeholder="Tên chỉ số Thiên Phú 1..."
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t1.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t1.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.agility >= reqAgi ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.agility >= reqAgi ? '100% ĐẠT' : `THIẾU ${(reqAgi - baseline.agility).toFixed(0)}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.agility}
                                    onChange={(e) => updateBaselineField({ agility: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t1.reqLabel}</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqAgi}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (baseline.simulate23) updateBaselineField({ agiThreshold23: val });
                                        else updateBaselineField({ reqAgility: val });
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.agility >= reqAgi ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.agility / Math.max(1, reqAgi)) * 100)}%` }}></div>
                        </div>

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t1.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t1', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{o.labelVi}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t1.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t1', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                        title="Số dòng khuyến nghị trên đồ"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t1.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t1', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                    placeholder="Ghi chú hướng dẫn..."
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t1.noteTemplate} Hiện trên 8 món có: <b className="text-emerald-400">{t1LineCount}/{activeTalentsMeta.t1.recommendedLines} dòng</b>.
                            </p>
                        )}
                    </div>

                    {/* THIÊN PHÚ 2 */}
                    <div className={`p-4 rounded-2xl border ${baseline.minPhysical >= reqPhys ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t2.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t2', { badgeText: e.target.value })}
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t2.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t2', { statTitle: e.target.value })}
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t2.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t2.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.minPhysical >= reqPhys ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.minPhysical >= reqPhys ? '100% (MAX CAP)' : `THIẾU ${(reqPhys - baseline.minPhysical).toFixed(1)}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.minPhysical}
                                    onChange={(e) => updateBaselineField({ minPhysical: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t2.reqLabel}</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqPhys}
                                    onChange={(e) => updateBaselineField({ reqMinPhysical: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.minPhysical >= reqPhys ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.minPhysical / Math.max(1, reqPhys)) * 100)}%` }}></div>
                        </div>

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t2.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t2', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{o.labelVi}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t2.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t2', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t2.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t2', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t2.noteTemplate} ({baseline.minPhysical}/{reqPhys} • Đang có <b className="text-amber-300">{t2LineCount} dòng</b>).
                            </p>
                        )}
                    </div>

                    {/* THIÊN PHÚ 3 */}
                    <div className={`p-4 rounded-2xl border ${baseline.minSilkbind >= reqSilk ? 'bg-zinc-900/60 border-emerald-500/30' : 'bg-rose-950/30 border-rose-500'}`}>
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="flex-1">
                                {isEditingTalentMeta ? (
                                    <div className="space-y-1.5 mb-2">
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t3.badgeText}
                                            onChange={(e) => updateTalentCardMeta('t3', { badgeText: e.target.value })}
                                            className="w-full bg-zinc-950 border border-emerald-500/40 rounded px-2 py-1 text-[10px] font-bold text-emerald-300"
                                        />
                                        <input
                                            type="text"
                                            value={activeTalentsMeta.t3.statTitle}
                                            onChange={(e) => updateTalentCardMeta('t3', { statTitle: e.target.value })}
                                            className="w-full bg-zinc-950 border border-amber-500/40 rounded px-2 py-1 text-xs font-black text-zinc-100"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{activeTalentsMeta.t3.badgeText}</div>
                                        <div className="text-sm font-black text-zinc-100">{activeTalentsMeta.t3.statTitle}</div>
                                    </>
                                )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${baseline.minSilkbind >= reqSilk ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white'}`}>
                                {baseline.minSilkbind >= reqSilk ? '100% ĐẠT' : `THIẾU ${(reqSilk - baseline.minSilkbind).toFixed(1)}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 my-2">
                            <div className="flex-1">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">✏️ Chỉ số của bạn:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.minSilkbind}
                                    onChange={(e) => updateBaselineField({ minSilkbind: Number(e.target.value) })}
                                    className="w-full bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-amber-300 focus:outline-none"
                                />
                            </div>
                            <span className="text-zinc-500 font-bold pt-4">/</span>
                            <div className="w-28">
                                <span className="text-[9px] text-zinc-500 uppercase block mb-0.5">🎯 {activeTalentsMeta.t3.reqLabel}</span>
                                <input
                                    type="number"
                                    step="1"
                                    value={reqSilk}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (baseline.simulate23) updateBaselineField({ silkThreshold23: val });
                                        else updateBaselineField({ reqMinSilkbind: val });
                                    }}
                                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-sm font-mono font-bold text-zinc-300 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div className={`h-full transition-all ${baseline.minSilkbind >= reqSilk ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (baseline.minSilkbind / Math.max(1, reqSilk)) * 100)}%` }}></div>
                        </div>

                        {isEditingTalentMeta ? (
                            <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400">Dòng liên kết:</span>
                                    <select
                                        value={activeTalentsMeta.t3.linkedStatKey}
                                        onChange={(e) => updateTalentCardMeta('t3', { linkedStatKey: e.target.value })}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-amber-300"
                                    >
                                        {statOptions.map(o => <option key={o.key} value={o.key}>{o.labelVi}</option>)}
                                    </select>
                                    <input
                                        type="number"
                                        value={activeTalentsMeta.t3.recommendedLines}
                                        onChange={(e) => updateTalentCardMeta('t3', { recommendedLines: Number(e.target.value) })}
                                        className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-center font-mono text-emerald-300"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={activeTalentsMeta.t3.noteTemplate}
                                    onChange={(e) => updateTalentCardMeta('t3', { noteTemplate: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300"
                                />
                            </div>
                        ) : (
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                {activeTalentsMeta.t3.noteTemplate} (Đang có <b className="text-emerald-400">{t3LineCount} dòng</b> trên đồ).
                            </p>
                        )}
                    </div>
                </div>

                {/* 3 RATES SỐ VÀNG & API KEYS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-zinc-800/60">
                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl border ${baseline.precisionRate >= 98 ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-rose-950/40 border-rose-500'}`}>
                            <div className="text-[10px] font-bold text-amber-400 uppercase">🎯 Precision (Số Vàng ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.precisionRate}
                                    onChange={(e) => updateBaselineField({ precisionRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-amber-500/40 rounded px-2 py-1 text-sm font-mono font-black text-amber-300"
                                />
                                <span className="text-xs text-zinc-400">% / 100%</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                {baseline.precisionRate < 98 ? '🚨 <98% bị nhảy Sát Thương Xám!' : '✅ Chuẩn (Cần 4-5 dòng đồ 100)'}
                            </div>
                        </div>

                        <div className={`p-3 rounded-xl border ${baseline.critRate <= 80.5 ? 'bg-zinc-950/80 border-amber-500/30' : 'bg-amber-950/30 border-amber-400'}`}>
                            <div className="text-[10px] font-bold text-amber-400 uppercase">💥 Critical (Số Vàng ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.critRate}
                                    onChange={(e) => updateBaselineField({ critRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-amber-500/40 rounded px-2 py-1 text-sm font-mono font-black text-amber-300"
                                />
                                <span className="text-xs text-zinc-400">% / 80% Trần</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                {baseline.critRate > 80.5 ? '⚠️ Overcap >80% lãng phí!' : '✅ Mục tiêu chạm trần 80%'}
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-zinc-950/80 border-zinc-800">
                            <div className="text-[10px] font-bold text-zinc-400 uppercase">🌀 Affinity (Hiểu Ý ✏️)</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={baseline.affinityRate}
                                    onChange={(e) => updateBaselineField({ affinityRate: Number(e.target.value) })}
                                    className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-mono font-bold text-zinc-300"
                                />
                                <span className="text-xs text-zinc-500">% (~12% tự nhiên)</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                                Tùy biến theo hệ phái
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">🔑 Gemini API Key (Để quét ảnh OCR):</label>
                            <input
                                type="password"
                                value={geminiApiKey}
                                onChange={(e) => {
                                    setGeminiApiKey(e.target.value);
                                    localStorage.setItem('tl_gemini_key', e.target.value);
                                }}
                                placeholder="AIzaSy... (Tùy chọn)"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">📤 Discord Webhook URL:</label>
                            <input
                                type="text"
                                value={webhookUrl}
                                onChange={(e) => {
                                    setWebhookUrl(e.target.value);
                                    localStorage.setItem('tl_discord_webhook', e.target.value);
                                }}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KHU VỰC 2 & 3: LƯỚI 8 MÓN ĐANG MẶC (TRÁI) & BÀN CHỈNH SỬA / GIÁM ĐỊNH ĐỒ (PHẢI) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* CỘT TRÁI (5 CỘT): 8 MÓN ĐANG MẶC */}
                <div className="lg:col-span-5 bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                        <div>
                            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">
                                🛡️ 8 Món Đang Mặc ({currentIngame})
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                Nhấp vào món bất kỳ để <b>Sửa chỉ số món đang mặc</b> hoặc <b>Đối chiếu phôi mới</b>
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handleClearAll8Slots}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer"
                            >
                                🧹 Làm Trống 8 Món
                            </button>
                            <button
                                type="button"
                                onClick={handleLoadSampleBiS8Slots}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                            >
                                ✨ Nạp Mẫu BiS
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-950/90 p-3 rounded-2xl border border-zinc-800/80 text-center">
                        <div>
                            <div className="text-[10px] text-zinc-500">Max Physical</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.maxPhysLines} / 12 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Power (Lực đạo)</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.powerLines} / 10 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500 truncate">{activeTalentsMeta.t1.statTitle.split('(')[0]}</div>
                            <div className={`text-xs font-black font-mono ${t1LineCount >= activeTalentsMeta.t1.recommendedLines ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t1LineCount} / {activeTalentsMeta.t1.recommendedLines} dòng
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Precision (Chính xác)</div>
                            <div className="text-xs font-black font-mono text-cyan-300">{loadoutSummary.precisionLines} / 4-5 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Crit Rate (Chí mạng)</div>
                            <div className="text-xs font-black font-mono text-amber-300">{loadoutSummary.critLines} / ~7 dòng</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">God Lines T0</div>
                            <div className="text-xs font-black font-mono text-emerald-400">{loadoutSummary.godLines} / 5 dòng</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SLOTS_CONFIG.map((slot) => {
                            const item = equipped[slot.key];
                            const ev = evaluateGear(item);
                            const isSelected = activeSlot === slot.key;
                            const disp = getSlotDisplayInfo(slot, item);
                            const setLabel = gearSetOptions.find(s => s.key === item.gearSet)?.labelVi.split('(')[0].trim() || item.gearSet;

                            return (
                                <div
                                    key={slot.key}
                                    onClick={() => handleSelectSlot(slot.key)}
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                                        isSelected
                                            ? 'bg-emerald-950/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                            : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{disp.icon}</span>
                                            <div>
                                                <div className="text-xs font-black text-zinc-100">{disp.title}</div>
                                                <div className="text-[10px] text-emerald-400 font-semibold">
                                                    Bậc {item.tier} • {setLabel}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black shrink-0 ${
                                            ev.badPoints <= 0.5 ? 'bg-emerald-500/20 text-emerald-300' : ev.badPoints <= 2.0 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            {ev.badPoints.toFixed(1)} xấu
                                        </span>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-zinc-800/70 text-[10px] text-amber-300 font-medium truncate">
                                        Dòng 1: {statOptions.find(o => o.key === item.slot1.statKey)?.labelVi.replace(/^[^\]]+\]\s*/, '') || item.slot1.statKey} (+{item.slot1.value})
                                    </div>
                                    <div className="mt-1 text-[9px] text-zinc-400 truncate">
                                        {item.tuningLines.map(l => statOptions.find(o => o.key === l.statKey)?.labelEn.split(' ')[0] || l.statKey).join(' • ')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-3 border-t border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                                📦 Kho Vũ Khí (Arsenal Bảo Toàn)
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{arsenal96.length} món bảo toàn</span>
                        </div>
                        {arsenal96.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic bg-zinc-950/60 p-3 rounded-xl border border-dashed border-zinc-800">
                                Tuyệt đối KHÔNG phân tách (dismantle) đồ cũ có Mastery cao! Khi đại hiệp thay đồ bậc mới vào người, đồ cũ sẽ tự động cất vào đây để kích hoạt Thiên Phú 3.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {arsenal96.map((g, idx) => (
                                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 flex justify-between items-center text-xs">
                                        <span className="text-amber-300 font-bold">{g.name} (Bậc {g.tier} • {g.gearSet})</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHasUnsavedChanges(true);
                                                setArsenal96(arsenal96.filter((_, i) => i !== idx));
                                            }}
                                            className="text-zinc-500 hover:text-rose-400 text-[10px]"
                                        >
                                            ✕ Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* CỘT PHẢI (7 CỘT): CHỈNH SỬA MÓN ĐANG MẶC HOẶC SOI PHÔI MỚI NHẶT */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-[#090d16] border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-5">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setEditorMode('edit_equipped')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                    editorMode === 'edit_equipped'
                                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                <span>✏️ Chế Độ 1: Sửa Món Đang Mặc ({currentSlotDisplay.icon})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorMode('compare_new')}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                                    editorMode === 'compare_new'
                                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                <span>⚖️ Chế Độ 2: Soi Phôi Mới & So Sánh Delta</span>
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                                    {editorMode === 'edit_equipped'
                                        ? `🛠️ Đang Chỉnh Sửa Trực Tiếp: ${currentSlotDisplay.title}`
                                        : `🔍 Đang Soi Phôi Mới Nhặt So Với: ${currentSlotDisplay.title}`}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    Mọi danh mục <b>Vũ Khí, Bậc Đồ, Bộ Set, Dòng Tẩy Luyện & Định Âm</b> đều có nút <b>[+]</b> để thêm mới hoặc sửa chữ ngay lập tức!
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowStatDictModal(true)}
                                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all"
                                >
                                    ⚙️ Quản Lý / +Thêm Mới
                                </button>

                                <label className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer text-center transition-all">
                                    {isScanning ? "⏳ AI đang đọc..." : "📷 Tải Ảnh / Ctrl+V"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    if (typeof ev.target?.result === 'string') runGeminiOcr(ev.target.result);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        {previewImage && (
                            <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                                <img src={previewImage} alt="Gear Preview" className="w-20 h-20 object-cover rounded-xl border border-amber-500/30" />
                                <div className="text-xs text-zinc-300 space-y-1">
                                    <div className="font-bold text-emerald-400">✅ Đã nạp ảnh chụp màn hình trang bị!</div>
                                    <p className="text-[11px] text-zinc-500">Đại hiệp có thể kiểm tra hoặc tinh chỉnh lại các dòng bên dưới.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Vị trí món đồ (8 Ô chuẩn):</label>
                                <select
                                    value={activeSlot}
                                    onChange={(e) => handleSelectSlot(e.target.value as SlotKey)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                >
                                    {SLOTS_CONFIG.map(s => {
                                        const disp = getSlotDisplayInfo(s, equipped[s.key]);
                                        return (
                                            <option key={s.key} value={s.key}>{disp.icon} {disp.title}</option>
                                        );
                                    })}
                                </select>
                            </div>

                            {currentSlotMeta.isWeaponSlot ? (
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-bold text-amber-400 uppercase">⚔️ Loại Vũ Khí (Đa hệ phái):</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDictTab('weapon');
                                                setShowStatDictModal(true);
                                            }}
                                            className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                                        >
                                            + Thêm vũ khí
                                        </button>
                                    </div>
                                    <select
                                        value={activeEditingGear.weaponType || getDefaultWeaponForSpec(selectedSpec, activeSlot)}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, weaponType: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                    >
                                        {weaponTypeOptions.map(w => (
                                            <option key={w.key} value={w.key}>{w.icon} {w.labelVi} ({w.labelEn})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tên món đồ (Tùy chỉnh):</label>
                                    <input
                                        type="text"
                                        value={activeEditingGear.name}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, name: e.target.value }))}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                    />
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Bậc trang bị (Tier):</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('tier');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                                    >
                                        + Thêm Bậc Mới
                                    </button>
                                </div>
                                <select
                                    value={activeEditingGear.tier}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, tier: Number(e.target.value) }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                >
                                    {tierOptions.map(t => (
                                        <option key={t.tier} value={t.tier}>{t.labelVi}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Bộ Set Trang Bị:</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('gearset');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                                    >
                                        + Thêm / Sửa Bộ Set
                                    </button>
                                </div>
                                <select
                                    value={activeEditingGear.gearSet}
                                    onChange={(e) => updateActiveEditingGear(g => ({ ...g, gearSet: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
                                >
                                    {gearSetOptions.map(s => (
                                        <option key={s.key} value={s.key}>{s.labelVi}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* CHỈNH DÒNG 1, DÒNG #2-#5 VÀ ĐỊNH ÂM */}
                        <div className="space-y-3">
                            <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3.5">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                                        🌟 Dòng Đầu Tiên (Slot 1 - Initial / Base Line):
                                    </span>
                                    <span className="text-[10px] text-zinc-400">
                                        Gợi ý BiS: <b className="text-emerald-300">{currentSlotMeta.godLineName}</b>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={activeEditingGear.slot1.statKey}
                                        onChange={(e) => {
                                            const opt = statOptions.find(o => o.key === e.target.value);
                                            updateActiveEditingGear(g => ({
                                                ...g,
                                                slot1: { statKey: e.target.value, value: opt ? opt.defaultVal : 40 }
                                            }));
                                        }}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                    >
                                        {statOptions.map(o => (
                                            <option key={o.key} value={o.key}>{o.labelVi}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={activeEditingGear.slot1.value}
                                        onChange={(e) => updateActiveEditingGear(g => ({
                                            ...g,
                                            slot1: { ...g.slot1, value: Number(e.target.value) }
                                        }))}
                                        className="w-24 bg-zinc-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 text-center"
                                    />
                                </div>
                            </div>

                            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                                        🛠️ Các Dòng Tẩy Luyện (Tuning Lines - #2, #3, #4, #5... Mở Full Tất Cả Dòng):
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDictTab('tuning');
                                                setShowStatDictModal(true);
                                            }}
                                            className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold cursor-pointer"
                                        >
                                            ⚙️ Sửa chữ / +Thêm dòng mới
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateActiveEditingGear(g => ({
                                                ...g,
                                                tuningLines: [...g.tuningLines, { statKey: 'MAX_PHYS_ATK', value: 45 }]
                                            }))}
                                            className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                                        >
                                            + Thêm ô dòng (#{activeEditingGear.tuningLines.length + 2})
                                        </button>
                                    </div>
                                </div>

                                {activeEditingGear.tuningLines.map((tLine, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-zinc-500 w-6">#{idx + 2}</span>
                                        <select
                                            value={tLine.statKey}
                                            onChange={(e) => {
                                                const opt = statOptions.find(o => o.key === e.target.value);
                                                updateActiveEditingGear(g => {
                                                    const nextLines = [...g.tuningLines];
                                                    nextLines[idx] = { statKey: e.target.value, value: opt ? opt.defaultVal : 30 };
                                                    return { ...g, tuningLines: nextLines };
                                                });
                                            }}
                                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-medium"
                                        >
                                            {statOptions.map(o => (
                                                <option key={o.key} value={o.key}>{o.labelVi}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={tLine.value}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                updateActiveEditingGear(g => {
                                                    const nextLines = [...g.tuningLines];
                                                    nextLines[idx] = { ...nextLines[idx], value: val };
                                                    return { ...g, tuningLines: nextLines };
                                                });
                                            }}
                                            className="w-24 bg-zinc-900 border border-amber-500/40 rounded-xl px-2 py-1.5 text-xs font-mono font-bold text-amber-300 text-center"
                                        />
                                        {activeEditingGear.tuningLines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => updateActiveEditingGear(g => ({
                                                    ...g,
                                                    tuningLines: g.tuningLines.filter((_, i) => i !== idx)
                                                }))}
                                                className="text-zinc-600 hover:text-rose-400 px-1.5 text-xs cursor-pointer"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className={`rounded-2xl p-3.5 border ${activeGearEval.attuneTrap ? 'bg-rose-950/30 border-rose-500' : 'bg-cyan-950/20 border-cyan-500/30'}`}>
                                <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">
                                        🔮 Dòng Định Âm Khóa Cuối (Attunement):
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDictTab('attunement');
                                            setShowStatDictModal(true);
                                        }}
                                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-bold cursor-pointer"
                                    >
                                        ✍️ Sửa tên / +Thêm Định Âm mới
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={activeEditingGear.attunementKey}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, attunementKey: e.target.value }))}
                                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                                    >
                                        {attunementOptions.map(a => (
                                            <option key={a.key} value={a.key}>{a.labelVi}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={activeEditingGear.attunementValue || 0}
                                        onChange={(e) => updateActiveEditingGear(g => ({ ...g, attunementValue: Number(e.target.value) }))}
                                        placeholder="Chỉ số"
                                        className="w-24 bg-zinc-950 border border-cyan-500/40 rounded-xl px-2 py-2 text-xs font-mono font-bold text-cyan-300 text-center"
                                    />
                                </div>
                                {activeGearEval.attuneTrap && (
                                    <div className="mt-2 text-xs font-bold text-rose-400 bg-rose-950/60 px-3 py-2 rounded-xl border border-rose-500/40">
                                        {activeGearEval.attuneTrap}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HỘP PHÁN QUYẾT */}
                        <div className={`rounded-2xl p-5 border-2 shadow-xl space-y-3 ${
                            activeGearEval.verdictColor === 'emerald'
                                ? 'bg-emerald-950/30 border-emerald-500/60'
                                : activeGearEval.verdictColor === 'amber'
                                    ? 'bg-amber-950/30 border-amber-500/60'
                                    : 'bg-rose-950/30 border-rose-500/60'
                        }`}>
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <h4 className={`text-base font-black tracking-wide ${
                                    activeGearEval.verdictColor === 'emerald' ? 'text-emerald-300' : activeGearEval.verdictColor === 'amber' ? 'text-amber-300' : 'text-rose-300'
                                }`}>
                                    {activeGearEval.verdictTitle}
                                </h4>
                                <span className="px-3 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-xs font-mono font-black text-amber-400">
                                    Tổng Điểm Xấu: {activeGearEval.badPoints.toFixed(1)} / 2.0
                                </span>
                            </div>

                            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                {activeGearEval.verdictAction}
                            </p>

                            {activeGearEval.crossSpecHints.length > 0 && (
                                <div className="bg-zinc-950/80 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300">
                                    💡 <b>Gợi ý Đa Hệ Võ Học:</b> {activeGearEval.crossSpecHints.join(' • ')}
                                </div>
                            )}

                            {editorMode === 'compare_new' && (
                                <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        ⚖️ Độ Chênh Lệch (Delta) Nếu Thay Món Này Vào [{currentSlotDisplay.title}]:
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block truncate">{activeTalentsMeta.t1.statTitle}</span>
                                            <span className={`font-black ${comparisonDelta.deltaAgi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaAgi >= 0 ? `+${comparisonDelta.deltaAgi}` : comparisonDelta.deltaAgi} (➔ {comparisonDelta.newTotalAgi})
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block truncate">{activeTalentsMeta.t3.statTitle}</span>
                                            <span className={`font-black ${comparisonDelta.deltaSilk >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaSilk >= 0 ? `+${comparisonDelta.deltaSilk}` : comparisonDelta.deltaSilk} (➔ {comparisonDelta.newTotalSilk})
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Chính Xác (Số Vàng)</span>
                                            <span className={`font-black ${comparisonDelta.deltaPrec >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaPrec >= 0 ? `+${comparisonDelta.deltaPrec}%` : `${comparisonDelta.deltaPrec}%`} (➔ {comparisonDelta.newTotalPrec}%)
                                            </span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            <span className="text-[10px] text-zinc-500 block">Max Physical</span>
                                            <span className={`font-black ${comparisonDelta.deltaMaxPhys >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {comparisonDelta.deltaMaxPhys >= 0 ? `+${comparisonDelta.deltaMaxPhys}` : comparisonDelta.deltaMaxPhys}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleEquipCandidate}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                                >
                                    {editorMode === 'edit_equipped'
                                        ? `💾 Lưu Cập Nhật Món [${currentSlotDisplay.title}] Lên Mây`
                                        : `⚡ Thay Phôi Này Vào [${currentSlotDisplay.title}] & Lưu Mây`}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendDiscordWebhook}
                                    className="py-3 px-5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    📤 Gửi Báo Cáo Lên Discord
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* KHU VỰC 4: TÂM PHÁP */}
                    <div className="bg-[#090d16] border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                            <div>
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                                    📜 Quy Tắc #6: Cố Vấn Tâm Pháp (Inner Ways) & Chuỗi Chiêu 2.3
                                </h3>
                                <p className="text-[11px] text-zinc-400">
                                    Có thể gõ chỉnh sửa trực tiếp tên Tâm Pháp và cấp đột phá (Tier 1 ➔ Tier 6) cho từng hệ phái.
                                </p>
                            </div>

                            <select
                                value={innerWays.bossStyle}
                                onChange={(e) => {
                                    setHasUnsavedChanges(true);
                                    const style = e.target.value as 'flex23' | 'flying' | 'standing';
                                    if (style === 'flex23') {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 }, slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 } });
                                    } else if (style === 'flying') {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Fivefold Bleed (Ngũ Trùng Xuất Huyết)', tier: 6 }, slot4: { name: 'Thunderous Bloom (Xuân Lôi Nhất Nộ)', tier: 5 } });
                                    } else {
                                        setInnerWays({ ...innerWays, bossStyle: style, slot3: { name: 'Star Reacher (Trích Tinh)', tier: 5 }, slot4: { name: 'Breaking Point (Phá Cực)', tier: 4 } });
                                    }
                                }}
                                className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold"
                            >
                                <option value="flex23">🔥 Khuyên dùng số 1 Bản 2.3 (Naki&apos;s Flex Rotation ~61.7k DPS)</option>
                                <option value="flying">🦅 Đánh Boss Bay Nhảy (Flying Umbrella)</option>
                                <option value="standing">🗿 Đánh Boss Đứng Im (Walking Umbrella)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((sKey, idx) => (
                                <div key={sKey} className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 flex justify-between items-center gap-2">
                                    <div className="flex-1">
                                        <div className="text-[10px] text-emerald-400 font-bold uppercase">Ô Tâm Pháp {idx + 1}</div>
                                        <input
                                            type="text"
                                            value={innerWays[sKey].name}
                                            onChange={(e) => {
                                                setHasUnsavedChanges(true);
                                                setInnerWays({ ...innerWays, [sKey]: { ...innerWays[sKey], name: e.target.value } });
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs font-black text-amber-300 mt-1"
                                        />
                                    </div>
                                    <select
                                        value={innerWays[sKey].tier}
                                        onChange={(e) => {
                                            setHasUnsavedChanges(true);
                                            setInnerWays({ ...innerWays, [sKey]: { ...innerWays[sKey], tier: Number(e.target.value) } });
                                        }}
                                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold mt-4"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(t => <option key={t} value={t}>Tier {t}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 🟢 MODAL TÀNG KINH CÁC 2.3: QUẢN LÝ 6 HẠNG MỤC (BAO GỒM CẢ VO_HOC_LIST TRONG thanhlong_config/wwm_data) */}
            {showStatDictModal && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-emerald-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                            <div>
                                <h3 className="text-lg font-black text-amber-400">
                                    ⚙️ Tàng Kinh Các 2.3 · Quản Lý Dòng, Set, Bậc, Vũ Khí & VO_HOC_LIST
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Mọi chỉnh sửa hoặc thêm mới tại đây sẽ lưu trực tiếp vào <code className="text-emerald-400">thanhlong_config/wwm_data</code> trên Firebase!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowStatDictModal(false)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                            >
                                ✕ Đóng
                            </button>
                        </div>

                        {/* 6 TAB QUẢN LÝ */}
                        <div className="flex flex-wrap gap-2 p-3 bg-zinc-950/60 border-b border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setDictTab('tuning')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'tuning' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                🛠️ 1. Dòng Tẩy Luyện ({statOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('attunement')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'attunement' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                🔮 2. Dòng Định Âm ({attunementOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('gearset')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'gearset' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                🛡️ 3. Bộ Set ({gearSetOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('tier')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'tier' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                🔥 4. Bậc Tier ({tierOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('weapon')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'weapon' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                ⚔️ 5. Vũ Khí ({weaponTypeOptions.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setDictTab('vohoc')}
                                className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer ${
                                    dictTab === 'vohoc' ? 'bg-sky-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400'
                                }`}
                            >
                                🥋 6. Võ Học VO_HOC_LIST ({voHocList.length})
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
                            {/* TAB 1: DÒNG TẨY LUYỆN */}
                            {dictTab === 'tuning' && (
                                <>
                                    <form onSubmit={handleSaveCustomTuningStat} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-emerald-400 uppercase">
                                            {editingStatItem.key ? `✏️ Đang sửa mã: ${editingStatItem.key}` : '➕ Thêm Dòng Tẩy Luyện Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã định danh (Để trống tự tạo):</label>
                                            <input
                                                type="text"
                                                value={editingStatItem.key}
                                                onChange={(e) => setEditingStatItem({ ...editingStatItem, key: e.target.value })}
                                                placeholder="VD: NEW_SKILL_BOOST_24"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Tên hiển thị Tiếng Việt:</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingStatItem.labelVi}
                                                onChange={(e) => setEditingStatItem({ ...editingStatItem, labelVi: e.target.value })}
                                                placeholder="VD: 🌟 [T0] Cửu Kiếm Tăng Sát Thương"
                                                className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Phân Nhóm:</label>
                                                <select
                                                    value={editingStatItem.group}
                                                    onChange={(e) => setEditingStatItem({ ...editingStatItem, group: e.target.value as any })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-2 text-xs text-emerald-300 font-bold"
                                                >
                                                    <option value="T0">🌟 T0 (God Line - 0 xấu)</option>
                                                    <option value="T1">⚔️ T1 (Chuẩn - 0 xấu)</option>
                                                    <option value="T2">🌪️ T2 (Tình huống - 0.5 xấu)</option>
                                                    <option value="T3">❌ T3 (Rác - 1.0 xấu)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Số mặc định:</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editingStatItem.defaultVal}
                                                    onChange={(e) => setEditingStatItem({ ...editingStatItem, defaultVal: Number(e.target.value) })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingStatItem({ key: '', labelVi: '', labelEn: '', group: 'T1', defaultVal: 40, unit: '', crossSpecHint: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu Dòng Này</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {statOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-zinc-100 truncate">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key} • Nhóm: {item.group}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingStatItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* TAB 2: DÒNG ĐỊNH ÂM */}
                            {dictTab === 'attunement' && (
                                <>
                                    <form onSubmit={handleSaveCustomAttunement} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-cyan-400 uppercase">
                                            {editingAttuneItem.key ? `✏️ Đang sửa: ${editingAttuneItem.key}` : '➕ Thêm Dòng Định Âm Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-cyan-400 uppercase mb-1">Tên hiển thị Định Âm:</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingAttuneItem.labelVi}
                                                onChange={(e) => setEditingAttuneItem({ ...editingAttuneItem, labelVi: e.target.value })}
                                                placeholder="VD: ✅ Định Âm Chuẩn Vũ Khí Mới"
                                                className="w-full bg-zinc-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-300 font-bold"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                            <input type="checkbox" checked={editingAttuneItem.isBiS} onChange={(e) => setEditingAttuneItem({ ...editingAttuneItem, isBiS: e.target.checked })} className="accent-emerald-400" />
                                            <span className="text-xs text-zinc-300 font-bold">Là Định Âm Chuẩn (Không báo lỗi bẫy)</span>
                                        </label>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingAttuneItem({ key: '', labelVi: '', labelEn: '', side: 'both', isBiS: true, trapWarning: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu Định Âm</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {attunementOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-zinc-100 truncate">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingAttuneItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold shrink-0 cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* TAB 3: BỘ TRANG BỊ (GEAR SETS) */}
                            {dictTab === 'gearset' && (
                                <>
                                    <form onSubmit={handleSaveCustomGearSet} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-amber-400 uppercase">
                                            {editingSetItem.key ? `✏️ Đang sửa Bộ Set: ${editingSetItem.key}` : '➕ Thêm Bộ Trang Bị (Set) Mới'}
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã Set (Để trống tự tạo):</label>
                                            <input
                                                type="text"
                                                value={editingSetItem.key}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, key: e.target.value })}
                                                placeholder="VD: CrimsonMoon"
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Tên Bộ Set (Tiếng Việt / Anh):</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingSetItem.labelVi}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, labelVi: e.target.value })}
                                                placeholder="VD: Bộ Huyết Nguyệt (4 Vũ Khí Trái)"
                                                className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Cảnh báo nếu có:</label>
                                            <input
                                                type="text"
                                                value={editingSetItem.warningText || ''}
                                                onChange={(e) => setEditingSetItem({ ...editingSetItem, warningText: e.target.value })}
                                                placeholder="Tùy chọn..."
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingSetItem({ key: '', labelVi: '', labelEn: '', side: 'both', warningText: '' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-black text-xs uppercase cursor-pointer">💾 Lưu Bộ Set</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {gearSetOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold text-emerald-300 truncate">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingSetItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* TAB 4: BẬC TRANG BỊ (TIER) */}
                            {dictTab === 'tier' && (
                                <>
                                    <form onSubmit={handleSaveCustomTier} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-rose-400 uppercase">
                                            ➕ Thêm / Sửa Bậc Trang Bị (Tier)
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Con số Bậc (VD: 105, 110, 96...):</label>
                                            <input
                                                type="number"
                                                required
                                                value={editingTierItem.tier}
                                                onChange={(e) => {
                                                    const t = Number(e.target.value);
                                                    setEditingTierItem({ ...editingTierItem, tier: t, labelVi: `🔥 Bậc ${t} (Mới)` });
                                                }}
                                                className="w-full bg-zinc-900 border border-rose-500/40 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-black"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nhãn hiển thị:</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingTierItem.labelVi}
                                                onChange={(e) => setEditingTierItem({ ...editingTierItem, labelVi: e.target.value })}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 font-bold"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(editingTierItem.isArsenal)}
                                                onChange={(e) => setEditingTierItem({ ...editingTierItem, isArsenal: e.target.checked })}
                                                className="accent-amber-400"
                                            />
                                            <span className="text-xs text-zinc-300 font-bold">Là bậc đồ cũ dùng để cất vào Kho Vũ Khí (Arsenal)</span>
                                        </label>
                                        <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase cursor-pointer">
                                            💾 Lưu Bậc Trang Bị
                                        </button>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {tierOptions.map((item) => (
                                            <div key={item.tier} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-100">{item.labelVi}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono">Tier: {item.tier} • {item.isArsenal ? '📦 Đồ Arsenal' : '🔥 Đồ Chính'}</div>
                                                </div>
                                                <button type="button" onClick={() => setEditingTierItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* TAB 5: LOẠI VŨ KHÍ */}
                            {dictTab === 'weapon' && (
                                <>
                                    <form onSubmit={handleSaveCustomWeapon} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-purple-400 uppercase">
                                            {editingWeaponItem.key ? `✏️ Đang sửa Vũ Khí: ${editingWeaponItem.key}` : '➕ Thêm Loại Vũ Khí Mới'}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Icon:</label>
                                                <input
                                                    type="text"
                                                    value={editingWeaponItem.icon}
                                                    onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, icon: e.target.value })}
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-center text-base"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mã Vũ Khí (Tùy chọn):</label>
                                                <input
                                                    type="text"
                                                    value={editingWeaponItem.key}
                                                    onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, key: e.target.value })}
                                                    placeholder="VD: BOW_NEW"
                                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">Tên Vũ Khí (Tiếng Việt):</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingWeaponItem.labelVi}
                                                onChange={(e) => setEditingWeaponItem({ ...editingWeaponItem, labelVi: e.target.value })}
                                                placeholder="VD: Cung Tiễn / Đàn Cổ Cầm"
                                                className="w-full bg-zinc-900 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-300 font-bold"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => setEditingWeaponItem({ key: '', labelVi: '', labelEn: '', icon: '⚔️' })} className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer">Làm mới</button>
                                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs uppercase cursor-pointer">💾 Lưu Vũ Khí</button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {weaponTypeOptions.map((item) => (
                                            <div key={item.key} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xl">{item.icon}</span>
                                                    <div>
                                                        <div className="text-xs font-bold text-zinc-100">{item.labelVi}</div>
                                                        <div className="text-[10px] text-zinc-500 font-mono">Mã: {item.key}</div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setEditingWeaponItem({ ...item })} className="px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold cursor-pointer">✏️ Sửa</button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* 🟢 TAB 6: QUẢN LÝ TRỰC TIẾP MẢNG VO_HOC_LIST TRONG thanhlong_config/wwm_data */}
                            {dictTab === 'vohoc' && (
                                <>
                                    <form onSubmit={handleSaveVoHocList} className="lg:col-span-5 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3 h-fit">
                                        <div className="text-xs font-black text-sky-400 uppercase">
                                            {editingVoHocIndex !== null ? `✏️ Đang sửa Võ Học #${editingVoHocIndex}` : '➕ Thêm Võ Học Mới Vào VO_HOC_LIST'}
                                        </div>
                                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                                            Dữ liệu này đọc và ghi trực tiếp vào mảng <code className="text-amber-300">thanhlong_config ➔ wwm_data ➔ VO_HOC_LIST</code> (dùng chung cho cả Bot Discord và Web).
                                        </p>
                                        <div>
                                            <label className="block text-[10px] font-bold text-sky-400 uppercase mb-1">Tên Nhánh Võ Học:</label>
                                            <input
                                                type="text"
                                                required
                                                value={newVoHocName}
                                                onChange={(e) => setNewVoHocName(e.target.value)}
                                                placeholder="VD: Kéo Tơ (Trống Eo 2.3)"
                                                className="w-full bg-zinc-900 border border-sky-500/40 rounded-xl px-3 py-2 text-xs text-sky-300 font-bold"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            {editingVoHocIndex !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingVoHocIndex(null);
                                                        setNewVoHocName("");
                                                    }}
                                                    className="px-3 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                                                >
                                                    Hủy sửa
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black text-xs uppercase cursor-pointer"
                                            >
                                                💾 Lưu Vào wwm_data.VO_HOC_LIST
                                            </button>
                                        </div>
                                    </form>
                                    <div className="lg:col-span-7 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                        {voHocList.map((vhName, idx) => (
                                            <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 font-mono text-[10px]">#{idx}</span>
                                                    <span className="text-xs font-bold text-zinc-100">{vhName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingVoHocIndex(idx);
                                                            setNewVoHocName(vhName);
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-bold cursor-pointer"
                                                    >
                                                        ✏️ Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVoHoc(idx)}
                                                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}