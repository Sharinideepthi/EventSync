// const authorizeRole = (roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res
//         .status(403)
//         .json({ message: "Unauthorized, user not authenticated" });
//     }

//     if (!roles.includes(req.user.role)) {
//       return res
//         .status(403)
//         .json({ message: "Forbidden: Insufficient permissions" });
//     }

//     next();
//   };
// };

// module.exports = authorizeRole;
