# VK-API-for-Bot

Библиотека для удобной работы с VK API для ботов.
Все запросы к VK API складываются в "пакеты" по 25 запросов и отправляются через vk.com/dev/execute 
Это позволяет не упираться в лимит три запроса в секунду.

## Установка

  `npm install test`

## Простой пример

GROUP TOKEN = Это ваш ключ доступа для сообщества.
```
const VK = require('./VK.js')('GROUP TOKEN');
VK.onNewMessage((message) => {
    switch(message.body) {
        case 'привет':
            message.reply('Ку');
            break;
        default:
            message.reply(message.body, (message_id) => {
                console.log(message_id);
            });
            break;
    }
});```