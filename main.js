// --- CONFIGURAÇÃO PWA & WAKE LOCK ---
let wakeLock = null;
document.addEventListener('click', async () => {
	if (!wakeLock && navigator.wakeLock) {
		try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { }
	}
}, { once: true });

// --- AUDIO ENGINE ---
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
let sourceNode = null;
let gainNode = audioCtx.createGain();
gainNode.connect(audioCtx.destination);

let isPlaying = false, startTime = 0, pausedAt = 0, loopEnabled = false;
let playlist = [], currentSong = null, sections = [], currentSectionIndex = -1, nextSectionIndex = -1, animId;
let fadeTimeout = null; // Para controlar o tempo do fade

const offcanvas = new bootstrap.Offcanvas('#menu');

// --- CARREGAMENTO ---
document.getElementById('folder-input').addEventListener('change', async (e) => {
	const files = Array.from(e.target.files);
	const audioFiles = files.filter(f => f.name.toLowerCase().match(/\.(mp3|wav|ogg)$/));
	const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
	playlist = [];

	for (let audio of audioFiles) {
		const baseName = audio.name.substring(0, audio.name.lastIndexOf('.'));
		const match = jsonFiles.find(j => j.name.substring(0, j.name.lastIndexOf('.')) === baseName);
		if (match) {
			try {
				const data = JSON.parse(await match.text());
				playlist.push({ name: data.title || baseName, audioFile: audio, sections: data.sections.sort((a, b) => a.time - b.time) });
			} catch (e) { }
		}
	}
	renderPlaylist();
	offcanvas.hide();
});

function renderPlaylist() {
	const list = document.getElementById('song-list');
	if (playlist.length === 0) { list.innerHTML = '<div class="p-4 text-center text-muted">Nada encontrado.</div>'; return; }
	document.getElementById('empty-state').classList.add('d-none');

	list.innerHTML = playlist.map((s, i) => `
		<button class="list-group-item list-group-item-action song-item py-3" onclick="loadSong(${i})">
			<div class="fw-bold">${s.name}</div>
		</button>
	`).join('');
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
		jumpToSection(0, false);
		offcanvas.hide();
	} catch (e) { alert("Erro no áudio."); }
}

function renderGrid() {
	document.getElementById('sections-grid').innerHTML = sections.map((s, i) => `
		<button class="section-btn" id="sec-btn-${i}" onclick="scheduleSection(${i})">${s.label}</button>
	`).join('');
}

// --- PLAYBACK ---
function playAudio(offset) {
	if (sourceNode) sourceNode.disconnect();

	// IMPORTANTE: Reseta o volume para 100% antes de tocar
	gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
	gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
	document.getElementById('btn-fade').classList.remove('fade-active');

	sourceNode = audioCtx.createBufferSource();
	sourceNode.buffer = audioBuffer;
	sourceNode.connect(gainNode);
	sourceNode.start(0, offset);
	startTime = audioCtx.currentTime - offset;
	isPlaying = true;
	updateUI(true);
	startLogic();
}

function stopAudio() {
	// Cancela qualquer Fade pendente
	if (fadeTimeout) clearTimeout(fadeTimeout);
	gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
	gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
	document.getElementById('btn-fade').classList.remove('fade-active');

	if (sourceNode) { sourceNode.stop(); sourceNode = null; }
	isPlaying = false; pausedAt = 0; currentSectionIndex = -1; nextSectionIndex = -1;
	updateUI(false); updateButtonStyles();
	cancelAnimationFrame(animId);
	document.getElementById('timer').innerText = "00:00";
}

function triggerFadeOut() {
	if (!isPlaying) return;

	const fadeBtn = document.getElementById('btn-fade');
	fadeBtn.classList.add('fade-active'); // Feedback visual

	const fadeDuration = 5; // 3 Segundos
	const now = audioCtx.currentTime;

	// Curva de volume suave
	gainNode.gain.setValueAtTime(gainNode.gain.value, now);
	gainNode.gain.linearRampToValueAtTime(0, now + fadeDuration);

	// Agenda o Stop real para daqui a 3 segundos
	fadeTimeout = setTimeout(() => {
		stopAudio();
	}, fadeDuration * 1000);
}

function togglePlay() {
	if (isPlaying) {
		pausedAt = audioCtx.currentTime - startTime;
		if (sourceNode) { sourceNode.stop(); sourceNode = null; }
		isPlaying = false;
		updateUI(false);
		cancelAnimationFrame(animId);
	} else {
		if (audioCtx.state === 'suspended') audioCtx.resume();
		playAudio(pausedAt);
	}
}

function startLogic() {
	cancelAnimationFrame(animId);
	const check = () => {
		if (!isPlaying) return;
		const now = audioCtx.currentTime - startTime;
		const m = Math.floor(now / 60), s = Math.floor(now % 60);
		document.getElementById('timer').innerText = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;

		if (currentSectionIndex !== -1 && sections[currentSectionIndex + 1]) {
			if (now >= sections[currentSectionIndex + 1].time) {
				if (loopEnabled) playAudio(sections[currentSectionIndex].time);
				else if (nextSectionIndex !== -1) {
					const t = nextSectionIndex; nextSectionIndex = -1; jumpToSection(t, true);
				} else {
					currentSectionIndex++; updateButtonStyles();
				}
			}
		} else if (now >= audioBuffer.duration) stopAudio();
		animId = requestAnimationFrame(check);
	};
	check();
}

function scheduleSection(i) {
	if (!isPlaying) { jumpToSection(i, true); return; }
	if (i === currentSectionIndex) return;
	nextSectionIndex = i; updateButtonStyles();
	if (navigator.vibrate) navigator.vibrate(30);
}

function jumpToSection(i, auto) {
	currentSectionIndex = i; nextSectionIndex = -1;
	pausedAt = sections[i].time;
	updateButtonStyles();
	if (auto) playAudio(pausedAt);
	else {
		const m = Math.floor(pausedAt / 60), s = Math.floor(pausedAt % 60);
		document.getElementById('timer').innerText = `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
	}
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