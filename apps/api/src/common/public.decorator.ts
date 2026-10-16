import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "tlh:isPublic";

/** Libera a rota da exigência de sessão (setup, login, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
