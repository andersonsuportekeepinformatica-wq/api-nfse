import { Module } from '@nestjs/common';
import { ContribuintesController } from './contribuintes.controller';
import { ContribuintesService } from './contribuintes.service';

@Module({
  controllers: [ContribuintesController],
  providers: [ContribuintesService],
  exports: [ContribuintesService],
})
export class ContribuintesModule {}
