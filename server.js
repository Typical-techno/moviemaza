const axios = require("axios");
const cheerio = require("cheerio");
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const app = express();
require("dotenv").config();

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
      const url = `${siteLink}/s/${movieName}`;

      // Make a GET request to the movie URL
      const response = await axios.get(url);
      const htmlCode = response.data;

      // Load the HTML code into Cheerio
      const $ = cheerio.load(htmlCode);

      // Array to store movie names and URLs
      const movies = [];

      // Find all the movie list items
      $("li").each((index, element) => {
        let name = $(element).find(".directory-entry").text().trim(); // Extract movie name
        const url = $(element).find(".directory-entry").attr("href"); // Extract movie URL

        // Remove [YTS.MX] from the movie name
        //   name = name.replace(/\[.*?\]/g, "").trim();

        // Push the movie name and URL to the movies array
        if (name && url) {
          movies.push({ name, url });
        }
      });
      if (movies.length === 0) {
        // If no movies found, send a sorry message
        if (movieName.toLowerCase().includes("/")) {
          const sorryMessage = "";
          bot.sendMessage(chatId, sorryMessage);
        } else {
          const sorryMessage = `
  Sorry, I couldn't find any movies with the name "${movieName}" 😔🎬
  
  Feel free to try searching for another movie!
  `;
          bot.sendMessage(chatId, sorryMessage);
        }
      } else {
        // Send each movie as a separate message with a button
        movies.forEach((movie, index) => {
          const buttonText = `This is My Movie`;
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

      // bot.sendMessage(chatId, "Movies sent to Telegram.");
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
  // const responseMessage = `You clicked on movie: ${movieUrl}`;
  // bot.sendMessage(chatId, responseMessage);

  try {
    const beforeMsg =
      "------------------------\n\nYou can Download the Movie From here....\nor you can just watch it online by coping the link and network stream with VLC media player or any other play supports network stream\n\n------------------------";
    bot.sendMessage(chatId, beforeMsg);
    // Make a GET request to the movie URL
    const movieLink = `${siteLink}${movieUrl}`;
    const response = await axios.get(movieLink);
    const htmlCode = response.data;

    // Load the HTML code into Cheerio
    const $ = cheerio.load(htmlCode);

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
      const buttonText = `Download ......`;
      const message = `${index + 1}. ${file.fileName}\n`;
      const keyboard = {
        inline_keyboard: [
          [{ text: buttonText, url: `${siteLink}${file.href}` }],
        ],
      };
      bot.sendMessage(chatId, message, {
        reply_markup: JSON.stringify(keyboard),
      });
    });
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
});
