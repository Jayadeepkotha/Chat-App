import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    deviceId: string;
    reports: number;
    bannedUntil: Date | null;
    lastOnline: Date;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    deviceId: { type: String, required: true, unique: true, index: true },
    reports: { type: Number, default: 0 },
    bannedUntil: { type: Date, default: null },
    lastOnline: { type: Date, default: Date.now },
}, {
    timestamps: true // Adds createdAt, updatedAt automatically
});

export default mongoose.model<IUser>('User', UserSchema);
