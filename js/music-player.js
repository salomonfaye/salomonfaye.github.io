(function () {
  "use strict";

  var audio = document.getElementById("audioPlayer");
  var playlist = []; // { name, url }
  var currentIndex = -1;
  var shuffleOn = false;
  var repeatOn = false;

  var trackNameEl = document.getElementById("trackName");
  var playPauseBtn = document.getElementById("playPauseBtn");
  var seekBar = document.getElementById("seekBar");
  var currentTimeEl = document.getElementById("currentTime");
  var durationTimeEl = document.getElementById("durationTime");
  var volumeBar = document.getElementById("volumeBar");
  var playlistEl = document.getElementById("playlist");
  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("fileInput");
  var shuffleBtn = document.getElementById("shuffleBtn");
  var repeatBtn = document.getElementById("repeatBtn");

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
  }

  function renderPlaylist() {
    playlistEl.innerHTML = "";
    if (playlist.length === 0) {
      var empty = document.createElement("div");
      empty.className = "playlist-empty";
      empty.textContent = "No songs added yet.";
      playlistEl.appendChild(empty);
      return;
    }
    playlist.forEach(function (track, index) {
      var li = document.createElement("li");
      li.className = index === currentIndex ? "active" : "";

      var nameSpan = document.createElement("span");
      nameSpan.className = "song-name";
      nameSpan.textContent = track.name;
      nameSpan.addEventListener("click", function () {
        playIndex(index);
      });

      var removeSpan = document.createElement("span");
      removeSpan.className = "remove-song";
      removeSpan.textContent = "✕";
      removeSpan.addEventListener("click", function (e) {
        e.stopPropagation();
        removeTrack(index);
      });

      li.appendChild(nameSpan);
      li.appendChild(removeSpan);
      playlistEl.appendChild(li);
    });
  }

  function playIndex(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    var track = playlist[index];
    audio.src = track.url;
    audio.play();
    trackNameEl.className = "track-name";
    trackNameEl.textContent = track.name;
    renderPlaylist();
  }

  function togglePlay() {
    if (playlist.length === 0) return;
    if (currentIndex === -1) {
      playIndex(0);
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function nextTrack() {
    if (playlist.length === 0) return;
    var index;
    if (shuffleOn) {
      index = Math.floor(Math.random() * playlist.length);
    } else {
      index = (currentIndex + 1) % playlist.length;
    }
    playIndex(index);
  }

  function prevTrack() {
    if (playlist.length === 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    var index = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1;
    playIndex(index);
  }

  function removeTrack(index) {
    var track = playlist[index];
    if (index === currentIndex) {
      audio.pause();
      audio.removeAttribute("src");
      currentIndex = -1;
      trackNameEl.className = "track-empty";
      trackNameEl.textContent = "No track loaded — add your music below";
    } else if (index < currentIndex) {
      currentIndex -= 1;
    }
    URL.revokeObjectURL(track.url);
    playlist.splice(index, 1);
    renderPlaylist();
  }

  function addFiles(fileList) {
    var files = Array.prototype.filter.call(fileList, function (f) {
      return f.type.indexOf("audio") === 0 || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.name);
    });
    if (files.length === 0) return;
    var startIndex = playlist.length;
    files.forEach(function (file) {
      playlist.push({ name: stripExtension(file.name), url: URL.createObjectURL(file) });
    });
    renderPlaylist();
    if (currentIndex === -1) {
      playIndex(startIndex);
    }
  }

  playPauseBtn.addEventListener("click", togglePlay);
  document.getElementById("nextBtn").addEventListener("click", nextTrack);
  document.getElementById("prevBtn").addEventListener("click", prevTrack);

  shuffleBtn.addEventListener("click", function () {
    shuffleOn = !shuffleOn;
    shuffleBtn.classList.toggle("toggled", shuffleOn);
  });

  repeatBtn.addEventListener("click", function () {
    repeatOn = !repeatOn;
    repeatBtn.classList.toggle("toggled", repeatOn);
  });

  audio.addEventListener("play", function () {
    playPauseBtn.innerHTML = "&#10074;&#10074;";
  });
  audio.addEventListener("pause", function () {
    playPauseBtn.innerHTML = "&#9658;";
  });
  audio.addEventListener("timeupdate", function () {
    if (!isFinite(audio.duration)) return;
    seekBar.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationTimeEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", function () {
    if (repeatOn) {
      audio.currentTime = 0;
      audio.play();
    } else {
      nextTrack();
    }
  });

  seekBar.addEventListener("input", function () {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  });

  volumeBar.addEventListener("input", function () {
    audio.volume = parseFloat(volumeBar.value);
  });
  audio.volume = parseFloat(volumeBar.value);

  dropzone.addEventListener("click", function () {
    fileInput.click();
  });
  fileInput.addEventListener("change", function (e) {
    addFiles(e.target.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  renderPlaylist();
})();
