const Promise = require('bluebird')
const TelegramBot = require('node-telegram-bot-api');

var bot

function start (config, router) {
  return new Promise(function (resolve, reject) {
    if (!config.token) {
      reject(new Error('No Telegram token provided.'))
    }

    bot = new TelegramBot(config.token, { polling: true });
    //capture every message sent
    bot.onText(/(.+)/, function(msg, match) {
      var chatId = msg.chat.id;
      var heard = match[1]; // the captured "whatever"

      console.log('in', heard, chatId)
      router.heard({input: heard, metadata: {chatId: chatId}})
    })

    resolve({speak: speak})
  })
}

function speak (message) {
  console.log('out', message)
  return new Promise(function (resolve, reject) {
    if (!message.metadata.chatId) {
      reject(new Error('No chatId in metadata.'))
    }

    bot.sendMessage(message.metadata.chatId, message.output)

    resolve()
  })
}

module.exports = {start: start}
