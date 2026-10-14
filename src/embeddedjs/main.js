import Poco from "commodetto/Poco";
import parseBMF from "commodetto/parseBMF";
import parseRLE from "commodetto/parseRLE";
import Message from "pebble/message";

const render = new Poco(screen);

function getFont(name, size) {
	const font = parseBMF(new Resource(`${name}-${size}.fnt`));
	font.bitmap = parseRLE(new Resource(`${name}-${size}-alpha.bm4`));
	return font;
}

const font = getFont("KosugiMaru-Regular", 48);
const smallFont = getFont("KosugiMaru-Regular", 22);

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);

// Settings (saved on the watch)
//   invert:   white background, black kanji
//   dateMode: 0 = off, 1 = kanji (十月十四日), 2 = numbers (10月14日)
let invert = localStorage.getItem("invert") === "1";
let dateMode = Number(localStorage.getItem("dateMode")) || 0;

const DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// 1 → 一, 10 → 十, 12 → 十二, 23 → 二十三, 40 → 四十
function kanjiNumber(n) {
	if (n < 10) return DIGITS[n];
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	return (tens > 1 ? DIGITS[tens] : "") + "十" + (ones ? DIGITS[ones] : "");
}

// Draw a list of cells top-to-bottom, each centered on centerX.
// A cell is usually one character; "14" stays together (縦中横 style).
function drawColumn(cells, f, color, centerX, top, step) {
	let y = top;
	for (const cell of cells) {
		const w = render.getTextWidth(cell, f);
		render.drawText(cell, f, color, centerX - (w >> 1), y);
		y += step;
	}
}

function centeredTop(cells, step, H) {
	return (H - cells.length * step) >> 1;
}

function dateCells(now) {
	const month = now.getMonth() + 1;
	const day = now.getDate();
	if (dateMode === 2)
		return [String(month), "月", String(day), "日"];
	return [...(kanjiNumber(month) + "月" + kanjiNumber(day) + "日")];
}

function draw(now) {
	const h = now.getHours() % 12 || 12;
	const m = now.getMinutes();
	const hourCells = [...(kanjiNumber(h) + "時")];

	const W = render.width;
	const H = render.height;
	const step = font.height;
	const bg = invert ? white : black;
	const fg = invert ? black : white;
	const showDate = dateMode !== 0;

	// Column positions (right → left reading order).
	// With the date on: the date sits at the left edge, and the gaps
	// date ↔ minutes, minutes ↔ hour and hour ↔ right edge are all equal.
	const dateX = 16;
	const bigW = render.getTextWidth("時", font);
	const dateRight = dateX + (render.getTextWidth("曜", smallFont) >> 1);
	const colGap = (W - dateRight - 2 * bigW) / 3;
	const minX = showDate ? Math.round(dateRight + colGap + bigW / 2) : W >> 2;
	const hourX = showDate ? Math.round(dateRight + 2 * colGap + 1.5 * bigW) : (W * 3) >> 2;
	const singleX = showDate ? Math.round((dateRight + W) / 2) : W >> 1;

	render.begin();
	render.fillRectangle(bg, 0, 0, W, H);

	if (m === 0 || m === 30) {
		// Single column: 一時 or 一時半
		const cells = m === 30 ? [...hourCells, "半"] : hourCells;
		drawColumn(cells, font, fg, singleX, centeredTop(cells, step, H), step);
	} else {
		// Hour on the right, minutes on the left
		const minCells = [...(kanjiNumber(m) + "分")];
		drawColumn(hourCells, font, fg, hourX, centeredTop(hourCells, step, H), step);
		drawColumn(minCells, font, fg, minX, centeredTop(minCells, step, H), step);
	}

	if (showDate) {
		// One small column: date, a small gap, then the weekday
		const dCells = dateCells(now);
		const wCells = [WEEKDAYS[now.getDay()], "曜", "日"];
		const n = dCells.length + wCells.length;
		// Shrink the spacing a little if the column would not fit (e.g. 十二月三十一日)
		const sStep = Math.min(smallFont.height, Math.floor((H - 8) / (n + 0.5)));
		const gap = sStep >> 1;
		const top = (H - (n * sStep + gap)) >> 1;
		drawColumn(dCells, smallFont, fg, dateX, top, sStep);
		drawColumn(wCells, smallFont, fg, dateX, top + dCells.length * sStep + gap, sStep);
	}

	render.end();
}

function getValue(msg, key) {
	return msg instanceof Map ? msg.get(key) : msg?.[key];
}

// Receive settings from the phone
const message = new Message({
	keys: ["INVERT", "DATE_MODE"],
	onReadable() {
		const msg = this.read();
		const inv = getValue(msg, "INVERT");
		const dm = getValue(msg, "DATE_MODE");
		if (inv !== undefined) {
			invert = !!inv;
			localStorage.setItem("invert", invert ? "1" : "0");
		}
		if (dm !== undefined) {
			dateMode = Number(dm) || 0;
			localStorage.setItem("dateMode", String(dateMode));
		}
		draw(new Date());
	}
});

// Update every minute (fires immediately when registered)
watch.addEventListener("minutechange", (event) => draw(event.date));
