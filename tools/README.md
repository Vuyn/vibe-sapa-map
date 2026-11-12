# Sapa Pixel Map build tools

`index.html` in the parent folder is a single self-contained file. These tools rebuild it. Everything runs on Node 20 or later; only the screenshot tool uses PowerShell. The page opens in Vietnamese; `#lang=en` or the settings tab switches to English.

## Edit the page

All page code lives in `template.html`. The build fills in its placeholders (`__DATA_GZ__`, `__FONT_CSS__`, `__FRAME__`, `__W__`, `__H__`). Edit the template, never the built file, then rebuild and test:

```text
node build.js data template.html ..\index.html
node test-headless.js ..\index.html
```

The test runs the page script in Node with a stubbed DOM. It checks that the data unpacks, every landmark is reachable on foot from the church, the mountain train and cable car rides work in both directions, no person, animal or stall stands on water, no trek line runs over a lake or reservoir, a click on the lake walks to the nearest shore, and no Vietnamese text is garbled. There is no worker in Node, so the test builds the land on the main thread. It cannot check how the page looks. Use the screenshot tools for that.

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
| `d` | Weekday, 0 Sunday to 6 Saturday. Sapa Market fills on Sunday 6 to 11, the night market on Saturday 18 to 23. |
| `z` | Zoom, 1 to 16 |
| `at` | Centre of the view as tile `x,y`. The church is at 406,199. |
| `sel` | Place id to open, for example `laochai` |
| `tab` | `place`, `list`, `settings` or `about` |
| `lang` | `en` or `vi` |
| `sky` | 0 automatic, 1 clear, 2 fog, 3 rain |
| `worker` | `0` builds the land on the main thread instead of a background worker |

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
node parse-osm2.js raw\sapa2.json data\osm2-out.json # OSM land-cover polygons, lakes with their islands, buildings, shops
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
| `osm2-out.json` | OSM land-cover polygons, `water` (lake and reservoir outlines, kept fine) and `holes` (their islands), building centroids with kind, shops and cafés |
| `fonts/` | Press Start 2P woff2 subsets and their unicode ranges |

## How the land is classified

OpenStreetMap wins where it has data: roads, rivers, lakes, buildings, and its few land-cover polygons. Everywhere else the Sentinel-2 class decides: trees become forest, crops become terraces, built-up tiles outside town become villages (houses clustered by smooth noise, with gardens between them), rangeland becomes grass or scrub by slope, bare ground stays bare. Tiles the satellite product marks as cloud fall back to slope and noise rules.

## How water is drawn

Water has its own mask of 16 bits per tile, one per art pixel. Lakes and reservoirs are filled from their OpenStreetMap outlines and islands are cut out; a tile keeps its water only if at least six of its sixteen pixels are wet. Rivers are channels one to five art pixels wide: the width at any point follows the length of river above it, tributaries included. A river whose bed falls steeply is flagged as rapids and drawn with white water. A tile with any water is closed to walking unless a road or trail crosses it there (kind `bridge`); a lake is crossed only by a real street. The art pixels a water tile does not cover show the bank beside it.

Some water has no outline in OpenStreetMap and is known only from the satellite class, one whole tile at a time: the edges of the reservoirs, and small ponds. Its shore is rounded on the art grid, so it does not show as square blocks. Four rules keep it honest:

- **In town it is ignored.** OpenStreetMap has the lake's true outline there, and a stray wet tile beside it would be a pond that does not exist.
- **At a waterfall it is white water.** On steep ground near a waterfall place it is the falls themselves, so it is flagged as rapids.
- **Beside a river it is the river.** A trail over a wet tile next to a river channel makes it part of the same footbridge.
- **A single wet tile with a road or trail through it stays land.** The way is mapped; the pond is smaller than the tile.

Terraces are drawn from the same idea: every art pixel takes the height of the ground under it, in 10 m levels, so the steps follow the real contours.

## How roads, the town and villages are drawn

Every road is a thin line on the 2 px art grid, stored as 16 bits per tile: main roads two subpixels wide, everything else one. Lanes are grey asphalt within about 2 km of the church and pale concrete outside it. Tiles on a main road also carry a flag, so the road still shows as a tile-wide line when zoomed out. A town or village tile holds up to four small buildings, one per quadrant that no lane crosses. In town they come from OpenStreetMap building and hotel counts; in villages from the satellite built-up class. Railways are drawn the same way.

## How the page is put together

`build.js` packs the JSON and the three binary grids into one container (`[uint32 length][JSON][elev][detail][lc]`), gzips it and embeds it as base64. In the page, `sharedHelpers`, `unpackData` and `buildTerrain` are plain functions with no outside references, so `getTerrain` can run them in a background worker made from their source text. If the worker fails, the same functions run on the main thread. The result is a set of typed arrays (`kind`, `elev`, `shade`, `flags`, `quad`, `stMask`, ...), one entry per tile. `at(x,y)` returns a small view object over them.

On screens up to 900 px wide the title and side panel give way to the map: the panel becomes a bottom sheet that shows only its tab row until a tab is tapped.

## Known gotchas

- The cached download in `raw` was made before guest houses were added to the query. The missing ones were merged in by hand once; a fresh `node fetch-data.js --force` asks for them itself.
- Overpass servers are often busy. `fetch-data.js` splits the request into parts, tries three mirrors, and retries three rounds.
- The built page is about 450 KB, most of it land cover and elevation. `elevStep: 1` in `frame.json` stores elevation for every tile and adds about 350 KB.
- The page needs `DecompressionStream`: Chrome 80, Firefox 113, Safari 16.4 or later.
- The pixel font has no Vietnamese-only letters. Labels that need them, and the whole interface in Vietnamese, use the body font.
- On Windows, read and write text as UTF-8 explicitly in PowerShell 5.1, or Vietnamese names get garbled.

## Sources and licences

Elevation: SRTM via AWS Terrain Tiles. Land cover: Sentinel-2 10 m Land Use/Land Cover, Esri and Impact Observatory, CC BY 4.0. Map data: © OpenStreetMap contributors, ODbL. Font: Press Start 2P, SIL Open Font License.
