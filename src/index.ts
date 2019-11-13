import * as http from 'http';
import websocket from "websocket";

const PORT = process.env.PORT || 8080;
const webSocketServer = websocket.server;

const server = http.createServer(function handleRequest(request, response){
  response.end('Server working properly. Requested URL : ' + request.url);
});

// start the http server
server.listen(PORT, () => {
  console.log(`server is listening on port: ${PORT}`);

});

// tie the WebSocket server to the HTTP port
const wsServer = new webSocketServer({
  httpServer: server
});

const clients: {[key: string]: any} = {};
const users: {[key: string]: any} = {};
// editor content
let editorContent = null;
// User activity history.
let userActivity:string[] = [];

const sendMessage = (json: string) => {
  // We are sending the current data to all connected clients
  Object.keys(clients).map((client) => {
    clients[client].sendUTF(json);
  });
};

const typesDef = {
  USER_EVENT: "userevent",
  CONTENT_CHANGE: "contentchange"
}

// This code generates unique userid for everyuser.
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};
//
wsServer.on('request', (request) => {
  const userID = getUniqueID();
  console.log((new Date()) + ' Received a new connection from origin ' + request.origin + '.');

  // connect a new client
  const connection = request.accept("", request.origin);
  clients[userID] = connection;
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));


  connection.on('message', function(message) {
    if (message.type === 'utf8' && message.utf8Data) {
      const dataFromClient = JSON.parse(message.utf8Data);
      const json: any = { type: dataFromClient.type };

      if (dataFromClient.type === typesDef.USER_EVENT) {
        users[userID] = dataFromClient;
        userActivity.push(`${dataFromClient.username} joined to edit the document`);
        json.data = { users, userActivity };
      } else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
        editorContent = dataFromClient.content;
        json.data = { editorContent, userActivity };
      }
      sendMessage(JSON.stringify(json));
    }
  });

  // user disconnected
  connection.on('close', function(connection) {
    console.log((new Date()) + " Peer " + userID + " disconnected.");
    const json: any = { type: typesDef.USER_EVENT };
    if (users[userID]) {
      userActivity.push(`${users[userID].username} left the document`);
    } else {
      userActivity.push(`Unknown user left the document`);
    }
    json.data = { users, userActivity };
    delete clients[userID];
    delete users[userID];
    sendMessage(JSON.stringify(json));
  });
});

