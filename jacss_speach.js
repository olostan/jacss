var jacss_speach = function () {
    // do context switch if necessary (for future to support several 'presentations':
    if (this == window) {
        jacss_speach.call(jacss_speach);
        return;
    }
    var config = { speach: "#speach", speach_verbs : { next: "next step", prev: "previous step"} };
    //var config = { server: '127.0.0.1:8088', name: window.location.host + window.location.pathname, share: "#share", simulate: true };
    for (var n in config) {
        //noinspection JSUnfilteredForInLoop
        if (Object.prototype.hasOwnProperty.call(jacss.config, n)) { //noinspection JSUnfilteredForInLoop
            config[n] = jacss.config[n];
        }
    }
    if (!window.webkitSpeechRecognition) return;
    var btn = document.querySelector(config.speach);
    btn.classList.add('visible');

    var recognizing;
    var recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    reset();
    recognition.onend = reset;
    recognition.onresult = function (event) {
        console.log('result', event);
        for (var i = resultIndex; i < event.results.length; ++i) {
            if (event.results.final) {
                //textarea.value += event.results[i][0].transcript;
                console.log(event.results[i][0].transcript);
                if (event.results[i][0].transcript == config.speach_verbs.next)
                    jacss.next();
                else if (event.results[i][0].transcript == config.speach_verbs.next)
                    jacss.previous();
            }
        }
    }
    recognition.onerror = function(event) {
        console.log("Error: ", event);
    }

    function reset() {
        console.log("reseting...");
        recognizing = false;
        btn.classList.remove('active');
    }

    function toggleStartStop() {
        if (recognizing) {
            recognition.stop();
            reset();
        } else {
            recognition.lang = 'ru_RU';
            recognition.start();
            recognizing = true;
            btn.classList.add('active');
        }
        console.log(recognizing);
    }
    btn.addEventListener('click', toggleStartStop);

};
window.addEventListener("load", jacss_speach, false);
