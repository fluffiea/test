import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true, index: true })
  username!: string;

  @Prop({ type: String, required: true })
  passwordHash!: string;

  @Prop({ type: String, required: true })
  nickname!: string;

  @Prop({ type: String, default: '' })
  avatar!: string;

  @Prop({ type: String, default: '' })
  bio!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  partnerId!: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  currentSessionId!: string | null;

  @Prop({ type: Date, default: null })
  lastOnlineAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
