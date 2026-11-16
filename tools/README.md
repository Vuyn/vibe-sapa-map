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
| `z` | Zoom, as a multiple of the whole-map view. It snaps to the nearest step: the map is only ever shown at 2, 4, 8, 16, 32, 64, 128 or (on sharp screens) 192 and 256 screen pixels a tile, plus the whole-map view. From 32 pixels a tile the close-up art is used. In a window about 800 px wide `z=8.6` is 8 pixels a tile, `z=17` 16, `z=34` 32, `z=69` 64 and `z=138` 128. |
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
| Close-up art | any view with `z=24`, `z=32` or `z=48` |
| Market-goers on the roads into town | `d=0&h=7&z=24&at=363,210` |
| School run | `d=2&h=6.75&z=32&at=426,194` (Monday to Friday) |
| Trekking group with a guide | `d=2&h=10&z=32&at=440,258` |
| Marathon runners | `m=9&d=6&h=9&z=32&at=728,356` |
| Sleeper bus coming up before dawn, headlight on | `h=5.5&z=24&at=475,109` |
| Ploughing, transplanting, harvest | `m=4`, `m=5`, `m=9` with `z=48&at=516,291` |
| Fireflies | `m=6&h=21&z=32&at=515,270&sky=1` |
| Umbrellas | `sky=3&z=32&at=406,199` |
| Rivers in the rains | `m=7` against `m=3`, at `z=16&at=560,310` |
| Wet roads and puddles | `sky=3&z=40&at=412,197` (a view opened with rain starts wet) |
| Mist along the rivers | `h=6.2&m=4&z=14&at=520,285&sky=1` |
| Snow on roofs and landmarks | `m=1&z=40&at=232,286` |
| Rice drying in the yards, tall straw stacks | `m=10&z=48&at=600,297` |
| Ducks in the paddies | `m=5&h=10&z=48&at=43,418` |
| A visitor at a viewpoint | `h=10&z=48&at=396,213&sky=1` |
| Porters on the Fansipan trail | `h=10&z=48&at=225,224` |
| Landmark windows lit | `h=20.5&z=40&at=407,200` |
| Golden hour, blue hour | `h=17.9&m=9&z=8&at=470,250&sky=1`, then `h=18.9` |
| Stars and the Milky Way | `h=23&m=9&z=6&at=560,330&sky=1` |
| Rain rings on the lake | `sky=3&m=7&z=24&at=418,193` |
| The wheel at Cát Cát, the church bell | `z=40&at=386,221`, `z=48&at=407,199` |

Run `check-worker.js` after every change to drawing code: the logic test never calls `render`, so an error there shows only in a real browser, and `shot.ps1` cannot report page errors. Opening the page with any setting skips the welcome box. The first frames build terrain a few chunks at a time, so the tool waits 15 seconds of page time by default (`-Budget`). Headless page time runs ahead of a background worker, so `shot.ps1` adds `worker=0` to every view.

`check-worker.js` covers what `shot.ps1` cannot. It opens the page in real time, checks that the background worker built the land (a second worker, for the light, starts only when the sun first moves, so a view with a fixed hour shows one worker) and that the page is no wider than the window, and can save a screenshot. It also emulates phone sizes, which a browser window cannot reach (the minimum window width is about 500 px):

```text
node --experimental-websocket check-worker.js ..\index.html shots\phone.png 390 800 "#sel=fansipan&tab=place"
```

## The frame

`frame.json` holds the map frame and is read by every tool and by the page: grid size, longitude and latitude bounds, metres per tile, the town box used for buildings and shops, and `elevStep`, the spacing of stored elevation samples in tiles. Currently 840 x 472 tiles of about 38.6 m over longitude 103.690 to 104.005 and latitude 22.240 to 22.405, a 16:9 area of 32.4 by 18.3 km. Tile x = (lon - LON0) / (LON1 - LON0) x W. Tile y = (LAT1 - lat) / (LAT1 - LAT0) x H.

To change the area or resolution, edit `frame.json` and run the whole refresh below. Keep the tile size near 38.6 m, or adjust `K` at the top of the template script, which scales every distance written for the older 77 m grid.

## Refresh the data

```text
node fetch-data.js                                   # downloads into .\raw; cached files are kept, --force refetches
node resample.js                                     # elevation and land-cover grids into .\data
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
| `lc.bin` | Sentinel-2 land-cover class per tile: 0 none, 1 water, 2 trees, 3 flooded, 4 crops, 5 built, 6 bare, 7 snow, 8 cloud, 9 rangeland |
| `osm-out.json` | Simplified roads, town streets, rivers, railways, cable car line, hotel and guest house points, `stays` (named places to stay outside town) and `feat` (waterfalls, viewpoints and peaks with names and heights), in tile coordinates |
| `osm2-out.json` | OSM land-cover polygons, `water` (lake and reservoir outlines, kept fine) and `holes` (their islands), `dams` (crest lines) and `plants` (power plants), each with a name where there is one, building centroids with kind, shops and cafés |
| `fonts/` | Press Start 2P woff2 subsets and their unicode ranges |
| `tiles/<pack>/` | `tilemap_packed.png`, the sheet of 16-pixel tiles of each of the four packs the close-up art is drawn from (Tiny Town, Tiny Farm, Tiny Dungeon, Tiny Ski, all by Kenney, CC0), exactly as it came in the pack, with the pack's `License.txt` beside it |

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

The slopes are not shaded in the terrain tiles. The light is a number a tile (`tone`: from deepest shade to fullest light), worked out again whenever the sun has moved a fifth of an hour, or the month or the sky changes. That takes 40 to 100 ms, so it is done in a second background worker (`lightWorker`, `lightCore`); the map keeps the light it has until the new one arrives. Only the very first light, and every light where there is no worker (old browsers, the test, `shot.ps1`), is worked out on the page itself. Shade is a cool dark blue and light a warm white, the painter's rule. The tones are not laid over the land as a soft picture: they are dithered into the pixel grid, in four strengths of shade and three of light (see One pixel grid). The far view gets one such picture of the whole map from the worker, at its own two pixels a tile; nearer, each chunk of land gets its own (`buildShade`), a few a frame.

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
- **Hoarfrost:** pale fields above 900 m on January mornings, gone by 10:00. The walker leaves footprints in it, and in snow, that fade in a minute and a half.
- **Market-goers:** on Sunday people walk in from Cát Cát, Sín Chải, Ý Linh Hồ, Lao Chải, Tả Van and Tả Phìn with a basket, stay at Sapa Market and walk home, between 4:30 and 14:30.
- **School run:** Monday to Friday children walk to up to six mapped schools at about 6:30 and home at about 16:30.
- **Trekking groups:** three groups of five, a guide in front, leave town at about 7:25, 8:10 and 9:00 and walk the valley trek line.
- **Marathon:** on Fridays and Saturdays in September, 5:00 to 17:00, runners are on the lines of the `vmm` trek (Vietnam Mountain Marathon). The map has no dates, so every September Friday and Saturday counts; the 2026 race was 17 to 20 September.
- **Sleeper buses:** three come up road 4D from Trung Chải at about 5:00, 5:40 and 6:25, wait at the bus station and leave at 13:30, 14:30 and 15:30. Buses and motorbikes show a headlight in the dark.
- **The farming year:** field crews (about 270 people in 96 spots) harvest in September and October, bend over the flooded terraces in May and June, and in April one in five is a buffalo and a ploughman.
- **Rivers in the rains:** June to August every river is one art pixel wider with more white water, and waterfalls throw spray (`wetSeason`, `swell`).
- **Fireflies and frogs:** over terraces on dry nights from May to August.
- **Animals and the walker:** chickens scatter, a dog follows for a while, buffalo turn to look.
- **Rain:** people carry umbrellas, the walker too.
- **Children at play:** forty games of three children in village yards (a ball, a chase, a skipping rope), all day at the weekend and at midday and after school on school days, not in rain (`PLAYS`, `playOn`).
- **Market stalls** come in four kinds by what is on the table: greens, fruit, indigo cloth and brocade, a charcoal grill.
- **Sky strip:** stars and the moon in its phase at night.
- **Wind:** one strength that rises and falls (`windAmt`). It swings the indigo cloth and the washing, streams the flag on Fansipan, and leans kitchen smoke and the smoke of burning stubble. Cloth and flag are drawn each frame for that reason; only their posts are in the painted land (`yardLine`). The gusts that used to cross the map as a wave of lighter ground, the leaning trees and the ripples on the lakes were taken out on 2026-11-16 (see One pixel grid): they were soft layers drawn over the pixel art. Check anything that is meant to move by comparing the canvas at two moments, not by looking at one screenshot.
- **Water:** in rain every drop leaves a ring on the water that widens and fades; rapids flicker white.
- **Working landmarks:** the water wheel at Cát Cát turns (faster from June to August) and the bell in the church tower swings for a few seconds when the hour strikes (`bellUntil`). Both are drawn each frame in the close-up and are left out of the painted picture.
- **Golden hour and blue hour** come from the height of the sun, morning and evening: a warm wash while it is within a few degrees above the horizon, a clear blue while it is a few degrees below.
- **Lightning:** in rain from May to September a soft double flash every ten to twenty seconds and thunder a second or two behind it (`boltNext`, `thunder`). There is no flash when the system asks for reduced motion.
- **Stars:** on a clear night one picture of some four hundred stars and the Milky Way is laid over the view (`starField`), fainter the nearer the middle of the view is to the town, with a few stars twinkling.
- **Rain on the ground:** `wetness` rises to 1 in a quarter of a minute of rain and falls away in a minute and a half after it. Roads darken, puddles lie on lanes, squares and bare ground and shrink as it dries.
- **Winter:** in January and February, yards, gardens and bare ground above the snow line are white, houses there have snow on the roof, and landmarks get a white cap on everything that faces the sky (`sprHi(name, true)`).
- **Harvest in the yards:** in September and October rice dries on mats in village yards; from October to January the straw stacks are taller and more numerous (`hayLimit`). On October afternoons stubble burns in some fields (`BURNS`).
- **Ducks** paddle on the flooded terraces in May (`DUCKS`).
- **People with a job:** one town walker in five carries a shoulder pole; three parties of porters climb the Fansipan trail in the morning and come down in the afternoon (`porterAt`); one or two visitors stand at each viewpoint, the pass and the glass bridge by day in dry weather, and now and then one takes a picture (`LOOKS`).
- **A day in half a minute:** the button under the time slider runs the clock through 24 hours in 30 seconds and then puts it back as it was set (`dayPlay`). Bells and roosters are silent meanwhile.
- **Sounds by the clock:** roosters at first light near villages, the church bell on the hour within earshot (three strokes at 6, 12 and 18), the monastery bell at dusk, rain, frogs on summer nights.

All of these are worked out from the clock, not stored, so a shared link shows the same scene. `clockFigures()` lists every such figure for the test, which checks at each quarter hour of four weekdays that none stands on water.

## Keeping it smooth

The page used to stop for 60 to 140 ms at a time: every second and a half while the clock ran (the light), whenever new land came into view (a chunk of 4,096 tiles painted in one frame), on a far click (the route) and on a change of month (the overview picture). What was done about each:

- **Chunks** are painted by `painter`, a plain pixel buffer that answers to `fillStyle` and `fillRect` like a canvas and is copied to the chunk's canvas in one go. Tile art must therefore use only those two, on whole pixels, with colours as `#rrggbb`, `rgb()` or `rgba()`.
- **The light** is worked out in a worker (see above).
- **The far-view picture** is redone a few rows a frame after a change of month, and the old one stays up until the new one is whole.
- **Route finding** keeps its working arrays between searches and uses a heap in two flat arrays.
- **Points along a line** (`polyAt`) use a running length kept with the line.
- **Fog masks** are written a whole pixel at a time; small sprites are stamped from a cached canvas.

`perf.js` measures all of this. It drives the page through zoom, pan, clicks and changes of month and hour, and prints the slowest frames and the functions that took the time:

```text
node --experimental-websocket perf.js ..\index.html
```

On 2026-11-13 the slowest frame in each action fell from 36-136 ms to 3-18 ms (headless Edge, software drawing). After the soft borders were added the same day it was 3-27 ms: the two highest are single frames, the first one in the close-up tier and the one after a change of month. Run it again after changes to drawing or to anything that runs every frame.

On 2026-11-14, with wind, rain traces and the other things drawn each frame added, the figures were 4-8 ms for panning and walking, 13-24 ms for zooming and a change of month, and one frame of 20-40 ms the first time the close-up tier is entered. While the page is idle after loading it now gets the close-up pictures and the chunks round the walker ready (`warm`).

On 2026-11-16, after the soft layers were taken out and the shading became dithered pictures kept per chunk, every action stayed under 11 ms a frame (panning and walking 4-8 ms, zooming 6-11 ms, a change of month 10 ms); the only longer frame was one of 22 ms on a change of tab, which is the browser laying the panel out.

To look for code that is no longer used, the parser bundled with Node is enough: parse the page script, list every declared name and count the places it is read. That check found nothing unread on 2026-11-13.

## Tiles

Added on 2026-11-16, straight after the pixel-grid pass below. That pass made the art disciplined, but it was still drawn by rules, and rules repeat in ways a hand does not. The close-up is now drawn from four tile packs by Kenney: Tiny Town (houses, trees, forest, fences, paths), Tiny Farm (beds, crops, bales, the farmer, cow, sheep, chicken), Tiny Dungeon (the villagers) and Tiny Ski (snowy pines, rocks, the cable car's cabin and pylon). All four are 16-pixel tiles in one style and one palette, released under CC0.

- **Scale.** Up close a map tile is 64 pixels: four by four cells of 16, and a cell is one tile of the packs. That is the grid the map already had (lanes, water and rails are stored four cells by four a tile, and a house has a quarter of a tile), so a lane is a tile wide, a house two or three tiles wide, a person one tile.
- **The sheets** are embedded as they came (`TILE_SRC`), read into pixel arrays when the page loads (`loadSheets`, `SHEET`), and copied into chunks by `blit`, a method of the chunk painter. A tile is named by a number: the sheet times 1000 plus its place in the sheet, twelve to a row (`TT(28)` is Tiny Town's small tree, `TF(96)` Tiny Farm's bale). Until the sheets are read, the close-up shows the middle view underneath.
- **A fifth sheet, `CU`,** is made in the page: tiles in other colours (`CU_TINT`: the slate roof as wooden shingles and under snow, trees in blossom, a buffalo from the cow, the forest tiles with a green outline) and what the packs do not have, drawn in their manner as rows of letters (`CU_ART`: a pig, a dog, a duck, a motorbike, a coach, a carriage of the mountain train) or put together from pack tiles (the four market stalls).
- **What the page still paints** in the close-up, in the packs' colours: the ground and its soft borders, the rice terraces with the crop of the month, the cliffs, water with its shore, lanes, rails, trails, bridges, dams (`hiGround`, `hiCliffs`). These have to follow the real land pixel by pixel, which tiles cannot.
- **What comes from the sheets** (`hiThings`): the forest, laid cell by cell from the nine forest tiles (`FOREST_TILE` picks the piece from which of the four cells round it are forest too, `fCell`), with taller pines standing out of it and firs above 2,000 m; trees, bushes, sprouts, rocks; garden beds with what grows in them this month; bales, barrels, benches, logs; market stalls; the coach in the bus yard.
- **Houses** (`houseAt`): two cells wide, three where the quarter beside is empty; a wall row with a window and a door; one or two rows of roof. Village houses are timber under slates, shingles or tiles; town houses stone under tiles or slates; a hotel has two floors. The pack draws the strip where roof meets wall for timber under slates and for stone under tiles, so the other pairings get that one row of pixels from the matching tile. A roof reaches up over the cells behind it only where those hold neither a house nor a lane, so no house hides the door of the one behind and nobody walks across a roof.
- **To use another tile:** find its number on the sheet (row times 12 plus column, from 0), and `put` it at a cell or `loose` it a few pixels off. A tile with the grass colour as its background (the grass tufts, flowers, beds, cobbles) is copied with that colour skipped, so it sits on any ground. Anything taller than its cell must stay off the top row of the tile unless its kind is one of those the tile above repaints (forest, village, town).

Still drawn by the page and visibly coarser than the tiles: the pictures of the places that are land (see The close-up tier), and frost, fog and the sea of clouds. The middle view (8 and 16 pixels a tile) and the far view are a coloured map in the packs' palette, not tile art.

## One pixel grid

Added on 2026-11-16. The map was still said to look "very AI-generated", and the reasons were ones a pixel artist would name: pixels of several sizes on screen at once, soft see-through layers over hard-edged art, far more colours than a hand would pick, effects piled on effects, and small things with no outline scattered evenly. What was done, and the rules that follow from it for anything new:

- **Zoom goes in steps.** The map is shown only at 2, 4, 8, 16, 32, 64, 128, 192 or 256 screen pixels a tile (`PPT_STEPS`; 192 where the screen has at least 1.5 device pixels a CSS pixel, 256 from 2.5), so one pixel of the art is always a whole number of screen pixels: 1 or 2 in the far view, 2 or 4 in the middle view, 1 to 4 in the close-up. The one exception is 32, where the close-up art is shown at half size, averaged two by two. `zoomLevels` turns the steps into zoom factors for the window, `snapZ` picks the nearest, and the wheel, pinch, buttons, the address and a resize of the window all go through it. The view is also moved by whole screen pixels (`setWorld`). The whole map fitted to the window is drawn with smoothing.
- **One palette**, that of the tile packs (see The palette).
- **Shade and light are dithered**, not blended, in the far and middle views. `lightCore` gives a tone a tile; `buildShade` reads it between the four nearest tiles for every art pixel of a middle-view chunk and turns it into one of four strengths of shade or three of light. Each strength is a flat band, and only the half of a band nearest the next is stippled into it with an ordered 4 x 4 pattern anchored to the map. The pictures are kept per chunk (`shades`) and made again when the light changes, for at most about 3 ms a frame. The close-up has no such layer: the tiles are drawn with their own light, and height shows there in the cliffs and terraces.
- **Outlines.** The tiles of the packs have a dark plum outline (`INK`), and what the page draws beside them has the same: cliff faces between two dark lines, cloth on the lines, the pictures of the places that are still drawn by the page (`inkEdge`). Forest is the exception: its mass is drawn with a dark green outline (a recoloured copy of the forest tiles), or a whole hillside is a mesh of dark lines; single trees keep the dark one.
- **No smooth lines.** Trek routes are square dots stepped along the line, two on and two off; the cable is stepped pixel by pixel; rain is short streaks of three stacked blocks. There is no `stroke()` left in the page.
- **Taken out:** the gust wave over the fields and its strokes, trees leaning in it, ripples and glints on open water, cloud shadows and the pale cloud haze of the far view, mist along the rivers, butterflies, and the slow drift of the ground colour. Each was a soft or sub-pixel layer, and together they were most of the "effects on effects". Wind is still there where a thing has pixels of its own to move: cloth, the flag, smoke.
- **Left as they were:** frost, valley fog and the sea of clouds are still see-through pictures with one value a tile, blended in the close-up. The fog level changes every few seconds of a foggy morning, so a dithered picture per chunk would be made again all the time. Golden hour, blue hour, night and rain are flat washes over the whole view, which leave the pixel grid alone.
- **For new art:** draw in whole pixels of the tier you are in (`S` in the middle view, `1/HD` in the close-up, `2/HD` for a landmark pixel); use a palette colour or let `pal` snap it; give a thing that stands on the land an outline and a thing that is land none; shade with a second flat colour or a dither, not with a see-through gradient; and if it moves, move it by whole pixels.

On the same day the close-up art was moved onto a hand-drawn tileset: see Tiles.

## Height

Added on 2026-11-14, when the map was asked to look "2.5D", with higher and lower ground told apart as in top-down pixel games. The land is drawn as levels of 60 m (`STEP_H`), with a face wherever one level drops to the next.

- **The view is from the south.** Where the ground steps down towards the bottom of the screen you see the face of the step: sixteen pixels of earth, rock, ice or walling in the close-up (twenty-six for a drop of two levels), streaked, dark at the foot, between two dark lines, under a lit lip of the ground above. Where it steps down away from you there is only a faint line. A step facing east shows a narrow face in shade, one facing west a narrow lit face. On a steep slope the faces run together into a cliff. The earth of a face is darker than the earth of a path, or a face is taken for a road.
- **The faces follow the contours.** The level is read from the height of the ground under every pixel (`eSub`), so a face is a curve and never follows the grid of tiles. `stepsHere` skips the tiles no level line comes near. A tile reads up to thirty pixels above itself and six to the side, because a face that starts in the next tile hangs into this one; `R` cuts each tile's share (`hiCliffs`).
- **Forest** shows its levels as a band of shade across the tree tops, drawn after the trees. **Paving** gets faces of walling, which read as the retaining walls of a hill town. **Rice terraces** do the same at their own 10 m: a bund two pixels tall where the step above faces you, a lit edge where this step drops away.
- **The 8-pixel art** draws a face one art pixel tall under a lighter lip; **the far view** darkens the upper half of a tile that lies below an 80 m drop and lightens the lower half of the tile above it.
- **Cost:** a tile crossed by a level line reads about six thousand heights. A close-up chunk is four tiles, and a frame stops starting new chunks after 3.5 ms; `perf.js` on 2026-11-16, with the tile art: every action under 18 ms a frame, panning and walking in the close-up under 5 ms.

## Soft borders

The land is stored one kind a tile, but it is not drawn as squares. Added on 2026-11-13, when the map still looked "stiff" where regions met.

- **One source for ground colour.** `groundCol(x, y, hi)` gives the plain colour of a tile of open ground and null for anything with a hard edge (water, roads) or no single colour (fields). It is kept per tile until the month changes. (Until 2026-11-16 the colour also drifted in small steps across the map; with a small palette that drift only made a surface flip between two colours, so it was removed.)
- **Wobbling borders, close-up.** Each side of a tile has a reach (`edgeReach`): how far the ground on one side runs over it, pixel by pixel along its 64 pixels, from +7 to -7. Both tiles work the reach out from the same numbers and each paints only its own pixels, so the border wobbles and runs on unbroken from tile to tile. Fields are reached into but never reach out, and get a bund drawn along the border. Up close most open ground (meadow, garden, village, town, forest floor) is the one grass green of the tile packs, so these borders show only where grass meets scrub, rock, bare earth, snow or paving.
- **What strays over a border:** small trees out from a forest onto open ground (`strays`), and three cells in ten along a forest's edge left open (`fCell`), so the tree line is not the line of the tiles.
- **Nothing is painted outside its tile, and yet things overlap.** `R` and `B`, the rectangle and the tile-copy of the close-up art, cut everything to the tile. A roof or a tall tree that reaches up over the tile behind it is painted twice: once by its own tile (which loses the top) and once by the tile above, which paints the things of the tile below it 64 pixels down and keeps only what reaches in (`hiThings(…, off)`). That is the rule for anything that crosses a tile line: draw the same thing from both sides, from the same numbers.
- **Softened outlines.** `smoothCells` turns a 4 x 4 cell pattern (lanes, water) into 64 x 64 pixels with five pixels cut from every corner that sticks out and filled into every corner that cuts in. Lanes get a rim all along the result. Water gets the shore the Tiny packs draw: under a northern shore a bank of earth, a line of foam and a band of deeper water; along the other shores the foam alone.
- **Fields under rivers and roads.** A water tile, or a tile that is all road with a lane drawn on it, shows the ground beside it round the water or the lane (`nearGround`); where that ground is a field the terrace steps run right through.
- **Houses.** `houseAt` says where a house stands and what it is built of (see Tiles). A village tile has one house, two in the middle of a hamlet; in town the count comes from OpenStreetMap. No two garden tiles are laid out alike (five plans of beds).
- **The 8-pixel art** has the same idea at its own size: along every side one art pixel in three belongs to the ground across it.
- **The far view** (`miniImage`) has four pixels a tile, and two in five on open ground take the colour of the ground beside them. `miniSmall` is the same picture at one pixel a tile for the overview.
- **The town square, the bus yard and the market ground** used to be boxes stamped by the terrain build. OpenStreetMap was asked for their outlines on 2026-11-14: it has only a point for the square and points for the bus station (and outlines for the two market halls, about five tiles together, which are not used). Each is now a rounded patch with an uneven edge round its point (`patch` in `buildTerrain`), and paving and tarmac take part in the soft borders (`PLAZA_COL`, `YARD_COL` in `groundCol`).
- **Nothing drawn over the land ends on a tile line.** Slope light and mountain shadows are dithered from tones read between the four nearest tiles, so their bands follow the hills and not the grid. Landmark pictures do not sit on a rectangle of their own ground (`kit.cut` breaks a straight outline). Frost, fog and the sea of clouds are still one value a tile and are blended in the close-up (see One pixel grid for why they were left).
- **No popping.** A chunk that has just been painted fades in over the coarser picture for a fifth of a second (`show` in `render`), and on a change of zoom tier, in either direction, what was painted for the tier just left fades out over the new one (`tierPrev`).
- **The 8-pixel art has softened outlines too:** lanes and water go through `smoothCells` at two pixels a cell.

## The palette

Every solid colour on the map is snapped to the palette of the tile packs (`PALETTE`, 57 colours: the dark plum outline, slates and stone, reds, timber and earth, golds, greens, water, snow, two purples). The four packs share it, and the page uses nothing else, so that what it still draws itself (ground, terraces, cliffs, water, roads, the far and middle views) sits with the tiles. The colours the page's own drawing uses most have names (`INK`, `GRASS`, `DIRT`, `STONE`, `WATER`, ...). Colours in older code are still written as hex; `pal` and `palRGB` replace each with the nearest palette colour the first time it is used, so nothing is paid while drawing. A see-through colour painted into a chunk is mixed with what is under it and the result snapped too (`blendC`). What is drawn over the land each frame (night, weather, glows) is not snapped. When a colour written long ago lands on a wrong neighbour (a tree trunk that came out red), change the colour in the code: `node snaps.js drawTile` lists the colours written in a function and what each becomes.

## The close-up tier

Below 6 screen pixels a tile the map is the far view (`miniImage`, two pixels a tile). At 8 and 16 pixels a tile it is drawn from 8-pixel tiles by the page itself (`drawTile`, chunks of 16 tiles): a coloured map with a little texture. From 32 up it is the close-up, 64 pixels a tile (`drawTileHi`, `chunksHi`, chunks of 2 x 2 tiles), drawn from tile sheets: see Tiles. A frame paints new chunks for at most 3.5 ms and shows the coarser picture underneath until the fine one is ready. Nothing new is stored: the close-up art reads the same per-tile arrays.


- **People, animals and vehicles** up close are tiles of the packs (`drawPerson` and the other `draw…` helpers; `PEOPLE` lists the villagers). Which villager a walker is follows from the colours it was given, so the same walker always looks the same; field hands are the farmer in the straw hat; you are the figure in the blue cap. A step is a hop of one pixel. The few small things that are still rows of letters (`FIG`: the basket on a back, the shoulder pole, the umbrella, birds, the homestay, viewpoint, peak and power-plant signs) are stamped with `putFig`, which always puts them on the close-up's pixel grid.
- **Landmarks.** The buildings among the places (church, cable car station, Sun Plaza, monastery, temple, museum, hotel, market hall, night market, the village houses) are built from the same roof and wall tiles as the houses, larger (`LM_TILES`, `lmCompose`): a list of parts with their floors, roofs and walls, plus a few strokes for what tiles cannot give (the cross, the clock, the cabin on its rope). Places that are land (the summit, the island, the tarn, the hill, the falls, the pass, the glass bridge, the carved stones, the gate, the mill by its stream, and the bus, the bell tower and the Buddha) keep the pictures the page draws (`HSPR`), shown at three close-up pixels to one of theirs (`LMK`), which is coarser than everything round them. A picture stands in the middle of its plot on the lower edge (`lmAt`), and everything drawn over it (bell, wheel, flag, lit windows) starts from that corner. Every sprite needs an entry in `LM_TILES` or `HSPR`.
- **Layers that hold one value a tile** and are still laid over the land as a picture (frost, fog, the sea of clouds) are drawn with smoothing in close-up, where a tile would otherwise show as a square of 32 to 256 pixels. Night glows are cut from two-pixel blocks (`pixelDisc`).
- **Windows at night** use `houseAt`, `houseWins` and `PANES`, the same numbers the house art uses, so the light is in the panes of a window that is really drawn; a place built from tiles keeps the list of its panes with its picture (`lit`).

## How roads, the town and villages are drawn

Every road is a thin line on the 2 px art grid, stored as 16 bits per tile: main roads two subpixels wide, everything else one. Lanes are grey asphalt within about 2 km of the church and pale concrete outside it. Tiles on a main road also carry a flag, so the road still shows as a tile-wide line when zoomed out. A town or village tile holds up to four small buildings, one per quadrant that no lane crosses. In town they come from OpenStreetMap building and hotel counts; in villages from the satellite built-up class. Railways are drawn the same way.

## How the page is put together

`build.js` packs the JSON and the two binary grids into one container (`[uint32 length][JSON][elev][lc]`), gzips it and embeds it as base64; the four tile sheets go in beside it as data URLs (`__TILES__`), unchanged. In the page, `sharedHelpers`, `unpackData` and `buildTerrain` are plain functions with no outside references, so `getTerrain` can run them in a background worker made from their source text. If the worker fails, the same functions run on the main thread. The result is a set of typed arrays (`kind`, `elev`, `flags`, `quad`, `stMask`, ...), one entry per tile. `at(x,y)` returns a small view object over them.

On screens up to 900 px wide the title and side panel give way to the map: the panel becomes a bottom sheet that shows only its tab row until a tab is tapped. The status row there is a single line: it leaves out the weekday, the sky word and the north mark, uses a shorter scale bar, and drops the rainfall figure whole if the row is still too long, so nothing is cut off at the edge. Check it with `check-worker.js` at 320, 360 and 390 px in both languages.

## Known gotchas

- The text on the place cards (the `LM` array in the template) was checked against sources on 2026-11-12. The parts most likely to go out of date are the hotel's name (Victoria Sapa became The Myst Sapa Resort in September 2026), the cable car's first and last departures, the days of the night market and the love market, whether the Móng Sến viaduct is open, and commune names (Sa Pa has been a ward, not a town-level unit, since 1 July 2025; the Vietnamese text says "trung tâm Sa Pa", not "thị xã"). Check these again before a new release.
- Five places have no point of their own in OpenStreetMap and are placed by hand (`src:'approx'`): the bus station, Sín Chải (at Sin Chai Ecolodge), Ý Linh Hồ, Giàng Tả Chải and Lếch Dao (on the houses beside the GeoNames point for Bản Lếch, north of Topas Ecolodge).
- Six kinds of ground that no rule ever assigned (`road`, `track`, `street`, `hotel`, `big`, `hut`) were removed on 2026-11-14 with their drawing code. `orchard` is kept: no tile has it with today's data, but OpenStreetMap land cover can produce it.
- `raw` is not in the repository, and `.gitignore` keeps it out, together with a `shots` folder for screenshots. `parse-osm.js` and `parse-osm2.js` reproduced the committed `osm-out.json` and `osm2-out.json` exactly from the saved download on 2026-11-12, before dams were added. A fresh fetch will pick up whatever has changed in OpenStreetMap since.
- The cached download in `raw` was made before guest houses were added to the query. The missing ones were merged in by hand once; a fresh `node fetch-data.js --force` asks for them itself.
- Overpass servers are often busy. `fetch-data.js` splits the request into parts, tries three mirrors, and retries three rounds.
- The built page is about 630 KB, most of it land cover, OpenStreetMap geometry and elevation; the four tile sheets are about 27 KB of it. `elevStep: 1` in `frame.json` stores elevation for every tile and adds about 350 KB. A finer elevation grid for the town (`detail.bin`, 192 x 192) was fetched, packed and unpacked until 2026-11-16; its only use was a finer light layer over the town in the far view, which went when the light became dithered, so the grid and the steps that made it were removed.
- The page needs `DecompressionStream`: Chrome 80, Firefox 113, Safari 16.4 or later.
- The pixel font has no Vietnamese-only letters. Labels that need them, and the whole interface in Vietnamese, use the body font.
- On Windows, read and write text as UTF-8 explicitly in PowerShell 5.1, or Vietnamese names get garbled.

## Sources and licences

Elevation: SRTM via AWS Terrain Tiles. Land cover: Sentinel-2 10 m Land Use/Land Cover, Esri and Impact Observatory, CC BY 4.0. Map data: © OpenStreetMap contributors, ODbL. Font: Press Start 2P, SIL Open Font License.

Tiles: Tiny Town, Tiny Farm, Tiny Dungeon and Tiny Ski, created and distributed by Kenney (www.kenney.nl), Creative Commons Zero (CC0). CC0 asks for no credit; it is given here, in the root README and on the page's own credits line because the close-up art is his. The sheets are in `data/tiles` as they came, each with its `License.txt`. Recoloured copies of some tiles and the few sprites the packs do not have are made in the page (`CU_TINT`, `CU_ART`), not stored.
