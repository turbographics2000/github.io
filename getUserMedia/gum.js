navigator.mediaDevices.getUserMedia({
    video: {
        width: 200,
        height: 200,
    }
}).then(stream => {
    var video = document.createElement('video');
    video.onloadedmetadata = function () {
        console.log(video.videoWidth, video.videoHeight);
    }
    video.srcObject = stream;
    document.body.appendChild(video);
}).catch(err => console.log(err));
