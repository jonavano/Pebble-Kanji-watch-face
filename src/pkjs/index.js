// Settings page for the kanji watch face (runs on the phone)

function settingsPage(invert, dateMode) {
	function opt(value, label) {
		return '<option value="' + value + '"' + (dateMode === value ? ' selected' : '') + '>' + label + '</option>';
	}
	var html =
		'<!DOCTYPE html><html><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width,initial-scale=1">' +
		'<title>漢字時計</title><style>' +
		'body{font-family:-apple-system,Helvetica,sans-serif;background:#1c1c1e;color:#fff;margin:0;padding:24px}' +
		'h1{font-size:22px;font-weight:600;margin:0 0 24px}' +
		'.row{display:flex;justify-content:space-between;align-items:center;background:#2c2c2e;border-radius:12px;padding:16px;margin-bottom:12px}' +
		'.row span{font-size:17px}' +
		'input{width:24px;height:24px}' +
		'select{font-size:16px;padding:6px;border-radius:8px}' +
		'button{margin-top:12px;width:100%;padding:14px;font-size:17px;border:0;border-radius:12px;background:#ff4700;color:#fff}' +
		'</style></head><body>' +
		'<h1>漢字時計 Settings</h1>' +
		'<label class="row"><span>White background, black kanji</span>' +
		'<input type="checkbox" id="invert"' + (invert ? ' checked' : '') + '></label>' +
		'<label class="row"><span>Date &amp; weekday</span>' +
		'<select id="date">' +
		opt(0, 'Off') + opt(1, 'Kanji (十月十四日)') + opt(2, 'Numbers (10月14日)') +
		'</select></label>' +
		'<button id="save">Save</button>' +
		'<script>document.getElementById("save").onclick=function(){' +
		'var s={invert:document.getElementById("invert").checked,date:Number(document.getElementById("date").value)};' +
		'location.href="pebblejs://close#"+encodeURIComponent(JSON.stringify(s));};</script>' +
		'</body></html>';
	return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

Pebble.addEventListener('showConfiguration', function () {
	var invert = localStorage.getItem('invert') === '1';
	var dateMode = Number(localStorage.getItem('dateMode')) || 0;
	Pebble.openURL(settingsPage(invert, dateMode));
});

Pebble.addEventListener('webviewclosed', function (e) {
	if (!e || !e.response) return;
	var settings;
	try {
		settings = JSON.parse(decodeURIComponent(e.response));
	} catch (err) {
		return;
	}
	var invert = settings.invert ? 1 : 0;
	var dateMode = Number(settings.date) || 0;
	localStorage.setItem('invert', String(invert));
	localStorage.setItem('dateMode', String(dateMode));
	Pebble.sendAppMessage({ INVERT: invert, DATE_MODE: dateMode },
		function () { console.log('Settings sent'); },
		function () { console.log('Settings failed to send'); });
});
