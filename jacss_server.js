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
var broadcast = function (presentation, event, data) {
    presentation.joins.forEach(function (client) {
        client.emit(event, data);
    });
};
var numberOfKeys = function (obj) {
    var r = 0;
    for (var x in obj) if (Object.prototype.hasOwnProperty.call(obj, x)) r++;
    return r;
};

io.sockets.on('connection', function (socket) {

    socket.emit('server.status', {version: '0.0.3', presentations: numberOfKeys(presentations)});

    socket.on('register', function (data, fn) {
        var name = data.name;
        var presentation = presentations[data.name];
        socket.set('name', data.name, function () {
            fn({presenter: presentation && !!presentation.presenter});
        });

    });

    var ensurePresentation = function (cb) {
        socket.get('name', function (err, name) {
            if (!err && name) {
                var presentation = presentations[name];
                if (!presentation) presentation = presentations[name] = { presenter: null, joins: [], stage: -1};
                cb(presentation, name);
            }
        });
    };

    socket.on('share', function (data, fn) {
        ensurePresentation(function (presentation) {
            if (presentation.presenter) return fn({error: "There is already presenter"});
            presentation.presenter = socket;
            presentation.stage = data.stage;
            broadcast(presentation, 'presenter', {presenter: true, stage: presentation.stage});
            return fn({ok: true});
        });
        return true;
    });
    socket.on('stop', function (data, fn) {
        ensurePresentation(function (presentation) {
            if (presentation.presenter == socket) {
                presentation.presenter = null;
                broadcast(presentation, 'presenter', {presenter: false});
                fn({ok: true});
            } else fn({error: "You're not presenter"});
        });

    });
    socket.on('join', function (data, fn) {
        ensurePresentation(function (presentation) {
            presentation.joins.push(socket);
            fn({ok: true, presenter: !!presentation.presenter, stage: presentation.stage});
        });
    });
    socket.on('stage', function (data) {
        ensurePresentation(function (presentation) {
            presentation.stage = data.stage;
            broadcast(presentation, 'stage', {stage: data.stage});
        });
    });
    socket.on('event', function (data) {
        ensurePresentation(function (presentation) {
            broadcast(presentation, 'event', data);
        });
    });
    socket.on('disconnect', function () {
        ensurePresentation(function (presentation, name) {
            if (presentation.presenter == socket) {
                presentation.presenter = null;
                broadcast(presentation, 'presenter', {presenter: false});
            }
            else {
                var i = presentation.joins.indexOf(socket);
                if (i >= 0) presentation.joins.splice(i, 1);
            }
            if (!presentation.presenter && presentation.joins.length == 0) {
                delete presentations[name];
                console.log("CLEANUP: Removed " + name);
            }
        })
    });
});

console.log("Server running on " + port);