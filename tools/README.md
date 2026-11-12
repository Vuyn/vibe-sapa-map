# Sapa Pixel Map build tools

`index.html` in the parent folder is a single self-contained file. These tools rebuild it. Everything runs on Node 20 or later; only the screenshot tool uses PowerShell. The page opens in Vietnamese; `#lang=en` or the settings tab switches to English.

## Edit the page

All page code lives in `template.html`. The build fills in its placeholders (`__DATA_GZ__`, `__FONT_CSS__`, `__FRAME__`, `__W__`, `__H__`). Edit the template, never the built file, then rebuild and test:

```text
node build.js data template.html ..\index.html
node test-headless.js ..\index.html
```

The test runs the page script in Node with a stubbed DOM. It checks that the data unpacks, every landmark is reachable on foot from the church, the mountain train and cable car rides work in both directions and the trip is planned on foot after hours, the sun stands where it should and casts long shadows only when low, no person, animal or stall stands on water, no trek line runs over a lake or reservoir, lakes and reservoirs lie on level ground, the dams are there, a click on the lake walks to the nearest shore, and no Vietnamese text is garbled. There is no worker in Node, so the test builds the land on the main thread. It cannot check how the page looks. Use the screenshot tools for that.

## See what it looks like

`shot.ps1` renders the page in headless Edge or Chrome and saves PNG screenshots:

```text
& .\shot.ps1 -Html ..\index.html -Out .\shots -Views "town=#h=14&m=9&z=5&at=406,199&sky=1","market=#h=8.5&d=0&z=12&at=430,192&sky=1"
```

Run it like this from inside PowerShell. Through `powershell -ExecutionPolicy Bypass -File .\shot.ps1 ...` it also works, but only with a single view: a list of several arrives as one garbled view.

Each view is `name=#settings`. The same settings work in a normal browser, so they also make shareable links:

| Setting | Meaning |
| --- | --- |
| `h` | Hour, 0 to 24. Stops the clock. |
| `m` | Month, 1 to 12 |
| `d` | Weekday, 0 Sunday to 6 Saturday. Sapa Market fills on Sunday 6 to 11; the night market is there on Friday, Saturday and Sunday 16 to 22; the love market is in the church square on Saturday 19 to 22. |
| `z` | Zoom, 1 to 16 |
| `at` | Centre of the view as tile `x,y`. The church is at 406,199. |
| `sel` | Place id to open, for example `laochai` |
| `tab` | `place`, `list`, `settings` or `about` |
| `lang` | `en` or `vi` |
| `sky` | 0 automatic, 1 clear, 2 fog, 3 rain |
| `worker` | `0` builds the land on the main thread instead of a background worker |
| `rainbow` | `1` keeps a rainbow up, for checking it. Normally it shows for under a minute after rain turns to a dry sky. |

Views that show the effects tied to the clock and the calendar:

| To see | Use |
| --- | --- |
| Long morning and evening shadows | `h=7.5` or `h=16.5` with `sky=1`; `h=12` for almost none |
| Love market in the church square | `d=6&h=20&z=16&at=404,198` |
| Night market open, or absent | `d=5&h=20` against `d=2&h=20`, at `at=428,190` |
| Kitchen smoke | `h=17.6` over any village (the morning smoke is under the valley fog) |
| Cable car and train stopped | `h=20&sel=cable` |
| Sea of clouds | `h=7&at=228,292` (Fansipan) or `h=7&at=200,149` (the pass), not in rain |
| Hoarfrost | `m=1&h=8.8` over fields |

Opening the page with any setting skips the welcome box. The first frames build terrain a few chunks at a time, so the tool waits 15 seconds of page time by default (`-Budget`). Headless page time runs ahead of a background worker, so `shot.ps1` adds `worker=0` to every view.

`check-worker.js` covers what `shot.ps1` cannot. It opens the page in real time, checks that the background worker built the land and that the page is no wider than the window, and can save a screenshot. It also emulates phone sizes, which a browser window cannot reach (the minimum window width is about 500 px):

```text
node --experimental-websocket check-worker.js ..\index.html shots\phone.png 390 800 "#sel=fansipan&tab=place"
```

## The frame

`frame.json` holds the map frame and is read by every tool and by the page: grid size, longitude and latitude bounds, metres per tile, the town detail box, the town box used for buildings and shops, and `elevStep`, the spacing of stored elevation samples in tiles. Currently 840 x 472 tiles of about 38.6 m over longitude 103.690 to 104.005 and latitude 22.240 to 22.405, a 16:9 area of 32.4 by 18.3 km. Tile x = (lon - LON0) / (LON1 - LON0) x W. Tile y = (LAT1 - lat) / (LAT1 - LAT0) x H.

To change the area or resolution, edit `frame.json` and run the whole refresh below. Keep the tile size near 38.6 m, or adjust `K` at the top of the template script, which scales every distance written for the older 77 m grid.

## Refresh the data

```text
node fetch-data.js                                   # downloads into .\raw; cached files are kept, --force refetches
node resample.js                                     # elevation, town detail and land-cover grids into .\data
node parse-osm.js  raw\sapa.json  data\osm-out.json  # roads, streets, rivers, railways, cable car, places to stay, waterfalls, viewpoints, peaks
node parse-osm2.js raw\sapa2.json data\osm2-out.json # OSM land-cover polygons, lakes with their islands, dams and power plants (from raw\dams.json), buildings, shops
node build.js data template.html ..\index.html
node test-headless.js ..\index.html
```

`node parse-osm.js raw\sapa.json data\osm-out.json --list` also prints every named place with coordinates. Use that list to check or move landmark positions in the `LM` array in the template.

Both parsers clean names through `names.js`: street names typed without accents or in English get their Vietnamese form, shop names lose price notes and complaints, and names in all lower or upper case get normal capitals. Add a line there when you spot another bad name. A fix must not change the unaccented words the page matches on (`tram ton`, `ham rong`, `vmm`, `o quy ho`, `quoc lo 4d`, `tinh 152`, `lao chai`, `muong hoa`).

## What is in `data`

| File | Content |
| --- | --- |
| `elev.bin`, `elev.json` | Elevation at 1 m precision, one sample every `elevStep` tiles (420 x 236 now). Stored as the error of a 2D predictor (left + up - upper left), low-byte plane then high-byte plane. The page rebuilds every tile with a Catmull-Rom curve. `elev.json` holds the sample grid size. |
| `detail.bin` | 192 x 192 grid for the town box at two samples per tile, metres = 1100 + value x 3.5 |
| `lc.bin` | Sentinel-2 land-cover class per tile: 0 none, 1 water, 2 trees, 3 flooded, 4 crops, 5 built, 6 bare, 7 snow, 8 cloud, 9 rangeland |
| `osm-out.json` | Simplified roads, town streets, rivers, railways, cable car line, hotel and guest house points, `stays` (named places to stay outside town) and `feat` (waterfalls, viewpoints and peaks with names and heights), in tile coordinates |
| `osm2-out.json` | OSM land-cover polygons, `water` (lake and reservoir outlines, kept fine) and `holes` (their islands), `dams` (crest lines) and `plants` (power plants), each with a name where there is one, building centroids with kind, shops and cafés |
| `fonts/` | Press Start 2P woff2 subsets and their unicode ranges |

## How the land is classified

OpenStreetMap wins where it has data: roads, rivers, lakes, buildings, and its few land-cover polygons. Everywhere else the Sentinel-2 class decides: trees become forest, crops become terraces, built-up tiles outside town become villages (houses clustered by smooth noise, with gardens between them), rangeland becomes grass or scrub by slope, bare ground stays bare. Tiles the satellite product marks as cloud fall back to slope and noise rules.

## How water is drawn

Water has its own mask of 16 bits per tile, one per art pixel. Lakes and reservoirs are filled from their OpenStreetMap outlines and islands are cut out; a tile keeps its water only if at least six of its sixteen pixels are wet. Rivers are channels one to five art pixels wide: the width at any point follows the length of river above it, tributaries included. A river whose bed falls steeply is flagged as rapids and drawn with white water. A tile with any water is closed to walking unless a road or trail crosses it there (kind `bridge`); a lake is crossed only by a real street. The art pixels a water tile does not cover show the bank beside it.

### Water only the satellite sees

The satellite land cover also marks water, one whole tile at a time. It cannot be taken at its word: it calls the deep shadow on a steep slope water too. Beside the three reservoirs most of its "water" hung on ground up to 200 m above the lake, and it doubled the size of Hồ Séo Mý Tỷ. So OpenStreetMap says where water is, and the satellite only says how wide:

- **It must join mapped water.** A wet tile counts only if it touches a lake outline, a river (not a stream) or a dam from OpenStreetMap, directly or through other accepted tiles.
- **It must lie at that water's level.** Its ground may be at most 10 m above the level it joins. The level of a lake is the highest ground under its outline, of a river the bed at that spot, of a dam the highest ground along its crest. A level spreads from tile to tile, so a reservoir with no outline fills from the river at its upper end, but nothing climbs a slope.
- **A tile with a mapped road stays land.** The road runs along the shore, not through the water.
- **In town it is ignored.** OpenStreetMap has the lake's true outline there, and a stray wet tile beside it would be a pond that does not exist.
- **Beside a river it is the river.** A trail over a wet tile next to a river channel makes it part of the same footbridge.

What passes has its shore rounded on the art grid, so it does not show as square blocks. The test fails if more than a handful of lake tiles stand over 40 m above the lowest ground near them.

### Dams, power plants and reservoir names

Dams (`waterway=dam` ways) and power plants (`power=plant`) come from OpenStreetMap, fetched into `raw\dams.json` and stored in `osm2-out.json`. A dam is drawn as a pale crest two art pixels wide, a plant as a small powerhouse with a blue-grey roof. Those with a name get the usual boxed label once you zoom in to street-name level. OpenStreetMap has the names in Vietnamese only, so the English label is the same name turned round ("Đập thủy điện Sử Pán 2" becomes "Sử Pán 2 dam"). A dam is walkable only where a mapped road runs along its crest, as at Séo Mý Tỷ and Sử Pán 1. Hồ Séo Mý Tỷ is a place with a card. Two more reservoirs carry a label only (`LAKES` in the template): Sử Pán 1, named by its dam in OpenStreetMap, and Nậm Củn. The Nậm Củn outline has no name in OpenStreetMap; it is identified from the operator's flood notices in Báo Lào Cai, which place the reservoir in Mường Bo commune with a full level of 385 m, the height of the ground under this outline. Check that name if better data turns up.

Terraces are drawn from the same idea: every art pixel takes the height of the ground under it, in 10 m levels, so the steps follow the real contours.

## How the light follows the sun

The slopes are not shaded in the terrain tiles. A separate light layer, one pixel per tile (one per half tile in the town box, from the finer elevation there), is stretched over the terrain and worked out again whenever the sun has moved a fifth of an hour, or the month or the sky changes. That takes about 25 ms on a desktop.

- **Where the sun is:** `sunAt(hour, month)` gives its height and compass bearing for the latitude of Sa Pa on the middle day of the month. In December it rises in the south-east and reaches 44 degrees at noon; in June it passes almost overhead.
- **Relief:** slopes facing the light are brightened and slopes facing away darkened. The light is the sun mixed with a steady glow from the north-west, the usual mapmaker's light, which takes over at noon and at night so the mountains never go flat.
- **Cast shadows:** one sweep across the grid from the sun's side. Each tile remembers how high the shadow of everything behind it stands, and a tile below that line is in shadow. About a fifth of the land is in shadow at 7:30 in September and none at noon. Shadows are weak in fog and absent in rain.

## Life tied to the clock

- **Cable car and mountain train** run only in opening hours: first car 8:00 (7:30 on Saturday and Sunday), last car down 16:00 (17:00 on Friday and Saturday), from Sun World's notice of 28 September 2026. No timetable was found for the mountain train, so it keeps the same hours. Outside them the cars wait at the stations, the train waits at Sun Plaza, every trip is planned on foot, and the cards of the four places involved say so.
- **Night market:** stalls and crowd only on Friday, Saturday and Sunday from 16 to 22.
- **Love market:** a ring of dancers, two khèn players, lanterns and a label in the church square on Saturday from 19 to 22, with a khèn tune when sound is on.
- **Kitchen smoke:** thin wisps from about one village roof in six around 7:00 and 18:00.
- **Yard animals:** chickens, dogs and pigs on village and garden tiles, each within two tiles of home and moving only to a neighbouring tile, so the "nobody on water" check covers them. Birds cross the map along the valley by day in dry weather; they fly, so they are kept in a list of their own.
- **Sea of clouds:** when the middle of the view is above the morning fog (Fansipan, the pass), the valleys below the fog top become a white floor.
- **Rainbow:** for 50 seconds after rain turns to a dry sky by day, if the sun is lower than 42 degrees.
- **Hoarfrost:** pale fields above 900 m on January mornings, gone by 10:00.

## How roads, the town and villages are drawn

Every road is a thin line on the 2 px art grid, stored as 16 bits per tile: main roads two subpixels wide, everything else one. Lanes are grey asphalt within about 2 km of the church and pale concrete outside it. Tiles on a main road also carry a flag, so the road still shows as a tile-wide line when zoomed out. A town or village tile holds up to four small buildings, one per quadrant that no lane crosses. In town they come from OpenStreetMap building and hotel counts; in villages from the satellite built-up class. Railways are drawn the same way.

## How the page is put together

`build.js` packs the JSON and the three binary grids into one container (`[uint32 length][JSON][elev][detail][lc]`), gzips it and embeds it as base64. In the page, `sharedHelpers`, `unpackData` and `buildTerrain` are plain functions with no outside references, so `getTerrain` can run them in a background worker made from their source text. If the worker fails, the same functions run on the main thread. The result is a set of typed arrays (`kind`, `elev`, `shade`, `flags`, `quad`, `stMask`, ...), one entry per tile. `at(x,y)` returns a small view object over them.

On screens up to 900 px wide the title and side panel give way to the map: the panel becomes a bottom sheet that shows only its tab row until a tab is tapped. The status row there is a single line: it leaves out the weekday, the sky word and the north mark, uses a shorter scale bar, and drops the rainfall figure whole if the row is still too long, so nothing is cut off at the edge. Check it with `check-worker.js` at 320, 360 and 390 px in both languages.

## Known gotchas

- The text on the place cards (the `LM` array in the template) was checked against sources on 2026-11-12. The parts most likely to go out of date are the hotel's name (Victoria Sapa became The Myst Sapa Resort in September 2026), the cable car's first and last departures, the days of the night market and the love market, whether the Móng Sến viaduct is open, and commune names (Sa Pa has been a ward, not a town-level unit, since 1 July 2025; the Vietnamese text says "trung tâm Sa Pa", not "thị xã"). Check these again before a new release.
- Five places have no point of their own in OpenStreetMap and are placed by hand (`src:'approx'`): the bus station, Sín Chải (at Sin Chai Ecolodge), Ý Linh Hồ, Giàng Tả Chải and Lếch Dao (on the houses beside the GeoNames point for Bản Lếch, north of Topas Ecolodge).
- `raw` is not in the repository, and `.gitignore` keeps it out, together with a `shots` folder for screenshots. `parse-osm.js` and `parse-osm2.js` reproduced the committed `osm-out.json` and `osm2-out.json` exactly from the saved download on 2026-11-12, before dams were added. A fresh fetch will pick up whatever has changed in OpenStreetMap since.
- The cached download in `raw` was made before guest houses were added to the query. The missing ones were merged in by hand once; a fresh `node fetch-data.js --force` asks for them itself.
- Overpass servers are often busy. `fetch-data.js` splits the request into parts, tries three mirrors, and retries three rounds.
- The built page is about 450 KB, most of it land cover and elevation. `elevStep: 1` in `frame.json` stores elevation for every tile and adds about 350 KB.
- The page needs `DecompressionStream`: Chrome 80, Firefox 113, Safari 16.4 or later.
- The pixel font has no Vietnamese-only letters. Labels that need them, and the whole interface in Vietnamese, use the body font.
- On Windows, read and write text as UTF-8 explicitly in PowerShell 5.1, or Vietnamese names get garbled.

## Sources and licences

Elevation: SRTM via AWS Terrain Tiles. Land cover: Sentinel-2 10 m Land Use/Land Cover, Esri and Impact Observatory, CC BY 4.0. Map data: © OpenStreetMap contributors, ODbL. Font: Press Start 2P, SIL Open Font License.
