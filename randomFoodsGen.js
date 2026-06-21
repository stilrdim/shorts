const { default: clipboard } = require("clipboardy");
const fs = require("fs");
const path = require("path");


const FOODS_AMOUNT = 15;

// PROCESS ARGS
const ENABLE_CLIPBOARD_AUTO_COPY = process.argv.includes("--clipboard");

// Able to run the script for tomorrow or further
const extraDaysArg = process.argv.indexOf("--extradays");
let EXTRA_DAYS = extraDaysArg !== -1 ? Number(process.argv[extraDaysArg + 1]) : 0;
if (!EXTRA_DAYS) { // Empty space returning   undefined => NaN
  EXTRA_DAYS = 0;
}



const BASE_DIR = path.join(__dirname, "results");
const FOODS_DIR = path.join(BASE_DIR, "assets", "foods");
const VID_DATE = getVidDate();
const VID_DIR = path.join(BASE_DIR, VID_DATE);


function getVidDate() {
  const date = new Date();

  date.setDate(date.getDate() + EXTRA_DAYS);

  const convertedDate = date.toISOString().split("T")[0];

  return convertedDate
}

function getRandomFood(foodList) {
  const maxNumber = foodList.length;

  return foodList[Math.floor(Math.random() * maxNumber)]
}


function generateList(desiredFoodsAmount) {
  const allImages = fs.readdirSync(FOODS_DIR, { encoding: "utf-8" });

  const allFoods = allImages.map(file => file.replaceAll("_", " ").replace(/\d/g, "").split(".")[0].trim());

  const generatedFoodList = new Set();

  while (generatedFoodList.size < desiredFoodsAmount) {
    const randomFood = getRandomFood(allFoods);

    generatedFoodList.add(randomFood);
  }

  return generatedFoodList;
}


function main() {
  const foods = generateList(FOODS_AMOUNT);

  console.log(`Generating ${FOODS_AMOUNT} foods:\n`);

  const foodsStr = [...foods].join("\n");
  // foods.forEach((f) => console.log(f));
  console.log(foodsStr);

  console.log(`Today's directory: file:///${VID_DIR}`);
  console.log(`Foods.txt: file:///${VID_DIR}/foods.txt`);

  if (ENABLE_CLIPBOARD_AUTO_COPY) {
    clipboard.writeSync(foodsStr);
    console.log("\n[--clipboard] Foods automatically saved to clipboard.")
  }
}

main();