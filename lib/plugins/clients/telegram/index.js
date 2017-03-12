const Promise = require('bluebird')
const TelegramBot = require('node-telegram-bot-api')

let bot
let allowedChatIds = {}
let passwordRequired = false
let configuredPassword
let parentRouter

function start (config, router) {
  return new Promise(function (resolve, reject) {
    if (!config.token) {
      reject(new Error('No Telegram token provided.'))
    }
    if (config.password) {
      passwordRequired = true
      configuredPassword = config.password
    }
    parentRouter = router

    bot = new TelegramBot(config.token, { polling: true })
    // capture every message sent
    bot.onText(/(.+)/, processTelegramTextMessage)

    resolve({speak: speak})
  })
}

function processTelegramTextMessage (msg, match) {
  var chatId = msg.chat.id
  var heard = match[1] // the captured "whatever"

  if (passwordRequired && heard === configuredPassword) {
    whitelistChatId(chatId)
    bot.sendMessage(chatId, 'Access is granted.')
    return
  }
  if (passwordRequired && !isChatIdWhiteListed(chatId)) {
    bot.sendMessage(chatId, 'Please send me the password first.')
    return
  }

  parentRouter.heard({input: heard, metadata: {chatId: chatId}})
}

function whitelistChatId (chatId) {
  allowedChatIds[chatId] = true
}

function isChatIdWhiteListed (chatId) {
  return allowedChatIds[chatId] === true
}

function speak (message) {
  return new Promise(function (resolve, reject) {
    if (!message.metadata.chatId) {
      reject(new Error('No chatId in metadata.'))
    }

    bot.sendMessage(message.metadata.chatId, message.output)
    resolve()
  })
}

module.exports = {start: start}
