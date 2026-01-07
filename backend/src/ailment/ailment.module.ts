import { Module } from '@nestjs/common';
import { AilmentService } from './ailment.service';
import { AilmentResolver } from './ailment.resolver';

@Module({
  providers: [AilmentService, AilmentResolver],
  exports: [AilmentService],
})
export class AilmentModule {}
