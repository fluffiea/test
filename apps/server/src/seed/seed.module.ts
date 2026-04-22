import { Module } from '@nestjs/common';
import { UserModule } from '../modules/user/user.module';
import { SeedService } from './seed.service';

@Module({
  imports: [UserModule],
  providers: [SeedService],
})
export class SeedModule {}
