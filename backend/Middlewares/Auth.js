const jwt = require("jsonwebtoken");

const ensureAuthenticated = (req, res, next) => {
  // console.log("Cookies received:", req.cookies); // Debugging
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(403)
      .json({ message: "Unauthorized, JWT token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(token)
    // console.log("Decoded Token:", decoded); // Debugging
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res
      .status(403)
      .json({ message: "Unauthorized, JWT token is invalid or expired" });
  }
};
const isAdmin = (req, res, next) => {
  ensureAuthenticated(req, res, () => {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }
    next();
  });
};

module.exports = {ensureAuthenticated,isAdmin};
