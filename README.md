# Eat or Pass Shorts Generator

## Instructions

1. Run `node initialize.js` or `npm run 1` / `npm run init` to create a new folder inside `results/` for each of the next 7 days
2. Generate 15 food items (with AI)
3. First line in `foods.txt` is `EDITION_NAME` (Ex. `Picky Eater`), second line is emoji if needed
4. Food items are on the remaining lines **(3-17)**
5. Run `node fetchImages.js` or `npm run 2` / `npm run fetch` \*
6. Use your terminal `CTRL + CLICK` to manually find images through Google Images
7. Save images into folder `YYYY-MM-DD/images` titled by food name + extension (Ex. `Balut_Egg.png`). Supports `png` `webp` `jpg` `jpeg` (`avif` will be converted to `png`)
8. Run `node generateVid.js` or `npm run 3` / `npm run generate` \*
   > or `npm run 3c` / `npm run generatecta` if you want to include a slide for engagement bait, type **Never eat x again or marry your first @**
9. Go to **[TikTok Studio](https://www.tiktok.com/tiktokstudio/upload?from=creator_center&tab=video)** or **[Youtube Upload](https://studio.youtube.com/channel/UCAaRyww02jzv6SNlK2tqJ9Q)**
10. Upload your `output.mp4` and add description + hashtags

- Populate your current existing images _(from all `date/images` folders)_ automatically into `results/assets/foods` with `npm run update` or `node updateFoods.js`. There's also a flag for `--overwrite` or `npm run updateOverwrite` if you'd like to replace the files if they already exist.

- Trim all images with `npm run trim` or `node trimImages.js`. Target location is `./results/assets/foods/`.

  > This is already done automatically for your current `date/images` folder whenever you use `generateVid` (step **3**)

- If you're out of ideas and lazy to find new lists but have plenty of images in `./results/assets/foods/`, run `npm run genlist` or `node run randomFoodsGen.js` for a list of `15` foods by default (adjustable in the `FOODS_AMOUNT` constant at the top).

### \* Applies for `fetchImages` and `generateVid` (step **2** and **3**)

> Use `node fetchImages.js --extraday 1` to check tomorrow's list

> `npm run fetchextra -- 1` for **positives** _(tomorrow)_

> `npm run fetchextra -- -1` for **negatives** _(yesterday)_

### Example description

> Eat or pass - picky eater edition 🍳

> #eat #eatorpass #game #foodlover #pickyeater
