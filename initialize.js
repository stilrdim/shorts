const fs = require("fs");
const path = require("path");

// Example: 2026-05-27
const date = new Date().toISOString().split("T")[0]

const BASE_DIR = path.join(__dirname, "results");
const TODAYS_FOLDER = path.join(BASE_DIR, date);
const FOOD_FILENAME = "foods.txt";


function initializeFolder() {
  // Create new folder and /images/ inside it
  const imagesPath = path.join(TODAYS_FOLDER, "images")

  fs.mkdirSync(imagesPath, { recursive: true })

  const foodsPath = path.join(TODAYS_FOLDER, FOOD_FILENAME);

  // Create new foods.txt
  if (!fs.existsSync(foodsPath)) {
    fs.writeFileSync(foodsPath, "", "utf-8");
  }
}

function main() {
  initializeFolder();
  console.log(`Folder ${date} created.`);
}

main()