var jacss_share = function () {
    // do context switch if necessary (for future to support several 'presentations':
    if (this == window) {
        jacss_share.call(jacss_share);
        return;
    }

    var presenter = false;
    var detached = false;
    var havePresenter = false;

    var config = { server: 'olostan.org.ua:8088', name: window.location.origin + window.location.pathname, share: "#share" };
    for (var n in config) {
        //noinspection JSUnfilteredForInLoop
        if (Object.prototype.hasOwnProperty.call(jacss.config,n)) { //noinspection JSUnfilteredForInLoop
            config[n] = jacss.config[n];
        }
    }

    var btn = document.querySelector(config.share);

    var socket;

    var pStage = 0;

    var connect = function () {

        /*socket.on('news', function (data) {
         console.log(data);
         socket.emit('my other event', { my: 'data' });
         });*/
        //console.log("connecting");
        var socket = io.connect(config.server);
        socket.on('error', function (message) {
            alert("Remote error: " + message);
        });
        socket.on('status', function (message) {
            console.log("JACSS server status:", message);
        });
        return socket;
    };

    var showBtn = function () {
        if (presenter)
            btn.innerHTML = 'Stop';
        else if (havePresenter) {
            if (detached)
                btn.innerHTML = 'Attach';
            else
                btn.innerHTML = 'Detach';
        }
        else btn.innerHTML = 'Share';
    };

    this.share = function () {
        if (presenter) {
            if (socket) socket = socket.disconnect();
            btn.innerHTML = "Share";
            presenter = false;
            havePresenter = false;
            this.join();
        } else {
            if (havePresenter) {
                if (detached) originalSet.call(jacss, pStage);
                detached = !detached;
                showBtn();
                return;
            }
            socket = connect();

            socket.emit("share", {name: config.name}, function (r) {
                if (r.error) return alert("Can't share: " + r.error);
                console.log('confirmed sharing', r);
                btn.innerHTML = "Stop";

                presenter = true;
                havePresenter = true;
                showBtn();
                return true;
            });
        }
    };
    this.join = function () {
        if (socket) socket = socket.disconnect();
        socket = connect();
        socket.emit("join", { name: config.name }, function (r) {
            console.log("confirmed join", r);

            socket.on('stage', function (data) {
                pStage = data.stage;
                if (!detached)
                    originalSet.call(jacss, data.stage);
            });

            presenter = false;
            havePresenter = r.presenter;
            showBtn();

            socket.on('presenter', function (p) {
                havePresenter = p;
                showBtn();
            });

        });
    };
    var originalSet = jacss.set_stage;
    var current;
    jacss.set_stage = function (stage) {
        if (current == stage) return;
        //console.log('changing',stage,presenter,detached);
        if (!presenter && !detached) return;

        current = stage;

        if (presenter)
            socket.emit('stage', {stage: stage});
        originalSet.call(jacss, stage);
    };
    this.join();

};
window.addEventListener("load", jacss_share, false);
