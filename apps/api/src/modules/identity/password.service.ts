import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";

/** Parâmetros do perfil "second recommended option" da RFC 9106 (Argon2id, 64 MiB, t=3, p=4). */
const ARGON2_OPTIONS = { memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

@Injectable()
export class PasswordService {
  /** Hash descartável para equalizar o tempo de resposta quando o e-mail não existe. */
  private dummyHash?: Promise<string>;

  /** O algoritmo padrão de `@node-rs/argon2` é Argon2id (§44.2). */
  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash("tlh-dummy-password-for-timing");
    await this.verify(await this.dummyHash, password);
  }
}
