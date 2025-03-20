const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types; // Import ObjectId
const EventModel = require("../../Models/Event");
const {
  createEvent,
  getAllEvents,
  getEventById,
  getFilteredEvents,
} = require("../../Controllers/eventController");

// Mock dependencies
jest.mock("../../Models/Event");

describe("Event Controller", () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request and response objects
    req = {
      body: {},
      params: {},
      query: {},
      file: null,
      fileUrl: null,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("createEvent", () => {
    it("should create an event with file URL", async () => {
      // Setup
      req.body = {
        name: "Test Event",
        startDate: "2025-04-01",
        startTime: "10:00",
        endDate: "2025-04-02",
        endTime: "18:00",
        eventAccess: "public",
        description: "Test description",
      };
      req.fileUrl = "http://example.com/image.jpg";

      const savedEvent = {
        ...req.body,
        thumbnail: req.fileUrl,
        _id: new ObjectId(), // MongoDB-generated _id
      };
      EventModel.create.mockResolvedValue(savedEvent);

      // Execute
      await createEvent(req, res);

      // Assert
      expect(EventModel.create).toHaveBeenCalledWith({
        name: req.body.name,
        startDate: req.body.startDate,
        startTime: req.body.startTime,
        endDate: req.body.endDate,
        endTime: req.body.endTime,
        eventAccess: req.body.eventAccess,
        description: req.body.description,
        thumbnail: req.fileUrl,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedEvent);
    });

    it("should create an event with file from S3", async () => {
      // Setup
      req.body = {
        name: "Test Event",
        startDate: "2025-04-01",
        startTime: "10:00",
        endDate: "2025-04-02",
        endTime: "18:00",
        eventAccess: "public",
      };
      req.file = { location: "s3://bucket/image.jpg" };

      const savedEvent = {
        ...req.body,
        thumbnail: req.file.location,
        _id: new ObjectId(), // MongoDB-generated _id
      };
      EventModel.create.mockResolvedValue(savedEvent);

      // Execute
      await createEvent(req, res);

      // Assert
      expect(EventModel.create).toHaveBeenCalledWith({
        name: req.body.name,
        startDate: req.body.startDate,
        startTime: req.body.startTime,
        endDate: req.body.endDate,
        endTime: req.body.endTime,
        eventAccess: req.body.eventAccess,
        thumbnail: req.file.location,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedEvent);
    });

    it("should create an event without thumbnail", async () => {
      // Setup
      req.body = {
        name: "Test Event",
        startDate: "2025-04-01",
        startTime: "10:00",
        endDate: "2025-04-02",
        endTime: "18:00",
        eventAccess: "public",
      };

      const savedEvent = {
        ...req.body,
        _id: new ObjectId(), // MongoDB-generated _id
      };
      EventModel.create.mockResolvedValue(savedEvent);

      // Execute
      await createEvent(req, res);

      // Assert
      expect(EventModel.create).toHaveBeenCalledWith({
        name: req.body.name,
        startDate: req.body.startDate,
        startTime: req.body.startTime,
        endDate: req.body.endDate,
        endTime: req.body.endTime,
        eventAccess: req.body.eventAccess,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedEvent);
    });

    it("should handle errors during event creation", async () => {
      // Setup
      req.body = {
        name: "Test Event",
      };

      const error = new Error("Database error");
      EventModel.create.mockRejectedValue(error);

      // Execute
      await createEvent(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Event creation failed",
        details: "Database error",
      });
    });
  });

  describe("getAllEvents", () => {
    it("should return all events with end date >= current date", async () => {
      // Setup
      const mockEvents = [
        {
          _id: new ObjectId(),
          name: "Event 1",
          endDate: new Date("2025-05-01"),
        },
        {
          _id: new ObjectId(),
          name: "Event 2",
          endDate: new Date("2025-06-01"),
        },
      ];

      EventModel.find.mockResolvedValue(mockEvents);

      // Execute
      await getAllEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalledWith({
        endDate: { $gte: expect.any(Date) },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it("should handle errors during event retrieval", async () => {
      // Setup
      const error = new Error("Database error");
      EventModel.find.mockRejectedValue(error);

      // Execute
      await getAllEvents(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch events",
      });
    });
  });

  describe("getEventById", () => {
    it("should return an event when valid ID is provided", async () => {
      // Setup
      const eventId = new ObjectId(); // Generate a valid ObjectId
      req.params.id = eventId;

      const mockEvent = {
        _id: eventId,
        name: "Test Event",
        startDate: new Date("2025-04-01"),
      };

      EventModel.findById.mockResolvedValue(mockEvent);

      // Execute
      await getEventById(req, res);

      // Assert
      expect(EventModel.findById).toHaveBeenCalledWith(eventId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvent);
    });

    it("should return 404 when event is not found", async () => {
      // Setup
      req.params.id = new ObjectId(); // Generate a valid ObjectId
      EventModel.findById.mockResolvedValue(null);

      // Execute
      await getEventById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Event not found" });
    });

    it("should handle errors during event retrieval", async () => {
      // Setup
      req.params.id = new ObjectId(); // Generate a valid ObjectId
      const error = new Error("Database error");
      EventModel.findById.mockRejectedValue(error);

      // Execute
      await getEventById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to retrieve event",
      });
    });
  });

  describe("getFilteredEvents", () => {
    beforeEach(() => {
      // Mock Date and Intl.DateTimeFormat for consistent testing
      const mockDate = new Date("2025-03-18T12:00:00Z");
      global.Date = jest.fn(() => mockDate);
      global.Date.now = jest.fn(() => mockDate.getTime());
      global.Date.prototype = Object.create(mockDate);

      global.Intl = {
        DateTimeFormat: jest.fn().mockImplementation(() => ({
          format: jest.fn().mockReturnValue("12:00"),
        })),
      };
    });

    afterEach(() => {
      // Restore original Date implementation
      global.Date = Date;
      global.Intl = Intl;
    });

    it("should return cancelled events when status is cancelled", async () => {
      // Setup
      req.query.status = "cancelled";
      const mockEvents = [
        { _id: new ObjectId(), name: "Event 1", isDeleted: true },
        { _id: new ObjectId(), name: "Event 2", isDeleted: true },
      ];

      EventModel.find.mockResolvedValue(mockEvents);

      // Execute
      await getFilteredEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalledWith({ isDeleted: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it("should return live events when status is live", async () => {
      // Setup
      req.query.status = "live";
      const mockEvents = [
        {
          _id: new ObjectId(),
          name: "Event 1",
          startDate: new Date("2025-03-17"),
        },
        {
          _id: new ObjectId(),
          name: "Event 2",
          startDate: new Date("2025-03-18"),
          startTime: "10:00",
        },
      ];

      EventModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEvents),
      });

      // Execute
      await getFilteredEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it("should return past events when status is past", async () => {
      // Setup
      req.query.status = "past";
      const mockEvents = [
        {
          _id: new ObjectId(),
          name: "Event 1",
          endDate: new Date("2025-03-17"),
        },
      ];

      EventModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEvents),
      });

      // Execute
      await getFilteredEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it("should return future events when status is future", async () => {
      // Setup
      req.query.status = "future";
      const mockEvents = [
        {
          _id: new ObjectId(),
          name: "Event 1",
          startDate: new Date("2025-03-19"),
        },
      ];

      EventModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEvents),
      });

      // Execute
      await getFilteredEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    it("should return all non-deleted events when status is all", async () => {
      // Setup
      req.query.status = "all";
      const mockEvents = [
        { _id: new ObjectId(), name: "Event 1", isDeleted: false },
        { _id: new ObjectId(), name: "Event 2", isDeleted: false },
      ];

      EventModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockEvents),
      });

      // Execute
      await getFilteredEvents(req, res);

      // Assert
      expect(EventModel.find).toHaveBeenCalledWith({ isDeleted: false });
      expect(res.json).toHaveBeenCalledWith(mockEvents);
    });

    // it("should handle errors during filtered events retrieval", async () => {
    //   // Setup
    //   req.query.status = "live";
    //   const error = new Error("Database error");
    //   EventModel.find.mockRejectedValue(error);

    //   // Execute
    //   await getFilteredEvents(req, res);

    //   // Assert
    //   expect(res.status).toHaveBeenCalledWith(500);
    //   expect(res.json).toHaveBeenCalledWith({
    //     message: "Internal Server Error",
    //   });
    // });
  });
});
