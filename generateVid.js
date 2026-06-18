const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// SHARP CONFIG
sharp.cache(false)

// Voices preview: https://tts.travisvn.com/
// Default male   :    en-US-EricNeural
// Default female :    en-US-AriaNeural
const MAIN_VOICE = "en-US-EricNeural";
const SECONDARY_VOICE = "en-US-AriaNeural";

// Store hardcoded FIRST_VID_DATE to calculate the video number in the intro/thumbnail
const FIRST_VID_DATE = "2026-05-26";

//#region Process Args
// Toggle CTA for engagement bait   (targeted at TikTok)
const ENABLE_CTA = process.argv.includes("--cta");
const DISABLE_SHUFFLE = process.argv.includes("--noshuffle");
const ENABLE_OPEN_IN_EXPLORER = process.argv.includes("--open-after-generating")

// Able to run the script for tomorrow or further
const extraDaysArg = process.argv.indexOf("--extradays");
let EXTRA_DAYS = extraDaysArg !== -1 ? Number(process.argv[extraDaysArg + 1]) : 0;
if (!EXTRA_DAYS) { // Empty space returning   undefined => NaN
  EXTRA_DAYS = 0;
}
//#endregion Process Args

//#region Constants
const VID_DATE = getVidDate();

const BASE_DIR = path.join(__dirname, "results");
const VID_DIR = path.join(BASE_DIR, VID_DATE);
const VID_IMAGES_DIR = path.join(VID_DIR, "images");
const OUTPUT_DIR = path.join(VID_DIR, "temp");
const OUTPUT_FINAL = path.join(VID_DIR, "output.mp4");
const ASSETS_FOODS_DIR = path.join(BASE_DIR, "assets", "foods");
const FOODS_TXT = path.join(VID_DIR, "foods.txt");
const FOODS_CONTENT = fs.readFileSync(FOODS_TXT, "utf-8").split("\n")
const EDITION = FOODS_CONTENT[0].trim();
const EDITION_EMOJI = FOODS_CONTENT[1].trim(); // TODO: Make emoji work
//#endregion Constants

//#region UTILS
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function getVidDate() {
  const date = new Date();

  date.setDate(date.getDate() + EXTRA_DAYS);

  const convertedDate = date.toISOString().split("T")[0];

  return convertedDate
}

// Replaced by daysSinceFirstVid
function getVidNumber(directory, date) {
  const allFiles = fs.readdirSync(directory, { recursive: true });

  const videos = allFiles.filter(file => file.includes("output.mp4") && !file.includes(date));

  return videos.length + 1;
}

// Gives the #23 type of heading in the intro/thumbnail
function daysSinceFirstVid(asOfDate) {
  const d1 = new Date(FIRST_VID_DATE);
  const d2 = new Date(asOfDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((d2 - d1) / msPerDay);
}

function estimateTextWidth(text, fontSize = 96) {
  const ratios = {
    narrow: 0.35,  // i, l, 1, |, :, ;, .
    wide: 0.75,    // m, w, M, W
    normal: 0.55,  // everything else
  };
  const narrow = new Set(['i', 'l', '1', '|', ':', ';', '.', ',', '!', '(', ')', '/']);
  const wide = new Set(['m', 'w', 'M', 'W']);
  let width = 0;
  for (const char of text) {
    if (narrow.has(char)) width += fontSize * ratios.narrow;
    else if (wide.has(char)) width += fontSize * ratios.wide;
    else width += fontSize * ratios.normal;
  }
  return Math.floor(width);
}
function escapeText(t) {
  return t
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function openInExplorer(dir) {
  try {
    execSync(`explorer ${dir}`, { stdio: "inherit" });
  } catch (err) {
    // Wrong error code returned from Explorer. Safe to ignore if the folder opens regardless
  }
}

//#endregion UTILS

//#region GENERATE SECTIONS
function makeTTS(text, outPath, duration, voice = MAIN_VOICE) {
  const safe = text.replace(/"/g, "'");
  const raw = outPath.replace(".mp3", "_raw.mp3").replace(/\\/g, "/");
  const safeOut = outPath.replace(/\\/g, "/");
  execSync(`py -m edge_tts --voice ${voice} --text "${safe}" --write-media "${raw}"`, { stdio: "inherit" });
  execSync(`ffmpeg -y -i "${raw}" -af "apad" -t ${duration} "${safeOut}"`, { stdio: "inherit" });
}

function makeThumbnail(introPath, outPath) {
  const safeIntro = introPath.replace(/\\/g, "/");
  const safeOut = outPath.replace(/\\/g, "/");

  // grab frame at 0.5s so everything is fully rendered
  execSync(
    `ffmpeg -y -ss 0.5 -i "${safeIntro}" -frames:v 1 "${safeOut}"`,
    { stdio: "inherit" }
  );

  console.log(`\nThumbnail saved → ${safeOut}`);
}

function makeIntro(outPath, images, duration = 5) {
  const safeOut = outPath.replace(/\\/g, "/");
  const line2 = escapeText(`${EDITION.toUpperCase()} EDITION`);
  const videoNumber = daysSinceFirstVid(VID_DATE).toString()
  const picks = pickRandom(images, 4).map(p => p.replace(/\\/g, "/"));
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");
  makeTTS(`Eat or Pass. ${EDITION} Edition`, audioOut, duration);

  const font = `C\\\\:/Windows/Fonts/bahnschrift.ttf`;
  const centerY = `(h/2)`;

  // Word widths estimated for centering the full "EAT or PASS" line
  const eatW = estimateTextWidth("EAT", 120);
  const orW = estimateTextWidth("OR", 70);
  const passW = estimateTextWidth("PASS", 120);
  const gap = 48;
  const totalW = eatW + gap + orW + gap + passW;
  const lineStartX = Math.floor((1080 - totalW) / 2);
  const orX = lineStartX + eatW + gap;
  const passX = orX + orW + gap;
  const colorPastelGreen = "#6DBF8A";
  const colorPastelRed = "#E8786A";
  const colorLightGrey = "#CCCCCC";
  const colorDarkGrey = "#AAAAAA";
  const colorVeryDarkGrey = "#333333"
  const colorBlack = "#111111"

  const corners = [
    { x: 125, y: 490 },
    { x: 1080 - 300 - 225, y: 490 },
    { x: 125, y: 1920 - 300 - 400 + 30 },
    { x: 1080 - 300 - 225, y: 1920 - 300 - 400 + 30 },
  ];

  const filters = [
    "[0:v]format=rgba[bg]",
    "[1:v]format=rgba,scale=400:400:force_original_aspect_ratio=decrease[c0]",
    "[2:v]format=rgba,scale=400:400:force_original_aspect_ratio=decrease[c1]",
    "[3:v]format=rgba,scale=400:400:force_original_aspect_ratio=decrease[c2]",
    "[4:v]format=rgba,scale=400:400:force_original_aspect_ratio=decrease[c3]",
    `[bg][c0]overlay=${corners[0].x}:${corners[0].y}[f0]`,
    `[f0][c1]overlay=${corners[1].x}:${corners[1].y}[f1]`,
    `[f1][c2]overlay=${corners[2].x}:${corners[2].y}[f2]`,
    `[f2][c3]overlay=${corners[3].x}:${corners[3].y}[f3]`,
    // Video number
    `[f3]drawtext=fontfile=${font}:text='#${videoNumber}':fontcolor=${colorVeryDarkGrey}:fontsize=100:x=(w-text_w)/2:y=290[t0]`,
    // EAT
    `[t0]drawtext=fontfile=${font}:text='EAT':fontcolor=${colorBlack}:fontsize=120:x=${lineStartX}:y=${centerY}-30[t1]`,
    // OR
    `[t1]drawtext=fontfile=${font}:text='OR':fontcolor=${colorVeryDarkGrey}:fontsize=70:x=${orX}:y=${centerY}-10[t2]`,
    // PASS
    `[t2]drawtext=fontfile=${font}:text='PASS':fontcolor=${colorBlack}:fontsize=120:x=${passX}:y=${centerY}-30[t3]`,
    // EDITION line
    `[t3]drawtext=fontfile=${font}:text='${line2}':fontcolor=${colorDarkGrey}:fontsize=65:x=(w-text_w)/2:y=${centerY}+110[out]`,
  ].join(";");

  const cmd = [
    "ffmpeg -y",
    `-f lavfi -i "color=c=white:s=1080x1920:d=${duration}"`,
    `-loop 1 -t ${duration} -i "${picks[0]}"`,
    `-loop 1 -t ${duration} -i "${picks[1]}"`,
    `-loop 1 -t ${duration} -i "${picks[2]}"`,
    `-loop 1 -t ${duration} -i "${picks[3]}"`,
    `-i "${audioOut}"`,
    `-filter_complex "${filters}"`,
    `-map "[out]"`,
    `-map 5:a`,
    `-t ${duration} -r 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${safeOut}"`
  ].join(" ");

  console.log("\nGenerating intro...");
  execSync(cmd, { stdio: "inherit" });
}

function makeClip(imagePath, text, outPath, voice = MAIN_VOICE) {
  const safeImage = imagePath.replace(/\\/g, "/");
  const safeOut = outPath.replace(/\\/g, "/");
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");
  const font = `C\\\\:/Windows/Fonts/bahnschrift.ttf`;
  const charDelay = 0.05;
  const duration = 3;

  makeTTS(text, audioOut, duration, voice);

  // build chained drawtext filters, one per character reveal
  // each takes previous output label as input
  // pre-calculate x offset based on full text width isn't possible in ffmpeg
  // so instead: left-align from a fixed start x, calculated to center the full word
  // we estimate character width at fontsize 96 ≈ 45px per char average
  const estimatedFullWidth = estimateTextWidth(text);
  const startX = Math.floor((1080 - estimatedFullWidth) / 2);

  const charFilters = [];
  for (let i = 1; i <= text.length; i++) {
    const substr = escapeText(text.slice(0, i)).toUpperCase();
    const startT = ((i - 1) * charDelay).toFixed(2);
    const endT = i < text.length ? (i * charDelay).toFixed(2) : duration;
    const inLabel = i === 1 ? "base" : `ct${i - 1}`;
    const outLabel = i === text.length ? "out" : `ct${i}`;
    charFilters.push(
      `[${inLabel}]drawtext=fontfile=${font}:text='${substr}':fontcolor=black:fontsize=96:x=${startX}:y=1350:enable='between(t,${startT},${endT})'[${outLabel}]`
    );
  }

  const vf = [
    "color=c=white:s=1080x1920:d=3[bg]",
    "[0:v]format=rgba,scale=750:750:force_original_aspect_ratio=decrease,loop=loop=-1:size=1[img]",
    "[bg][img]overlay=(W-w)/2:(H-h)/2-60[base]",
    ...charFilters
  ].join(";");

  const cmd = [
    "ffmpeg -y",
    `-t ${duration} -i "${safeImage}"`,
    `-i "${audioOut}"`,
    `-filter_complex "${vf}"`,
    `-map "[out]" -map 1:a`,
    `-t ${duration} -r 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${safeOut}"`
  ].join(" ");

  console.log(`\nProcessing: ${text}`);
  execSync(cmd, { stdio: "inherit" });
}

function makeCTA(foodName, images, outPath, duration = 5) {
  const safeOut = outPath.replace(/\\/g, "/");
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");
  const shareImg = path.join(BASE_DIR, "assets", "icons", "tiktok_share.png").replace(/\\/g, "/");

  const safe = foodName.toLowerCase().replace(/ /g, "_");
  const candidates = [1, 2, 3]
    .map(n => path.join(VID_IMAGES_DIR, `${safe}_${n}.png`))
    .filter(fs.existsSync);
  const foodImg = candidates.length
    ? candidates[0].replace(/\\/g, "/")
    : images.find(p => path.basename(p).toLowerCase().startsWith(safe))?.replace(/\\/g, "/");

  const CTA_ACTIONS = ["kiss", "marry", "cook for", "fight", "poop on", "text"];
  const CTA_ORDINALS = ["first", "second", "third", "fourth"];
  const action = CTA_ACTIONS[Math.floor(Math.random() * CTA_ACTIONS.length)];
  const ordinal = CTA_ORDINALS[Math.floor(Math.random() * CTA_ORDINALS.length)];

  makeTTS(`Never have ${foodName} ever again, or ${action} the ${ordinal} person that appears when you click Share.`, audioOut, duration);

  const line1 = escapeText("Never have");
  const line3 = escapeText("ever again");
  const line4 = escapeText(`or ${action} the ${ordinal} person...`);

  const filters = [
    "color=c=white:s=1080x1920:d=5[bg]",
    `[1:v]format=rgba,scale=750:750:force_original_aspect_ratio=decrease[food]`,
    `[2:v]format=rgba,scale=500:500:force_original_aspect_ratio=decrease[share]`,
    `[bg][food]overlay=(W-w)/2:(H-h)/2-200[with_food]`,
    `[with_food][share]overlay=(W-w)/2:(H-h)/2+500[with_share]`,
    `[with_share]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='${line1}':fontcolor=black:fontsize=75:x=(w-text_w)/2:y=(h/2)-640[t1]`,
    `[t1]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='${line3}':fontcolor=black:fontsize=65:x=(w-text_w)/2:y=(h/2)+160[t2]`,
    `[t2]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='${line4}':fontcolor=#888888:fontsize=60:x=(w-text_w)/2:y=(h/2)+250[out]`
  ].join(";");

  const cmd = [
    "ffmpeg -y",
    `-f lavfi -i "color=c=white:s=1080x1920:d=${duration}"`,
    `-loop 1 -t ${duration} -i "${foodImg}"`,
    `-loop 1 -t ${duration} -i "${shareImg}"`,
    `-i "${audioOut}"`,
    `-filter_complex "${filters}"`,
    `-map "[out]" -map 3:a`,
    `-t ${duration} -r 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${safeOut}"`
  ].join(" ");

  console.log(`\nGenerating CTA — never have ${foodName} again or ${action} the ${ordinal} person...`);
  execSync(cmd, { stdio: "inherit" });
}

function makeOutro(outPath, duration = 5) {
  const safeOut = outPath.replace(/\\/g, "/");
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");

  makeTTS(`Comment your results and follow for more content like this`, audioOut, duration);

  const filters = [
    "[0:v]format=rgba[bg]",
    `[bg]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='COMMENT':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=(h/2)-180:box=1:boxcolor=#FF3333:boxborderw=20[t1]`,
    `[t1]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='your results':fontcolor=black:fontsize=65:x=(w-text_w)/2:y=(h/2)-40[t2]`,
    `[t2]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='FOLLOW':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=(h/2)+130:box=1:boxcolor=#FF3333:boxborderw=20[t3]`,
    `[t3]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='for more':fontcolor=black:fontsize=55:x=(w-text_w)/2:y=(h/2)+260[out]`
  ].join(";");

  const cmd = [
    "ffmpeg -y",
    `-f lavfi -i "color=c=white:s=1080x1920:d=${duration}"`,
    `-i "${audioOut}"`,
    `-filter_complex "${filters}"`,
    `-map "[out]" -map 1:a`,
    `-t ${duration} -r 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${safeOut}"`
  ].join(" ");

  console.log("\nGenerating outro...");
  execSync(cmd, { stdio: "inherit" });
}
//#endregion GNEERATE SECTIONS

//#region Main
async function main() {
  await trimAllImages(VID_IMAGES_DIR);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Convert any AVIF images to PNG before processing
  const avifs = fs.readdirSync(VID_IMAGES_DIR).filter(f => /\.avif$/i.test(f));
  for (const f of avifs) {
    const inPath = path.join(VID_IMAGES_DIR, f).replace(/\\/g, "/");
    const outPath = path.join(VID_IMAGES_DIR, f.replace(/\.avif$/i, ".png")).replace(/\\/g, "/");
    console.log(`Converting AVIF: ${f}`);
    execSync(`ffmpeg -y -i "${inPath}" "${outPath}"`, { stdio: "inherit" });
    fs.unlinkSync(path.join(VID_IMAGES_DIR, f));
  }

  const getImages = fs.readdirSync(VID_IMAGES_DIR)
    .filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f))
    .map(f => path.join(VID_IMAGES_DIR, f))

  const images = DISABLE_SHUFFLE ? getImages : shuffle(getImages)

  console.log("Images found:", images.length);
  console.log("Edition:", EDITION);

  const introOut = path.join(OUTPUT_DIR, "clip_intro.mp4");
  const thumbOut = path.join(VID_DIR, "thumbnail.jpg");
  makeIntro(introOut, images, 4);
  makeThumbnail(introOut, thumbOut);

  const clips = [introOut];

  const shownFoods = [];

  // Ensure the random slide we'll pick is between the first X amount and the last X amount
  const amountToIgnoreBefore = 1 // Example: 1;       15 slides, 2-15 are valid
  const amounttoIgnoreAfter = 3 //  Example: 3;       15 slides, 1-12 are valid
  //                                Example: 2, 4;    15 slides, 3-11 are valid                 
  // Pick a random image to change the voice for
  const randomImageIndex = amountToIgnoreBefore + Math.floor(Math.random() * (images.length - (amounttoIgnoreAfter + 1)));

  images.forEach((img, i) => {
    const name = path.basename(img)
      .replace(/\.[^/.]+$/, "")
      .replace(/\d/g, "") // Remove digits from pics with multiple options
      .replace(/_/g, " ");
    const out = path.join(OUTPUT_DIR, `clip_${i}.mp4`);

    // Change the voice of one random slide for engagement bait
    i === randomImageIndex ? makeClip(img, name, out, SECONDARY_VOICE) : makeClip(img, name, out)

    clips.push(out);
    shownFoods.push(name);

    // after 5th food (index 4), insert CTA
    if (i === 4 && ENABLE_CTA) {
      const ctaFood = shownFoods[Math.floor(Math.random() * shownFoods.length)];
      const ctaOut = path.join(OUTPUT_DIR, "clip_cta.mp4");
      makeCTA(ctaFood, images, ctaOut, 6);
      clips.push(ctaOut);
    }
  });

  const outroOut = path.join(OUTPUT_DIR, "clip_outro.mp4");
  makeOutro(outroOut, 5);
  clips.push(outroOut);

  console.log("\n=== CONCATENATING ===");
  const listFile = path.join(OUTPUT_DIR, "list.txt");
  fs.writeFileSync(listFile,
    clips.map(c => `file '${c.replace(/\\/g, "/")}'`).join("\n")
  );

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${OUTPUT_FINAL}"`,
    { stdio: "inherit" }
  );

  console.log("\nDONE:", OUTPUT_FINAL);
  console.log(`\n\n\nDifferent voice on slide #${randomImageIndex + 1} (${path.basename(images[randomImageIndex])})`);
  console.log("\nUpload to\nhttps://studio.youtube.com/channel/UCAaRyww02jzv6SNlK2tqJ9Q\nhttps://www.tiktok.com/tiktokstudio/content");
  console.log(`\nDescription:\nEat or pass - ${EDITION.toLowerCase()} edition`);
  console.log(`\nHashtags:\n#eat #eatorpass #game #foodlover #pickyeater`);

  // Check for --open-after-generating
  ENABLE_OPEN_IN_EXPLORER ? openInExplorer(VID_DIR) : console.log(`Video folder: file:///${VID_DIR}`);
}
//#endregion Main

main()