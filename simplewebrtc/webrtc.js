var signalingChannel = new BroadcastChannel('webrtc-test');
var configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc;

// call start() to initiate
function start() {
    pc = new webkitRTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        signalingChannel.postMessage({ candidate: evt.candidate });
    };

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = function () {
        pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        })
        .then(function () {
            // send the offer to the other peer
            signalingChannel.postMessage({ desc: pc.localDescription });
        })
        .catch(logError);
    };

    // once remote video track arrives, show it in the remote video element
    pc.ontrack = function (evt) {
        if (evt.track.kind === "video")
          remoteView.srcObject = evt.streams[0];
    };

    pc.onaddstrem = function(evt) {
        if(evt.stream) {
            remoteView.srcObject = evt.stream;
        }
    }

    // get a local stream, show it in a self-view and add it to be sent
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(function (stream) {
            selfView.srcObject = stream;
            if(pc.addStream) {
                pc.addStream(stream);
            } else {
                pc.addTrack(stream.getAudioTracks()[0], stream);
                pc.addTrack(stream.getVideoTracks()[0], stream);
            }
        })
        .catch(logError);
}

signalingChannel.onmessage = function (evt) {
    if (!pc)
        start();

    if (evt.data.desc) {
        var desc = evt.data.desc;

        // if we get an offer, we need to reply with an answer
        if (desc.type == "offer") {
            pc.setRemoteDescription(desc).then(function () {
                return pc.createAnswer();
            })
            .then(function (answer) {
                return pc.setLocalDescription(answer);
            })
            .then(function () {
                signalingChannel.send({ desc: pc.localDescription });
            })
            .catch(logError);
        } else if (desc.type == "answer") {
            pc.setRemoteDescription(desc).catch(logError);
        } else {
            log("Unsupported SDP type. Your code may differ here.");
        }
    } else
        pc.addIceCandidate(evt.data.candidate).catch(logError);
};

function logError(error) {
    console.log(error.name + ": " + error.message);
}

btnConnect.onclick = function() {
    start();
}
