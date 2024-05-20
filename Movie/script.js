// script.js

// Video player element
const video = document.getElementById('video-player');
// Title element
const titleElement = document.getElementById('movie-title');

// Function to toggle play/pause
function togglePlayPause() {
  if (video.paused || video.ended) {
    video.play();
  } else {
    video.pause();
  }
}

// Event listener for play/pause button click
document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);

// Function to set video source and title dynamically
function setVideoSourceAndTitle(source, title) {
  video.src = source;
  video.setAttribute('title', title);
  titleElement.textContent = title; // Set the title text
}

// Get movie source and title from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const movieSource = urlParams.get('source');
const movieTitle = urlParams.get('title');

// Set video source and title if available
if (movieSource && movieTitle) {
  setVideoSourceAndTitle(movieSource, movieTitle);
}

// Function to skip forward by 5 seconds
function skipForward() {
  video.currentTime += 5; // Add 5 seconds to the current time
}

// Event listener for skip forward button click
document.getElementById('skip-forward-btn').addEventListener('click', skipForward);
