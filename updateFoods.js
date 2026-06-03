const path = require("path");
const fs = require("fs");


const OVERWRITE_FILES = false;

const todaysDate = new Date().toISOString().split("T")[0];

const folderName = "results";
const BASE_DIR = path.join(__dirname, folderName);
const VIDEO_DIR = path.join(BASE_DIR, todaysDate);
const ASSETS_FOODS_DIR = path.join(BASE_DIR, "assets", "foods");


function getVidNumber(directory) {
  const allFiles = fs.readdirSync(directory, { recursive: true });

  const videos = allFiles.filter(file => file.includes("output.mp4") && !file.includes(todaysDate));

  return videos.length + 1;
}

function getUniqueFoods(directory) {
  const foodsFolder = path.join(directory, "assets", "foods");
  const extensions = ["png", "webp", "jpg", "jpeg"];

  const allFiles = fs.readdirSync(directory, { recursive: true, encoding: "utf-8" });

  const images = allFiles
    .map(f => path.join(directory, f)) // Generate absolute path
    .filter(file => extensions.some(ext => file.endsWith(`.${ext}`)) && !file.includes("thumbnail") && !file.includes("assets"));

  const uniqueFoods = new Map();
  images.forEach(file => {
    const name = path.basename(file).split(".")[0].replaceAll("_", " ").trim();
    if (uniqueFoods.has(name)) return;
    uniqueFoods.set(name, file);
  })
  return uniqueFoods;
}

/*
TODO: Fetch the unique foods and send them to assets/foods

  Then, after the initial set up, in step #2, check assets/foods for existing photos,
if there are, move them to the current daily /images/ folder and only generate Google Search URLs
for the ones that haven't been found yet.
Multpile matches with different extensions should be picked at random.

  Then, on step #3 generate vid with the images as usual, then try to send the images to
assets/foods without replacing old ones, so essentially only the new ones get added.

  Alternatively, create an updater to manually run every now and then after a few videos with
npm run update, which will recheck all food images overall and send them to assets / foods
 */
function moveUniqueFoods(directory, foods) {
  const movedFiles = []
  const existingFiles = new Map();

  foods.forEach((dir, food) => {
    const filename = path.basename(dir);
    const targetDir = path.join(ASSETS_FOODS_DIR, filename);

    try {
      if (OVERWRITE_FILES) {
        fs.copyFileSync(dir, targetDir);
      }
      else {
        fs.copyFileSync(dir, targetDir, fs.constants.COPYFILE_EXCL);
      }

      movedFiles.push(food);
    } catch (err) {
      existingFiles.set(food, err.code);
    }
  });

  if (existingFiles.size > 0) {
    console.table(Array.from(existingFiles.entries()).map(([food, err]) => ({
      Food: food,
      Error: err
    })))
    console.log(`Errors occured [${existingFiles.size}]`);
  }

  if (movedFiles.length > 0) {
    console.table(movedFiles.map((food) => ({ Food: food })))
    console.log(`Successfully moved files [${movedFiles.length}]`)
  }
}

// Grab all existing images so far and add them to ./results/assets/foods
function main() {
  const uniqueFoods = getUniqueFoods(BASE_DIR);

  moveUniqueFoods(BASE_DIR, uniqueFoods)
}

main();