const express = require('express');
const { searchEmails,sendInvite,forgotPassword,resetPassword,getUserIdByEmail,getUserById,signup, login, logout,getUserDeptByEmail, getallUsers,deleteUser,updateuser } = require('../Controllers/AuthController');
const { signupValidation} = require('../Middlewares/AuthValidation');
const {
  ensureAuthenticated,
  isAdmin,
 
} = require("../Middlewares/Auth");
const router = express.Router();
router.get("/check", ensureAuthenticated, (req, res) => {
    if (!req.user) {
        return res.json({ isAuthenticated: false, user: null });
    }
    res.json({ isAuthenticated: true, user: req.user });
});

router.post('/login', login);
router.post('/signup', signupValidation, signup);
router.post('/logout', logout);
router.get("/getallusers", getallUsers);
router.post("/forgot-password", forgotPassword);
router.get("/search-emails", isAdmin,searchEmails);
router.post("/send-invites", isAdmin,sendInvite);
router.get("/:id",getUserById)
router.get("/getUserIdByEmail/:email", getUserIdByEmail);
router.get("/getUserDeptByEmail/:email", getUserDeptByEmail);
router.post("/reset-password/:token", resetPassword);
router.put("/update/:id",updateuser)
router.delete("/deleteuser/:id",isAdmin,deleteUser)

module.exports = router;
