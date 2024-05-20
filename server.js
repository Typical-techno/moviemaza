const axios = require("axios");
const cheerio = require("cheerio");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
 
app.get("/", (req, res) => {
  res.send("Your API is LIVE 🚀");
});

// Middleware to serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'Movie')));

// Route to serve movie.html at /movie
app.get('/movie', (req, res) => {
  res.sendFile(path.join(__dirname, 'Movie', 'movie.html'));
});

let valueWhichControl = false;

// Event listener for the /search command
bot.onText(/\/search/, (msg) => {
  const chatId = msg.chat.id;
  const responseMessage = `
  🔍 Search Movies
  
  Looking for a movie? Just type the name of the movie you want to search and I'll find it for you!
  
  Let's find some awesome movies together! 🎥✨
  `;
  bot.sendMessage(chatId, responseMessage);
  valueWhichControl = true;
});

bot.onText(/\/start/, (msg) => {
  valueWhichControl = false;
  const chatId = msg.chat.id;
  const responseMessage = `
  👋 Hello there!
  
  Welcome to Movie Maza 🎬, your personal movie assistant!
  
  To get started, simply type /search to find your favorite movies.
  
  Enjoy your movie journey with Movie Maza! 🍿🎉
  `;
  bot.sendMessage(chatId, responseMessage);
});

const siteLink = process.env.BASE_URL;

// Event listener for incoming messages
bot.on("message", async (msg) => {
  if (valueWhichControl) {
    const chatId = msg.chat.id;
    const movieName = msg.text.trim();

    try {
      const url = `${siteLink}/s/${encodeURIComponent(movieName)}`;

      // Make a GET request to the movie URL
      const response = await axios.get(url);
      const htmlCode = response.data;

      // Load the HTML code into Cheerio
      const $ = cheerio.load(htmlCode);

      // Array to store movie/series names and URLs
      const movies = [];

      // Find all the movie/series list items
      $("li").each((index, element) => {
        let name = $(element).find(".directory-entry").text().trim(); // Extract movie/series name
        const url = $(element).find(".directory-entry").attr("href"); // Extract movie/series URL

        // Push the movie/series name and URL to the movies array
        if (name && url) {
          movies.push({ name, url });
        }
      });

      if (movies.length === 0) {
        // If no movies found, send a sorry message
        const sorryMessage = `
  Sorry, I couldn't find any movies or series with the name "${movieName}" 😔🎬
  
  Feel free to try searching for another movie!
  `;
        bot.sendMessage(chatId, sorryMessage);
      } else {
        // Send each movie/series as a separate message with a button
        movies.forEach((movie, index) => {
          const buttonText = `This is My Movie/Series`;
          const message = `🎬 ${index + 1}. *${movie.name}*`;
          const keyboard = {
            inline_keyboard: [[{ text: buttonText, callback_data: movie.url }]],
          };
          bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify(keyboard),
          });
        });
      }
    } catch (error) {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
      bot.sendMessage(
        chatId,
        "Error searching for movies. Please try again later."
      );
    }
  }
});

// Event listener for callback queries
bot.on("callback_query", async (callbackQuery) => {
  const movieUrl = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  try {
    const beforeMsg =
      "------------------------\n\nYou can Download the Movie/Series From here....\nor you can just watch it online by copying the link and network stream with VLC media player or any other player that supports network stream\n\n------------------------";
    bot.sendMessage(chatId, beforeMsg);
    // Make a GET request to the movie/series URL
    const movieLink = `${siteLink}${movieUrl}`;
    const response = await axios.get(movieLink);
    const htmlCode = response.data;

    // Load the HTML code into Cheerio
    const $ = cheerio.load(htmlCode);

    // Check if it's a series page by looking for seasons
    const seasons = [];
    $("li").each((index, element) => {
      const seasonName = $(element).find(".directory-entry").text().trim();
      const seasonHref = $(element).find(".directory-entry").attr("href");

      if (seasonName && seasonHref) {
        seasons.push({ seasonName, seasonHref });
      }
    });

    if (seasons.length > 0) {
      // It's a series, so list the seasons
      seasons.forEach((season, index) => {
        const buttonText = `Select Season`;
        const message = `${index + 1}. ${season.seasonName}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: buttonText, callback_data: season.seasonHref }],
          ],
        };
        bot.sendMessage(chatId, message, {
          reply_markup: JSON.stringify(keyboard),
        });
      });
    } else {
      // It's a movie, so list the files
      listFiles($, chatId, movieUrl, $("title").text().trim());
    }
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
});

// Function to list files
const listFiles = ($, chatId, movieUrl, movieTitle) => {
  // Extract file names and hrefs
  const files = [];
  $("li").each((index, element) => {
    const fileName = $(element).find(".file-entry").text().trim(); // Extract file name
    const href = $(element).find(".file-entry").attr("href"); // Extract href

    // Include files with names containing ".mp4" or ".mkv"
    if (
      fileName.toLowerCase().includes(".mp4") ||
      fileName.toLowerCase().includes(".mkv")
    ) {
      files.push({ fileName, href });
    }
  });

  // Send file names and hrefs as buttons
  files.forEach((file, index) => {
    const downloadButtonText = `Download`;
    const watchOnlineButtonText = `Watch Online`;
    const downloadUrl = `${siteLink}${file.href}`;
    const watchOnlineUrl = `http://localhost:5500/movie.html?source=${encodeURIComponent(downloadUrl)}&title=${encodeURIComponent(file.fileName)}`;

    const message = `${index + 1}. ${file.fileName}\n`;
    const keyboard = {
      inline_keyboard: [
        [
          { text: downloadButtonText, url: downloadUrl },
          { text: watchOnlineButtonText, url: watchOnlineUrl }
        ],
      ],
    };
    bot.sendMessage(chatId, message, {
      reply_markup: JSON.stringify(keyboard),
    });
  });
};

// Event listener for season callback queries
bot.on("callback_query", async (callbackQuery) => {
  const seasonUrl = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  try {
    // Make a GET request to the season URL
    const seasonLink = `${siteLink}${seasonUrl}`;
    const response = await axios.get(seasonLink);
    const htmlCode = response.data;

    // Load the HTML code into Cheerio
    const $ = cheerio.load(htmlCode);

    // List the files in the season
    listFiles($, chatId, seasonUrl, $("title").text().trim());
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
});
