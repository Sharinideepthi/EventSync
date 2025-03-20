// __tests__/controllers/userManagement.test.js
const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

// const UserModel = require("../Models/User");
// const authController = require("../Controllers/userController");
// const { validUser } = require("../__tests__/mocks/mockUser");
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
app.get("/api/users", authController.getallUsers);
app.get("/api/users/:id", authController.getUserById);
app.put("/api/users/:id", authController.updateuser);
app.delete("/api/users/:id", authController.deleteUser);
app.get("/api/user-dept/:email", authController.getUserDeptByEmail);
app.get("/api/user-id/:email", authController.getUserIdByEmail);

describe("User Management Functions", () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user before each test
    testUser = await new UserModel({
      ...validUser,
      password: await require("bcrypt").hash(validUser.password, 10),
    }).save();
  });

  describe("Get All Users", () => {
    it("should return all users", async () => {
      const res = await request(app).get("/api/users");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].email).toBe(validUser.email);
    });
  });

  describe("Get User By ID", () => {
    it("should return user by ID", async () => {
      const res = await request(app).get(`/api/users/${testUser._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeTruthy();
      expect(res.body.user.email).toBe(validUser.email);
    });

    it("should return 404 for non-existent user ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/users/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Update User", () => {
    it("should update user information", async () => {
      const updateData = { name: "Updated Name" };

      const res = await request(app)
        .put(`/api/users/${testUser._id}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("updated successfully");
      expect(res.body.user.name).toBe(updateData.name);

      // Verify in database
      const updatedUser = await UserModel.findById(testUser._id);
      expect(updatedUser.name).toBe(updateData.name);
    });

    it("should return 400 when no fields to update", async () => {
      const res = await request(app).put(`/api/users/${testUser._id}`).send({});

      expect(res.statusCode).toBe(400);
    });
  });

  describe("Delete User", () => {
    it("should delete a user", async () => {
      const res = await request(app).delete(`/api/users/${testUser._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify user was deleted
      const deletedUser = await UserModel.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it("should return 404 for non-existent user ID", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/users/${fakeId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
