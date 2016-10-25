function xhrSend(url, params, successCB, errorCB) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.onload = function (evt) {
        if(successCB) successCB(evt.srcElement);
    };
    xhr.onerror = function (evt) {
        if(errorCB) errorCB();
    };
    var fd = new FormData();
    for(paramName in params) {
        fd.append(paramName, params[paramName]);
    }
    xhr.send(fd);
}

function sendByAjax(blob, origin, fileName){
    xhrSend(
        origin + '/client/screenShare',
        { filename: fileName, screenshot: blob },
        function (xhr) {
            socket.emit('screenShare_app', '/client/screenShare/' + fileName);
        }
    );
}