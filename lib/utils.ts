// lib/utils.ts
export const safeParse = (val: any) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return {}; }
};

export function warmBangHoi(name: string) {
    if (name && (name.includes("Thanh Long") || name.toLowerCase() === "thanhlong")) return "🐉 Thanh Long Sơn Trang";
    return name;
}