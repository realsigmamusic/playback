// --- CONFIGURAÇÃO PWA & WAKE LOCK ---
let wakeLock = null;
document.addEventListener('click', async () => {
	if (!wakeLock && navigator.wakeLock) {
		try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
	}
}, { once: true });

// --- PROTEÇÃO CONTRA SAÍDA ACIDENTAL ---
window.addEventListener('beforeunload', (e) => {
	if (isPlaying) { e.preventDefault(); e.returnValue = ''; return ''; }
});

// --- AUDIO ENGINE PROFISSIONAL ---
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let sourceNode = null;	   // O som que está tocando
let nextSourceNode = null;   // O som agendado (para troca perfeita)
let gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

// --- ESTADO ---
let isPlaying = false;
let startTime = 0;	   // Momento zero do audioContext
let pausedAt = 0;		// Onde parou (segundos)
let loopEnabled = false;

let playlist = [], currentSong = null, sections = [];
let currentSectionIndex = -1, nextSectionIndex = -1;
let animId;
let isScheduled = false; // Trava de segurança para agendamento

const offcanvas = new bootstrap.Offcanvas('#menu');

// --- CARREGAMENTO ---
document.getElementById('folder-input').addEventListener('change', async (e) => {
	const files = Array.from(e.target.files);
	const audioFiles = files.filter(f => f.name.toLowerCase().match(/\.(mp3|wav|ogg|m4a)$/));
	const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
	playlist = [];

	for (let audio of audioFiles) {
		const baseName = audio.name.substring(0, audio.name.lastIndexOf('.'));
		const match = jsonFiles.find(j => j.name.substring(0, j.name.lastIndexOf('.')) === baseName);
		if (match) {
			try {
				const data = JSON.parse(await match.text());
				playlist.push({
					name: data.title || baseName,
					artist: data.artist || "",
					bpm: data.bpm || "",
					key: data.key || "",
					audioFile: audio,
					sections: data.sections.sort((a, b) => a.time - b.time)
				});
			} catch (e) { console.error("Erro JSON:", e); }
		}
	}
	renderPlaylist();
	offcanvas.hide();
});

function renderPlaylist() {
	const list = document.getElementById('song-list');
	if (playlist.length === 0) { list.innerHTML = '<div class="p-4 text-center text-muted">Nenhum par (Audio + JSON) encontrado.</div>'; return; }
	document.getElementById('empty-state').classList.add('d-none');

	list.innerHTML = playlist.map((s, i) => {
		let details = [];
		if (s.artist) details.push(s.artist);
		if (s.bpm) details.push(s.bpm + " BPM");
		if (s.key) details.push("Tom: " + s.key);

		const detailsText = details.join(' • ');

		return `
		<button class="list-group-item list-group-item-action song-item py-3" onclick="loadSong(${i})">
			<div class="fw-bold">${s.name}</div>
			${detailsText ? `<small class="text-muted">${detailsText}</small>` : ''}
		</button>
	`}).join('');
}

async function loadSong(i) {
	stopAudio();
	currentSong = playlist[i];
	sections = currentSong.sections;

	document.getElementById('song-title').innerText = currentSong.name;
	document.getElementById('loader').classList.remove('d-none');
	document.getElementById('btn-play').disabled = true;
	document.getElementById('ready').classList.add('d-none');

	document.querySelectorAll('.song-item').forEach(el => el.classList.remove('active-song'));
	document.querySelectorAll('.song-item')[i].classList.add('active-song');

	try {
		const buffer = await currentSong.audioFile.arrayBuffer();
		audioBuffer = await audioCtx.decodeAudioData(buffer);

		document.getElementById('loader').classList.add('d-none');
		document.getElementById('ready').classList.remove('d-none');
		document.getElementById('btn-play').disabled = false;

		renderGrid();

		currentSectionIndex = 0;
		pausedAt = sections[0].time;
		updateTimerVisual(pausedAt);
		updateButtonStyles();
		updateProgressBar(pausedAt); // Zera barra

		offcanvas.hide();

	} catch (e) {
		document.getElementById('loader').classList.add('d-none');
		alert("ERRO CRÍTICO: Não foi possível ler o áudio.\n\nMotivo: " + e.message + "\n\nVerifique se o arquivo está corrompido.");
		console.error(e);
	}
}

function renderGrid() {
	document.getElementById('sections-grid').innerHTML = sections.map((s, i) => `
		<button class="section-btn" id="sec-btn-${i}" onclick="scheduleSection(${i})">${s.label}</button>
	`).join('');
}

// --- ENGINE DE PLAYBACK ---

function playAudio(offset, when = 0) {
	const startTimeAbs = (when === 0) ? audioCtx.currentTime : when;

	const source = audioCtx.createBufferSource();
	source.buffer = audioBuffer;
	source.connect(gainNode);
	source.start(startTimeAbs, offset);

	if (when === 0) {
		if (sourceNode) try { sourceNode.stop(); } catch (e) { }
		sourceNode = source;
		startTime = audioCtx.currentTime - offset;
		isPlaying = true;
		isScheduled = false;
		updateUI(true);
		startLogic();
	} else {
		nextSourceNode = source;
	}
}

function stopAudio() {
	if (sourceNode) { try { sourceNode.stop(); } catch (e) { } sourceNode = null; }
	if (nextSourceNode) { try { nextSourceNode.stop(); } catch (e) { } nextSourceNode = null; }

	gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
	gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
	document.getElementById('btn-fade').classList.remove('fade-active');

	isPlaying = false;
	pausedAt = 0;
	nextSectionIndex = -1;
	isScheduled = false;

	updateUI(false);
	updateButtonStyles();
	updateProgressBar(0); // Reseta barra
	cancelAnimationFrame(animId);
	document.getElementById('timer').innerText = "00:00";
}

function triggerFadeOut() {
	if (!isPlaying) return;
	const fadeBtn = document.getElementById('btn-fade');
	fadeBtn.classList.add('fade-active');

	const now = audioCtx.currentTime;
	gainNode.gain.setValueAtTime(gainNode.gain.value, now);
	gainNode.gain.linearRampToValueAtTime(0, now + 5);

	setTimeout(() => stopAudio(), 5000);
}

function togglePlay() {
	if (isPlaying) {
		pausedAt = audioCtx.currentTime - startTime;
		stopAudio();
	} else {
		if (audioCtx.state === 'suspended') audioCtx.resume();
		let startPoint = pausedAt > 0 ? pausedAt : (sections[0] ? sections[0].time : 0);
		playAudio(startPoint);
		updateButtonStyles();
	}
}

// --- LÓGICA INTELIGENTE (LOOKAHEAD + PROGRESS BAR) ---
function startLogic() {
	cancelAnimationFrame(animId);

	const check = () => {
		if (!isPlaying) return;

		const now = audioCtx.currentTime - startTime;
		updateTimerVisual(now);
		updateProgressBar(now); // ATUALIZA A BARRA

		if (currentSectionIndex !== -1 && sections[currentSectionIndex + 1]) {
			const nextSec = sections[currentSectionIndex + 1];
			const timeRemaining = nextSec.time - now;

			if (timeRemaining < 0.2 && timeRemaining > 0 && !isScheduled) {
				isScheduled = true;
				const switchTimeAbs = audioCtx.currentTime + timeRemaining;

				if (loopEnabled) {
					const loopStart = sections[currentSectionIndex].time;
					performSeamlessSwitch(switchTimeAbs, loopStart, currentSectionIndex);

				} else if (nextSectionIndex !== -1) {
					const targetStart = sections[nextSectionIndex].time;
					const targetIdx = nextSectionIndex;
					nextSectionIndex = -1;
					performSeamlessSwitch(switchTimeAbs, targetStart, targetIdx);

				}
			}

			if (now >= nextSec.time + 0.05) {
				if (!loopEnabled && nextSectionIndex === -1 && isScheduled === false) {
					currentSectionIndex++;
					updateButtonStyles();
				}
				if (now >= nextSec.time + 0.5) isScheduled = false;
			}

		} else if (now >= audioBuffer.duration) {
			stopAudio();
		}

		animId = requestAnimationFrame(check);
	};
	check();
}

// --- CALCULA A BARRA DE PROGRESSO ---
function updateProgressBar(currentTime) {
	if (currentSectionIndex === -1 || !sections[currentSectionIndex]) {
		document.getElementById('section-progress').style.width = '0%';
		return;
	}

	const currentSec = sections[currentSectionIndex];
	const nextSecTime = sections[currentSectionIndex + 1] ? sections[currentSectionIndex + 1].time : audioBuffer.duration;
	
	const duration = nextSecTime - currentSec.time;
	const elapsed = currentTime - currentSec.time;

	let percent = (elapsed / duration) * 100;
	percent = Math.max(0, Math.min(100, percent)); // Trava entre 0 e 100
	
	document.getElementById('section-progress').style.width = `${percent}%`;
}

function performSeamlessSwitch(whenAbs, offset, newIdx) {
	playAudio(offset, whenAbs);
	if (sourceNode) sourceNode.stop(whenAbs);

	const delayMs = (whenAbs - audioCtx.currentTime) * 1000;
	setTimeout(() => {
		sourceNode = nextSourceNode;
		nextSourceNode = null;
		startTime = audioCtx.currentTime - offset;
		currentSectionIndex = newIdx;
		isScheduled = false;
		updateButtonStyles();
	}, delayMs);
}

// --- CONTROLES UI ---
function scheduleSection(i) {
	if (!isPlaying) { jumpToSection(i, true); return; }
	if (i === currentSectionIndex) return;
	nextSectionIndex = i;
	updateButtonStyles();
	if (navigator.vibrate) navigator.vibrate(30);
}

function jumpToSection(i, auto) {
	currentSectionIndex = i;
	nextSectionIndex = -1;
	pausedAt = sections[i].time;
	updateButtonStyles();
	updateProgressBar(pausedAt);
	if (auto) { playAudio(pausedAt); }
	else { updateTimerVisual(pausedAt); }
}

function updateTimerVisual(seconds) {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	document.getElementById('timer').innerText = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

function updateUI(playing) {
	const btn = document.getElementById('btn-play');
	btn.innerHTML = playing ? '<i class="bi bi-pause-fill"></i>' : '<i class="bi bi-play-fill pl-1"></i>';
	if (playing) btn.classList.add('bg-light', 'text-dark');
	else btn.classList.remove('bg-light', 'text-dark');
}

function updateButtonStyles() {
	document.querySelectorAll('.section-btn').forEach((b, i) => {
		b.className = 'section-btn' + (i === currentSectionIndex ? ' active' : '') + (i === nextSectionIndex ? ' queued' : '');
	});
}

function toggleLoop() {
	loopEnabled = !loopEnabled;
	document.getElementById('btn-loop').classList.toggle('loop-active', loopEnabled);
	if (navigator.vibrate) navigator.vibrate(50);
}