import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { MomentController } from './moment.controller';
import { MomentService } from './moment.service';
import { Moment, MomentSchema } from './schemas/moment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Moment.name, schema: MomentSchema }]),
    // AuthModule：Controller 需要 JwtAccessGuard；UserModule：Service 需要 UserService。
    AuthModule,
    UserModule,
  ],
  controllers: [MomentController],
  providers: [MomentService],
})
export class MomentModule {}
