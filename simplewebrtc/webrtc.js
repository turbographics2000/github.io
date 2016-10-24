var signalingChannel = new BroadcastChannel('webrtc-test');
var configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
var pc;
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection; 

// call start() to initiate
function start() {
    pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if(evt.candidate)
            signalingChannel.postMessage(JSON.stringify({ candidate: evt.candidate }));
    };

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = function () {
        pc.createOffer().then(function (offer) {
            return pc.setLocalDescription(offer);
        })
        .then(function () {
            // send the offer to the other peer
            signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription }));
        })
        .catch(logError);
    };

    // once remote video track arrives, show it in the remote video element
    pc.ontrack = function (evt) {
        if (evt.track.kind === "video")
          remoteView.srcObject = evt.streams[0];
    };

    pc.onaddstream = function(evt) {
        if(evt.stream) {
            remoteView.srcObject = evt.stream;
        }
    }

    // get a local stream, show it in a self-view and add it to be sent
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
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

    var message = JSON.parse(evt.data);
    if (message.desc) {
        var desc = message.desc;

        // if we get an offer, we need to reply with an answer
        if (desc.type == "offer") {
            pc.setRemoteDescription(desc).then(function () {
                return pc.createAnswer();
            })
            .then(function (answer) {
                return pc.setLocalDescription(answer);
            })
            .then(function () {
                signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription }));
            })
            .catch(logError);
        } else if (desc.type == "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc)).catch(logError);
        } else {
            log("Unsupported SDP type. Your code may differ here.");
        }
    } else
        pc.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(logError);
};

function logError(error) {
    console.log(error.name + ": " + error.message);
}

btnConnect.onclick = function() {
    start();
}
