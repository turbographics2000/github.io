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
const eventHandlers = {}
function on(eventName, func) {
    if(typeof eventName !== 'string') throw 'argument 1 expect string'
    if(typeof func !== 'function') throw 'not function';
    eventHandlers[eventName] = eventHandlers[eventName] || [];
}
function off(eventName, func) {
    if(!func) throw 'require argument 2 function type';
    if(func) throw 'argument 2 not function';
    eventHandlers.splice(eventHandlers.indexOf(func), 1);
}
function offAll(eventName) {
    delete eventHandlers[eventName];
}
function eventEmmit(eventName) {
    let handlers = eventHandlers[eventName];
    for(let i = 0, l = handlers.length; i < l; i++) {
        handlers[i]();
    }
}
function chromeGetStats() {
    const container = document.createDocumentFragment();
    pc.getStats(response => {
        response.result().forEach(stats => {
            const typeId = `webrtcstats_${stats.type}`;
            let statsTypeContainer = window[typeId];
            if(!statsTypeContainer) {
                const statsTypeContainer = document.createElement('div');
                statsTypeContainer.id = typeId;
                container.appendChild(statsTypeContainer);
            }

            let reportStatsType = standardReport[typeId];
            let sameTypeStatsCntId = `webrtcstats_${stats.type}_count`;
            let newStatsType;
            if(!reportStatsType) {
                const h2 = document.createElement('h2');
                h2.id = sameTypeStatsCntId;
                statsTypeContainer.appendChild(h2);
                reportStatsType = {};
                standardReport[statsTypeId] = reportStatsType;
                h2.textContent = `${stats.type}タイプ (cnt: ${Object.keys(standardReport[stats.type]).length})`;
                newStatsType = newStatsType || {};
                newStatsType[stats] = reportStatsType;
            }

            const statsId = `webrtcstats_${stats.type}_${sstats.Id}`;
            let statsTbody = window[statsId];
            let reportStats = reportStatsType[statsId];
            let newStats = null;
            const statsTableId = 'stats' + stats.id;
            if(!reportStats) {
                const table = document.createElement('table');
                const tHead = document.createElement('thead');
                const thtr = document.createElement('tr');
                const th = document.createElement('th');
                const tBody = document.createElement('tbody');
                th.colSpan = 2;
                th.textContent = stats.id;
                th.id = statsId;
                thtr.appendChild(th);
                thead.appendChild(thtr);
                table.appendChild(thead);
                tBody.id = `${statsId}_table`;
                table.appendChild(tbody);
                statsTbody = tBody;
                statsTypeContainer.appendChild(table);
                reportStats = {
                    id: stats.id,
                    timestamp: stats.timestamp,
                    type: stats.type
                };
                reportStatsType[stats.id] = reportStats;
                newStats = reportStats;
            }

            stats.names().forEach(name => {
                const statId = `webrtcstats_${stats.type}_${stats.Id}_${name}`;
                const value = stats.stat(name);
                const oldValue = reportStats[name];
                if(!oldValue) {
                    const tr = document.createElement('tr');
                    const tdName = document.createElement('td');
                    const tdValue = document.createElement('td');
                    tdName.textContent = name;
                    tdValue.id = statId;
                    tdValue.textContent = stats.stat(name);
                    tr.appendChild(tdName);
                    tr.appendChild(tdValue);
                    statsTbody.appendChild(tr);
                    eventEmmit('newStat', stats.type, stats.id, name, value);
                } else if(oldValue !== value) {
                    window[statId].textContent = value;
                    eventEmmit('statsValueChanged', stats.type, stats.id, name, value);
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
