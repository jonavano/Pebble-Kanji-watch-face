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

const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);

// Setting: invert colors (white background, black kanji). Saved on the watch.
let invert = localStorage.getItem("invert") === "1";

const DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

// 1 → 一, 10 → 十, 12 → 十二, 23 → 二十三, 40 → 四十
function kanjiNumber(n) {
	if (n < 10) return DIGITS[n];
	const tens = Math.floor(n / 10);
	const ones = n % 10;
	return (tens > 1 ? DIGITS[tens] : "") + "十" + (ones ? DIGITS[ones] : "");
}

// Draw a string top-to-bottom, each character centered on centerX
function drawColumn(text, color, centerX, top, step) {
	let y = top;
	for (const ch of text) {
		const w = render.getTextWidth(ch, font);
		render.drawText(ch, font, color, centerX - (w >> 1), y);
		y += step;
	}
}

function draw(now) {
	const h = now.getHours() % 12 || 12;
	const m = now.getMinutes();
	const hourText = kanjiNumber(h) + "時";

	const W = render.width;
	const H = render.height;
	const step = font.height;
	const bg = invert ? white : black;
	const fg = invert ? black : white;

	render.begin();
	render.fillRectangle(bg, 0, 0, W, H);

	if (m === 0 || m === 30) {
		// Single centered column: 一時 or 一時半
		const text = hourText + (m === 30 ? "半" : "");
		drawColumn(text, fg, W >> 1, (H - [...text].length * step) >> 1, step);
	} else {
		// Two columns, read right → left: hour on the right, minutes on the left
		const minText = kanjiNumber(m) + "分";
		drawColumn(hourText, fg, (W * 3) >> 2, (H - [...hourText].length * step) >> 1, step);
		drawColumn(minText, fg, W >> 2, (H - [...minText].length * step) >> 1, step);
	}

	render.end();
}

// Receive settings from the phone
const message = new Message({
	keys: ["INVERT"],
	onReadable() {
		const msg = this.read();
		const value = msg instanceof Map ? msg.get("INVERT") : msg?.INVERT;
		if (value === undefined) return;
		invert = !!value;
		localStorage.setItem("invert", invert ? "1" : "0");
		draw(new Date());
	}
});

// Update every minute (fires immediately when registered)
watch.addEventListener("minutechange", (event) => draw(event.date));
