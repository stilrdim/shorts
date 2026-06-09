const fs = require("fs");
const path = require("path");


// Able to run the script for tomorrow or further
const extraDaysArg = process.argv.indexOf("--extradays");
let EXTRA_DAYS = extraDaysArg !== -1 ? Number(process.argv[extraDaysArg + 1]) : 0;
if (!EXTRA_DAYS) { // Empty space returning   undefined => NaN
  EXTRA_DAYS = 0;
}


const BASE_DIR = path.join(__dirname, "results");
const FOOD_FILENAME = "foods.txt";
const ASSETS_FOODS_DIR = path.join(BASE_DIR, "assets", "foods");
const VID_DATE = getVidDate();
const VID_DIR = path.join(BASE_DIR, VID_DATE);
const IMAGES_DIR = path.join(VID_DIR, "images")


// Food items that we need to actually look up
const missingFoodImages = [];


function getVidDate() {
  const date = new Date();

  date.setDate(date.getDate() + EXTRA_DAYS);

  const convertedDate = date.toISOString().split("T")[0];

  return convertedDate
}

function sleep(secs) {
  return new Promise(r => setTimeout(r, secs * 1000))
}

function fetchFoodInfo() {
  const foodFile = path.join(VID_DIR, FOOD_FILENAME);

  if (!fs.existsSync(foodFile)) {
    console.log(`File not found! Likely the directory doesn't exist:\t${VID_DATE}`);
    return { foodListTitle: "", foodItems: [] }
  };

  const fileContent = fs.readFileSync(foodFile, "utf-8");

  if (fileContent.length < 1) {
    console.log("Unable to fetch food file contents:\tFile empty");
    console.log(`Date checked: ${VID_DATE}\nFilename: ${foodFile}`);
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

function normalizeStr(str) {
  return str.toLowerCase()
    .split(".")[0] // Grab name without extension(s)
    .replace(/[_-]/g, " ") // Format _ and - to spaces
    .replace(/\d+$/g, "") // Remove numbers
    .trim();
}

function normalizeList(foodList) {
  return foodList.map(food => {
    return normalizeStr(food);
  })
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fetchImages(foodList) {
  // Fetch all images and map them to normalized food names
  const allImages = fs.readdirSync(ASSETS_FOODS_DIR, { recursive: false, encoding: "utf-8" });

  const images = new Map();
  // allImages.forEach(f => images.set(normalizeStr(f), f))

  allImages.forEach(f => {
    const key = normalizeStr(f);

    if (!images.has(key)) images.set(key, []);
    images.get(key).push(f);
  })

  // Return the existing and non-existing ones separately
  const foods = normalizeList(foodList);

  const existing = foods
    .map(food => {
      const imgs = images.get(food);

      if (!imgs) {
        missingFoodImages.push(food);
        return undefined;
      }

      const randomImg = pickRandom(imgs);
      return path.join(ASSETS_FOODS_DIR, randomImg);
    })
    .filter(Boolean);

  return existing;
}

function populateImages(imagesList) {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  imagesList.forEach(img => {
    const filename = path.basename(img);
    const targetDir = path.join(IMAGES_DIR, filename)

    fs.copyFileSync(img, targetDir)

    console.log(`Added image for ${filename.split(".")[0]}`)
  })
}


function main() {
  const { foodItems, foodListTitle } = fetchFoodInfo();

  const images = fetchImages(foodItems);

  populateImages(images);


  const foodToUrlMap = new Map();

  for (const food of missingFoodImages) {
    foodToUrlMap.set(food, generateURL(food));
  }

  console.log(foodListTitle, "\n");
  console.log(foodToUrlMap);
  console.log("\n", foodItems.join(", "));
}

main()