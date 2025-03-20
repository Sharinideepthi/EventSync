const Notification = require("../Models/Notification");
const User = require("../Models/User");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const notifications = await Notification.find({
      $or: [{ eventAccess: "Public" }, { eventAccess: user.department }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Validate ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // This query finds notifications that are either public or match the user's department
    // AND where the user's ID is not in the readBy array
    const notifications = await Notification.find({
      $and: [
        { $or: [{ eventAccess: "Public" }, { eventAccess: user.department }] },
        {
          readBy: {
            $not: {
              $elemMatch: {
                userId: userId,
              },
            },
          },
        },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { name, startDate, startTime, eventAccess } = req.body;

    const notification = await Notification.create({
      name,
      startDate,
      startTime,
      eventAccess,
      readBy: [], // Initialize empty readBy array
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notificationId = await Notification.findById(req.params.id);

    // const notificationId = req.params.notificationId;
    const { userId } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(userId) || !ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: "Notification not found",
      });
    }

    // Check if the notification is already read by this user
    const alreadyRead = notification.readBy.some(
      (reader) => reader.userId.toString() === userId
    );

    if (!alreadyRead) {
      // Add user to readBy array
      notification.readBy.push({ userId, readAt: new Date() });
      await notification.save();
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
  }
};
