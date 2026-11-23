import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OUTBOX, PrismaOutbox } from './outbox';
import { OutboxWorker } from './outbox.worker';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: OUTBOX, useClass: PrismaOutbox }, OutboxWorker],
  exports: [OUTBOX, OutboxWorker],
})
export class EventosModule {}
