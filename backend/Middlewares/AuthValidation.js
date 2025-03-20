const signupValidation = (req, res, next) => {
  const { email, password } = req.body;

  const emailCheck = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "example.com",
    ];

    if (!email || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({
          message: "Bad request invalid email format ",
          error: "Invalid email format.",
        });
    }

    const domain = email.split("@")[1].toLowerCase();

    if (!validDomains.includes(domain)) {
      return res.status(400).json({
        message: "Bad request invalid email domain",
        error:
          "Invalid email domain. Please use a valid domain like gmail.com, yahoo.com, etc.",
      });
    }
  };

  const passwordCheck = (password) => {
    if (
      !password ||
      typeof password !== "string" ||
      password.length < 4 ||
      password.length > 100
    ) {
      return res.status(400).json({
        message: "Bad request password is short",
        error: "Password must be between 4 and 100 characters.",
      });
    }
  };

  emailCheck(email);
  passwordCheck(password);

  next();
};

module.exports = { signupValidation };
