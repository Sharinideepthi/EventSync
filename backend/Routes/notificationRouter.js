const express = require("express");
const router = express.Router();
const notificationController = require("../Controllers/notificationController");
router.get("/", notificationController.getAllNotifications);
router.post("/", notificationController.createNotification);
router.get("/user/:userId", notificationController.getUserNotifications);
router.get("/unread/:userId", notificationController.getUnreadNotifications);
router.post("/markAsRead/:id", notificationController.markAsRead);
router.get("/:id", notificationController.getNotificationById);


module.exports = router;
