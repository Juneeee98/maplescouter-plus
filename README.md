# MapleScouter Plus

A Chrome extension that makes [MapleScouter](https://maplescouter.com) easier to use for English-speaking MapleStory players, especially on **MapleSEA**.

MapleScouter's English mode leaves a lot of Korean behind — in menus, tooltips, popups, badges and help text — and the machine translation it does have often gets game terms wrong. This extension fixes that with a hand-made MapleStory glossary, and adds a few quality-of-life fixes.

## Features

- **Proper game terms, not literal translation.** 유니온 → Union/Legion, 추옵 → Flame, 어빌리티 → Inner Ability, 바이퍼 → Buccaneer, 거공 → Endless Terror, and ~700 more.
- **MapleSEA or GMS names.** Pick your server in the popup. MapleSEA uses Union, Authentic Symbol/Force, Hotel Arcs, Talahart, Chosen Serene, Carling, Gatekeeper Kalos, Djunkel, etc. This also fixes GMS-style English the site already shows (e.g. "Legion Total" → "Union Total").
- **Uses MapleScouter's own dictionary too.** The site ships ~1,500 Korean→English pairs in its code; the extension reads them automatically, so new site terms get picked up when the site updates.
- **Korean number formats converted.** 3억 1631만 → 316,310,000 · 2,893위 → #2,893 · 59층 → Floor 59 · 22성 → 22★
- **Leaves player names alone.** Character and guild names are never "translated".
- **Optional full-sentence translation** with Chrome's built-in on-device Translator (Chrome 138+). Game terms are swapped in first so the sentence translation keeps them right. Nothing is sent to any server.
- **English search in dropdowns.** The site's Class / World / Class Group dropdowns only search the hidden Korean value ("War" finds nothing, "전사" finds Warrior). The extension lets you search by the English names you see.
- **Hide ads** (toggle). Blocks ad networks on maplescouter.com only, and removes the empty ad boxes.

## Install

1. Download this repo (**Code → Download ZIP**) and unzip it, or `git clone` it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the folder.
4. Open MapleScouter in English and refresh the page.

Optional: click the extension icon → **Set up backup translator**, or click the "🌐 Translate full sentences too" button that appears on the page. It's a one-time language pack download.

### Updating

`git pull` (or download again), then click the reload icon on the extension's card in `chrome://extensions`.

## Settings (extension popup)

| Setting | What it does |
|---|---|
| Server names | MapleSEA (default) or GMS (NA/EU) naming |
| Hide ads | Block ad networks and hide ad slots on MapleScouter |
| Translate leftover Korean | Glossary + site dictionary translation |
| Backup translation for sentences | Chrome's on-device translator for text the glossary doesn't cover |

## How it works

| File | Purpose |
|---|---|
| `glossary.js` | Hand-made Korean → English MapleStory glossary, plus MapleSEA name overrides (`MSX_REGIONS`) |
| `content.js` | Translates the page (text, tooltips, titles, placeholders), watches for new content, loads the site's own dictionary, English dropdown search, translator button |
| `adblock.js` | Hides ad slots before the page draws |
| `ad_rules.json` | Network rules that block ad domains, only for requests made by maplescouter.com |
| `popup.html` / `popup.js` | Settings |

Translation order for each piece of text:

1. Exact match in the glossary (our entries override the site's dictionary)
2. Number patterns (억/만, 위, 층, 성…)
3. Whole-word term replacement (never inside a longer Korean word, so 페이지 isn't turned into 페Easy)
4. Optional Chrome on-device translation for remaining sentences
5. Server-specific renames (MapleSEA / GMS)

## Contributing

Spotted a wrong or missing term? The easiest fix is a line in `glossary.js`:

```js
"한국어": "English",
```

MapleSEA-specific names go in `MSX_REGIONS.msea` at the bottom of `glossary.js` as English → English replacements.

Pull requests and issues are welcome. Please include a screenshot or the page URL for missing translations.

## Privacy

- Runs only on `maplescouter.com`.
- No analytics, no external servers. Settings are stored in Chrome sync storage; the site dictionary cache in local storage.
- The optional translator runs on your device via Chrome's built-in Translator API.

## Disclaimer

Unofficial fan project. Not affiliated with MapleScouter, Nexon or Asiasoft. MapleStory is a trademark of Nexon. MapleScouter is a free site that is funded by ads — if you find it useful, consider turning **Hide ads** off or supporting its creators.

## License

[MIT](LICENSE)
