const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const FOODS_DIR = path.join(__dirname, "results", "assets", "foods")

async function trimImage(inputPath) {
  const tmpPath = inputPath + ".tmp";
  await sharp(inputPath).trim().toFile(tmpPath);
  fs.renameSync(tmpPath, inputPath);
}

async function main() {

  const allImages = fs.readdirSync(FOODS_DIR, { encoding: "utf-8" })
    .map(img => path.join(FOODS_DIR, img));

  allImages.forEach(async (img) => {
    await trimImage(img)
  })
}

main()