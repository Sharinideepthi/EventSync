const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");
const crypto = require("crypto");
// const nodemailer = require("nodemailer");
const Event = require("../Models/Event");
const sendEmail = require("../utils/emailQueue");
require("dotenv").config();

const generateToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      _id: user._id,
      name: user.name,
      dept: user.department,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || "1d" }
  );
};

const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 24*24 * 60 * 60 * 1000,
  });
};

const searchEmails = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ message: "Query must be at least 2 characters" });
    }

    const users = await UserModel.aggregate([
      {
        $search: {
          index: "default",
          autocomplete: {
            query: query,
            path: "email",
            fuzzy: {
              maxEdits: 1,
              prefixLength: 1,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          email: 1,
          username: 1,
          score: { $meta: "searchScore" },
        },
      },
      {
        $limit: 10,
      },
    ]);

    res.json(users);
  } catch (error) {
    console.error("Email search error:", error);
    res.status(500).json({ message: "Server error during email search" });
  }
};

const sendInvite = async (req, res) => {
  const stripHtmlTags = (html) => {
    if (!html) return "";
    return html.replace(/<\/?[^>]+(>|$)/g, "");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    if (dateString instanceof Date) {
      const year = dateString.getFullYear();
      const month = String(dateString.getMonth() + 1).padStart(2, "0");
      const day = String(dateString.getDate()).padStart(2, "0");
      return `${day}-${month}-${year}`;
    }

    if (typeof dateString === "string") {
      const [year, month, day] = dateString.split("T")[0].split("-");
      return `${day}-${month}-${year}`;
    }

    return "N/A";
  };

  try {
    const { eventId, emails, usernames } = req.body;

    if (!eventId || !emails || !Array.isArray(emails) || emails.length === 0) {
      return res
        .status(400)
        .json({ message: "Event ID and email list are required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const formattedDate = formatDate(event.startDate);
    const formattedTime = event.startTime || "TBD";

    const createEmailTemplate = (event, username) => {
      const greeting = username ? `Hello ${username},` : "Hello,";

      const plainDescription = stripHtmlTags(event.description);
      const shortDescription = plainDescription
        ? plainDescription.length > 120
          ? `${plainDescription.slice(0, 120)}...`
          : plainDescription
        : "";
      return `
${greeting}

You are cordially invited to ${event.name}!

Event Details:
- Date: ${formattedDate}
- Time: ${formattedTime}
- Description: ${shortDescription}

To know more, follow the link below:
${process.env.FRONTEND_URL || "http://localhost:3000"}/eventf/${event._id}

We look forward to seeing you!

Best regards,
The Event Team
      `;
    };

    const emailPromises = emails.map((email, index) => {
      const username = usernames && usernames[index] ? usernames[index] : null;
      return sendEmail({
        email,
        subject: `Invitation: ${event.name}`,
        message: createEmailTemplate(event, username),
      });
    });

    await Promise.all(emailPromises);

    console.log(
      `Admin sent ${emails.length} invitations for event: ${event.name}`
    );

    res.status(200).json({ message: "Invitations sent successfully" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ message: "Failed to send invitations" });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User already exists, please login", success: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      department,
      role,
    });

    await newUser.save();

    const token = generateToken(newUser);
    setTokenCookie(res, token);

    res.status(201).json({
      message: "Signup successful",
      success: true,
      token,
      email,
      name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Auth failed: incorrect email or password",
        success: false,
      });
    }

    const isPassEqual = await bcrypt.compare(password, user.password);
    if (!isPassEqual) {
      return res.status(401).json({
        message: "Auth failed: incorrect email or password",
        success: false,
      });
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      success: true,
      token,
      email,
      name: user.name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error", success: false });
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully", success: true });
};

const getUserDeptByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await UserModel.findOne({ email }).select("email department");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserIdByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await UserModel.findOne({ email }).select("email _id");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getallUsers = async (req, res) => {
  try {
    const users = await UserModel.find({});
    res.json(users);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error getting all users data" });
  }
};

const updateuser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = {};

    if (req.body.name) updateData.name = req.body.name;
    if (req.body.department) updateData.department = req.body.department;
    if (req.body.email) updateData.email = req.body.email;

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting user" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save();

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

    const message = `Click the following link to reset your password: \n\n ${resetUrl} \n\n This link expires in 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      message,
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error sending reset email", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const { newPassword } = req.body;
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getUserDeptByEmail,
  getUserIdByEmail,
  getallUsers,
  updateuser,
  getUserById,
  deleteUser,
  forgotPassword,
  resetPassword,
  sendInvite,
  searchEmails,
};
