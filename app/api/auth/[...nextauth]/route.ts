import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

// ID của Server Thanh Long và các Role được phép vào Web
const GUILD_ID = "889524360992403506";
const ALLOWED_ROLES = [
    "961955225030258692",  // Master
    "1466085276152500411", // Bang Phó
    "1466080985450938512", // Trưởng Lão
    "1466080893591355497", // Hộ Pháp
    "1466080790113816820"  // Bang Chúng
];

const handler = NextAuth({
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
            // Yêu cầu Discord cấp quyền xem người dùng đang ở trong những Server nào
            authorization: "https://discord.com/api/oauth2/authorize?scope=identify+guilds.members.read",
        })
    ],
    callbacks: {
        async signIn({ account }) {
            try {
                // Cầm thẻ của người dùng sang gõ cửa API Discord xem có hộ khẩu Thanh Long không
                const res = await fetch(`https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`, {
                    headers: {
                        Authorization: `Bearer ${account?.access_token}`,
                    },
                });

                if (!res.ok) {
                    // Trả về false -> Kẻ này không ở trong Server Thanh Long -> Cấm cửa!
                    return false; 
                }

                const member = await res.json();
                
                // Kiểm tra xem áo họ mặc có đúng là Bang Chúng hoặc Cán Bộ không
                const hasAllowedRole = member.roles.some((roleId: string) => ALLOWED_ROLES.includes(roleId));

                // Đúng thì cho vào, sai thì đuổi về
                return hasAllowedRole;

            } catch (error) {
                console.error("Lỗi soi chiếu danh tính:", error);
                return false;
            }
        }
    }
})

export { handler as GET, handler as POST }