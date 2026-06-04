const sharp = require("sharp");
const fs = require("fs");
const path = require("path");


const TRIM_DOWNLOADS = process.argv.includes("--downloads");

const FOODS_DIR = path.join(__dirname, "results", "assets", "foods");
const DOWNLOADS_DIR = `C:\\Users\\stili\\Downloads\\newvid`;

async function trimImage(imgPath) {
  const buffer = await sharp(imgPath).trim().toBuffer();
  fs.writeFileSync(imgPath, buffer)
}

async function trimAllImages(inputPath) {
  let successfulTrimCount = 0;

  const allImages = fs.readdirSync(inputPath, { encoding: "utf-8" })
    .map(img => path.join(inputPath, img));

  await Promise.all(
    allImages.map(async (img) => {
      await trimImage(img);

      console.log(`Trimmed ${img}`);
      successfulTrimCount += 1;
    })
  )

  console.log(`\n\nSuccessfully trimmed ${successfulTrimCount}/${allImages.length} images!`);
}

async function main() {
  const targetDir = TRIM_DOWNLOADS ? DOWNLOADS_DIR : FOODS_DIR;

  await trimAllImages(targetDir);
}

main()