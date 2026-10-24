import { DomainError } from "./errors";

/** Quem executa a operação — sempre derivado da sessão no servidor. */
export type Actor = {
  id: string;
  isBarber: boolean;
  isAdmin: boolean;
};

export function assertAdmin(actor: Actor): void {
  if (!actor.isAdmin) {
    throw new DomainError("forbidden", "Acesso restrito à gestão.");
  }
}

export function assertBarber(actor: Actor): void {
  if (!actor.isBarber) {
    throw new DomainError("forbidden", "Acesso restrito a barbeiros.");
  }
}

/** Barbeiro só mexe na própria agenda; admin mexe em qualquer uma. */
export function assertCanManageBarberAgenda(actor: Actor, barberId: string): void {
  if (actor.isAdmin) return;
  if (actor.isBarber && actor.id === barberId) return;
  throw new DomainError("forbidden", "Você não pode alterar a agenda de outro barbeiro.");
}
