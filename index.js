const express = require("express");
const app = express();
const path = require("path");
const db = require("./data/db");
const bodyParser = require("body-parser");
const session = require("express-session");
const axios = require("axios");

const PORT = 5000;

app.set("view engine", "ejs");
app.use(express.static("public")); // Serve static files from the public directory
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({ secret: "hotelkey", resave: false, saveUninitialized: true }),
);

// 📍 ROUTES

// Welcome page with weather
app.get("/", async (req, res) => {
  const apiKey = "9741d4f4b7ed836ae0e99139b886658e"; // Replace with actual API key
  const city = "Luang Prabang";

  let weather;
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`,
    );
    weather = response.data;
  } catch (error) {
    console.error("Weather API not available (API key needed)", error);
    weather = null; // Handle error gracefully
  }

  res.render("welcome", { weather });
});

// Activities, Restaurants, and Entertainment pages
app.get("/activities", async (req, res) =>
  renderCategory(res, "Activities", "Discover the wonders of Luang Prabang"),
);
app.get("/restaurants", async (req, res) =>
  renderCategory(res, "Restaurants", "Taste the flavors of Luang Prabang"),
);
app.get("/entertainment", async (req, res) =>
  renderCategory(res, "Entertainment", "Live TV and streaming services"),
);

async function renderCategory(res, category, subtitle) {
  try {
    const links = await db.getLinksByCategory(category);
    res.render("category", { title: category, subtitle, links, category });
  } catch (error) {
    console.error(`Error loading ${category.toLowerCase()}:`, error);
    res.render("category", { title: category, subtitle, links: [], category });
  }
}

// Admin routes
app.get("/login", (req, res) => res.render("login"));
app.post("/login", authenticateUser);
app.get("/admin", async (req, res) => checkAdminAccess(req, res));
app.post("/admin", async (req, res) => handleAdminPost(req, res));

async function authenticateUser(req, res) {
  const { user, pass } = req.body;
  if (user === "admin" && pass === "1234") {
    req.session.auth = true;
    res.redirect("/admin");
  } else {
    res.send("Login failed - Use admin/1234");
  }
}

async function checkAdminAccess(req, res) {
  if (!req.session.auth) return res.redirect("/login");
  try {
    const links = await db.getLinks();
    res.render("admin", { links });
  } catch (error) {
    console.error("Error loading links:", error);
    res.render("admin", { links: [] });
  }
}

async function handleAdminPost(req, res) {
  if (!req.session.auth) return res.redirect("/login");
  const { name, url, category, logo, description } = req.body;

  try {
    await db.addLink(name, url, category, logo, description || "");
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding link:", error);
    res.redirect("/admin");
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hotel TV Dashboard running on http://0.0.0.0:${PORT}`);
});
