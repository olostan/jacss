var app = require('http').createServer(handler)
    , io = require('socket.io').listen(app)
    , fs = require('fs');

var port = 8088;
app.listen(port);


function handler(req, res) {
    //console.log(req);
    var file = req.url;
    if (file[0] != '/') file = '/' + file;
    if (file == '/') {
        console.log("root");
        res.writeHead(302, {
            "Location": "/examples/shared/small.html"
        });
        res.end("Please go to /examples/shared/small.html");
        return;
    }
    fs.readFile(__dirname + file,
        function (err, data) {
            if (err) {
                if (err.code == 'ENOENT') {
                    res.writeHead(404);
                    return res.end('Not found');
                }
                console.log(err);
                res.writeHead(500);
                return res.end('Error loading file');

            }
            res.writeHead(200);
            res.end(data);
            return true;
        });
}
var presentations = {};
var broadcast = function (name, event, data) {
    presentations[name].joins.forEach(function (client) {
        client.emit(event, data);
    });
};
var numberOfKeys = function (obj) {
    var r = 0;
    for (var x in obj) if (Object.prototype.hasOwnProperty.call(obj,x)) r++;
    return r;
};

io.sockets.on('connection', function (socket) {

    socket.emit('status', {version: '0.0.1', presentations: numberOfKeys(presentations)});
    socket.on('share', function (data, fn) {
        var presentation = presentations[data.name];
        if (presentation && presentation.presenter) return fn({error: "There is already presenter"});
        if (!presentation) presentations[data.name] = { presenter: socket, joins: []};
        else presentation.presenter = socket;

        broadcast(data.name, 'presenter', true);
        socket.set('name', data.name, function () {
            fn({ok: true});
        });
        return true;
    });
    socket.on('join', function (data, fn) {
        var p = presentations[data.name];
        if (!p) p = presentations[data.name] = { presenter: null, joins: []};
        p.joins.push(socket);
        socket.set('name', data.name, function () {
            fn({ok: true, presenter: !!p.presenter});
        });

    });
    socket.on('stage', function (data) {
        socket.get('name', function (err, name) {
            if (err || !name) return;
            broadcast(name, 'stage', {stage: data.stage});
        })
    });
    socket.on('disconnect', function () {
        socket.get('name', function (err, name) {
            if (err || !name) return;
            var p = presentations[name];
            if (p.presenter == socket) {
                p.presenter = null;
                broadcast(name, 'presenter', false);
            }
            else {
                var i = p.joins.indexOf(socket);
                if (i >= 0) p.joins.splice(i, 1);
            }
            if (!p.presenter && p.joins.length == 0) {
                delete presentations[name];
                console.log("CLEANUP: Removed " + name);
            }
        })
    });
});

console.log("Server running on " + port);