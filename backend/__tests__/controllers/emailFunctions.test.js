const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");

const Event = require("../../Models/Event");
const UserModel = require("../../Models/User");
const authController = require("../../Controllers/AuthController");
const { mockSendEmail } = require("../mocks/mockEmail");

// Mock nodemailer
jest.mock("nodemailer");

// Setup express app for testing
const app = express();
app.use(express.json());

// Create routes for testing
app.post("/api/send-invite", authController.sendInvite);
app.get("/api/search-emails", authController.searchEmails);

describe("Email Functions", () => {
  let mockTransporter;

  beforeEach(() => {
    // Setup nodemailer mock before each test
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ response: "250 Message Sent" }),
    };

    nodemailer.createTransport.mockReturnValue(mockTransporter);

    // Reset mock between tests
    mockSendEmail.mockClear();
  });

  describe("Send Invite", () => {
    let testEvent;

    beforeEach(async () => {
      // Create a test event
      testEvent = await new Event({
        name: "Test Event",
        description: "Test Description",
        startDate: new Date("2025-04-01"),
        startTime: "14:00",
        createdBy: new mongoose.Types.ObjectId(),
      }).save();
    });

    it("should return 400 if event ID or emails are missing", async () => {
      const res = await request(app)
        .post("/api/send-invite")
        .send({ emails: ["sharini5@gmail.com"] }); // Missing eventId

      expect(res.statusCode).toBe(400);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("should return 404 if event is not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post("/api/send-invite")
        .send({
          eventId: fakeId,
          emails: ["test@example.com"],
        });

      expect(res.statusCode).toBe(404);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("Search Emails", () => {
    beforeEach(async () => {
      // Create test users
      await UserModel.create([
        {
          name: "Test User",
          email: "testuser@example.com",
          password: "password",
          department: "Product",
          role: "user",
        },
        {
          name: "Another User",
          email: "another@example.com",
          password: "password",
          department: "Intern",
          role: "user",
        },
      ]);
    });

    it("should return 400 if query is too short", async () => {
      const res = await request(app)
        .get("/api/search-emails")
        .query({ query: "a" });

      expect(res.statusCode).toBe(400);
    });

    it("should return success status for valid query length", async () => {
      // Mock the aggregation pipeline for this test
      const originalAggregate = UserModel.aggregate;
      UserModel.aggregate = jest
        .fn()
        .mockResolvedValue([
          { email: "testuser@example.com", username: "Test User", score: 1.0 },
        ]);

      const res = await request(app)
        .get("/api/search-emails")
        .query({ query: "test" });

      expect(res.statusCode).toBe(200);

      // Restore original function
      UserModel.aggregate = originalAggregate;
    });
  });

  describe("SendEmail Unit Tests", () => {
    it("should create a transporter with correct config", async () => {
      const sendEmail = require("../../utils/emailQueue");

      const emailOptions = {
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
      };

      await sendEmail(emailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: "Gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    });

    it("should configure mail options correctly", async () => {
      const sendEmail = require("../../utils/emailQueue");

      const emailOptions = {
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
      };

      await sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test Message",
      });
    });

    it("should send the email through the transporter", async () => {
      const sendEmail = require("../../utils/emailQueue");

      const emailOptions = {
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
      };

      await sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it("should throw an error if sending fails", async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error("Failed to send email")
      );

      const sendEmail = require("../../utils/emailQueue");

      const emailOptions = {
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
      };

      await expect(sendEmail(emailOptions)).rejects.toThrow(
        "Failed to send email"
      );
    });
  });
});
