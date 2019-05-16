'use strict';
var opn = require('opn');

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new (nodeStatic.Server)();
var app = http.createServer(function (req, res) {
    fileServer.serve(req, res);
}).listen(80);

// opn('http://localhost');
// opn('http://localhost/three.html');
global.roomSockets = {};

var getNumbers = function () {
    return Object.keys(global.roomSockets).length
};

var io = socketIO.listen(app);
io.sockets.on('connection', function (socket) {
    console.log('connected', socket.id)
    socket.on('disconnect', function () {
        console.log('-----------------------------------')
        console.log('disconnected', socket.id);
        socket.leave('foo');
        delete global.roomSockets[socket.id];
        console.log(`getNumbers`, getNumbers());
    })
    socket.on('close', function () {
        console.log('closeed');
    })

    // convenience function to log server messages on the client
    function log() {
        // console.log(arguments)
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('message', function (message) {
        log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);
    });

    socket.on('create or join', function (room) {
        log('Received request to create or join room ' + room);
        
        // var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = getNumbers();
        
        console.log('numClients', numClients);
        log('Room ' + room + ' now has ' + numClients + ' client(s)');

        socket.emit('message', `numClients = ${numClients}`);
        if (numClients === 0) {
            socket.join(room);
            global.roomSockets[socket.id] = socket;
            log('Client ID ' + socket.id + ' created room ' + room);
            socket.emit('created', room, socket.id);

        } else if (numClients === 1) {
            log('Client ID ' + socket.id + ' joined room ' + room);
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            global.roomSockets[socket.id] = socket;
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        } else { // max two clients
            console.log('full room')
            socket.emit('full', room);
        }
    });

    socket.on('ipaddr', function () {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function (details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });

});