# Sapa Pixel Map

An interactive pixel-art map of Sa Pa and the Mường Hoa valley in Lào Cai, Vietnam, in a single HTML file. The land is not drawn by hand: it is built from real elevation data, satellite land cover and OpenStreetMap, then rendered as pixel art.

Bản đồ pixel tương tác của Sa Pa và thung lũng Mường Hoa, gói trong một tệp HTML. Địa hình, sông suối, đường và bản làng dựng từ dữ liệu thật. Giao diện mặc định là tiếng Việt, có thể đổi sang tiếng Anh trong thẻ Cài đặt.

## Open it

Open `index.html` in a browser. There is nothing to install and no server to run. To host it, enable GitHub Pages for this repository: the page is `index.html` at the root.

It needs a browser from 2023 or later (Chrome 80, Firefox 113, Safari 16.4). It works offline; only the text font is fetched from Google Fonts, and the system font is used when that fails.

## What is on the map

- **The area:** 32.4 by 18.3 km around Sa Pa town, as 840 by 472 tiles of about 39 m. It runs from Fansipan (3,147 m) and the Ô Quy Hồ pass down the Mường Hoa valley to Bản Hồ.
- **33 places with a card each:** the stone church, the lake, the markets, Fansipan, waterfalls, the villages of the valley, and Hồ Séo Mý Tỷ, the reservoir high on the Hoàng Liên range. Each card has a short description, a travel tip, walking and riding times, and a small picture built from the real skyline behind that place.
- **Real terrain:** rice terraces that follow the contour lines, rivers that widen downstream with rapids where they fall steeply, the true outline of Hồ Sa Pa with its island, the hydropower reservoirs with their dams and power plants, and hill shading from the elevation model.
- **Town detail:** streets, buildings, hotels, shops and cafés from OpenStreetMap, with street names when you zoom in.
- **A close-up view:** zoom in past street level and the map is redrawn at three times the detail: houses with doors and windows, tree crowns, the crop on each terrace, and people small enough to blend in but clear enough to tell a guide from a farmer.
- **Homestays:** named homestays near the valley villages, as mapped in OpenStreetMap.
- **Peaks, waterfalls and viewpoints** with their names and heights.

## What you can do

- **Walk:** click or tap anywhere and the walker finds a way there along roads and trails. A flag marks the destination and dots show the path. A click on water or a cliff goes to the nearest spot that can be reached.
- **Ride:** trips between town and the cable car base take the Mường Hoa mountain train, and the cable car goes up to Fansipan. Both keep their real opening hours; after the last car the walker goes on foot.
- **Change the month:** the terraces flood in May, turn green in summer and gold in September. February brings peach blossom and the Hmong Gầu Tào festival, April brings buffalo ploughing, May and June people bent over the seedlings, September and October harvest crews, and January and February snow on the high ridge. From June to August the rivers run wider and whiter.
- **Change the time and the sky:** the sun crosses the sky as it does at Sa Pa's latitude, so the mountains throw long shadows in the morning and evening and almost none at noon. Night brings lit windows and street lamps; there is morning valley fog, a sea of clouds seen from Fansipan and the pass, rain with a rainbow after it, and hoarfrost on the fields on January mornings.
- **Visit on market day:** Sapa Market fills up on Sunday morning, the night market sets up on Friday, Saturday and Sunday evenings, and the love market fills the church square on Saturday evening.
- **Watch village life:** kitchen smoke at breakfast and supper time, chickens, dogs and pigs in the yards, buffalo in the fields, birds over the valley. Children walk to school on weekdays, villagers walk to market on Sunday, trekking groups follow their guide down the valley in the morning, sleeper buses arrive before dawn, and on September Fridays and Saturdays the mountain marathon is on. Fireflies come out over the terraces on summer nights. The animals notice the walker.
- **Keep a journal:** places you have walked to are ticked off. Your position and journal are saved in the browser.
- **Read the weather:** the status bar shows the typical temperature and rainfall for the chosen month, adjusted to the height where the walker stands.
- **Listen:** optional sound of river, wind, birds, market chatter, the train and the cable car, with roosters at dawn, the church bell on the hour, the monastery bell at dusk, rain, and frogs on summer nights.

## Controls

| Input | Action |
| --- | --- |
| Click or tap | Walk to that spot, or to a place |
| Drag | Move the view |
| Scroll, pinch, `+` and `-` | Zoom |
| Double tap (phone) | Zoom in at that spot |
| Arrow keys | Move the view |
| `Enter` | Walk to the cross in the middle of the view |

On a phone the map fills the screen. The panel is a sheet at the bottom that opens when you tap one of its tabs.

## Link to a view

The address can carry a view, which makes a shareable link. For example, `index.html#h=18&m=9&z=8&at=534,292&sel=tavan` opens Tả Van at six in the evening in September.

| Setting | Meaning |
| --- | --- |
| `h` | Hour, 0 to 24 |
| `m` | Month, 1 to 12 |
| `d` | Weekday, 0 Sunday to 6 Saturday |
| `z` | Zoom, 1 to 48 |
| `at` | Centre of the view as tile `x,y` (the church is at 406,199) |
| `sel` | Place to open, for example `laochai` |
| `lang` | `vi` or `en` |
| `sky` | 0 automatic, 1 clear, 2 fog, 3 rain |

## How it is built

`index.html` is a build output. All page code lives in `tools/template.html`, and the map data is packed into the page as one compressed block of about 260 KB.

```text
cd tools
node build.js data template.html ..\index.html
node test-headless.js ..\index.html
```

The tools need Node 20 or later. [tools/README.md](tools/README.md) describes the whole pipeline: how to refresh the data, how the land is classified, how water and roads are drawn, and how to take screenshots of the page for checking.

## Data and credits

- **Elevation:** SRTM, through AWS Terrain Tiles.
- **Land cover:** Sentinel-2 10 m Land Use/Land Cover, Esri and Impact Observatory, CC BY 4.0.
- **Roads, rivers, lakes, buildings, shops, places to stay and most places:** © OpenStreetMap contributors, Open Database License.
- **Monthly temperature and rainfall:** Sa Pa averages from climatestotravel.com.
- **Fonts:** Press Start 2P and IBM Plex Sans, SIL Open Font License.

Place descriptions and travel tips are written for this map. Check opening times, prices and trail conditions locally before you travel.

## Licence

The code is under the MIT licence, see [LICENSE](LICENSE). The map data keeps the licences of its sources listed above.
