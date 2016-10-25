const signalingChannel = new BroadcastChannel('webrtc-getstats-test');
const configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };
let pc;

window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection; 
btnConnect.onclick = start;

function appendVideo(side, stream) {
    var video = document.createElement('video');
    video.id = side + stream.id;
    video.width = 320;
    video.height = 240;
    remoteStreams.appendChild(video);
    video.srcObject = stream;
    video.play();
};

function removeVideo(side, stream) {
    var video = window[side + stream.id];
    window[side + 'Streams'].removeChild(video);
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
            .catch(logError);
    };
    pc.ontrack = evt => {
        if(!window['remote_' + evt.streams[0].id]) appendVideo('remote', evt.streams[0]);
    };
    pc.onaddstream = evt => {
        appendVideo('remote', evt.stream);
    }
    pc.onremovestream = evt => {
        removeVideo('remote', evt.stream);
    }
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
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
        .catch(logError);
}

signalingChannel.onmessage = function(evt) {
    let flg = false
    if (!pc) {
        flg = true;
        start();
    }
    let message = JSON.parse(evt.data);
    if (message.desc) {
        let desc = message.desc;
        if (desc.type == "offer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .then(_ =>{
                    return pc.createAnswer();
                })
                .then(answer => {
                    pc.setLocalDescription(new RTCSessionDescription(answer));
                })
                .then(_ => {
                    signalingChannel.postMessage(JSON.stringify({ desc: pc.localDescription }))
                })
                .catch(logError);
        } else if (desc.type == "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(desc))
                .catch(logError)
                .then(_ => {
                    if(flg) chromeGetStats();
                });
        } else 
            console.log("Unsupported SDP type. Your code may differ here.");
    } else
        pc.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(logError);
};

function logError(error) {
    console.log(error.name + ": " + error.message);
};

function chromeGetStats() {
    pc.getStats(response => {
        let standardReport = {};
        response.result().forEach(reports => {
            const standardStats = {
                id: reports.id,
                timestamp: reports.timestamp,
                type: reports.type
            };
            reports.names().forEach(name => {
                standardStats[name] = reports.stat(name);
            });
            standardReport[reports.type] = standardReport[reports.type] || {};
            standardReport[reports.type][standardStats.id] = standardStats;
        });
        displayReport(standardReport);
    });
}

function displayReport(report) {
    const container = document.body;
    const h1 = document.createElement('h1');
    h1.textContent = '統計情報';
    container.appendChild(h1);
    const tableRow = (tbody, cols, cellType) => {
        const tr = document.createElement('tr');
        for(let col in cols) {
            const td = document.createElement(cellType);
            td.textContent = col;
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    for(let typ in report) {
        const h2 = document.createElement('h2');
        h2.textContent = type + ' タイプ';
        container.appendChild(h2);
        for(let statsId in report[typ]) {
            const h3 = document.createElement('h3');
            h3.textContent = statsId;
            container.appendChild(h3);
            const table = document.createElement('table');
            const tHead = document.createElement('thead');
            const tBody = document.createElement('tbody');
            table.appendChild(tHead);
            table.appendChild(tBody);
            tableRow(tHead, ['name', 'value'], 'th');
            for(let name in report[typ][statsId]) {
                tableRow(tBody, [name, report[typ][statsId][name]], 'td');
            }
            container.appendChild(table);
        }
    }
}
