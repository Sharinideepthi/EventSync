// __tests__/controllers/auth.test.js
const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Mock dependencies
jest.mock(
  "../../utils/emailQueue",
  () => require("../mocks/mockEmail").mockSendEmail
);
jest.mock("jsonwebtoken");
// require("../../utils")
const UserModel = require("../../Models/User");
const authController = require("../../Controllers/AuthController");
const {
  validUser,
  loginCredentials,
  invalidLoginCredentials,
} = require("../mocks/mockUser");

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());

// Create routes for testing
app.post("/api/signup", authController.signup);
app.post("/api/login", authController.login);
app.post("/api/logout", authController.logout);
app.post("/api/forgot-password", authController.forgotPassword);
app.post("/api/reset-password/:token", authController.resetPassword);
app.get("/api/users", authController.getallUsers);
app.get("/api/users/:id", authController.getUserById);
app.put("/api/users/:id", authController.updateuser);
app.delete("/api/users/:id", authController.deleteUser);
app.get("/api/user-dept/:email", authController.getUserDeptByEmail);
app.get("/api/user-id/:email", authController.getUserIdByEmail);
app.post("/api/send-invite", authController.sendInvite);
app.get("/api/search-emails", authController.searchEmails);

// Setup JWT mock
jwt.sign.mockImplementation(() => "mock-token");

describe("Authentication Controller", () => {
  describe("Signup", () => {
    it("should create a new user and return token", async () => {
      const res = await request(app).post("/api/signup").send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe("mock-token");
      expect(res.body.email).toBe(validUser.email);

      // Check if user was actually saved
      const savedUser = await UserModel.findOne({ email: validUser.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.name).toBe(validUser.name);
    });

    it("should return 409 if user already exists", async () => {
      // Create user first
      await new UserModel({
        ...validUser,
        password: await require("bcrypt").hash(validUser.password, 10),
      }).save();

      // Try to create same user again
      const res = await request(app).post("/api/signup").send(validUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already exists");
    });
  });

  describe("Login", () => {
    beforeEach(async () => {
      // Create test user before each login test
      await new UserModel({
        ...validUser,
        password: await require("bcrypt").hash(validUser.password, 10),
      }).save();
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post("/api/login").send(loginCredentials);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe("mock-token");
    });

    it("should fail login with incorrect password", async () => {
      const res = await request(app)
        .post("/api/login")
        .send(invalidLoginCredentials);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should fail login with non-existent email", async () => {
      const res = await request(app)
        .post("/api/login")
        .send({ email: "nonexistent@example.com", password: "anypassword" });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Logout", () => {
    it("should clear token cookie on logout", async () => {
      const res = await request(app).post("/api/logout");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Check if 'Set-Cookie' header contains cookie clearing directive
      expect(res.headers["set-cookie"][0]).toContain("token=;");
    });
  });

  // Additional test cases would follow for other controller methods
});
