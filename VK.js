'use strict'

const request = require('request');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const http = require('http');

class VK {

	constructor(config) {
		var self = this;
		self.CallbackRegistry = {};
		self.accessTokens = config instanceof Array ? config : [config];
		self.methodQueue = [];
		self.lastToken = 0;
		self.longPollParams = false;
		self.messageCallBack = Function();
		self.lastServers = {};
		setInterval(function() {
            self.execute(false);
        }, Math.ceil(1000 / (self.accessTokens.length * 3)) + 50);
	}

	longPoll() {
		var self = this;
		if (!self.longPollParams) {
			self.api('messages.getLongPollServer', {need_pts: 1}, function(data) {
				self.longPollParams = data;
				self.longPoll();
            });
            return;
		}
		request.get('https://' + self.longPollParams.server + '?act=a_check&key=' + self.longPollParams.key + '&ts=' + self.longPollParams.ts + '&wait=1&mode=' + (128 + 32 + 2) + '&version=1', function(error, response, body) {
        	if (!error && response.statusCode == 200 && body) {
        		try {
        			body = JSON.parse(body);
        			if (body.pts) {
                        self.longPollParams.pts = body.pts;
                    }
        			if (body.ts) {
        				self.longPollParams.ts = body.ts;
        			} else {
        				self.longPollParams = false;
        			}
        			self.longPoll();
        			if (body.updates && body.updates.length >= 1) {
        				let messages_ids = [];
        				for (var i = body.updates.length - 1; i >= 0; i--) {
        					let update = body.updates[i];
        					if (update[0] != 4) {
                                continue;
                            }
                            if ((update[2] & 2) != 0) {
                                continue;
                            }
                            if (!isEmpty(update[7])) {
                            	messages_ids.push(update[1]);
                            	continue;
                            }
                            let messageObject = {
                                user_id: update[3],
                                body: update[6].replace(/<br>/g, ' '),
                                id: update[1],
                                title: update[5],
                                out: 0,
                                read_state: 0,
                                date: update[4]
                            };
                            messageObject.reply = (message, callback) => {
                                callback = callback || Function();
                                let params = message instanceof Object ? message : {message: message};
                                params.peer_id = messageObject.user_id;
                                self.sendMessage(params, callback);
                            };
                            self.messageCallBack(messageObject);
        				}
        				if (messages_ids.length == 0) {
        					return;
        				}
        				self.api('messages.getById', {message_ids: messages_ids.join(',')}, function(data) {
        					if (data && data.items) {
        						for (var i = data.items.length - 1; i >= 0; i--) {
                                    let messageObject = data.items[i];
                                    messageObject.reply = (message, callback) => {
                                        callback = callback || Function();
                                        let params = message instanceof Object ? message : {message: message};
                                        params.peer_id = messageObject.user_id;
                                        self.sendMessage(params, callback);
                                    };
        							self.messageCallBack(messageObject);
        						}
        					}
        				});
        			}
        		} catch(e) {
        			self.longPollParams = false;
        		    self.longPoll();
        		}
        	} else {
        		self.longPollParams = false;
        		self.longPoll();
        	}
        });
	}

	sendMessage(params, callback) {
        var self = this;
        
        callback = callback || Function();
        var to_id = params.peer_id || params.user_id || params.chat_id;
        if (!params.random_id) {
            params.random_id = to_id + time() + rand(1, 999999);
        }
        self.api('messages.send', params, function(id) {
            if (parseInt(id) >= 1) {
                callback(parseInt(id));
            } else {
                callback(false);
            }
        });
    }

	onNewMessage(callback) {
		var self = this;
		self.messageCallBack = callback;
		self.longPoll();
	}

	docsMessagesUploadServer(peer_id, file, type, callback) {
        var self = this;
        let key = 'docsGetMessagesUploadServer' + peer_id + '_' + type;
        self.docsGetMessagesUploadServer(peer_id, type, function(upload_url) {
            if (!upload_url) {
                callback(false);
                return;
            }
            let data = {
                file: {
                    value: fs.createReadStream(file),
                    options: {
                        filename: path.basename(file),
                        contentType: mime.lookup(file)
                    }
                }
            };
            request.post({url: upload_url, formData: data}, function(err, response, body) {
                if (err) {
                    callback(false);
                    return;
                }
                try {
                    body = JSON.parse(body);
                } catch(e) {
                    if (self.lastServers[key]) {
                        delete self.lastServers[key];
                    }
                    callback(false);
                    return;
                }
                if (!err && response.statusCode == 200 && body.file) {
                    body.title = 'file' + path.extname(file);
                    self.api('docs.save', body, function(upload_result) {
                        if (upload_result && upload_result.length >= 1) {
                            callback(upload_result[0]);
                            return;
                        } else {
                            if (self.lastServers[key]) {
                                delete self.lastServers[key];
                            }
                            callback(false);
                            return;
                        }
                    });
                } else {
                    if (self.lastServers[key]) {
                        delete self.lastServers[key];
                    }
                    callback(false);
                }
            });
        });
    }

	docsGetMessagesUploadServer(peer_id, type, callback) {
        var self = this;
        let key = 'docsGetMessagesUploadServer' + peer_id + '_' + type;
        if (Object.keys(self.lastServers).length >= 5000) {
            self.lastServers = {};
        }
        if (self.lastServers[key]) {
            callback(self.lastServers[key]);
            return;
        }
        let options = {
            peer_id: peer_id
        };
        if (type) {
            options.type = type;
        }
        self.api('docs.getMessagesUploadServer', options, function(data) {
            if (data && data.upload_url) {
                self.lastServers[key] = data.upload_url;
                callback(data.upload_url);
            } else {
                callback(false);
            }
        });
    }

	execute() {
		var self = this;
        if (self.methodQueue.length == 0) {
        	return;
        }
        let methods = self.methodQueue.slice(0, 25);
        self.methodQueue = self.methodQueue.slice(25);
        if (methods.length == 0) {
            return;
        }
        let items = [];
        for (var i = methods.length - 1; i >= 0; i--) {
            let method = methods[i];
            items.push('{"callbackName":"' + method.callbackName + '","response":' + method.method + '}');
        }
        if (items.length == 0) {
            return;
        }
        let code = 'return [' + items.join(',') + '];';
        let sendParams = {code: code};
        self.api('execute', sendParams, function(data) {
            if (!data) {
            	for (var i = methods.length - 1; i >= 0; i--) {
            		try {
            			self.CallbackRegistry[methods[i].callbackName](false);
            		} catch(ignored) { } 
            	}
                return;
            }
        	if (data.response) {
        		let errorsMethods = [];
        		let errorsParams = [];
        		for (var i = data.response.length - 1; i >= 0; i--) {
                    let item = data.response[i];
                    if (item.response) {
                    	try {
                    		self.CallbackRegistry[item.callbackName](item.response);
                    	} catch(ignored) { } 
                    } else {
                    	errorsMethods.push(item.callbackName);
                    	errorsParams.push(methods[i].params);
                    }
                }
                if (errorsMethods.length == 0) {
                	return;
                }
                for (var i = errorsMethods.length - 1; i >= 0; i--) {
                	try {
                		let error = data.execute_errors[i];
                		let params = errorsParams[i];
                		let keys = Object.keys(params);
                		delete error.method;
                		error.request_params = [];
                		for (var n = keys.length - 1; n >= 0; n--) {
                			error.request_params.push({key:keys[n], value:params[keys[n]]});
                		}
                		self.CallbackRegistry[errorsMethods[i]]({error: error});
                	} catch(ignored) { } 
                }
        	} else if (data.error) {
        		for (var i = methods.length - 1; i >= 0; i--) {
        			try {
        				let method = methods[i];
        				self.CallbackRegistry[method.callbackName](data);
        			} catch(ignored) { } 
        		}
        	} else {
        		for (var i = methods.length - 1; i >= 0; i--) {
            		try {
            			self.CallbackRegistry[methods[i].callbackName](false);
            		} catch(ignored) { } 
            	}
        	}
        });
	}

	api(method, params, callback, attempt) {
		var self = this;
        attempt = attempt || 0;
        attempt++;
        if (attempt >= 5) {
            callback(false);
            return;
        }
        method = method || 'execute';
        params = params || {};
        callback = callback || Function();
        if (method != 'execute') {
        	let callbackName = 'method' + rand(0, 9999999) + '_' + rand(0, 999999);
        	var isOk = false;
        	let timerId = setTimeout(function() { 
                if (!isOk) {
                    try {
                        delete self.CallbackRegistry[callbackName];
                        callback(false);
                    } catch(e) { } 
                }
            }, 6000);
        	self.CallbackRegistry[callbackName] = function(data) {
        		callback(data);
                isOk = true;
                clearTimeout(timerId);
                delete self.CallbackRegistry[callbackName];
            };
            self.methodQueue.push({callbackName: callbackName, method: 'API.' + method + '(' + JSON.stringify(params) + ')', params: params});
        	return;
        }
        if (!params.v) {
            params.v = '5.67';
        }
        if (!params.request_id) {
            params.request_id = rand(0, 9999999) + '_' + rand(0, 9999999);
        }
        if (!params.access_token) {
            if (self.lastToken >= self.accessTokens.length) {
                self.lastToken = 0;
            } else {
                self.lastToken = self.lastToken + 1;
            }
            params.access_token = self.accessTokens[Math.abs(self.lastToken - 1)];
            if (!params.access_token || params.access_token == undefined) {
                self.lastToken = 0;
                params.access_token = self.accessTokens[0];
            }
        }
        let options = {
            form: params, 
            gzip: true,
            timeout: 15000
        };
        request.post('https://api.vk.com/method/' + method, options, function(err, response, body) {
        	if (body) {
                var json = false;
                try {
                    json = JSON.parse(body);
                } catch(ignored) {}
                if (!json) {
                    self.api(method, params, callback, attempt);
                } else if (json.response) {
                    callback(json);
                } else {
                    let error = json.error;
                    switch (error.error_code) {
                        case 1:
                        case 6:
                        case 9:
                        case 10:
                            setTimeout(function() {
                                self.api(method, params, callback, attempt);
                            }, 400);
                            break;
                        case 5:
                            throw new Error(error.error_msg);
                            break;
                        default:
                            callback(json);
                            break;
                    }
                }
        	} else {
        		setTimeout(function() {
                    self.api(method, params, callback, attempt);
                }, 400);
        	}
        });
	}
}

module.exports = function(config) {
    return new VK(config);
}

function rand(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function time() {
    return Math.round(new Date().getTime() / 1000);
}

function isEmpty(obj) {
    if (obj == null) {
        return true;
    }
    if (obj.length && obj.length > 0) {
        return false;
    }
    if (obj.length === 0) {
        return true;
    }
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}