const fs = require("fs");
const path = require("path");

// ARGS
const amountOfDaysArg = process.argv.indexOf("--days");
let AMOUNT_OF_DAYS = amountOfDaysArg !== -1 ? Number(process.argv[amountOfDaysArg + 1]) : 7;
if (!AMOUNT_OF_DAYS) { // Empty space returning   undefined => NaN
  AMOUNT_OF_DAYS = 7;
}


// Example: 2026-05-27
const date = new Date().toISOString().split("T")[0]

const BASE_DIR = path.join(__dirname, "results");
const FOOD_FILENAME = "foods.txt";


function initializeFolder(folderName) {
  const folderBasePath = path.join(BASE_DIR, folderName);

  // Create new folder and /images/ inside it
  const imagesPath = path.join(folderBasePath, "images")

  fs.mkdirSync(imagesPath, { recursive: true })

  const foodsPath = path.join(folderBasePath, FOOD_FILENAME);

  // Create new foods.txt
  if (!fs.existsSync(foodsPath)) {
    fs.writeFileSync(foodsPath, "", "utf-8");
  }

  console.log(`Created folder ${folderName} with 'images/' and 'foods.txt'`)
}

function getWeeklyDates() {
  let folderNames = [];
  for (let i = 0; i <= AMOUNT_OF_DAYS; i++) {
    const date = new Date();

    date.setDate(date.getDate() + i);

    const normalizedDate = date.toISOString().split("T")[0];

    folderNames.push(normalizedDate)
  }

  return folderNames;
}

function generateWeeklyFolders() {
  const weeklyDates = getWeeklyDates();

  weeklyDates.forEach(date => initializeFolder(date))
}

function main() {
  generateWeeklyFolders()
}

main()