'use strict';

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
});