const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  name: String,
  startDate: Date,
  startTime: String,
  eventAccess: String,
  readBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "My_Users",
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const NotificationModel = mongoose.model("Notification", NotificationSchema);
module.exports = NotificationModel;
