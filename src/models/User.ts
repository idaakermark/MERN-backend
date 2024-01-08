import { Document, Schema, Model, model, MongooseError } from "mongoose";
import bcrypt from "bcrypt";

interface IUser extends Document {
  userName: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userName: {
      type: String,
      required: true, 
      unique: true, 
      trim: true, 
    },
    password: {
      type: String,
      select: false,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    if (error instanceof MongooseError) next(error);
    else throw error;
  }
});

const User = model<IUser>("User", UserSchema);

export default User;