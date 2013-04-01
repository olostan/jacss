var jacss_share = function () {
    // do context switch if necessary (for future to support several 'presentations':
    if (this == window) {
        jacss_share.call(jacss_share);
        return;
    }

    if (!navigator.onLine) {
        // we're offline, no sharing
        return;
    }

    var presenter = false;
    var detached = false;
    var havePresenter = false;
    var joined = false;

    var config = { server: 'olostan.org.ua:8088', name: window.location.host + window.location.pathname, share: "#share", simulate: true };
    //var config = { server: '127.0.0.1:8088', name: window.location.host + window.location.pathname, share: "#share", simulate: true };
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
        status();
        if (havePresenter && !detached) originalSet.call(jacss, p.stage);
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

    // simulate activity
    if (config.simulate) {
        var findElementN = function(element) {
            var n = 0;

            var finder = function(e) {
                n++;
                if (e == element) return n;
                for (var i = 0; i<e.childNodes.length;i++)
                    if (finder(e.childNodes[i])>0) return n;
                return 0;
            };
            finder(document);
            return n;
        };
        var findElementByN = window.findByElementN = function(targetN) {
            var n =0;
            var finderN = function(e) {
                n++;
                if (n == targetN) return e;
                for (var i = 0; i<e.childNodes.length;i++) {
                    var found = finderN(e.childNodes[i]);
                    if (found!=undefined) return found;
                }
                return undefined;
            };
            return finderN(document);
        };
        var events = ['click','mousedown','mouseup']; // todo: Check what wlse works
        events.forEach(function (eName) {
            window.addEventListener(eName, function (e) {
                if (presenter) {
                    console.log(eName, e);
                    var n = findElementN(e.toElement);
                    if (presenter) socket.emit('event', {name: eName, elementN: n, x: e.screenX, y: e.screenY});
                }
            });
        });
        document.body.addEventListener('focus', function(e) {
            if (presenter) {
                        console.log("Sending focus");
                        socket.emit('event', { name: 'focus', elementN: findElementN(document.activeElement), value: e.target.value});
            }
        },true);

        window.addEventListener('keyup', function(e) {
            if (presenter) {
                if (e.target.tagName=='INPUT' || e.target.tagName=='TEXTAREA') {
                    if (e.target.dataset.old != e.target.value) {
                        console.log("Sending value", e.target.value);
                        socket.emit('event', { name: 'value', elementN: findElementN(e.target), value: e.target.value});
                        e.target.dataset.old = e.target.value;
                    }
                }
            }
        });


        socket.on('event', function(data) {
            if (!presenter) {
                console.log('simulation event',data);
                var e = findElementByN(data.elementN);
                console.log("Found element:",e);
                if (data.name == 'value') e.value = data.value;
                else if (data.name == 'focus') e.focus();
                else if (!presenter) simulate(e,data.name,{pointerX: data.x, pointerY: data.y});

            }
        });
    }
};
window.addEventListener("load", jacss_share, false);


// Simulate events
var simulate = function() {
    var eventMatchers = {
        'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
        'MouseEvents': /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
    };
    var defaultOptions = {
        pointerX: 0,
        pointerY: 0,
        button: 0,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        bubbles: true,
        cancelable: true
    };
    return function (element, eventName)
    {
        var options = extend(defaultOptions, arguments[2] || {});
        var oEvent, eventType = null;

        for (var name in eventMatchers)
        {
            if (eventMatchers[name].test(eventName)) { eventType = name; break; }
        }

        if (!eventType)
            throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

        if (document.createEvent)
        {
            oEvent = document.createEvent(eventType);
            if (eventType == 'HTMLEvents')
            {
                oEvent.initEvent(eventName, options.bubbles, options.cancelable);
            }
            else
            {
                oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
                    options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
                    options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
            }
            element.dispatchEvent(oEvent);
        }
        else
        {
            options.clientX = options.pointerX;
            options.clientY = options.pointerY;
            var evt = document.createEventObject();
            oEvent = extend(evt, options);
            element.fireEvent('on' + eventName, oEvent);
        }
        return element;
    };

    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }
}();