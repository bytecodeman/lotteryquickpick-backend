const express = require("express");
const session = require("cookie-session");
const compression = require("compression");
const helmet = require("helmet");
const path = require("path");
const fetch = require("node-fetch");
require("dotenv").config();
const randomLibrary = require("./randomLibrary");
const mongo = require("./mongo");
const { convertToHTML, convertToText } = require("./quickPicksToEmail");
const mailer = require("./oauth2mailer");

const app = express();
const port = process.env.PORT || 5000;
const listener = app.listen(port, "0.0.0.0", () =>
  console.log("Listening on Port " + listener.address().port)
);

app.set("json replacer", function (key, value) {
  // undefined values are set to `null`
  if (typeof value === "undefined") {
    return null;
  }
  return value;
});

app.use(compression());

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: [
        "*",
        "data:",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "'unsafe-dynamic'",
      ],
      scriptSrc: ["*", "data:", "blob:", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["*", "data:", "blob:", "'unsafe-inline'"],
      styleSrc: ["*", "data:", "blob:", "'unsafe-inline'"],
      imgSrc: ["*", "data:", "blob:", "'unsafe-inline'"],
      frameSrc: ["*", "data:", "blob:", "'unsafe-inline'"],
    },
    reportOnly: false,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    name: "lotteryquickpickssilvestri",
    keys: ["xyzzy"],
  })
);
// CORS Headers => Required for cross-origin/ cross-server communication
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});

const getClientIPAddr = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress
  ).split(",")[0];
};

app.set("view engine", "pug");

//*************************************************************

function storeInDatabase(operation, data, req) {
  const ip = getClientIPAddr(req);
  const logData = {
    operation,
    ...data,
    ip,
    timestamp: Date.now(),
  };
  mongo.logData(logData);
}

function gamesSupported() {
  return { gamesSupported: randomLibrary.gamesSupported };
}

//*************************************************************

app.use(express.static(path.join(__dirname, "build")));

app.get("/supportedgames", (req, res) => {
  const method = "GET";
  let message;
  let gs;
  let status;
  try {
    message = "OK";
    gs = gamesSupported();
    status = 200;
  } catch (error) {
    message = "ERROR: " + (error.message || "Something went wrong!");
    gs = null;
    status = 422;
  }
  const data = {
    message,
    method,
    gs,
  };
  res.status(200).json(data);
});

app.post("/supportedgames", (req, res) => {
  const method = "POST";
  let message;
  let gs;
  let status;
  try {
    message = "OK";
    gs = gamesSupported();
    status = 200;
  } catch (error) {
    message = "ERROR: " + (error.message || "Something went wrong!");
    gs = null;
    status = 422;
  }
  const data = {
    message,
    method,
    gs,
  };
  res.status(200).json(data);
});

//*************************************************************

function getTheQuickPicks(reqData) {
  let gameIndex;
  if (
    typeof reqData.game !== "string" ||
    reqData.game.trim() === "" ||
    (gameIndex = randomLibrary.gamesSupported
      .map((e) => e.shortname)
      .indexOf(reqData.game.toLowerCase())) < 0
  ) {
    throw new Error(`Bad Game Specified: ${reqData.game}`);
  }
  const testNumber = /^\d+$/.test(reqData.number)
    ? global.parseInt(reqData.number)
    : NaN;
  if (testNumber !== testNumber) {
    throw new Error(`Invalid Number of Games: ${reqData.number}`);
  }
  const game = reqData.game.trim().toLowerCase();
  const number = reqData.number > 25 ? 25 : reqData.number;
  const qp = randomLibrary.generateQuickPicks(gameIndex, number);
  const padding = randomLibrary.gamesSupported[gameIndex].padding;
  const longName = randomLibrary.gamesSupported[gameIndex].longname;
  return { longName, padding, qp };
}

app.get("/:game/:number", (req, res) => {
  const reqData = req.params;
  const method = "GET";
  let message;
  let qp;
  let status;
  try {
    message = "OK";
    qp = getTheQuickPicks(reqData);
    status = 200;
  } catch (error) {
    message = "ERROR: " + (error.message || "Something went wrong!");
    qp = null;
    status = 422;
  }
  const data = {
    message,
    method,
    qp,
  };
  storeInDatabase("Gen QP", data, req);
  res.status(status).json(data);
});

app.post("/getquickpicks", async (req, res) => {
  const reqData = req.body;
  const method = "POST";
  let message;
  let qp;
  let status;
  try {
    message = "OK";
    qp = getTheQuickPicks(reqData);
    status = 200;
  } catch (error) {
    message = "ERROR: " + (error.message || "Something went wrong!");
    qp = null;
    status = 422;
  }
  const data = {
    message,
    method,
    qp,
  };
  storeInDatabase("Gen QP", data, req);
  res.status(status).json(data);
});

//*************************************************************

const validRecaptcha = async (token, ip) => {
  const siteVerify = "https://www.google.com/recaptcha/api/siteverify";
  const secret = `${process.env.RECAPTCHA_SECRET_KEY}`;
  const postBody = `secret=${secret}&response=${token}&remoteip=${ip}`;
  try {
    const response = await fetch(siteVerify, {
      method: "POST",
      body: postBody,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": postBody.length,
      },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const responseData = await response.json();

    return {
      success:
        responseData.success &&
        responseData.action === "getquickpicks" &&
        responseData.score >= 0.7,
    };
  } catch (error) {
    return { success: false, captchaError: error.message };
  }
};

app.post("/verifytoken", async (req, res) => {
  const reqData = req.body;
  const token = reqData.token;
  let status;
  const ip = getClientIPAddr(req);
  try {
    const response = await validRecaptcha(token, ip);
    status = response.success;
  } catch (error) {
    status = false;
  }
  res.json({ success: status });
});

app.get("/log", checkSignIn, (request, response) => {
  database.find({}, (err, data) => {
    if (err) {
      response.end();
      return;
    }
    response.json(data);
  });
});

function checkSignIn(req, res, next) {
  if (req.session.userLoggedIn) {
    next(); //If session exists, proceed to page
  } else {
    res.redirect("/login");
  }
}

app.get("/login", function (req, res) {
  res.render("login", { message: "Please login" });
});

app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("user logged out.");
  });
  res.redirect("/login");
});

app.post("/login", function (req, res) {
  if (!req.body.id || !req.body.password) {
    res.render("login", { message: "Please enter both id and password" });
  } else if (req.body.id === "Tony" && req.body.password === "Silvestri") {
    req.session.userLoggedIn = true;
    res.redirect("/log");
  } else {
    res.render("login", { message: "Invalid credentials!" });
  }
});

//*************************************************************

app.post("/send", async function (req, res) {
  let statusCode;
  let statusInfo;
  try {
    const data = req.body;

    await mailer.sendEmail({
      from: process.env.EMAIL,
      to: data.email, // list of receivers
      subject: `Here are your Lucky ${data.quickPicks.longName} Quick Picks`,
      text: convertToText(data.quickPicks), // plain text body
      html: convertToHTML(data.quickPicks), // html body
    });

    storeInDatabase("Send Email", data, req);

    statusCode = 200;
    statusInfo = {
      message: "Message Sent",
    };
  } catch (error) {
    statusCode = 422;
    statusInfo = {
      message: "ERROR sending message",
      error,
    };
  }

  res.status(statusCode).json(statusInfo);
});
