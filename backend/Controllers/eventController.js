const EventModel = require("../Models/Event");
const Comment = require("../Models/Comment");
// const path = require("path");
// const fs = require("fs");
const mongoose = require("mongoose");
// const DeletedEvent = require("../Models/DeletedEvent");
// const { SendNotifications } = require("../helper/SendNotifications");

const createEvent = async (req, res) => {
  try {
    // console.log("createEvent controller called");
    // console.log("Request Body:", req.body);
    // console.log("File URL:", req.fileUrl);

    const newEvent = {
      name: req.body.name,
      startDate: req.body.startDate,
      startTime: req.body.startTime,
      endDate: req.body.endDate,
      endTime: req.body.endTime,
      eventAccess: req.body.eventAccess,
    };

    if (req.fileUrl) {
      newEvent.thumbnail = req.fileUrl;
    } else if (req.file) {
      newEvent.thumbnail = req.file.location;
    } else {
      // console.log("No file URL available");
    }

    if (req.body.description) {
      newEvent.description = req.body.description;
    }

    const savedEvent = await EventModel.create(newEvent);
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error("Error saving event:", error);
    res
      .status(500)
      .json({ error: "Event creation failed", details: error.message });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const currentDate = new Date();
    const events = await EventModel.find({ endDate: { $gte: currentDate } });
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to retrieve event" });
  }
};

const getFilteredEvents = async (req, res) => {
  try {
    const { status } = req.query;
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const options = {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    };
    const currentTime = new Intl.DateTimeFormat("en-IN", options).format(now);

    if (status === "cancelled") {
      try {
        const deletedEvents = await EventModel.find({ isDeleted: true });
        return res.status(200).json(deletedEvents);
      } catch (error) {
        console.error("Error fetching deleted events:", error);
        return res
          .status(500)
          .json({ message: "Error fetching deleted events", error });
      }
    }

    let query = {};

    if (status === "live") {
      query = {
        isDeleted: false,
        $and: [
          {
            $or: [
              { startDate: { $lt: new Date(currentDate) } },
              {
                $and: [
                  { startDate: { $eq: new Date(currentDate) } },
                  { startTime: { $lte: currentTime } },
                ],
              },
            ],
          },
          {
            $or: [
              { endDate: { $gt: new Date(currentDate) } },
              {
                $and: [
                  { endDate: { $eq: new Date(currentDate) } },
                  { endTime: { $gt: currentTime } },
                ],
              },
            ],
          },
        ],
      };
    } else if (status === "past") {
      query = {
        isDeleted: false,
        $or: [
          { endDate: { $lt: new Date(currentDate) } },
          {
            $and: [
              { endDate: { $eq: new Date(currentDate) } },
              { endTime: { $lte: currentTime } },
            ],
          },
        ],
      };
    } else if (status === "future") {
      query = {
        isDeleted: false,
        $or: [
          { startDate: { $gt: new Date(currentDate) } },
          {
            $and: [
              { startDate: { $eq: new Date(currentDate) } },
              { startTime: { $gt: currentTime } },
            ],
          },
        ],
      };
    } else if (status === "all") {
      query = { isDeleted: false };
    }

    const events = await EventModel.find(query).sort({
      startDate: 1,
      startTime: 1,
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const softDeleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { isDeleted, deletedAt } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Event ID is required" });
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(
      id,
      { isDeleted, deletedAt },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: "Event soft deleted successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Error soft deleting event:", error);
    return res
      .status(500)
      .json({ message: "Error soft deleting event", error: error.message });
  }
};

const getEventsByAccess = async (req, res) => {
  try {
    let { eventAccess } = req.query;

    if (!eventAccess) {
      return res
        .status(400)
        .json({ error: "eventAccess parameter is required" });
    }

    eventAccess = eventAccess.trim();
    let filter = {
      isDeleted: false,
      $or: [{ eventAccess: "Public" }],
    };

    if (eventAccess !== "Public") {
      filter.$or.push({ eventAccess });
    }

    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 5;
    let skip = (page - 1) * limit;

    const totalEvents = await EventModel.countDocuments(filter);
    const totalPages = Math.ceil(totalEvents / limit);

    const events = await EventModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      events,
      pagination: {
        currentPage: page,
        totalPages,
        totalEvents,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching events by access:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const pollEvent = async (req, res) => {
  const { _id: userId } = req.body;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const responseIndex = event.responseBy.findIndex(
      (id) => id.toString() === userId
    );

    if (responseIndex !== -1) {
      event.responseBy.splice(responseIndex, 1);
    } else {
      event.responseBy.push(userId);
    }

    await event.save();
    res.json({ responseBy: event.responseBy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const likeEvent = async (req, res) => {
  const { _id: userId } = req.body;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const likedIndex = event.likedBy.findIndex(
      (id) => id.toString() === userId
    );

    if (likedIndex !== -1) {
      event.likedBy.splice(likedIndex, 1);
    } else {
      event.likedBy.push(userId);
    }

    await event.save();
    res.json({ likedBy: event.likedBy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const saveEvent = async (req, res) => {
  const { _id: userId } = req.body;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const savedIndex = event.savedBy.findIndex(
      (id) => id.toString() === userId
    );

    if (savedIndex !== -1) {
      event.savedBy.splice(savedIndex, 1);
    } else {
      event.savedBy.push(userId);
    }

    await event.save();
    res.json({ savedBy: event.savedBy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  const { _id: userId } = req.body;
  const { eventId } = req.params;

  try {
    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const newComment = new Comment({
      user: userId,
      event: eventId,
      text: req.body.text,
    });
    await newComment.save();

    await newComment.populate("user", "name");

    event.comments.push(newComment._id);
    await event.save();

    res.json({ comments: event.comments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getComments = async (req, res) => {
  const { eventId } = req.params;

  try {
    const comments = await Comment.find({ event: eventId })
      .populate("user", "name")
      .select("_id text user");

    if (!comments || comments.length === 0) {
      return res.status(404).json("No comments found for this event.");
    }

    res.json(comments);
  } catch (error) {
    console.error("Oops! Unable to get all comments", error);
    res.status(500).json({ message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    console.log("Received request to update event:", req.params.id, req.body);

    const updatedEvent = await EventModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedEvent) {
      console.log("Event not found with ID:", req.params.id);
      return res.status(404).json({ message: "Event not found" });
    } else {
      console.log("found eventid");
    }

    console.log("Event updated successfully:", updatedEvent);
    res.json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    res
      .status(500)
      .json({ message: "Error updating event", error: error.message });
  }
};

const getAllEventDates = async (req, res) => {
  try {
    const { department } = req.query;

    let filter = {
      $or: [{ eventAccess: "Public" }],
    };

    if (department) {
      filter.$or.push({ eventAccess: department.trim() });
    }

    const events = await EventModel.find(filter);

    const uniqueDates = [
      ...new Set(
        events.map((event) => {
          const eventDate = new Date(event.startDate);
          return eventDate.toISOString().split("T")[0];
        })
      ),
    ];

    return res.status(200).json(uniqueDates);
  } catch (error) {
    console.error("Error fetching event dates:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getEventByDate = async (req, res) => {
  try {
    const { date, department } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let filter = {
      startDate: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ eventAccess: "Public" }],
    };

    if (department) {
      filter.$or.push({ eventAccess: department.trim() });
    }

    const events = await EventModel.find(filter).sort({ createdAt: -1 });

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteeventbyid = async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    event.isDeleted = true;
    event.deletedAt = new Date();
    await event.save();

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkUserResponse = async (req, res) => {
  try {
    const { eventId, userId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(eventId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID or user ID format",
      });
    }

    const event = await EventModel.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const hasResponded = event.responseBy.some(
      (respondent) => respondent.toString() === userId
    );

    return res.status(200).json({
      success: true,
      hasResponded,
      event: {
        _id: event._id,
        name: event.name,
        responseBy: event.responseBy,
      },
    });
  } catch (error) {
    console.error("Error checking user response:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while checking user response",
      error: error.message,
    });
  }
};

const attendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingEvent = await EventModel.findOne({
      _id: eventId,
      attendance: email,
    });

    if (existingEvent) {
      return res
        .status(409)
        .json({ message: "Email already added to attendance" });
    }

    const event = await EventModel.findByIdAndUpdate(
      eventId,
      { $push: { attendance: email } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Email added to attendance", event });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const getLikedEvents = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const likedEvents = await EventModel.find({
      likedBy: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    res.json(likedEvents);
  } catch (error) {
    console.error("Error fetching liked events:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching liked events", error: error.message });
  }
};

const getSavedEvents = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const savedEvents = await EventModel.find({
      savedBy: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });

    res.json(savedEvents);
  } catch (error) {
    console.error("Error fetching saved events:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching saved events", error: error.message });
  }
};

module.exports = {
  getLikedEvents,
  getSavedEvents,
  attendance,
  createEvent,
  deleteeventbyid,
  getAllEvents,
  getEventByDate,
  getAllEventDates,
  getEventById,
  getFilteredEvents,
  getEventsByAccess,
  likeEvent,
  saveEvent,
  addComment,
  getComments,
  updateEvent,
  pollEvent,
  checkUserResponse,
  softDeleteEvent,
};
