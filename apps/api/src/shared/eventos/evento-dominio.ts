import { randomUUID } from 'node:crypto';

/**
 * Envelope de todo evento de domínio. O payload é tipado pelo contrato do módulo emissor.
 * - eventId: usado pelos consumidores para idempotência
 * - ocorridoEm: ISO 8601 UTC (convenção explícita de datas)
 */
export interface EventoDominio<TTipo extends string = string, TPayload = unknown> {
  readonly eventId: string;
  readonly tipo: TTipo;
  readonly ocorridoEm: string;
  readonly payload: TPayload;
}

export function criarEvento<TTipo extends string, TPayload>(tipo: TTipo, payload: TPayload): EventoDominio<TTipo, TPayload> {
  return { eventId: randomUUID(), tipo, ocorridoEm: new Date().toISOString(), payload };
}
