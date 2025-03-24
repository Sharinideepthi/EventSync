// __tests__/mocks/mockUser.js
const bcrypt = require("bcrypt");

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
  department: "IT",
  role: "user",
};

const loginCredentials = {
  email: "test@example.com",
  password: "password123",
};

const invalidLoginCredentials = {
  email: "test@example.com",
  password: "wrongpassword",
};

const mockEvent = {
  _id: "event123",
  name: "Test Event",
  description: "<p>This is a test event description</p>",
  startDate: new Date(),
  startTime: "14:00",
};

const mockUsers = [
  {
    _id: "user1",
    name: "User One",
    email: "user1@example.com",
    department: "HR",
    role: "admin",
  },
  {
    _id: "user2",
    name: "User Two",
    email: "user2@example.com",
    department: "IT",
    role: "user",
  },
];

module.exports = {
  validUser,
  loginCredentials,
  invalidLoginCredentials,
  mockEvent,
  mockUsers,
};
