const VK = require('./VK.js')('TOKEN');
const request = require('request');
const fs = require('fs');

VK.onNewMessage((message) => {
    // Получено новое сообщение
    let file = 'photo.jpg';
    let params = {
        peer_id: message.user_id // Указываем peer_id диалога в который нужно загрузить фото
    };
    // Запрос сервера для загрузки фотографии в диалог
    VK.api('photos.getMessagesUploadServer', params, function(data) {
        // Загрузка файла на сервер
        let formData = {
            photo: {
                value: fs.createReadStream(file)
            }
        };
        request.post({url: upload_url, formData: formData}, function(err, response, body) {
            body = JSON.parse(body);
            if (body.photo) {
                VK.api('photos.saveMessagesPhoto', body, function(photos) {
                    if (photos && photos.length >= 1) {
                        let photo = photos[0];
                        // Отправляем фото 
                        message.sendMessage({message: 'Твое фото:', attachment: 'photo' + photo.owner_id + '_' + photo.id}); 
                    } else {
                        message.sendMessage('Не удалось сохранить фото.');
                    }
                });
            } else {
                message.sendMessage('Не удалось загрузить фото.');
            }
        });
    });

    /* Все тоже самое, но короче */
    message.sendPhoto(file);
});
