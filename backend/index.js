const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AuthRouter = require("./Routes/AuthRouter");
const EventRouter = require("./Routes/EventRouter");
const notificationRoutes = require("./Routes/notificationRouter");
const analytics = require("./Routes/Analytics");
// const path = require("path");

dotenv.config();
require("./Models/db");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: "GET,POST,PUT,DELETE,PATCH",
    allowedHeaders: "Content-Type,Authorization",
  })
);

app.use(cookieParser());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use("/api/auth", AuthRouter);
app.use("/events", EventRouter);

app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analytics);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
