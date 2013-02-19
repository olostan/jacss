var jacss_share = function () {
    // do context switch if necessary (for future to support several 'presentations':
    if (this == window) {
        jacss_share.call(jacss_share);
        return;
    }

    var presenter = false;
    var detached = false;
    var havePresenter = false;
    var joined = false;

    var config = { server: 'olostan.org.ua:8088', name: window.location.host + window.location.pathname, share: "#share" };
    for (var n in config) {
        //noinspection JSUnfilteredForInLoop
        if (Object.prototype.hasOwnProperty.call(jacss.config, n)) { //noinspection JSUnfilteredForInLoop
            config[n] = jacss.config[n];
        }
    }

    var btn = document.querySelector(config.share);

    var pStage = 0;

    var socket = io.connect(config.server);

    socket.on('error', function (message) {
        alert("Remote error: " + message);
    });

    socket.on('server.status', function (message) {
        console.log("JACSS server status:", message);
    });

    socket.on('stage', function (data) {
        pStage = data.stage;
        if (joined && !detached)
            originalSet.call(jacss, data.stage);
    });
    // for debugging
    var status = function () {
        console.log("havePresenter:" + havePresenter + " joined:" + joined + " detached:" + detached);
    };
    socket.on('presenter', function (p) {
        console.log("Changed presenter ", p);
        havePresenter = p.presenter;
        if (havePresenter) pStage = p.stage;
        //status();
        if (havePresenter && !detached) jacss.set_stage(p.stage);
        showBtn();
    });

    socket.emit('register', {name: config.name}, function (r) {
        havePresenter = r.presenter;
        showBtn();
        console.log("Successfully registered to " + config.name, r);
    });

    var showBtn = function () {
        if (presenter)
            btn.innerHTML = 'Stop';
        else if (havePresenter) {
            if (!joined)
                btn.innerHTML = 'Join';
            else if (detached)
                btn.innerHTML = 'Attach';
            else
                btn.innerHTML = 'Detach';
        }
        else btn.innerHTML = 'Share';
    };

    this.share = function () {

        if (presenter) {
            socket.emit('stop', {}, function (r) {
                if (r.error) return alert("Can't stop: " + r.error);

                presenter = false;
                havePresenter = false;
                return showBtn();
            })
        } else {
            if (havePresenter) {
                if (joined) {

                    if (detached) originalSet.call(jacss, pStage);
                    detached = !detached;
                    return showBtn();
                } else this.join();
            } else {

                socket.emit("share", {stage: jacss.frame}, function (r) {
                    if (r.error) return alert("Can't share: " + r.error);
                    console.log('confirmed sharing', r);

                    presenter = true;
                    havePresenter = true;
                    showBtn();
                    return true;
                });
            }
        }
        return false;
    };

    this.join = function () {
        socket.emit("join", { name: config.name }, function (r) {
            console.log("confirmed join", r);
            joined = true;
            presenter = false;
            havePresenter = r.presenter;
            showBtn();
        });
    };
    var originalSet = jacss.set_stage;
    var current;
    jacss.set_stage = function (stage) {
        if (current == stage) return;

        if (havePresenter && joined && !detached && !presenter) return;

        current = stage;

        if (presenter)
            socket.emit('stage', {stage: stage});
        originalSet.call(jacss, stage);
    };
    this.join();
    detached = true;
};
window.addEventListener("load", jacss_share, false);
