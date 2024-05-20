const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

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

// Event listener for incoming messages
bot.on("message", async (msg) => {
  if (valueWhichControl) {
    const chatId = msg.chat.id;
    const movieName = msg.text.trim();

    try {
      const url = `${process.env.BASE_URL}/s/${encodeURIComponent(movieName)}`;

      // Make a GET request to the movie URL
      const response = await axios.get(url);
      const htmlCode = response.data;

      // Parse HTML using jsdom
      const dom = new JSDOM(htmlCode);
      const document = dom.window.document;

      // Find all movie links
      const movieLinks = document.querySelectorAll(".directory-entry");

      if (movieLinks.length === 0) {
        // If no movies found, send a sorry message
        const sorryMessage = `
  Sorry, I couldn't find any movies or series with the name "${movieName}" 😔🎬
  
  Feel free to try searching for another movie!
  `;
        bot.sendMessage(chatId, sorryMessage);
      } else {
        // Send each movie/series as a separate message with a button
        movieLinks.forEach((movieLink, index) => {
          const buttonText = `This is My Movie/Series`;
          const name = movieLink.textContent.trim();
          const url = movieLink.getAttribute("href");
          const message = `🎬 ${index + 1}. *${name}*`;
          const keyboard = {
            inline_keyboard: [[{ text: buttonText, callback_data: url }]],
          };
          bot.sendMessage(chatId, message, {
            parse_mode: "Markdown",
            reply_markup: JSON.stringify(keyboard),
          });
        });
      }
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      bot.sendMessage(chatId, "Error searching for movies. Please try again later.");
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
    const movieLink = `${process.env.BASE_URL}${movieUrl}`;
    const response = await axios.get(movieLink);
    const htmlCode = response.data;

    // Parse HTML using jsdom
    const dom = new JSDOM(htmlCode);
    const document = dom.window.document;

    // Find all file links
    const fileLinks = document.querySelectorAll(".file-entry");

    // Check if it's a series page by looking for seasons
    const seasons = document.querySelectorAll(".directory-entry");

    if (seasons.length > 0) {
      // It's a series, so list the seasons
      seasons.forEach((season, index) => {
        const buttonText = `Select Season`;
        const seasonName = season.textContent.trim();
        const seasonHref = season.getAttribute("href");
        const message = `${index + 1}. ${seasonName}`;
        const keyboard = {
          inline_keyboard: [
            [{ text: buttonText, callback_data: seasonHref }],
          ],
        };
        bot.sendMessage(chatId, message, {
          reply_markup: JSON.stringify(keyboard),
        });
      });
    } else {
      // It's a movie, so list the files
      fileLinks.forEach((fileLink, index) => {
        const fileName = fileLink.textContent.trim();
        const href = fileLink.getAttribute("href");
        const downloadUrl = `${process.env.BASE_URL}${href}`;
        const watchOnlineUrl = `https://moviemaza.vercel.app/Movie/movie.html?source=${encodeURIComponent(downloadUrl)}&title=${encodeURIComponent(fileName)}`;

        const message = `${fileName}\n`;
        const keyboard = {
          inline_keyboard: [ 
            [
              { text: 'Download', url: downloadUrl },
              { text: 'Watch Online', url: watchOnlineUrl }
            ],
          ],
        };
        bot.sendMessage(chatId, message, {
          reply_markup: JSON.stringify(keyboard),
        });
      });
    }
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
});

// Event listener for season callback queries
bot.on("callback_query", async (callbackQuery) => {
  const seasonUrl = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  try {
    // Make a GET request to the season URL
    const seasonLink = `${process.env.BASE_URL}${seasonUrl}`;
    const response = await axios.get(seasonLink);
    const htmlCode = response.data;

    // Parse HTML using jsdom
    const dom = new JSDOM(htmlCode);
    const document = dom.window.document;

    // Find all file links
    const fileLinks = document.querySelectorAll(".file-entry");

    // List the files in the season
    fileLinks.forEach((fileLink, index) => {
      const fileName = fileLink.textContent.trim();
      const href = fileLink.getAttribute("href");
      const downloadUrl = `${process.env.BASE_URL}${href}`;
      const watchOnlineUrl = `https://a751-103-167-205-137.ngrok-free.app/Movie/movie.html?source=${encodeURIComponent(downloadUrl)}&title=${encodeURIComponent(fileName)}`;

      const message = `${fileName}\n`;
      const keyboard = {
        inline_keyboard: [ 
          [
            { text: 'Download', url: downloadUrl },
            { text: 'Watch Online', url: watchOnlineUrl }
          ],
        ],
      };
      bot.sendMessage(chatId, message, {
        reply_markup: JSON.stringify(keyboard),
      });
    });
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
});