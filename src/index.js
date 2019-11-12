"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http = __importStar(require("http"));
var websocket_1 = __importDefault(require("websocket"));
var webSocketsServerPort = 8000;
var webSocketServer = websocket_1.default.server;
var server = http.createServer();
// start the http server
server.listen(webSocketsServerPort, function () {
    console.log("server is listening on port: " + webSocketsServerPort);
});
// tie the WebSocket server to the HTTP port
var wsServer = new webSocketServer({
    httpServer: server
});
var clients = {};
var users = {};
// editor content
var editorContent = null;
// User activity history.
var userActivity = [];
var sendMessage = function (json) {
    // We are sending the current data to all connected clients
    Object.keys(clients).map(function (client) {
        clients[client].sendUTF(json);
    });
};
var typesDef = {
    USER_EVENT: "userevent",
    CONTENT_CHANGE: "contentchange"
};
// This code generates unique userid for everyuser.
var getUniqueID = function () {
    var s4 = function () { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); };
    return s4() + s4() + '-' + s4();
};
//
wsServer.on('request', function (request) {
    var userID = getUniqueID();
    console.log((new Date()) + ' Received a new connection from origin ' + request.origin + '.');
    // connect a new client
    var connection = request.accept("", request.origin);
    clients[userID] = connection;
    console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));
    connection.on('message', function (message) {
        if (message.type === 'utf8' && message.utf8Data) {
            var dataFromClient = JSON.parse(message.utf8Data);
            var json = { type: dataFromClient.type };
            if (dataFromClient.type === typesDef.USER_EVENT) {
                users[userID] = dataFromClient;
                userActivity.push(dataFromClient.username + " joined to edit the document");
                json.data = { users: users, userActivity: userActivity };
            }
            else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
                editorContent = dataFromClient.content;
                json.data = { editorContent: editorContent, userActivity: userActivity };
            }
            sendMessage(JSON.stringify(json));
        }
    });
    // user disconnected
    connection.on('close', function (connection) {
        console.log((new Date()) + " Peer " + userID + " disconnected.");
        var json = { type: typesDef.USER_EVENT };
        if (users[userID]) {
            userActivity.push(users[userID].username + " left the document");
        }
        else {
            userActivity.push("Unknown user left the document");
        }
        json.data = { users: users, userActivity: userActivity };
        delete clients[userID];
        delete users[userID];
        sendMessage(JSON.stringify(json));
    });
});
