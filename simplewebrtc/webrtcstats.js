/**
 * WebRTCStatsコンストラクタ
 *
 * @class
 * @classdesc WebRTCStatsクラス
 * @param {object} peerConnections RTCPeerConnection、または、RTCPeerConnectionを含むオブジェクト
 * @param {object} options オプション
 */
function WebRTCStats(peerConnections, options) {
    if(!peerConnectoins) {
        throw 'WebRTCStats: 第一引数は必須です。';
    }
    if(!this.addPeerConnections(peerConnections)) return;

    this.options = options || {};
    if(isNaN(this.options.interval)){
        this.options.interval = 1000;
    }
    this.options.startImmediately = true;

    this.state = 'stoped';
    if('startImmediately' in options) {
        if(!!this.options.startImmediately) {
            this.start();
        }
    }

    if(['webrtc', 'canvas'].includes(this.options.streamPreviewType)) {
        if(this.options.streamPreviewType === 'webrtc') {
            this.relayPC = new RTCPeerConnection(null);
        } else {
            this.relayCnv = document.createElement('canvas');
            this.relayCtx = this.relayCnv.getContext('2d');
        }
        this.options.streamPreviewType = null;
    }

    this.relayPC

    this.eventHandlers = {};
    this.log = [];
}

/**
 * イベントにイベントハンドラー関数を割り当てる関数.
 *
 * @param {string} eventName イベント名
 * @param {function} func イベントハンドラー関数
 */
WebRTCStats.prototype.on = function(eventName, func) {
    this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
    this.eventHandlers[eventName].push(func);
}

/**
 * イベントハンドラーの割り当てを解除する関数
 *
 * @param {string} eventName
 * @param {any} func
 */
WebRTCStats.prototype.off = function(eventName, func) {
    if(typeof func === 'function' && this.eventHandlers[eventName].includes(func)){
        this.eventHandlers[eventName].splice(this.eventHandlers[eventName].indexOf(func), 1);
    } else {
        if(this.eventHandlers[eventName]) {
            delete this.eventHandlers[eventName];
        }
    }
}

/**
 * event emit.
 *
 * @param {any} eventName
 * @param {any} event args
 */
WebRTCStats.prototype.emit = function(eventName, ...args) {
    if(this.eventHandlers[eventName]) {
        this.eventHandlers[eventName].forEach(func => {
            func.apply(this, args);
        });
    }
};

/**
 * check peerConnections argument.
 *
 * @param {any} peerConnections
 * @returns {peerConnections} peerConnections引数がRTCPeerConnection型の場合は、その値を含む
 *     オブジェクトに変換して返します。peerConnections引数がRTCPeerConnection型を含むオブジェクトの場合はそのまま返します。
 *     それ以外の場合はnullを返します。
 */
WebRTCStats.prototype.checkPeerConnections = function(peerConnections) {
    if(typeof peerConnections === 'object') {
        if(peerConnections.constructor.name !== 'RTCPeerConnection') {
            for(var i in peerConnections) {
                if(typeof peerConnections[i].constructor.name !== 'RTCPeerConnection'){
                    console.error('RTCPeerConnection型以外の値を渡したか、RTCPeerConnection型以外の値が含まれるオブジェクトが渡されました。');
                    return null;
                }
            }
        } else {
            peerConnections = { pc: peerConnections };
        }
    } else {
        console.error('RTCPeerConnection型以外の値を渡したか、RTCPeerConnection型以外の値が含まれるオブジェクトが渡されました。');
        return null;
    }
    return peerConnections;
}

/**
 * add peerConnections
 *
 * @param {any} peerConnections
 * @returns {true|false} peerConnections引数が、期待するものであればtrue, そうでない場合はfalse
 */
WebRTCStats.prototype.addPeerConnections = function(peerConnections) {
    peerConnections = this.checkPeerConnections(peerConnections);
    if(!peerConnections) return false;
    this.peerConnections = this.peerConnections || {};
    for(var pcName in peerConnections) {
        var pc = peerConnections[pcName];
        pc.pcName = pcName;
        pc.webrtcStats = this;
        pc.addEventListener('icecandidate', this.onicecandidate);
        pc.addEventListener('iceconnectionstatechange', this.oniceconnectionstatechange);
        if('ontrack' in pc) {
            // TODO: リレー前にストリームにトラックが追加されるとリレー先もトラックが追加される状態となるか？
            // pc.addEventListener('track', this.ontrack)
        } else {
            pc.addEventListener('addstream', this.onaddstream);
        }
        pc.orgAddIceCandidate = pc.addIceCandidate;
        pc.addIceCandidate = function(candidate) {
            this.webrtcStats.candidates = this.webrtcStats.objectInit(this.candidates, 'array', candidate, [pcName, 'remoteCandidates']);
            return this.orgAddIceCandidate(candidate);
        };
        if(pc.addTrack) {
            pc.orgAddTrack = pc.addTrack;
            pc.addTrack = function(track, ...streams) {
                for(var stream of streams) {
                    var streamTracks = stream.getTracks();
                    var ret = streamTracks.filter(streamTrack => streamTrack.id === track.id);
                    if(!ret.length) {
                        // TODO new track
                        // this.wertcStats.newTrack(pc, 'local', track, stream);
                    }
                }
                return pc.orgAddTrack(track, streams);
            };
        } else {
            pc.orgAddStream = pc.addStream;
            pc.addStream = (stream) => {
                // this.webrtcStats.newStream(pc, 'local', stream);
                return this.addStream(stream);
            }
        }
        this.peerConnections[pcName] = pc;
    }
    return true;
};


/**
 * removePeerConnections
 *
 * @param {Array.<string>} peerConnectionNames
 */
WebRTCStats.prototype.removePeerConnections = function(peerConnectionNames) {
    if(!peerConnectionNames) return;
    if(typeof peerConnectionNames === 'string') {
        peerConnectionNames = [peerConnectionNames];
    }
    peerConnectionNames.forEach(pcName => {
        var pc = this.peerConnections[pcName];
        delete pc.pcName;
        delete pc.WebRTCStats;
        pc.removeListener('icecandidate', this.onicecandidate);
        pc.removeEventListener('iceconnectionstatechange', this.oniceconnectionstatechange);
        if('ontrack' in pc) {
            pc.removeEventListener('track', this.ontrack);
        } else {
            pc.removeEventListener('addstream', this.onaddstream);
        }
        pc.addIceCandidate = pc.orgAddIceCandidate;
        delete pc.orgAddIceCandidate;
        if(pc.addTrack) {
            pc.addTrack = pc.orgAddTrack;
            delete pc.orgAddTrack;
        } else {
            pc.addStream = pc.orgAddStream;
            delete pc.orgAddStream;
        }
    });
};


/**
 * icecandidateイベントハンドラー
 *
 * @param {any} evt
 */
WebRTCStats.prototype.onicecandidate = function(evt) {
    this.candidates = this.objectInit(this.candidates, 'array', evt.candidate, [this.pcName, 'localCandidates']);
}

/**
 * iceconnectionstatechangeイベントハンドラー
 *
 * @param {any} evt
 */
WebRTCStats.prototype.oniceconnectionstatechange = function(evt) {
    this.log.push({
        logType: 'iceconnectionState',
        timestamp: new Date(),
        connectionState: pc.iceConnectionState
    });
}

/**
 * ontrackイベントハンドラー
 *
 * @param {any} evt
 */
WebRTCStats.prototype.ontrack = function(evt) {

}

/**
 * onaddstreamイベントハンドラー
 *
 * @param {any} evt
 */
WebRTCStats.prototype.onaddstream = function(evt) {

}


/**
 * 階層構造のオブジェクトを初期化する関数
 *
 * @param {object} obj
 * @param {string} lastType
 * @param {any} value
 * @param {string} keys
 * @returns {object} 初期化されたオブジェクト
 */
WebRTCStats.prototype.objectInit = function(obj, lastType, value, ...keys) {
    obj = obj || {};
    var child = obj;
    keys.forEach((key, i) => {
        if(i === keys.length - 1) {
            if(lastType === 'array') {
                child[key] = child[key] || [];
                child[key].push(value);
            } else {
                child[key] = value;
            }
        } else {
            child[key] = child[key] || {};
        }
        child = child[key];
    });
    return obj;
}

/**
 * 統計情報取得開始
 */
WebRTCStats.prototype.start = function() {
    this.state = 'runnning';
    this.intervalId = setInterval(_ => {
        this.getStats().then(reports => {
            for(var pcName in reports) {
                this.log[pcName] = this.log[pcName] || [];
                this.log[pcName].push({
                    logType: 'report',
                    timeStamp: new Date(),
                    report: reports[pcName]
                });
                if(this.options.displayContainer) {
                    this.displayReport(pcName, reports[pcName], this.displayContainer);
                }
            }
            // if(this.options.selfView && this.options.selfView.srcObject) {
            //     this.displayStreamStats(this.selfView);
            // }
            // if(this.options.remoteView && this.options.remoteView.srcObject) {
            //     this.displayStreamStats(this.remoteView);
            // }
            return reports;
        })
        .then(eventEmitter.bind(this))
        .then(reports => this.prevReports = reports)
        .catch((err) => {
            console.log(err);
        });
    }, this.options.interval);
}

/**
 * 統計情報取得
 *
 * @param {any} pc
 */
WebRTCStats.prototype.getStats = function (pc) {
    var promisies = [];
    for(var pc of this.peerConnections) {
        if(window.chrome && window.chrome.webstore) {
            promisies.push(this.chromeGetStats(pc));
        } else if(typeof InstallTrigger !== 'undefined') {
            promisies.push(this.firefoxGetStats(pc));
        } else if(!!window.globalLeft) {
            // Edge
        } else if(document.createElement('video').canPlayType('application/vnd.apple.mpegURL')) {
            // Safari
        }
        return Promise.all(promisies).then(response => {
            var reports = {};
            response.forEach(value => reports[value.pcName] = value.report);
            return reports;
        });
    }
};

/**
 * Chrome用統計情報取得関数
 *
 * @param {any} pc
 * @returns {Promise}
 */
WebRTCStats.prototype.chromeGetStats = function (pc) {
    return new Promise((resolve, reject)  => {
        pc.getStats(response => {
            var report = {};
            response.result().forEach(stats => {
                var reportStats = {
                    id: stats.id,
                    timestamp: stats.timestamp,
                    type: stats.type
                };
                stats.names().forEach(name => {
                    reportStats[name] = stats.stat(name);
                });
                report[reportStats.id] = reportStats;
            });
            resolve({pcName: pc.pcName, report: report});
        }, reject);
    });
}

/**
 * Firefox用統計情報取得関数
 *
 * @param {RTCPeerConnection} pc
 * @param {MediaStreamTrack?} [selector=null]
 * @returns {Promise}
 */
WebRTCStats.prototype.firefoxGetStats = function(pc, selector = null) {
    return pc.getStats(selector)
        .then(response => {
            const report = {};
            for(stats of response) {
                // statsオブジェクトは["statsのId(文字列)", statsオブジェクト]という配列になっている
                stats[1].timestamp = new Date(stats[1].timestamp);
                report[stats[0]] = stats[1];
            }
            return {pcName: pc.pcName, report: report};
        })
        .catch(err => {
            console.log(err);
        });
}

/**
 * イベント発行関数
 *
 * @param {any} reports
 * @returns {object} reports
 */
WebRTCStats.prototype.eventEmitter = function(reports) {
    for(var pcName in reports) {
        var [newStats, newStat, valueChanged] = reportDiff(reports[pcName], this.prevReports[pcName]);
        var [removeStats, removeStat] = reportDiff(this.prevReports[pcName], reports[pcName]);

        if(newStats) {
            this.emit('newStats', pcName, newStats);
            this.displayAnimate('newStats', pcName, newStats);
        }
        if(newStat)  {
            this.emit('newStat', pcName, newStat);
            this.displayAnimate('newStat', pcName, newStat);
        }
        if(removeType) {
            this.emit('removeType', pcName, removeType);
            this.displayAnimate('newStat', pcName, newStat);
        }
        if(removeStats) {
            this.emit('removeStats', pcName, removeStats);
            this.displayAnimate('removeStats', pcName, removeStat);
        }
        if(removeStat) {
            this.emit('removeStat', pcName, removeStat);
            this.displayAnimate('removeStat', pcName, removeStat);
        }
        if(valueChanged) {
            this.emit('valueChanged', pcName, valueChanged);
            this.displayAnimate('valueChanged', pcName, valueChanged);
        }
    }
    return reports;
};

/**
 * 前回のレポートと今回のレポートの差分を取得する関数
 *
 * @param {object} a 比較レポートA
 * @param {object} b 比較レポートB
 * @returns {Array.<object>} 比較結果
 */
WebRTCStats.prototype.reportDiff = function(a, b) {
    var diffStats = null;
    var diffStat = null;
    var valueChanged = null;
    for(var statsId in a) {
        if(b[statsId]) {
            for(var name in a[statsId]) {
                if(!b[statsId][name]) {
                    diffStat = this.objectInit(diffStat, 'object', a[statsId][name], statsId, name);
                } else {
                    if(+a[statsId].timestamp > +b[statsId].timestamp) {
                        valueChanged = this.objectInit(valueChanged, 'object', {newValue: a[statsId][name], prevValue: b[statsId][name]}, statsId, name);
                    }
                }
            }
        } else {
            diffStats = this.objectInit(diffStats, 'object', a[statsId], statsId);
        }
    }

    return [diffStats, diffStat, valueChanged];
};


/**
 * ログをオブジェクトの配列ではなくの各メンバー(stat)ごとに配列にしたものを取得する関数
 */
WebRTCStats.prototype.getArrayTypeOfValueStatsLog = function() {
    var length = this.statsLog.length;
    var arrayTypeOfValueLog = {};
    for(var i = 0; i < length; i ++) {
        var reportStats = this.statsLog[i];
        for(var statsId in reportStats){

        }
    }
}

/**
 * 統計情報を画面に表示する関数
 *
 * @param {any} pcName
 * @param {any} report
 * @param {any} container
 */
WebRTCStats.prototype.displayReport = function(pcName, report, container) {
    const prefix = ['webrtcstats', pcName].join('_');
    const tableRow = (tbody, cellType, id, cols) => {
        const tr = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement(cellType);
            td.classList.add([prefix, id].join('_'));
            td.textContent = col;
            if(cellType === 'th') td.colSpan = 2;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
        return tr;
    }
    for(let typ in report) {
        for(let statsId in report) {
            const tableId = [prefix, 'table', statsId].join('_');
            let tBody = document.getElementsByClassName(tableId);
            if(!tBody.length) {
                table = document.createElement('table');
                const tHead = document.createElement('thead');
                tBody = document.createElement('tbody');
                tBody.classList.add(tableId);
                table.appendChild(tHead);
                table.appendChild(tBody);
                tableRow(tHead, 'th', [prefix, statsId].join('_'), [statsId]);
            }
            for(let name in report[statsId]) {
                if(name !== 'id' && name !== 'type') {
                    const rowId = [prefix, 'row', statsId, name].join('_');
                    const value = report[statsId][name];
                    let row = document.getElementsByClassName(rowId);
                    if(row) {
                        row.textContent = value;
                    } else {
                        tableRow(tBody, 'td', rowId, [name, value]);
                    }
                }
            }
            container.appendChild(table);
        }
    }
};

/**
 * 画面にグラフを表示する関数
 */
WebRTCStats.prototype.displayGraph = function() {

};

WebRTCStats.prototype.newTrack = function(pc, side, track) {

};

WebRTCStats.prototype.newStream = function(pc, side, stream) {

};
