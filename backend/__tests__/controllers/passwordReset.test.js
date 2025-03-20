// __tests__/controllers/passwordReset.test.js
const request = require("supertest");
const express = require("express");
const crypto = require("crypto");
// const Event = require("../../Models/Event");
const UserModel = require("../../Models/User");
const authController = require("../../Controllers/AuthController");
// const UserModel = require("../Models/User");
// const authController = require("../Controllers/userController");
const { validUser } = require("../mocks/mockUser");
const { mockSendEmail } = require("../mocks/mockEmail");

// Setup express app for testing
const app = express();
app.use(express.json());

// Create routes for testing
app.post("/api/forgot-password", authController.forgotPassword);
app.post("/api/reset-password/:token", authController.resetPassword);

describe("Password Reset Functions", () => {
  let testUser;

  beforeEach(async () => {
    // Reset mock between tests
    mockSendEmail.mockClear();

    // Create a test user before each test
    testUser = await new UserModel({
      ...validUser,
      password: await require("bcrypt").hash(validUser.password, 10),
    }).save();
  });

  describe("Forgot Password", () => {
    // it("should generate reset token and send email", async () => {
    //   console.log("Before API call");

    //   const res = await request(app)
    //     .post("/api/forgot-password")
    //     .send({ email: validUser.email });

    //   console.log("API response:", res.body);

    //   // Check if the user exists in the database before making assertions
    //   const userCheck = await UserModel.findOne({ email: validUser.email });
    //   console.log("User in DB:", userCheck ? "exists" : "not found");

    //   expect(res.statusCode).toBe(200);
    //   expect(res.body.message).toContain("Email sent successfully");

    //   console.log("sendEmail called times:", mockSendEmail.mock.calls.length);
    //   if (mockSendEmail.mock.calls.length > 0) {
    //     console.log("sendEmail first call:", mockSendEmail.mock.calls[0]);
    //   }

    //   expect(mockSendEmail).toHaveBeenCalledTimes(1);
    //   // Rest of your test...
    // });

    it("should return 404 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.statusCode).toBe(404);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("Reset Password", () => {
    it("should reset password with valid token", async () => {
      // Generate and save a real token first
      const resetToken = crypto.randomBytes(20).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      testUser.resetPasswordToken = hashedToken;
      testUser.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      await testUser.save();

      const res = await request(app)
        .post(`/api/reset-password/${resetToken}`)
        .send({ newPassword: "NewPassword123" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("Password reset successful");

      // Check if token was cleared
      const updatedUser = await UserModel.findOne({ email: validUser.email });
      expect(updatedUser.resetPasswordToken).toBeUndefined();
      expect(updatedUser.resetPasswordExpire).toBeUndefined();

      // Verify password was changed
      const bcrypt = require("bcrypt");
      const passwordMatches = await bcrypt.compare(
        "NewPassword123",
        updatedUser.password
      );
      expect(passwordMatches).toBe(true);
    });

    it("should fail with invalid token", async () => {
      const res = await request(app)
        .post("/api/reset-password/invalidtoken")
        .send({ newPassword: "NewPassword123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("Invalid or expired token");
    });
  });
});
