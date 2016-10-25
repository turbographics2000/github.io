const {ipcRenderer, desktopCapturer, remote} = require('electron');

let sourceId = null;
let params = null;
let selectWindowRefreshId = null;

let url = new URL(location.href);
params = {};
for(var p of url.searchParams) {
    params[p[0]] = p[1];
}

ipcRenderer.on('show', (evt, msg) => {
    setSourceList();
    btnOK.disabled = true;
    sourceList.scrollTop = 0;
});

ipcRenderer.on('hide', (evt, msg) => {
    if(selectWindowRefreshId) clearInterval(selectWindowRefreshId);
});

function setSourceList() {
    if(selectWindowRefreshId) {
        clearInterval(selectWindowRefreshId);
        selectWindowRefreshId = null;
    }
    sourceId = null;
    selectWindowRefreshId = setInterval(refresh, 3000);
    refresh();
}
setSourceList();

function refresh() {
    desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
        console.log(sources);
        if (error) throw error;
        sourceList.innerHTML = '';
        sources.forEach(source => {
            let name = source.name;
            if(source.id.indexOf('screen') === 0) {
                if(!+(params.fullScreen || '0')) return;
                var screenNo = +source.id.replace('screen', '').trim().replace(/:/g, '') + 1;
                name = '画面' + screenNo;
            }
            let thumb = source.thumbnail.toDataURL();
            if (!thumb) return;
            let item = document.createElement('li');
            item.dataset.id = source.id;
            if(sourceId === source.id) {
                item.classList.add('select');
            }
            item.classList.add('sourceItem');
            let img = new Image();
            img.src = thumb;
            let itemName = document.createElement('div');
            itemName.textContent = name.slice(0, 20);
            item.appendChild(img);
            item.appendChild(itemName);
            sourceList.appendChild(item);
            item.addEventListener('click', itemClick, false);
        });
    });
}

function itemClick(evt) {
    document.querySelectorAll('.sourceItem.select').forEach(item => {
        item.classList.remove('select');
    });
    this.classList.add('select');
    sourceId = this.dataset.id;
    btnOK.disabled = false;
}

function hideWindow(srcId) {
    document.querySelectorAll('.select').forEach(elm => {
        elm.classList.remove('select');
    });
    if(selectWindowRefreshId) clearInterval(selectWindowRefreshId);
    ipcRenderer.send('source-selected', srcId);
    sourceId = null;
}

btnOK.addEventListener('click', _ => hideWindow(sourceId));
btnCancel.addEventListener('click', _ => hideWindow(null));
