const VK = require('./VK.js')('TOKEN'); // Ключ или массив ключей доступа для сообщества

// Получение новых сообщений

VK.onNewMessage((message) => {
    switch(message.body) {
        case 'привет':
            message.sendMessage('Ку'); // Текстовый ответ на новое сообщение
            break;
        case 'фото':
            message.sendPhoto('photo.jpg'); // Загрузить и отправить фотографию в ответ
            break;
        case 'документ':
            message.sendFile('animation.gif'); // Загрузить и отправить документ в ответ
            break;
    }
});
