const express = require("express");
const router = express.Router();

const { isAdmin} = require("../Middlewares/Auth");
const {
  upload,
  processAndUploadImage,
} = require("../Middlewares/s3");
const {
  checkUserResponse,
  pollEvent,
  createEvent,
  getAllEvents,
  updateEvent,
  getEventByDate,
  getEventById,
  getFilteredEvents,
  getEventsByAccess,
  likeEvent,
  saveEvent,
  addComment,
  getComments,
  deleteeventbyid,
  attendance,
  getLikedEvents,
  getSavedEvents,
  getAllEventDates,
  softDeleteEvent
} = require("../Controllers/eventController");

router.post(
  "/create",
  isAdmin,
  upload.single("thumbnail"),
  processAndUploadImage,
  createEvent
);

router.get("/allevents",  getAllEvents);
router.get("/filter",  getFilteredEvents);
router.get("/eventaccess",  getEventsByAccess);
router.get("/geteventbydate",  getEventByDate);
router.get("/getalleventdates",getAllEventDates);
router.get("/liked", getLikedEvents);
router.get("/saved", getSavedEvents);
router.get("/:id", getEventById);
router.put("/:id", isAdmin, updateEvent);
router.patch("/soft-delete/:id", isAdmin,softDeleteEvent);
router.post("/:eventId/attendance", isAdmin, attendance);
router.post("/:eventId/like", likeEvent);
router.post("/:eventId/userresponse", pollEvent);
router.post("/:eventId/save", saveEvent);
router.post("/:eventId/comment", addComment);
router.get("/:eventId/comments",  getComments);
router.delete("/:id",isAdmin, deleteeventbyid);
router.get(
  "/check-response/:eventId/:userId",
  
  checkUserResponse
);


module.exports = router;
