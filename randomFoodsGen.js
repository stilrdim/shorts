const fs = require("fs");
const path = require("path");


const FOODS_AMOUNT = 15;

const todaysDate = new Date().toISOString().split("T")[0];

const BASE_DIR = path.join(__dirname, "results");
const FOODS_DIR = path.join(BASE_DIR, "assets", "foods");
const VIDEO_DIR = path.join(BASE_DIR, todaysDate);


function getRandomFood(foodList) {
  const maxNumber = foodList.length;

  return foodList[Math.floor(Math.random() * maxNumber)]
}


function generateList(desiredFoodsAmount) {
  const allImages = fs.readdirSync(FOODS_DIR, { encoding: "utf-8" });

  const allFoods = allImages.map(file => file.replaceAll("_", " ").replace(/\d/, "").split(".")[0].trim());

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

  foods.forEach((f) => console.log(f));

  console.log(`Today's directory: file///${VIDEO_DIR}`);
  console.log(`Foods.txt: file:///${VIDEO_DIR}/foods.txt`);
}

main();