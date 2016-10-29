const signalingChannel = new BroadcastChannel('webrtc-getstats-test');
const configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
let pc;

window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
btnConnect.onclick = start;

function appendVideo(side, stream) {
    var video = document.createElement('video');
    video.id = side + stream.id;
    window[side + 's'].appendChild(video);
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
            video: true/*{
                width: {ideal: 320},
                height: {ideal: 240},
                frameRate: {min: 1, max: 15}
            }*/
        })
        .then(stream => {
            appendVideo('selfStream', stream);
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
    pc.oniceconnectionstatechange = evt => {
        console.log('oniceconnectionstatechange', evt);
    };
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
    if(window.chrome) {
        pc.onaddstream = evt => { // Firefox49において警告は出るものの有効である
            appendVideo('remoteStream', evt.stream);
        }
    } else {
        pc.ontrack = evt => {
            if(!window['remoteStream' + evt.streams[0].id]) {
                appendVideo('remoteStream', evt.streams[0]);
            }
        };
    }
    pc.onremovestream = evt => {
        removeVideo('remoteStream', evt.stream);
    }
    addStream();
}

signalingChannel.onmessage = function(evt) {
    if (!pc)
        start();
    let message = JSON.parse(evt.data);
    if (message.desc) {
        let desc = message.desc;
        if (desc.type == "offer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ =>{
                    return pc.createAnswer();
                })
                .then(answer => {
                    return pc.setLocalDescription(new RTCSessionDescription(answer));
                })
                .then(_ => {
                    signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription }));
                })
                .catch(error => {
                    console.log(error.name + ": " + error.message);
                });
        } else if (desc.type == "answer") {
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
                        setTimeout(function() {
                            firefoxGetStats1().then(displayReport);
                        }, 1000);
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

function getCameraCapability() {
    var videoInputs = [];
    navigator.mediaDevices.enumerateDevices(devices => devices.filter(device => device.kind === 'videoinput'))
        .then(videoInputs => {
            gum(videoInputs, 0, 1, 1);
        });
}

function gum(devices, idx, width, height) {
    navigator.mediaDevices.getUserMedia({
            video: {
                width: { min: 1, ideal: width, max: 10000},
                height: { min: 1, ideal: height, max: 10000},
                deviceId: devices[idx].deviceId
            },
            audio:false
        }).then(stream => {
            debugger;
            var video = document.createElement('video');
            video.onloadedmetadata = function() {
                console.log(video.videoWidth, video.videoHeight);
                video.srcObject = null;
                video = null;
            };
            video.srcObject = stream;
        });
}
