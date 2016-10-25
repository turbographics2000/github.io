const {ipcRenderer} = require('electron');

let plots = {};
let dataSet = {};
let prevValues = {};
ipcRenderer.on('data', (evt, msg) => {
    for(let i in msg) {
        if(i === 'ssrc') continue;
        if(!isNaN(msg[i])) {
            dataSet[i] = dataSet[i] || Array(100).fill(+msg[i]);
            if(i === 'bytesSent') {
                prevValues[i] = prevValues[i] || +msg[i];
                dataSet[i].push(+msg[i] - prevValues[i]);
                prevValues[i] = +msg[i];
            } else {
                dataSet[i].push(+msg[i]);
            }
            if(dataSet[i].length > 100) {
                dataSet[i].shift();
            }
            if(dataSet[i].length > 100) dataSet[i].shift();
            let res = dataSet[i].map((val, i) => [i, val]);
            plots[i] = plots[i] ? plots[i] : createPlot(i, res);
            let yaxisOptions = plots[i].getAxes().yaxis.options;
            yaxisOptions.max = Math.max.apply(null, dataSet[i]) * 1.1 | 0;
            if(i === 'bytesSent') {
                yaxisOptions.tickSize = ((yaxisOptions.max / 5) / 1024 | 0) * 1024;
            }
            plots[i].setupGrid();
            plots[i].getOptions();
            plots[i].setData([res]);
            plots[i].draw();   
        }
    }
});

function createPlot(graphId, data) {
    $('body').append(
        $('<div>').addClass('graph').css('float', 'left').append(
            $('<div>').text(graphId)
        ).append(
            $('<div>').attr('id', graphId).width(300).height(150).css('float', 'left')
        ).append(
            $('<div>').addClass('graph-tooltip').attr('id', `${graphId}_toolTip`).width(100).height(20)
        )
    );
    let options = {
        xaxis: {
            show: false
        },
        crosshair: {
            mode: "x"
        },
        grid: {
            hoverable: true,
            autoHighlight: false
        }
    };
    if(graphId === 'bytesSent') {
        options.yaxis = {
            tickSize: 1024 * 20,
            tickFormatter: function (val, axis) {
                return (val / 1024 | 0 ) + 'K';
            }
        };
    }
    var plot = $.plot(`#${graphId}`, [ data ], options);
    $(`#${graphId}`).bind('plothover',  (evt, pos, item) => {
        if(item && item.datapoint) {
            if(graphId === 'bytesSent') {
                $(`#${graphId}_toolTip`).text(`${(item.datapoint[1] / 1024).toFixed(2)}KBytes/s`).show();
            } else {
                $(`#${graphId}_toolTip`).text(`${item.datapoint[1]}`).show();
            }
        } else {
            $(`${graphId}_toolTip`).hide();
        }
    }).on('mouseout', (evt) => {
        $(`#${graphId}_toolTip`).hide();
    });

    return plot;
}

function updateLegend(pos) {

    updateLegendTimeout = null;


    var axes = plot.getAxes();
    if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
        pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
        return;
    }

    var i, j, dataset = plot.getData();
    for (i = 0; i < dataset.length; ++i) {

        var series = dataset[i];

        // Find the nearest points, x-wise

        for (j = 0; j < series.data.length; ++j) {
            if (series.data[j][0] > pos.x) {
                break;
            }
        }

        // Now Interpolate

        var y,
            p1 = series.data[j - 1],
            p2 = series.data[j];

        if (p1 == null) {
            y = p2[1];
        } else if (p2 == null) {
            y = p1[1];
        } else {
            y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
        }

        legends.eq(i).text(series.label.replace(/=.*/, "= " + y.toFixed(2)));
    }
}
