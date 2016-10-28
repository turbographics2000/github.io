const signalingChannel = new BroadcastChannel('webrtc-getstats-test');
const configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
let pc;

window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
btnConnect.onclick = start;

function appendVideo(side, stream) {
    var video = document.createElement('video');
    video.id = side + stream.id;
    window[side + 'Streams'].appendChild(video);
    video.srcObject = stream;
    video.play();
};

function removeVideo(side, stream) {
    var video = window[side + stream.id];
    window[side + 'Streams'].removeChild(video);
}

function addStream() {
    if(selfStreams.children.length >= 3) return;
    navigator.mediaDevices.getUserMedia({
            audio: false,
            // audio: {
            //     googEchoCancellation: true,
            //     googAutoGainControl: true,
            //     googNoizeSuppression: true,
            //     googHighpassFilter: true,
            //     googNoizeSuppression2: true,
            //     googEchoCancellation2: true,
            //     googAutoGainControl2: true
            // },
            video: {
                width: {ideal: 320},
                height: {ideal: 240},
                frameRate: {min: 1, max: 15}
            }
        })
        .then(stream => {
            appendVideo('self', stream);
            if(pc.addStream) {
                pc.addStream(stream);
            } else {
                if(stream.getAudioTracks().length)
                    pc.addTrack(stream.getAudioTracks()[0], stream);
                if(stream.getVideoTracks().length)
                    pc.addTrack(stream.getVideoTracks()[0], stream);
            }
        })
        .catch(error => {
            console.log(error.name + ": " + error.message);
        });
}

function start(flg) {
    pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = evt => {
        if(evt.candidate)
            signalingChannel.postMessage(JSON.stringify({ candidate: evt.candidate }));
    }
    pc.onnegotiationneeded = _ => {
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .then(_ => signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription })))
            .catch(error => {
                console.log(error.name + ": " + error.message);
            });
    };
    pc.ontrack = evt => {
        if(!window['remote_' + evt.streams[0].id]) {
            appendVideo('remote', evt.streams[0]);
        }
    };
    pc.onaddstream = evt => {
        appendVideo('remote', evt.stream);
    }
    pc.onremovestream = evt => {
        removeVideo('remote', evt.stream);
    }
    addStream();
}

signalingChannel.onmessage = function(evt) {
    if (!pc)
        start();
    let message = JSON.parse(evt.data);
    if ('desc' in message) {
        let desc = message.desc;
        if (desc.type == "offer") {
            console.log('setRemoteDescription offer');
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ =>{
                    return pc.createAnswer();
                })
                .then(answer => {
                    return pc.setLocalDescription(new RTCSessionDescription(answer));
                })
                .then(_ => {
                    var d = pc.localDescription;
                    if(!pc.localDescription) {
                        debugger;
                    }
                    setTimeout(signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription })), 1000);
                })
                .catch(error => {
                    console.log(error.name + ": " + error.message);
                });
        } else if (desc.type == "answer") {
            console.log('setRemoteDescription answer');
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .catch(error => {
                    console.log(error.name + ": " + error.message);
                })
                .then(_ => {
                    if(window.chrome) {
                        setTimeout(function() {
                            chromeGetStats().then(displayReport);
                        }, 1000);
                    } else {
                        firefoxGetStats();
                    }
                });
        } else
            console.log("Unsupported SDP type. Your code may differ here.");
    } else {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(error => {
                console.log(error.name + ": " + error.message);
            });
    }
};

function logError(error) {
    console.log(error.name + ": " + error.message);
};

