const fs = require("fs");
const path = require("path");

const BASE_FOLDER = path.join(__dirname, "results");
const FOOD_FILENAME = "foods.txt";

// Able to run the script for tomorrow or further
const extraDaysArg = process.argv.indexOf("--extradays");
let EXTRA_DAYS = extraDaysArg !== -1 ? Number(process.argv[extraDaysArg + 1]) : 0;
if (!EXTRA_DAYS) { // Empty space returning   undefined => NaN
  EXTRA_DAYS = 0;
}

function sleep(secs) {
  return new Promise(r => setTimeout(r, secs * 1000))
}

function fetchFoodInfo() {
  const date = new Date();
  date.setDate(date.getDate() + EXTRA_DAYS);

  const convertedDate = date.toISOString().split("T")[0];
  const foodFile = path.join(BASE_FOLDER, convertedDate, FOOD_FILENAME);

  if (!fs.existsSync(foodFile)) {
    console.log(`File not found! Likely the directory doesn't exist:\t${convertedDate}`);
    return { foodListTitle: "", foodItems: [] }
  };

  const fileContent = fs.readFileSync(foodFile, "utf-8");

  if (fileContent.length < 1) {
    console.log("Unable to fetch food file contents:\tFile empty");
    console.log(`Date checked: ${convertedDate}\nFilename: ${foodFile}`);
    return { foodListTitle: "", foodItems: [] };
  }

  const foodListTitle = fileContent.split("\n")[0].trim() ?? "[!] UNKNOWN";
  const foodItems = fileContent.split("\n").slice(2).map(f => f.trim()).filter(Boolean);

  return { foodListTitle, foodItems };
}

function generateURLs(foodList) {
  return foodList.map(food =>
    // tbm - to be matched;   isch - image search;    tbs - to be searched;   ic - image color
    `https://www.google.com/search?q=${encodeURIComponent(food)}&tbm=isch&tbs=ic:trans`
  )
}

function generateURL(food) {
  return `https://www.google.com/search?q=${encodeURIComponent(food)}&tbm=isch&tbs=ic:trans`;
}


function main() {
  const { foodItems, foodListTitle } = fetchFoodInfo();

  const map = new Map();

  for (const food of foodItems) {
    map.set(food, generateURL(food));
  }

  console.log(foodListTitle, "\n");
  console.log(map);
  console.log("\n", foodItems.join(", "));
}

main()