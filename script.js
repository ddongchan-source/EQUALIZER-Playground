
const audio = document.querySelector("#audio");

const volume = document.querySelector("#volume");
const bass = document.querySelector("#bass");
const mid = document.querySelector("#mid");
const treble = document.querySelector("#treble");

const progress = document.querySelector("#progress");
const playButton = document.querySelector("#playButton");
const recordWrap = document.querySelector("#recordWrap");
const audioFile = document.querySelector("#audioFile");

let audioContext;
let source;

let bassFilter;
let midFilter;
let trebleFilter;

let loadedAudioUrl;


/* 슬라이더의 색상 업데이트 */

function updateRange(range) {
    const min = Number(range.min);
    const max = Number(range.max);
    const value = Number(range.value);

    const percent = ((value - min) / (max - min)) * 100;

    let fillColor = "#42f75d";

    if (range.id === "volume") {
        range.style.background = `linear-gradient(
            to right,
            ${fillColor} 0%,
            ${fillColor} ${percent}%,
            #000 ${percent}%,
            #000 100%
        )`;
    } else {
        const center = ((0 - min) / (max - min)) * 100;

        if (percent < center) {
            range.style.background = `linear-gradient(
                to right,
                #000 0%,
                #000 ${percent}%,
                ${fillColor} ${percent}%,
                ${fillColor} ${center}%,
                #000 ${center}%,
                #000 100%
            )`;
        } else {
            range.style.background = `linear-gradient(
                to right,
                #000 0%,
                #000 ${center}%,
                ${fillColor} ${center}%,
                ${fillColor} ${percent}%,
                #000 ${percent}%,
                #000 100%
            )`;
        }
    }
}


/* 오디오 이퀄라이저 생성 */

function startAudioProcessing() {
    if (audioContext) return;

    audioContext = new (
        window.AudioContext || window.webkitAudioContext
    )();

    source = audioContext.createMediaElementSource(audio);

    bassFilter = audioContext.createBiquadFilter();
    midFilter = audioContext.createBiquadFilter();
    trebleFilter = audioContext.createBiquadFilter();

    bassFilter.type = "lowshelf";
    bassFilter.frequency.value = 250;

    midFilter.type = "peaking";
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 0.8;

    trebleFilter.type = "highshelf";
    trebleFilter.frequency.value = 4000;

    source.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(audioContext.destination);

    applyEqualizer();
}


/* 볼륨 및 이퀄라이저 값 적용 */

function applyEqualizer() {
    audio.volume = Number(volume.value) / 100;

    if (bassFilter) {
        bassFilter.gain.value = Number(bass.value);
    }

    if (midFilter) {
        midFilter.gain.value = Number(mid.value);
    }

    if (trebleFilter) {
        trebleFilter.gain.value = Number(treble.value);
    }

    document.querySelector("#volumeValue").textContent =
        `${volume.value}%`;

    document.querySelector("#bassValue").textContent =
        `${bass.value} dB`;

    document.querySelector("#midValue").textContent =
        `${mid.value} dB`;

    document.querySelector("#trebleValue").textContent =
        `${treble.value} dB`;

    [volume, bass, mid, treble].forEach(updateRange);
}


/* 재생 시간을 분:초 형태로 변환 */

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
}


/* 재생 상태에 따라 버튼과 LP 변경 */

function updatePlayState() {
    if (audio.paused) {
        playButton.textContent = "▶";
        playButton.setAttribute("aria-label", "재생");

        recordWrap.classList.remove("playing");
    } else {
        playButton.textContent = "Ⅱ";
        playButton.setAttribute("aria-label", "일시정지");

        recordWrap.classList.add("playing");
    }
}


/* 재생 및 일시정지 버튼 */

playButton.addEventListener("click", async function () {
    if (!audio.src) {
        audioFile.click();
        return;
    }

    startAudioProcessing();

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    if (audio.paused) {
        await audio.play();
    } else {
        audio.pause();
    }

    updatePlayState();
});


/* 다른 음원 파일 선택 */

audioFile.addEventListener("change", function () {
    const file = audioFile.files[0];

    if (!file) return;

    if (loadedAudioUrl) {
        URL.revokeObjectURL(loadedAudioUrl);
    }

    loadedAudioUrl = URL.createObjectURL(file);
    audio.src = loadedAudioUrl;

    document.querySelector("#miniTitle").textContent =
        file.name.replace(/\.[^.]+$/, "");

    document.querySelector("#miniArtist").textContent = "내 음악";

    audio.load();

    startAudioProcessing();
    applyEqualizer();

    audio.play()
        .then(updatePlayState)
        .catch(updatePlayState);
});


/* 슬라이더를 움직일 때 값 변경 */

[volume, bass, mid, treble].forEach(function (range) {
    range.addEventListener("input", applyEqualizer);
});


/* 전체 음악 재생 시간 표시 */

audio.addEventListener("loadedmetadata", function () {
    document.querySelector("#duration").textContent =
        formatTime(audio.duration);
});


/* 음악 재생 중 진행 바 업데이트 */

audio.addEventListener("timeupdate", function () {
    if (!audio.duration) return;

    progress.value =
        (audio.currentTime / audio.duration) * 100;

    document.querySelector("#currentTime").textContent =
        formatTime(audio.currentTime);

    updateRange(progress);
});


/* 진행 바를 움직여 재생 위치 변경 */

progress.addEventListener("input", function () {
    if (audio.duration) {
        audio.currentTime =
            (Number(progress.value) / 100) * audio.duration;
    }
});


/* 10초 뒤로 이동 */

document.querySelector("#backButton").addEventListener(
    "click",
    function () {
        audio.currentTime = Math.max(
            0,
            audio.currentTime - 10
        );
    }
);


/* 10초 앞으로 이동 */

document.querySelector("#forwardButton").addEventListener(
    "click",
    function () {
        if (audio.duration) {
            audio.currentTime = Math.min(
                audio.duration,
                audio.currentTime + 10
            );
        }
    }
);


/* 오디오 상태 변화 감지 */

audio.addEventListener("play", updatePlayState);
audio.addEventListener("pause", updatePlayState);
audio.addEventListener("ended", updatePlayState);


/* 처음 실행할 때 슬라이더 표시 설정 */

applyEqualizer();
