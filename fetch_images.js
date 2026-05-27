const fs = require("fs");
const path = require("path");

const BASE_FOLDER = path.join(__dirname, "results");
const FOOD_FILENAME = "foods.txt";


function sleep(secs) {
  return new Promise(r => setTimeout(r, secs * 1000))
}

function getDate() {
  // Example: 2026-05-27
  return new Date().toISOString().split("T")[0]
}


function fetchFoods(date) {
  const foodFile = path.join(BASE_FOLDER, date, FOOD_FILENAME);

  if (!fs.existsSync(foodFile)) {
    console.log("File not found");
    return [];
  };

  const fileContent = fs.readFileSync(foodFile, "utf-8");

  if (fileContent.length < 1) {
    console.log("Unable to fetch foods, file empty.");
    return [];
  }

  // Ignore the first 2 lines, those are edition-name and emojis
  const foods = fileContent.split("\n").slice(2).map(f => f.trim()).filter(Boolean);

  return foods;
}

function generateURLs(foodList) {
  return foodList.map(food =>
    // tbm - to be matched;   isch - image search;    tbs - to be searched;   ic - image color
    `https://www.google.com/search?q=${encodeURIComponent(food)}&tbm=isch&tbs=ic:trans`
  )
}

function generateURL(food) {
  return `https://www.google.com/search?q=${encodeURIComponent(food)}&tbm=isch&tbs=ic:trans`
}


function main() {
  const foodList = fetchFoods(getDate());
  const urls = generateURLs(foodList);

  const map = new Map();

  for (const food of foodList) {
    map.set(food, generateURL(food));
  }

  console.log(map)

  console.log("\n", foodList.join(", "))
}

main()