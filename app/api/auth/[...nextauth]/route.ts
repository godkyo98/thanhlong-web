/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

// ID của Server Thanh Long và các Role được phép vào Web
const GUILD_ID = "889524360992403506";
const MASTER_ROLE_ID = "961955225030258692";
const OFFICER_ROLE_IDS = [
    MASTER_ROLE_ID,        // Master
    "1466085276152500411", // Bang Phó
    "1466080985450938512", // Trưởng Lão
    "1466080893591355497", // Hộ Pháp
];
const ALLOWED_ROLES = [
    ...OFFICER_ROLE_IDS,
    "1466080790113816820"  // Bang Chúng
];

const handler = NextAuth({
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
            issuer: "https://discord.com", // 🟢 Thêm dòng này để khớp với chuẩn OAuth mới của Discord
        } as any),
    ],
    callbacks: {
        async signIn({ user, account }) {
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
                const memberRoles: string[] = Array.isArray(member.roles) ? member.roles : [];

                // Kiểm tra xem áo họ mặc có đúng là Bang Chúng hoặc Cán Bộ không
                const hasAllowedRole = memberRoles.some((roleId: string) => ALLOWED_ROLES.includes(roleId));

                if (hasAllowedRole) {
                    (user as any).discordRoles = memberRoles;
                    (user as any).discordId = member?.user?.id || (user as any).id;
                }

                // Đúng thì cho vào, sai thì đuổi về
                return hasAllowedRole;

            } catch (error) {
                console.error("Lỗi soi chiếu danh tính:", error);
                return false;
            }
        },
        async jwt({ token, user, profile }) {
            if (user) {
                const roles: string[] = Array.isArray((user as any).discordRoles) ? (user as any).discordRoles : [];
                const discordId = (user as any).discordId || (profile as any)?.id || token.sub;
                (token as any).discordId = discordId;
                (token as any).roles = roles;
                (token as any).isMaster = roles.includes(MASTER_ROLE_ID);
                (token as any).isManager = roles.some((r) => OFFICER_ROLE_IDS.includes(r));
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                const u = session.user as any;
                u.id = (token as any).discordId || token.sub;
                u.roles = (token as any).roles || [];
                u.isMaster = Boolean((token as any).isMaster);
                u.isManager = Boolean((token as any).isManager);
            }
            return session;
        }
    }
})

export { handler as GET, handler as POST }