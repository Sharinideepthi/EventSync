const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "My_Users", required: true }, 
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true }, 
  text: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now },
});

const CommentModel = mongoose.model("Comment", CommentSchema);
module.exports = CommentModel;



