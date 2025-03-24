// __tests__/controllers/auth.test.js
const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Mock dependencies
jest.mock("../../utils/emailQueue", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
jest.mock("jsonwebtoken");
jest.mock("../../Models/Event");
jest.mock("../../Models/User");

const UserModel = require("../../Models/User");
const Event = require("../../Models/Event");
const authController = require("../../Controllers/AuthController");

const {
  validUser,
  loginCredentials,
  invalidLoginCredentials,
  mockEvent,
  mockUsers,
} = require("../mocks/mockUser");

// Setup express app for testing
const app = express();
app.use(express.json());
app.use(cookieParser());

// Create routes for testing with correct paths
app.post("/api/auth/login", authController.login);
app.post("/api/auth/signup", authController.signup);
app.post("/api/auth/logout", authController.logout);
app.get("/api/auth/getallusers", authController.getallUsers);
app.post("/api/auth/forgot-password", authController.forgotPassword);
app.get("/api/auth/search-emails", authController.searchEmails);
app.post("/api/auth/send-invites", authController.sendInvite);
app.get("/api/auth/:id", authController.getUserById);
app.get("/api/auth/getUserIdByEmail/:email", authController.getUserIdByEmail);
app.get(
  "/api/auth/getUserDeptByEmail/:email",
  authController.getUserDeptByEmail
);
app.post("/api/auth/reset-password/:token", authController.resetPassword);
app.put("/api/auth/update/:id", authController.updateuser);
app.delete("/api/auth/deleteuser/:id", authController.deleteUser);

// Setup JWT mock
jwt.sign.mockImplementation(() => "mock-token");

describe("Authentication Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Signup", () => {
    it("should create a new user and return token", async () => {
      UserModel.findOne.mockResolvedValue(null);
      UserModel.prototype.save.mockResolvedValue({
        ...validUser,
        _id: "mockUserId",
      });

      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe("mock-token");
      expect(res.body.email).toBe(validUser.email);
      expect(UserModel.prototype.save).toHaveBeenCalled();
    });

    it("should return 409 if user already exists", async () => {
      UserModel.findOne.mockResolvedValue({ email: validUser.email });

      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("already exists");
    });

    it("should handle server errors", async () => {
      UserModel.findOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Login", () => {
    it("should login successfully with correct credentials", async () => {
      const mockUser = {
        ...validUser,
        password: await bcrypt.hash(validUser.password, 10),
        _id: "mockUserId",
      };
      UserModel.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send(loginCredentials);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe("mock-token");
    });

    it("should fail login with incorrect password", async () => {
      const mockUser = {
        ...validUser,
        password: await bcrypt.hash(validUser.password, 10),
        _id: "mockUserId",
      };
      UserModel.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send(invalidLoginCredentials);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should fail login with non-existent email", async () => {
      UserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@example.com", password: "anypassword" });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should handle server errors", async () => {
      UserModel.findOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/api/auth/login")
        .send(loginCredentials);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Logout", () => {
    it("should clear token cookie on logout", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"][0]).toContain("token=;");
    });
  });

  describe("Forgot Password", () => {
    it("should send reset email for valid user", async () => {
      const mockUser = {
        email: validUser.email,
        getResetPasswordToken: jest.fn().mockReturnValue("mockToken"),
        save: jest.fn().mockResolvedValue(true),
      };
      UserModel.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: validUser.email });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Email sent successfully");
      expect(mockUser.getResetPasswordToken).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should return 404 for non-existent user", async () => {
      UserModel.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("User not found");
    });

    it("should handle errors", async () => {
      UserModel.findOne.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: validUser.email });

      expect(res.statusCode).toBe(500);
    });
  });

  describe("User Management", () => {
    describe("getAllUsers", () => {
      it("should return all users", async () => {
        UserModel.find.mockResolvedValue(mockUsers);

        const res = await request(app).get("/api/auth/getallusers");

        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(mockUsers.length);
      });

      it("should handle errors", async () => {
        UserModel.find.mockRejectedValue(new Error("Database error"));

        const res = await request(app).get("/api/auth/getallusers");

        expect(res.statusCode).toBe(500);
      });
    });

    describe("getUserById", () => {
      it("should return user by ID", async () => {
        const mockUser = mockUsers[0];
        UserModel.findById.mockResolvedValue(mockUser);

        const res = await request(app).get(`/api/auth/${mockUser._id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.user).toEqual(mockUser);
      });

      it("should return 404 for non-existent user", async () => {
        UserModel.findById.mockResolvedValue(null);

        const res = await request(app).get("/api/auth/nonexistent");

        expect(res.statusCode).toBe(404);
      });

      it("should handle errors", async () => {
        UserModel.findById.mockRejectedValue(new Error("Database error"));

        const res = await request(app).get("/api/auth/error");

        expect(res.statusCode).toBe(500);
      });
    });

    describe("updateUser", () => {
      it("should update user successfully", async () => {
        const mockUser = {
          ...mockUsers[0],
          save: jest.fn().mockResolvedValue(true),
        };
        UserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

        const res = await request(app)
          .put(`/api/auth/update/${mockUser._id}`)
          .send({ name: "Updated Name" });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("User updated successfully");
      });

      it("should return 400 for no update data", async () => {
        const res = await request(app).put("/api/auth/update/mockId").send({});

        expect(res.statusCode).toBe(400);
      });

      it("should return 404 for non-existent user", async () => {
        UserModel.findByIdAndUpdate.mockResolvedValue(null);

        const res = await request(app)
          .put("/api/auth/update/nonexistent")
          .send({ name: "Updated Name" });

        expect(res.statusCode).toBe(404);
      });

      it("should handle errors", async () => {
        UserModel.findByIdAndUpdate.mockRejectedValue(
          new Error("Database error")
        );

        const res = await request(app)
          .put("/api/auth/update/error")
          .send({ name: "Updated Name" });

        expect(res.statusCode).toBe(500);
      });
    });

    describe("deleteUser", () => {
      it("should delete user successfully", async () => {
        UserModel.findByIdAndDelete.mockResolvedValue({ _id: "mockId" });

        const res = await request(app).delete("/api/auth/deleteuser/mockId");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it("should return 404 for non-existent user", async () => {
        UserModel.findByIdAndDelete.mockResolvedValue(null);

        const res = await request(app).delete(
          "/api/auth/deleteuser/nonexistent"
        );

        expect(res.statusCode).toBe(404);
      });

      it("should handle errors", async () => {
        UserModel.findByIdAndDelete.mockRejectedValue(
          new Error("Database error")
        );

        const res = await request(app).delete("/api/auth/deleteuser/error");

        expect(res.statusCode).toBe(500);
      });
    });
  });

  describe("User Lookup", () => {
    describe("getUserDeptByEmail", () => {
      it("should return user department by email", async () => {
        const mockUser = mockUsers[0];
        UserModel.findOne.mockResolvedValue(mockUser);

        const res = await request(app).get(
          `/api/auth/getUserDeptByEmail/${mockUser.email}`
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(mockUser.email);
      });

      it("should return 404 for non-existent user", async () => {
        UserModel.findOne.mockResolvedValue(null);

        const res = await request(app).get(
          "/api/auth/getUserDeptByEmail/nonexistent@example.com"
        );

        expect(res.statusCode).toBe(404);
      });

      it("should handle errors", async () => {
        UserModel.findOne.mockRejectedValue(new Error("Database error"));

        const res = await request(app).get(
          "/api/auth/getUserDeptByEmail/error@example.com"
        );

        expect(res.statusCode).toBe(500);
      });
    });

    describe("getUserIdByEmail", () => {
      it("should return user ID by email", async () => {
        const mockUser = mockUsers[0];
        UserModel.findOne.mockResolvedValue(mockUser);

        const res = await request(app).get(
          `/api/auth/getUserIdByEmail/${mockUser.email}`
        );

        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(mockUser.email);
      });

      it("should return 404 for non-existent user", async () => {
        UserModel.findOne.mockResolvedValue(null);

        const res = await request(app).get(
          "/api/auth/getUserIdByEmail/nonexistent@example.com"
        );

        expect(res.statusCode).toBe(404);
      });

      it("should handle errors", async () => {
        UserModel.findOne.mockRejectedValue(new Error("Database error"));

        const res = await request(app).get(
          "/api/auth/getUserIdByEmail/error@example.com"
        );

        expect(res.statusCode).toBe(500);
      });
    });
  });

  describe("sendInvite", () => {
    it("should send invites successfully", async () => {
      const mockEvent = {
        ...mockEvent,
        _id: "mockEventId",
        startDate: new Date(),
        startTime: "14:00",
      };
      Event.findById.mockResolvedValue(mockEvent);

      const reqBody = {
        eventId: "mockEventId",
        emails: ["test1@example.com", "test2@example.com"],
        usernames: ["User1", "User2"],
      };

      const res = await request(app)
        .post("/api/auth/send-invites")
        .send(reqBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Invitations sent successfully");
      expect(Event.findById).toHaveBeenCalledWith("mockEventId");
    });

    it("should return 400 for missing required fields", async () => {
      const res = await request(app).post("/api/auth/send-invites").send({
        eventId: "mockEventId",
      });

      expect(res.statusCode).toBe(400);
    });

    it("should return 404 for non-existent event", async () => {
      Event.findById.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/send-invites")
        .send({
          eventId: "nonexistent",
          emails: ["test@example.com"],
        });

      expect(res.statusCode).toBe(404);
    });

    it("should handle errors", async () => {
      Event.findById.mockRejectedValue(new Error("Database error"));

      const res = await request(app)
        .post("/api/auth/send-invites")
        .send({
          eventId: "error",
          emails: ["test@example.com"],
        });

      expect(res.statusCode).toBe(500);
    });
  });

  // Add tests for searchEmails and resetPassword if needed
});
