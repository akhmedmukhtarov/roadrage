export const Role = {
    USER: "USER",
    ADMIN: "ADMIN"
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const CoinReason = {
    ADMIN_GRANT: "ADMIN_GRANT",
    SKIN_PURCHASE: "SKIN_PURCHASE",
    REACTION_PACK_PURCHASE: "REACTION_PACK_PURCHASE"
} as const;
export type CoinReason = (typeof CoinReason)[keyof typeof CoinReason];
