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
                    setTimeout(chromeGetStats, 2000);
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

// function chromeGetStats() {
//     pc.getStats(response => {
//         const standardReport = {};
//         response.result().forEach(stats => {
//             const standardStats = {
//                 id: stats.id,
//                 timestamp: stats.timestamp,
//                 type: stats.type
//             };
//             stats.names().forEach(name => {
//                 standardStats[name] = stats.stat(name);
//             });
//             standardReport[stats.type] = standardReport[stats.type] || {};
//             standardReport[stats.type][standardStats.id] = standardStats;
//         });
//         displayReport(standardReport);
//     });
// }

const standardReport = {};
function chromeGetStats() {
    const container = document.body;
    pc.getStats(response => {
        response.result().forEach(stats => {
            const typeId = 'webrtc_statstype' + stats.type;
            let statsTypeContainer = window[typeId];
            if(!statsTypeContainer) {
                statsTypeContainer = document.createElement('div');
                container.appendChild(statsTypeContainer);
            }

            let reportStatsType = standardReport[typeId];
            if(!reportStatsType) {
                statsTypeContainer = document.createElement('div');
                statsTypeContainer.id = typeId;
                const h2 = document.createElement('h2');
                h2.textContent = `${stats.type}タイプ (cnt: ${Object.keys(report[stats.type]).length})`;
                statsTypeContainer.appendChild(h2);

                reportStatsType = {};
                standardReport[statsTypeId] = reportStatsType;
            } 

            const statsId = 'webrtc_stats' + sstats.Id;
            let statsTable = window[statsId];
            let reportStats = reportStatsType[statsId];
            const statsTableId = 'stats' + stats.id;
            if(!reportStats) {
                const table = document.createElement('table');
                const tHead = document.createElement('thead');
                const thtr = document.createElement('tr');
                const th = document.createElement('th');
                const tBody = document.createElement('tbody');
                th.colSpan = 2;
                th.textContent = stats.id;
                thtr.appendChild(th);
                thead.appendChild(thtr);
                table.appendChild(thead);
                tBody.id = statsId;
                table.appendChild(tbody);
                statsTable = tBody;
                statsTypeContainer.appendChild(table);

                reportStats = {
                    id: stats.id,
                    timestamp: stats.timestamp,
                    type: stats.type
                };
                reportStatsType[stats.id] = reportStats;
            }
            
            stats.names().forEach(name => {
                const statId = 'webrtc_stat' + name;
                const value = stats.stat(name);
                let oldValue = reportStats[name];
                if(!oldValue) {
                    const tr = document.createElement('tr');
                    const tdName = document.createElement('td');
                    const tdValue = document.createElement('td');
                    tdName.textContent = name;
                    tdValue.id = statId;
                    tdValue.textContent = stats.stat(name);
                    tr.appendChild(tdName);
                    tr.appendChild(tdValue);
                    statsTable.appendChild(tr);
                } else if(oldValue !== value) {
                    window[statId].textContent = value;
                }
                
                reportStats[name] = value;
            });
        });
    });
}

function displayReport(report) {
    const container = document.body;
    const h1 = document.createElement('h1');
    h1.textContent = '統計情報';
    container.appendChild(h1);
    const tableRow = (tbody, cols, cellType) => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement(cellType);
            td.textContent = col;
            if(cellType === 'th') td.colSpan = 2;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
        return tr;
    }
    for(let typ in report) {
        const h2 = document.createElement('h2');
        h2.textContent = typ + ` タイプ (cnt: ${Object.keys(report[typ]).length})`;
        container.appendChild(h2);
        for(let statsId in report[typ]) {
            //const h3 = document.createElement('h3');
            //h3.textContent = statsId;
            //container.appendChild(h3);
            const tableId = 'table' + statsId;
            let table = winodw[tableId];
            if(!table) {
                table = document.createElement('table');
                table.id = tableId;
                const tHead = document.createElement('thead');
                const tBody = document.createElement('tbody');
                table.appendChild(tHead);
                table.appendChild(tBody);
                tableRow(tHead, 'th', statsId, [statsId]);
            }
            for(let name in report[typ][statsId]) {
                if(name !== 'id' && name !== 'type') {
                    const rowId = `row${statsId + name}`;
                    const value = report[typ][statsId][name];
                    let row = window[rowId];
                    if(row) {
                        if(row.dataset.value !== value) {

                        }
                    } else {
                        tableRow(tBody, 'td', rowId, [name, value]);
                    }
                }
            }
            container.appendChild(table);
        }
    }
}
