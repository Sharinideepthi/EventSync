const analyticsController = require("../../Controllers/Analytics");
const Event = require("../../Models/Event");
const User = require("../../Models/User");

// Mocking the model
jest.mock("../../Models/Event");
jest.mock("../../Models/User");

describe("Analytics Controller", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDepartmentDistribution", () => {
    it("should return department distribution stats", async () => {
      // Mock data
      const mockDepartmentStats = [
        { name: "Engineering", value: 12 },
        { name: "Marketing", value: 8 },
        { name: "HR", value: 5 },
      ];

      // Mock the User.aggregate method
      User.aggregate.mockResolvedValue(mockDepartmentStats);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getDepartmentDistribution(req, res);

      // Assertions
      expect(User.aggregate).toHaveBeenCalledWith([
        { $group: { _id: "$department", value: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: 1 } },
        { $sort: { value: -1 } },
      ]);
      expect(res.json).toHaveBeenCalledWith(mockDepartmentStats);
    });

    it("should handle errors", async () => {
      // Mock the User.aggregate method to throw an error
      const mockError = new Error("Database error");
      User.aggregate.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getDepartmentDistribution(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch department analytics",
        error: mockError,
      });
    });
  });

  describe("getEventsData", () => {
    it("should return events data with analytics", async () => {
      // Mock data
      const mockEventsData = [
        {
          name: "Tech Conference",
          eventAccess: "public",
          date: "2025-03-15",
          registered: 50,
          attended: 45,
          likes: 30,
          comments: 15,
        },
        {
          name: "Team Building",
          eventAccess: "private",
          date: "2025-03-10",
          registered: 20,
          attended: 18,
          likes: 12,
          comments: 8,
        },
      ];

      // Mock the Event.aggregate method
      Event.aggregate.mockResolvedValue(mockEventsData);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getEventsData(req, res);

      // Assertions
      expect(Event.aggregate).toHaveBeenCalledWith([
        {
          $project: {
            name: 1,
            eventAccess: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$startDate" } },
            registered: { $size: "$responseBy" },
            attended: { $size: "$attendance" },
            likes: { $size: "$likedBy" },
            comments: { $size: "$comments" },
          },
        },
        { $sort: { startDate: -1 } },
      ]);
      expect(res.json).toHaveBeenCalledWith(mockEventsData);
    });

    it("should handle errors", async () => {
      // Mock the Event.aggregate method to throw an error
      const mockError = new Error("Database error");
      Event.aggregate.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getEventsData(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch events analytics",
      });
    });
  });

  describe("getUserGrowthData", () => {
    it("should return user growth data by timeframe", async () => {
      // Mock data
      const mockTimeframe = "week";
      const mockUserGrowthData = [
        { _id: "2025-03-13", newUsers: 5 },
        { _id: "2025-03-14", newUsers: 8 },
        { _id: "2025-03-15", newUsers: 3 },
      ];
      const mockInitialUserCount = 100;

      // Mock the User.aggregate and User.countDocuments methods
      User.aggregate.mockResolvedValue(mockUserGrowthData);
      User.countDocuments.mockResolvedValue(mockInitialUserCount);

      // Expected formatted data
      const expectedFormattedData = [
        { date: "2025-03-13", newUsers: 5, users: 105 },
        { date: "2025-03-14", newUsers: 8, users: 113 },
        { date: "2025-03-15", newUsers: 3, users: 116 },
      ];

      // Mock request and response
      const req = { query: { timeframe: mockTimeframe } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getUserGrowthData(req, res);

      // Assertions
      // We can't directly test the date range since it's based on current date
      expect(User.aggregate).toHaveBeenCalled();
      expect(User.countDocuments).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expectedFormattedData);
    });

    it("should handle errors", async () => {
      // Mock the User.aggregate method to throw an error
      const mockError = new Error("Database error");
      User.aggregate.mockRejectedValue(mockError);

      // Mock request and response
      const req = { query: { timeframe: "week" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getUserGrowthData(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch user growth analytics",
      });
    });
  });

  describe("getEventTypesDistribution", () => {
    it("should return event types distribution", async () => {
      // Mock data
      const mockEventTypes = [
        { name: "public", value: 15 },
        { name: "private", value: 8 },
        { name: "invite", value: 5 },
      ];

      // Mock the Event.aggregate method
      Event.aggregate.mockResolvedValue(mockEventTypes);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getEventTypesDistribution(req, res);

      // Assertions
      expect(Event.aggregate).toHaveBeenCalledWith([
        { $group: { _id: "$eventAccess", value: { $sum: 1 } } },
        { $project: { _id: 0, name: "$_id", value: 1 } },
      ]);
      expect(res.json).toHaveBeenCalledWith(mockEventTypes);
    });

    it("should handle errors", async () => {
      // Mock the Event.aggregate method to throw an error
      const mockError = new Error("Database error");
      Event.aggregate.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getEventTypesDistribution(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch event types analytics",
      });
    });
  });

  describe("getEngagementData", () => {
    it("should return engagement data by date", async () => {
      // Mock data
      const mockEvents = [
        {
          likedBy: ["user1", "user2", "user3"],
          comments: ["comment1", "comment2"],
          savedBy: ["user1", "user4"],
          createdAt: new Date("2025-03-15"),
        },
        {
          likedBy: ["user1", "user5"],
          comments: ["comment3"],
          savedBy: ["user2"],
          createdAt: new Date("2025-03-16"),
        },
      ];

      // Expected result
      const expectedResult = [
        { date: "2025-03-15", likes: 3, comments: 2, saves: 2 },
        { date: "2025-03-16", likes: 2, comments: 1, saves: 1 },
      ];

      // Mock the Event.find method
      Event.find.mockResolvedValue(mockEvents);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getEngagementData(req, res);

      // Assertions
      expect(Event.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(expectedResult);
    });

    it("should handle errors", async () => {
      // Mock the Event.find method to throw an error
      const mockError = new Error("Database error");
      Event.find.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getEngagementData(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch engagement analytics",
      });
    });
  });

  describe("getTopEvents", () => {
    it("should return top events by attendance ratio", async () => {
      // Mock data
      const mockTopEvents = [
        {
          name: "Tech Talk",
          attendance: 45,
          responseBy: 50,
          attendanceRatio: 0.9,
        },
        {
          name: "Workshop",
          attendance: 18,
          responseBy: 20,
          attendanceRatio: 0.9,
        },
      ];

      // Mock the Event.aggregate method
      Event.aggregate.mockResolvedValue(mockTopEvents);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getTopEvents(req, res);

      // Assertions
      expect(Event.aggregate).toHaveBeenCalledWith([
        {
          $project: {
            name: 1,
            attendance: { $size: "$attendance" },
            responseBy: { $size: "$responseBy" },
            attendanceRatio: {
              $cond: {
                if: { $gt: [{ $size: "$responseBy" }, 0] },
                then: {
                  $divide: [{ $size: "$attendance" }, { $size: "$responseBy" }],
                },
                else: 0,
              },
            },
          },
        },
        { $sort: { attendanceRatio: -1 } },
        { $limit: 10 },
      ]);
      expect(res.json).toHaveBeenCalledWith(mockTopEvents);
    });

    it("should handle errors", async () => {
      // Mock the Event.aggregate method to throw an error
      const mockError = new Error("Database error");
      Event.aggregate.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getTopEvents(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch top events analytics",
      });
    });
  });

  describe("getUsersByDepartment", () => {
    it("should return users by department", async () => {
      // Mock data
      const mockDepartment = "Engineering";
      const mockUsers = [
        {
          name: "John Doe",
          email: "john@example.com",
          department: "Engineering",
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          department: "Engineering",
        },
      ];

      // Mock the User.find method
      User.find.mockResolvedValue(mockUsers);

      // Mock request and response
      const req = { query: { department: mockDepartment } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getUsersByDepartment(req, res);

      // Assertions
      expect(User.find).toHaveBeenCalledWith({ department: mockDepartment });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should return 400 if department is not provided", async () => {
      // Mock request and response
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getUsersByDepartment(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Department parameter is required",
      });
    });

    it("should handle errors", async () => {
      // Mock the User.find method to throw an error
      const mockError = new Error("Database error");
      User.find.mockRejectedValue(mockError);

      // Mock request and response
      const req = { query: { department: "Engineering" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getUsersByDepartment(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error while fetching users",
      });
    });
  });

  describe("getAllUsers", () => {
    it("should return all users", async () => {
      // Mock data
      const mockUsers = [
        {
          name: "John Doe",
          email: "john@example.com",
          department: "Engineering",
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          department: "Marketing",
        },
      ];

      // Mock the User.find method
      User.find.mockResolvedValue(mockUsers);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getAllUsers(req, res);

      // Assertions
      expect(User.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should handle errors", async () => {
      // Mock the User.find method to throw an error
      const mockError = new Error("Database error");
      User.find.mockRejectedValue(mockError);

      // Mock request and response
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getAllUsers(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error while fetching users",
      });
    });
  });

  describe("getUserById", () => {
    it("should return user by ID", async () => {
      // Mock data
      const mockUserId = "123456789012";
      const mockUser = {
        _id: mockUserId,
        name: "John Doe",
        email: "john@example.com",
        department: "Engineering",
      };

      // Mock the User.findById method
      User.findById.mockResolvedValue(mockUser);

      // Mock request and response
      const req = { params: { id: mockUserId } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getUserById(req, res);

      // Assertions
      expect(User.findById).toHaveBeenCalledWith(mockUserId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user is not found", async () => {
      // Mock the User.findById method to return null
      User.findById.mockResolvedValue(null);

      // Mock request and response
      const req = { params: { id: "123456789012" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Call the function
      await analyticsController.getUserById(req, res);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });

    it("should handle errors", async () => {
      // Mock the User.findById method to throw an error
      const mockError = new Error("Database error");
      User.findById.mockRejectedValue(mockError);

      // Mock request and response
      const req = { params: { id: "123456789012" } };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      // Mock console.error to prevent actual logging during tests
      console.error = jest.fn();

      // Call the function
      await analyticsController.getUserById(req, res);

      // Assertions
      expect(console.error).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Server error while fetching user",
      });
    });
  });

  describe("getDateRange", () => {
    it("should return correct date range for week timeframe", () => {
      // Save the original Date implementation
      const RealDate = global.Date;

      // Mock the Date constructor to return a fixed date
      const mockDate = new Date("2025-03-20T00:00:00Z");
      global.Date = jest.fn(() => mockDate);
      global.Date.now = RealDate.now;

      // Call the function through a temporary direct export
      const getDateRange =
        analyticsController.getDateRange ||
        require("../controllers/analyticsController").getDateRange;

      const result = getDateRange("week");

      // Reset the Date constructor
      global.Date = RealDate;

      // Check the result (startDate should be 7 days before the mockDate)
      const expectedStartDate = new Date("2025-03-13T00:00:00Z");

      // Check if the dates are close (within 1 day)
      const dayDiff =
        Math.abs(result.startDate - expectedStartDate) / (1000 * 60 * 60 * 24);
      expect(dayDiff).toBeLessThan(1);
      expect(result.endDate).toEqual(mockDate);
    });

    // Additional tests for other timeframes would follow a similar pattern
  });
});
