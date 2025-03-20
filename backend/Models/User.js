const mongoose = require("mongoose");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true,trim:true,lowercase:true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    role: { type: String, required: true,
      enum: ['user', 'admin'], 
      default: 'user' 
     },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    token: String,
  },
  { timestamps: true }
);

UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const UserModel = mongoose.model("My_Users", UserSchema);
module.exports = UserModel;
