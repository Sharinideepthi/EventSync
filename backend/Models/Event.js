const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    name: String,
    startDate: Date,
    startTime: String,
    endDate: Date,
    endTime: String,
    thumbnail: String,
    description: String,
    eventAccess: String,
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "My_Users" }],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "My_Users" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    responseBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "My_Users" }],
    attendance: [String],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);


EventSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};


EventSchema.statics.restore = function (eventId) {
  return this.findByIdAndUpdate(
    eventId,
    { isDeleted: false, deletedAt: null },
    { new: true }
  );
};


EventSchema.pre("find", function () {
  
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.where({ isDeleted: false });
  }
});

EventSchema.pre("findOne", function () {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.where({ isDeleted: false });
  }
});

EventSchema.pre("countDocuments", function () {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.where({ isDeleted: false });
  }
});

const EventModel = mongoose.model("Event", EventSchema);
module.exports = EventModel;
