const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Voices preview: https://tts.travisvn.com/
const MAIN_VOICE = "en-US-AriaNeural";
const SECONDARY_VOICE = "en-US-EricNeural";

function getDate() {
  return new Date().toISOString().split("T")[0];
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

function makeTTS(text, outPath, duration, voice = MAIN_VOICE) {
  const safe = text.replace(/"/g, "'");
  const raw = outPath.replace(".mp3", "_raw.mp3").replace(/\\/g, "/");
  const safeOut = outPath.replace(/\\/g, "/");
  execSync(`py -m edge_tts --voice ${voice} --text "${safe}" --write-media "${raw}"`, { stdio: "inherit" });
  execSync(`ffmpeg -y -i "${raw}" -af "apad" -t ${duration} "${safeOut}"`, { stdio: "inherit" });
}

const BASE_DIR = path.join(`${__dirname}/results/${getDate()}`);
const INPUT_DIR = path.join(BASE_DIR, "images");
const OUTPUT_DIR = path.join(BASE_DIR, "temp");
const OUTPUT_FINAL = path.join(BASE_DIR, "output.mp4");
const FOODS_TXT = path.join(BASE_DIR, "foods.txt");
const FOODS_CONTENT = fs.readFileSync(FOODS_TXT, "utf-8").split("\n")
const EDITION = FOODS_CONTENT[0].trim();
const EDITION_EMOJI = FOODS_CONTENT[1].trim(); // TODO: Make emoji work

const ENABLE_CTA = process.argv.includes("--cta");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Convert any AVIF images to PNG before processing
const avifs = fs.readdirSync(INPUT_DIR).filter(f => /\.avif$/i.test(f));
for (const f of avifs) {
  const inPath = path.join(INPUT_DIR, f).replace(/\\/g, "/");
  const outPath = path.join(INPUT_DIR, f.replace(/\.avif$/i, ".png")).replace(/\\/g, "/");
  console.log(`Converting AVIF: ${f}`);
  execSync(`ffmpeg -y -i "${inPath}" "${outPath}"`, { stdio: "inherit" });
  fs.unlinkSync(path.join(INPUT_DIR, f));
}

const images = shuffle(
  fs.readdirSync(INPUT_DIR)
    .filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f))
    .map(f => path.join(INPUT_DIR, f))
)

console.log("Images found:", images.length);
console.log("Edition:", EDITION);

function escapeText(t) {
  return t
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
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

function makeIntro(outPath, duration = 5) {
  const safeOut = outPath.replace(/\\/g, "/");
  const line1 = "EAT or PASS";
  const line2 = escapeText(`${EDITION} Edition`); // TODO: Make emoji work
  const picks = pickRandom(images, 4).map(p => p.replace(/\\/g, "/"));
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");

  makeTTS(`Eat or Pass. ${EDITION} Edition`, audioOut, duration);

  const corners = [
    { x: 125, y: 400 },
    { x: 1080 - 300 - 225, y: 400 },
    { x: 125, y: 1920 - 300 - 400 },
    { x: 1080 - 300 - 225, y: 1920 - 300 - 400 },
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
    `[f3]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='${line1}':fontcolor=black:fontsize=120:x=(w-text_w)/2:y=(h/2)-120[t1]`,
    `[t1]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='${line2}':fontcolor=#888888:fontsize=70:x=(w-text_w)/2:y=(h/2)+20[out]`
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
  const avgCharWidth = 46;
  const estimatedFullWidth = text.length * avgCharWidth;
  const startX = Math.floor((1080 - estimatedFullWidth) / 2);

  const charFilters = [];
  for (let i = 1; i <= text.length; i++) {
    const substr = escapeText(text.slice(0, i));
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
    "[0:v]format=rgba,scale=750:750:force_original_aspect_ratio=decrease[img]",
    "[bg][img]overlay=(W-w)/2:(H-h)/2-60[base]",
    ...charFilters
  ].join(";");

  const cmd = [
    "ffmpeg -y",
    `-loop 1 -t ${duration} -i "${safeImage}"`,
    `-i "${audioOut}"`,
    `-vf "${vf}"`,
    `-map 0:v -map 1:a`,
    `-t ${duration} -r 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 128k "${safeOut}"`
  ].join(" ");

  console.log(`\nProcessing: ${text}`);
  execSync(cmd, { stdio: "inherit" });
}

function makeCTA(foodName, outPath, duration = 5) {
  const safeOut = outPath.replace(/\\/g, "/");
  const audioOut = outPath.replace(".mp4", ".mp3").replace(/\\/g, "/");
  const shareImg = path.join(__dirname, "results/assets/tiktok_share.png").replace(/\\/g, "/");

  const safe = foodName.toLowerCase().replace(/ /g, "_");
  const candidates = [1, 2, 3]
    .map(n => path.join(INPUT_DIR, `${safe}_${n}.png`))
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

  makeTTS(`Comment your results, tag a friend and follow for more content like this`, audioOut, duration);

  const filters = [
    "[0:v]format=rgba[bg]",
    `[bg]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='COMMENT':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=(h/2)-280:box=1:boxcolor=#FF3333:boxborderw=20[t1]`,
    `[t1]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='your results':fontcolor=black:fontsize=65:x=(w-text_w)/2:y=(h/2)-150[t2]`,
    `[t2]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='TAG':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=(h/2)-60:box=1:boxcolor=#FF3333:boxborderw=20[t3]`,
    `[t3]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='a friend':fontcolor=black:fontsize=65:x=(w-text_w)/2:y=(h/2)+70[t4]`,
    `[t4]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='FOLLOW':fontcolor=white:fontsize=110:x=(w-text_w)/2:y=(h/2)+230:box=1:boxcolor=#FF3333:boxborderw=20[t5]`,
    `[t5]drawtext=fontfile=C\\\\:/Windows/Fonts/bahnschrift.ttf:text='for more':fontcolor=black:fontsize=55:x=(w-text_w)/2:y=(h/2)+360[out]`
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

// ── main ──────────────────────────────────────────────────
const introOut = path.join(OUTPUT_DIR, "clip_intro.mp4");
const thumbOut = path.join(BASE_DIR, "thumbnail.jpg");
makeIntro(introOut);
makeThumbnail(introOut, thumbOut);

const clips = [introOut];

const shownFoods = [];

// Pick a random image to change the voice for;   Ensure it's not first and not in the last 3
const randomImageIndex = 1 + Math.floor(Math.random() * (images.length - 4));

images.forEach((img, i) => {
  const name = path.basename(img)
    .replace(/\.[^/.]+$/, "")
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
    makeCTA(ctaFood, ctaOut, 6);
    clips.push(ctaOut);
  }
});

const outroOut = path.join(OUTPUT_DIR, "clip_outro.mp4");
makeOutro(outroOut, 6);
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
console.log(`\n\n\nDifferent voice on slide ${randomImageIndex} (${path.basename(images[randomImageIndex])})`)
console.log("\nUpload to\nhttps://studio.youtube.com/channel/UCAaRyww02jzv6SNlK2tqJ9Q\nhttps://www.tiktok.com/tiktokstudio/content")
console.log(`\nDescription:\nEat or pass - ${EDITION.toLowerCase()} edition`)
console.log(`\nHashtags:\n#eat #eatorpass #game #foodlover #pickyeater`)