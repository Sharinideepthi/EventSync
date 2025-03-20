const express = require("express");
const router = express.Router();
const analyticsController = require("../Controllers/Analytics");
const {
 
  isAdmin,
  
} = require("../Middlewares/Auth");
router.get("/departments", isAdmin,analyticsController.getDepartmentDistribution);
router.get("/events",isAdmin, analyticsController.getEventsData);
router.get("/user-growth", isAdmin,analyticsController.getUserGrowthData);
router.get("/event-types", isAdmin,analyticsController.getEventTypesDistribution);
router.get("/engagement", isAdmin,analyticsController.getEngagementData);
router.get("/top-events", isAdmin,analyticsController.getTopEvents);

router.get("/", (req, res) => {
  if (req.query.department) {
    return analyticsController.getUsersByDepartment(req, res);
  }
  return analyticsController.getAllUsers(req, res);
});

router.get("/:id", analyticsController.getUserById);

module.exports = router;
