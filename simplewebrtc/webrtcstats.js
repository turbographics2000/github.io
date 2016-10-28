function WebRTCStats(peerConnections, options) {
    if(!peerConnectoins) {
        throw 'WebRTCStats: 第一引数は必須です。';
    }
    if(typeof peerConnections !== 'object') {
        if(!peerConnections.constructor.name === 'RTCPeerConnection') {
            for(var i in peerConnections) {
                if(typeof peerConnections[i].constructor.name !== 'RTCPeerConnection'){
                    throw '第一引数にRTCPeerConnection型以外の値を渡したか、RTCPeerConnection型以外の値が含まれるオブジェクトが渡されました。';
                }
            }
        }
    } else {
        throw '第一引数にRTCPeerConnection型以外の値を渡したか、RTCPeerConnection型以外の値が含まれるオブジェクトが渡されました。';
    }

    this.options = options || {};
    if(isNan(this.options.interval)){
        options.interval = 1000;
    }

    displayReport(chromeGetStats());
}

function chromeGetStats() {
    return new Promise(function(resolve, reject) {
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
                report[stats.type] = report[stats.type] || {};
                report[stats.type][reportStats.id] = reportStats;
            });
            resolve(report);
        });
    });
}

function firefoxGetStats() {
    return pc.getStats().then(response => {
        const report = {};
        for(stats of response) {
            report[stats.type] = stats;
        }
        return report;
    })
}

function displayReport(report) {
    const container = document.body;
    const h1 = document.createElement('h1');
    h1.textContent = '統計情報';
    container.appendChild(h1);
    const tableRow = (tbody, cellType, id, cols) => {
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
            let tBody = window[tableId];
            if(!tBody) {
                table = document.createElement('table');
                table.id = tableId;
                const tHead = document.createElement('thead');
                tBody = document.createElement('tbody');
                tBody.id = tableId;
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
