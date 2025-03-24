const Event = require("../Models/Event");
const User = require("../Models/User");

// const getDateRange = (timeframe) => {
//   const now = new Date();
//   let startDate = new Date();

//   switch (timeframe) {
//     case "week":
//       startDate.setDate(now.getDate() - 7);
//       break;
//     case "month":
//       startDate.setMonth(now.getMonth() - 1);
//       break;
//     case "quarter":
//       startDate.setMonth(now.getMonth() - 3);
//       break;
//     case "all":
//     default:
//       startDate = new Date(0);
//       break;
//   }

//   return { startDate, endDate: now };
// };

exports.getDepartmentDistribution = async (req, res) => {
  try {
    const departmentStats = await User.aggregate([
      { $group: { _id: "$department", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
      { $sort: { value: -1 } },
    ]);

    res.json(departmentStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch department analytics",error });
  }
};

exports.getEventsData = async (req, res) => {
  try {
    const events = await Event.aggregate([
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

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch events analytics" });
  }
};

// exports.getUserGrowthData = async (req, res) => {
//   try {
//     const { timeframe } = req.query;
//     const { startDate, endDate } = getDateRange(timeframe);

//     const userGrowthData = await User.aggregate([
//       { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//           newUsers: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     let cumulativeUsers = await User.countDocuments({
//       createdAt: { $lt: startDate },
//     });

//     const formattedData = userGrowthData.map((entry) => {
//       cumulativeUsers += entry.newUsers;
//       return {
//         date: entry._id,
//         newUsers: entry.newUsers,
//         users: cumulativeUsers,
//       };
//     });

//     res.json(formattedData);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch user growth analytics" });
//   }
// };

exports.getEventTypesDistribution = async (req, res) => {
  try {
    const eventTypes = await Event.aggregate([
      { $group: { _id: "$eventAccess", value: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", value: 1 } },
    ]);

    res.json(eventTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch event types analytics" });
  }
};

// exports.getEngagementData = async (req, res) => {
//   try {
//     const events = await Event.find({}).select(
//       "likedBy comments savedBy createdAt"
//     );
//     const engagementByDate = {};

//     events.forEach((event) => {
//       const date = event.createdAt.toISOString().split("T")[0];
//       if (!engagementByDate[date])
//         engagementByDate[date] = { likes: 0, comments: 0, saves: 0 };
//       engagementByDate[date].likes += event.likedBy.length;
//       engagementByDate[date].comments += event.comments.length;
//       engagementByDate[date].saves += event.savedBy.length;
//     });

//     const engagementData = Object.keys(engagementByDate)
//       .map((date) => ({ date, ...engagementByDate[date] }))
//       .sort((a, b) => new Date(a.date) - new Date(b.date));

//     res.json(engagementData);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch engagement analytics" });
//   }
// };

// exports.getTopEvents = async (req, res) => {
//   try {
//     const topEvents = await Event.aggregate([
//       {
//         $project: {
//           name: 1,
//           attendance: { $size: "$attendance" },
//           responseBy: { $size: "$responseBy" },
//           attendanceRatio: {
//             $cond: {
//               if: { $gt: [{ $size: "$responseBy" }, 0] },
//               then: {
//                 $divide: [{ $size: "$attendance" }, { $size: "$responseBy" }],
//               },
//               else: 0,
//             },
//           },
//         },
//       },
//       { $sort: { attendanceRatio: -1 } },
//       { $limit: 10 },
//     ]);

//     res.json(topEvents);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch top events analytics" });
//   }
// };

exports.getUsersByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    if (!department)
      return res
        .status(400)
        .json({ success: false, message: "Department parameter is required" });
    const users = await User.find({ department });
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching users" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    return res.status(200).json(users);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching users" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while fetching user" });
  }
};
