# VK-API-for-Bot
Библиотека для работы с VK API для ботов.

# Установка
```
git clone https://github.com/AntDev95/VK-API-for-Bot.git
```
Простой пример: 
```javascript
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
```

# Получение бесплатного SSL сертификата
Callback API работает только через защищенное https соеденение.
Для того чтобы ваш сайт работал через https, нужно получить сертификат. Его можно купить, но можно получить бесплатно на 4 месяца и обновлять его каждые 4 месяца.

**Вместо bot-maxim.com указывате домен вашего сайта!**
```
git clone https://github.com/letsencrypt/letsencrypt
cd /root/letsencrypt
./letsencrypt-auto certonly -a standalone -d bot-maxim.com
```

После этого будет создано два файла в директории /etc/letsencrypt/live/bot-maxim.com/

Пример конфига для Nginx 
```
server {
    listen 443 http2 ssl;
    server_name bot-maxim.com;
    ssl_certificate /etc/letsencrypt/live/bot-maxim.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot-maxim.com/privkey.pem;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    ssl_ecdh_curve secp384r1;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    charset utf-8;
    
    location /callback_api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3000s;
    }
}
```
Перезапустить Nginx:
```
service nginx restart
```

# Функции

### VK.api(method, params, callback) 
Выполняет запрос к VK API 

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| method | string | Да | Название метода  |
| params | object | Нет | Параметры метода  |
| callback | function | Нет | callback функция. Возвращает результат выполнения метода. |

Пример:
```javascript
VK.api('groups.getById', {group_id: 1}, (response) => {
    console.log(response);
});
```
Список всех методов ВКонтакте https://vk.com/dev/methods 

### VK.onNewMessage(callback)
Позволяет получать новые входящие сообщения
```javascript
VK.onNewMessage((message) => {
    console.log(message);
});
```

Каждое полученное это объект сообщения ВКонтакте https://vk.com/dev/objects/message и три дополнительных фуннкции:
- sendMessage
- sendPhoto
- sendFile

### Message.sendMessage(msg, callback) 
*Отвечает на полученное сообщение*

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| msg | string или object | Да | Текст сообщения или объект c параметрами для отправки сообщения https://vk.com/dev/messages.send *Например если нужно фото вместе с тектом* |
| callback | function | Нет | callback функция. Возвращает *id* отправленого сообщения или *false* при неудачной попытке  |

**Отправка обычного текстово сообщения:**

```javascript
message.sendMessage('Привет', (message_id) => {
   if (message_id) {
      console.log('Сообщение отправлено. message_id = ' + message_id)
   } else {
      // Например если пользователь запретил ему отправлять сообщения
      console.log('Не удалось отправить сообщение')
   }
});
// Отправка сообщения с текстом и фото
message.sendMessage({message: 'Привет', attachment: 'photo-135209264_456334675'});
```

*Все параметры Вы можете узнать в документации VK API вот тут: https://vk.com/dev/messages.send*


### Message.sendPhoto(params, callback)
*Загружает и отправляет фото в текущий диалог*

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| params | string или object | Да | Путь к фото на сервере. Если к отправленому фото нужно добавить текст, тогда используется объект с параметрами для https://vk.com/dev/messages.send и один параметр file который содержит путь файла на сервере *См. пример ниже*  |
| callback | function | Нет | callback функция. Возвращает два параметра message_id и photo. |

**Загрузка и отправка фото:**

```javascript
message.sendPhoto('photo.jpg');
// Пример с текстом
message.sendPhoto({message: 'Вот фото', file: 'animation.gif'});
```

### Message.sendFile(params, callback)
*Загружает и отправляет документ в текущий диалог*

| Параметр  | Тип | Обязательный | Описание |
| ------------- | ------------- | ------------- | ------------- |
| params | string или object | Да | Путь к файлу на сервере. Если к отправленому файлу нужно добавить текст, тогда используется объект с параметрами для https://vk.com/dev/messages.send и один параметр file который содержит путь файла на сервере *См. пример ниже*  |
| callback | function | Нет | callback функция. Возвращает два параметра message_id и doc. |

**Загрузка и отправка файла:**

```javascript
message.sendFile('photo.jpg');
// Пример с текстом
message.sendFile({message: 'Вот гифка', file: 'animation.gif'});
```
