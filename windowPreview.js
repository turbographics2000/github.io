const electron = require('electron');
const {ipcRenderer, remote} = require('electron');
const win = remote.getCurrentWindow();
//const Peer = require('skyway-peerjs-electron');

let connectionType = 'SkyWay';

const MIN_WIDTH = 300;
const MIN_HEIGHT = 240;
const MAX_WIDTH = 498;
const MAX_HEIGHT = 498;
const CHANGETARGET_WINDOW_WIDTH = 800;
const CHANGETARGET_WINDOW_HEIGHT = 600;
let calcWidth = val => val / ssVideo.videoHeight * ssVideo.videoWidth;
let calcHeight = val => val / ssVideo.videoWidth * ssVideo.videoHeight;
let session = null;
let publisher = null;
let isNotSaveBounds = false;
// let appId = 'miolilhijcenbhmcmmjgehkkcpjaiomf';
let saveBounds = { left: null, top: null, width: null, height: null };
let localStream = null;
let ssCapTime = null;
let ssTimeoutId = null;
let cnv = document.createElement('canvas');
let ctx = cnv.getContext('2d');
let nextFunc = _ => {};
let socket = null;
let ssPC = null;
let ssPeer = null;
let ssCall = null;
let remotePeerId = null;
let staffPC = null;
window.staffDC = null;
let pcs = {};
let prevW = null;
let prevH = null;
let prevVW = null;
let prevVH = null;
let fileName = null;
let saveBoundsThrottleId = null;
let observeTargetResizeId = null;
let ssRTCconfiguration = { 
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

let params = {};
let url = new URL(location.href);
for(var p of url.searchParams) {
    params[p[0]] = isNaN(p[1]) ? p[1] : +p[1];
}
console.log(params);
if(params.skyWay) {
    connectionType = 'SkyWay';
} else {
    connectionType = 'WebRTC';
}

ipcRenderer.on('close-app', (evt, msg) => {
    console.log('close-app');
    ssPC.close();
});

ipcRenderer.on('sourceId', (evt, sourceId) => {
    console.log('sourceId', sourceId);
    if(sourceId) getStream(sourceId);
    ssChangeTarget.style.backgroundColor = '';
});

ipcRenderer.on('cancel', (evt, msg) => {
    if(staffDC) staffDC.send('cancel');
});

// setupSocket -> initStaffDC -> getStream -> initScreenSharePC
window.onload = function() {
    setupSocket();
    if(localStorage.bounds) {
        let bounds = JSON.parse(localStorage.bounds);
        win.setContentBounds(bounds);
    }
}

ssChangeTarget.onmouseover = function() {
    ssChangeTarget.style.backgroundColor = '#e0eef3';
}
ssChangeTarget.onmouseout = function() {
    ssChangeTarget.style.backgroundColor = '';
}

// win.on('move', setBounds);
// win.on('resize', setBounds);
// function setBounds() {
//     if(!cnv.width) return;
//     let bounds = win.getContentBounds();
//     if(moveThrottleId) clearTimeout(moveThrottleId);
//     moveThrottleId = setTimeout(_ => {
//         localStorage.bounds = JSON.stringify(win.getContentBounds());
//     }, 100);
// }

function setupSocket() {
    console.log('setupSocket');
    socket = io.connect(params.origin + ':3002');
    socket.on('connect', _ => {
        console.log('socket connect');
        socket.emit('init_app', params.pid, params.cid);
        socket.on('screenShare_app', data => {
            if(data === 'imageNextReady') {
                let intervalTime = (params.screenshare_interval || 1) * 1000;
                let now = Date.now();
                let nextTime = Math.max(0, intervalTime - (now - ssCapTime));
                ssTimeoutId = setTimeout(nextFunc, nextTime);
            } else if (data.desc) { // answer
                //if(data.type === 'staff') getStream();
                pcs[data.type].setRemoteDescription(data.desc).catch(logError);
            } else if(data.candidate) {
                pcs[data.type].addIceCandidate(data.candidate).catch(logError);
            }
        });
        initStaffPC();
    });
    socket.on('disconnect', _ => {
        console.log('socket disconnect');
        //socket = null;
        //closeApp();
    });
}

function getStream(sourceId) {
    console.log('getStream', sourceId);
    navigator.mediaDevices.getUserMedia({ 
        audio: false, 
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                maxWidth: 1280,
                maxHeight: 720,
                //maxFrameRate: params.lowBandwidth ? 7 : 15
            }
        }
    })
    .then(function (stream){
        console.log('stream', stream);
        if(!observeTargetResizeId) {
            observeTargetResize();
        }
        if(staffDC) {
            console.log('send screenSharing');
            staffDC.send('screenSharing');
        }
        if(localStream) {
            if(connectionType === 'WebRTC') {
                localStream.getVideoTracks()[0].onended = null;
                if(ssPC) ssPC.removeStream(localStream);
                if(ssPC) ssPC.addStream(stream);
                localStream.getVideoTracks()[0].stop();
            } else if(connectionType === 'SkyWay') {
                if(ssPeer) {
                    if(ssCall) ssCall.close();
                    ssCall = ssPeer.call(remotePeerId, stream); 
                }
            }
            localStream = null;
        }
        localStream = stream;
        ssVideo.oncanplay = evt => {
            cnv.width = ssVideo.videoWidth;
            cnv.height = ssVideo.videoHeight;
            if(params.isWebRTC && !(+params.forceImageMode)) {
                if(connectionType === 'WebRTC') {
                    console.log('Streaming Type = "WebRTC"');
                    shareType.textContent = 'WebRTC';
                    if(!ssPC) initScreenSharePC();
                } else if(connectionType === 'SkyWay') {
                    console.log('Streaming Type = "SkyWay"');
                    shareType.textContent = 'SkyWay';
                    staffPC.addStream(localStream);
                }
            } else {
                setTimeout(_ => {
                    if(params.clientIsLegacyIE) {
                        console.log('Streaming Type = "Image (Legacy IE)"');
                        shareType.textContent = 'Image (Legacy IE)';
                        nextFunc = ssCaptureImageLegacyIE;
                        ssCaptureImageLegacyIE();
                    } else {
                        console.log('Streaming Type = "Image (Blob)"');
                        shareType.textContent = 'Image (Blob)';
                        nextFunc = ssCaptureImage;
                        ssCaptureImage();
                    } 
                }, 500);
            }
        };
        ssVideo.srcObject = localStream;

    })
    .catch(logError);
}

function ssCaptureImageLegacyIE(){
    let randSrc = params.staff_id.split('').map(val => val.charCodeAt(0)).join('');
    randSrc += params.sid.split('').map(val => val.charCodeAt(0)).join('');
    randSrc += params.cid.split('').map(val => val.charCodeAt(0)).join('');
    randSrc += '' + Date.now();
    let randSrcArr = new Uint8Array(randSrc.split('').map(val => +val));
    let hashSrc = window.crypto.getRandomValues(randSrcArr);
    window.crypto.subtle.digest({ name: 'SHA-512' }, hashSrc)
        .then(hash => {
            let arr = new Uint8Array(hash);
            fileName = ('0000' + (+params.staff_id)).slice(-5) + Array.from(arr).map(val => val.toString(16)).join('') + 'ss.jpg';
            //socket.emit('screenShare_app', { msg: { fileName: fileName }, sendTo: 'Staff' });
            ssCaptureImage();
        })
        .catch(logError);
}

function ssCaptureImage() {
    ssCapTime = Date.now();
    cnv.width = ssVideo.videoWidth;
    cnv.height = ssVideo.videoHeight;
    ctx.drawImage(ssVideo, 0, 0, cnv.width, cnv.height);
    if(params.clientBinarySupport || params.clientIsLegacyIE) {
        cnv.toBlob(blob => {
            if(params.clientIsLegacyIE) {
                sendByAjax(blob, params.origin, fileName);
            } else {
                socket.emit('screenShare_app', blob);
            }
        }, 'image/jpeg', 0.6);
    } else {
        let dataURL = cnv.toDataURL();
        socket.emit('screenShare_app', dataURL);
    }
}

function initPC(configuration, remoteType) {
    console.log('initPC', configuration, remoteType);
    let pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = evt => {
        if(evt.candidate) {
            socket.emit('screenShare_app', { 
                msg: { 
                    isSignaling: true, 
                    candidate: evt.candidate, 
                    pid: params.pid, 
                    cid: params.cid 
                }, 
                sendTo: remoteType 
            });
        }
    };
    pc.onnegotiationneeded = _ => {
        console.log('onnegotiationneeded');
        pc.createOffer().then(offer => {
            console.log('created offer', offer);
            return pc.setLocalDescription(offer);
        })
        .then(_ => {
            console.log('send offer');
            socket.emit('screenShare_app', { 
                msg: { 
                    isSignaling: true, 
                    desc: pc.localDescription, 
                    pid: params.pid, 
                    cid: params.cid 
                }, 
                sendTo: remoteType 
            });
        })
        .catch(logError);
    };
    return pc;
}

function initPCforWowza() {
    console.log('initPCforWowza');
    let pc = new RTCPeerConnection(null);
    pc.onnegotiationneeded = _ => {
        console.log('onnegotiationneeded');
        pc.createOffer().then(offer => {
            console.log('created offer', offer);
            return pc.setLocalDescription(offer);
        })
        .then(_ => {
            console.log('send offer');
            var xhr = new XMLHttpRequest();
            xhr.open("POST", 'https://578e0183ae4f4.streamlock.net/webrtc-session.json');
            xhr.responseType = 'json';
            xhr.onload = _ => {
                console.log('xhr onload', xhr.response);
                let res = xhr.response;
                if(res.sdp) {
                    ssPC.setRemoteDescription(res.sdp).catch(logError);
                    socket.emit('screenShare_app', { msg: 'startHTTPSStreaming', sendTo: 'Client' });
                }
                if(res.iceCandidates) {
                    res.iceCandidates.forEach(candidate => ssPC.addIceCandidate(candidate).catch(logError));
                }
            };
            xhr.onerror = evt => {
                console.log('xhr error', xhr, evt);
            };
            var streamInfo = {
                applicationName: 'live', 
                streamName: 'myStream', 
                sessionId: '[empty]'
            };
            xhr.send(JSON.stringify({
                direction: 'publish', 
                command: 'sendOffer', 
                streamInfo: streamInfo, 
                sdp: pc.localDescription
            }));
            //xhr.send('{"direction":"publish", "command":"sendOffer", "streamInfo":' + JSON.stringify(streamInfo) + ', "sdp":' + JSON.stringify(pc.localDescription) + '}');
        })
        .catch(logError);
    };
    return pc;
}

function initScreenSharePC() {
    console.log('initScreenSharePC');
    ssPC = initPC(ssRTCconfiguration, 'client');
    //ssPC = initPCforWowza();
    ssPC.oniceconnectionstatechange = evt => {
        console.log('ssfPC oniceconnectionstatechange', ssPC.iceConnectionState);
        if(['failed', 'disconnected', 'closed'].indexOf(ssPC.iceConnectionState) !== -1) {
            ssPC = null;
            //closeApp();
        }
    };
    console.log('ssPC addStream', localStream);
    ssPC.addStream(localStream);
    pcs.ss = ssPC;
}

function initStaffPC() {
    console.log('initStaffDC');
    // スタッフページとの通信にDataChannelを使用
    staffPC = initPC(null, 'staff');
    staffPC.oniceconnectionstatechange = evt => {
        if(!staffPC) return;
        console.log('staffPC oniceconnectionstatechange', staffPC.iceConnectionState);
        if(['failed', /*'disconnected',*/ 'closed'].indexOf(staffPC.iceConnectionState) !== -1) {
            staffPC = null;
            staffDC = null;
            //closeApp();
        }
    };
    staffDC = staffPC.createDataChannel('app_to_staff');
    staffDC.onopen = _ => {
        console.log('staffDC open');
    };
    staffDC.onmessage = evt => {
        console.log('staffDC onmessage', evt.data);
        let msg = evt.data;
        if(msg === 'selectWindow') {
            ipcRenderer.send('open-selectWindowDialog', true);
        } else if(msg.includes('forceImageMode')) {
            if(msg === 'forceImageModeON') {
                params.forceImageMode = 1;
            } else if(msg === 'forceImageModeOFF') {
                params.forceImageMode = 0;
            }
        } else if(msg.includes('skyWay')) {
            if(msg === 'SkyWayON') {
                connectionType = 'SkyWay';
            } else if(msg === 'skyWayOFF') {
                connectionType = 'WebRTC';
            }
        } else if(msg === 'stopStream') {
            if(localStream) {
                if(!params.forceImageMode) {
                    if(connectionType === 'WebRTC') {
                        ssPC.removeStream(localStream);
                        localStream.getVideoTracks()[0].stop();
                        localStream = null;
                        ssPC.close();
                    } else if(connectionType === 'SkyWay') {
                        staffPC.removeStream(localStream);
                        localStream.getVideoTracks()[0].stop();
                        localStream = null;
                        // staffPC.close(); // データチャンネルもあるため閉じない
                    }
                }
            }
            nextFunc = _ => {};
            win.hide();
            ipcRenderer.send('hide-window');
        } else if(msg === 'closeApp') {
            // staffDC.send('closeAppAck');
            // closeApp();
            var xhr = new XMLHttpRequest();
            xhr.open('GET', params.origin + '/client/screenShareDelete/' + fileName);
            xhr.onloadend = function () {
                console.log('send close-app');
                ipcRenderer.send('close-app');
            }
            xhr.send();
        }
    }
    pcs.staff = staffPC;
}

// function initSSPeer() {
//     ssPeer = new Peer({key: '5c234cf5-14dc-495a-b592-a09da85a3f40', origin: 'enkarz.me'});
//     ssCall = ssPeer.call(remotePeerId, localStream);
// }

// function closeApp() {
//     console.log('closeApp');
//     if(ssPC) {
//         ssPC.close();
//     } else if(staffPC) {
//         staffPC.close();
//     } else if(socket) {
//         socket.close();
//     } else {
//         console.log('send close-app');
//         ipcRenderer.send('close-app');
//     }
// }

function logError(error) {
    console.log('error', error);
}

ssChangeTarget.addEventListener('click', evt => {
    console.log('send open-selectWindowDialog');
    setTimeout(_ => ipcRenderer.send('open-selectWindowDialog', null), 100);
});

function observeTargetResize() {
    observeTargetResizeId = requestAnimationFrame(observeTargetResize);
    let bounds = win.getContentBounds();
    let vBounds = ssVideo.getBoundingClientRect();
    if(bounds.width !== prevW || bounds.height !== prevH || prevVW !== vBounds.width || prevVH !== vBounds.height) {
        let minSize = win.getMinimumSize();
        let x = bounds.x;
        let y = bounds.y;
        let w = vBounds.width + 8;
        let h = bounds.height;
        let h2 = vBounds.height + 76 | 0;
        y -= h2 - h;  
        h = h2;
        if(minSize[1] > h) win.setMinimumSize(MIN_WIDTH, h);
        x = Math.min(screen.availWidth - 1 - w, x);
        y = Math.min(screen.availHeight - 1 - h, y);
        win.setContentBounds({x: x, y: y, width: w, height: h});
        prevW = bounds.width;
        prevH = bounds.height;
        prevVW = vBounds.width;
        prevVH = vBounds.height;

        if(saveBoundsThrottleId) clearTimeout(saveBoundsThrottleId);
        saveBoundsThrottleId = setTimeout(_ => {
            localStorage.bounds = JSON.stringify(win.getContentBounds());
        }, 100);
    }
}