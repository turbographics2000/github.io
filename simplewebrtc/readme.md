# WebRTC Stats
WebRTCの統計情報を取得するライブラリです。

## 使用方法
```js
var webrtcStats = new WebRTCStats(RTCPeerConnections, options);
```
### RTCPeerConnections引数
必須の引数です。  
1:1接続の場合は、単一のRTCPeerConnectionオブジェクトを渡します。
３人以上のメッシュ接続の場合、複数のRTCPeerConnectionが使用されていますので、
オブジェクトにまとめて渡します。
ライブラリでは渡されたオブジェクトのキーをRTCPeerConnectionの識別名として使用します。
```js
var webrtcStats = new WebRTCStats({
    alice: alicePC,
    bob: bobPC,
    charlie: charliePC
});
```

### opsions引数
|オプション名|説明|
|:--|:--|
|selfVideo|自分のストリームの統計情報を表示したい場合にこのオプションを渡します。<br>渡す値は、自分のストリームを表示しているVideoエレメント(HTMLVideoElement型)、または、Videoエレメントのセレクタ(string型)になります。詳しくはストリームの統計情報を見てください。|
|remoteVideos|相手のストリームの統計情報を表示したい場合にこのオプションを渡します。<br>渡す値は、第一引数のRTCPeerConnections引数のように、1:1接続の場合は単一の相手のストリームを表示しているVideoエレメントまたはセレクタ、３人以上のまたは複数のVideoエレメントまたはセレクタをまとめたオブジェクトになります。<br>詳しくはストリームの統計情報を見てください。|
|interval|統計情報を取得する間隔(単位:ms)を設定します。デフォルト値は1000(ms)です。<br>Number型もしくは数字のstring型以外の値が渡された場合は無視されます。|


## ストリームの統計情報
optionsにVideoElementが

## イベント
|イベント名|説明|
|:--|:--|
|changeStatsCntOfSameType|同じタイプのStatsオブジェクト数が変わった時に発生|
|newType|新しいタイプが取得された時に発生|
|newStats|新しいStatsが取得された時に発生|
|newStat|新しいStatが取得された時に発生|
|removeType|前回取得されたタイプのStatsが、今回一つも取得されなかった時に発生|
|removeStats|前回取得されたStatsが、今回取得されなかった時に発生|
|removeStat|前回取得されたStatが、今回取得されなかった時に発生|
|statValueChanged|Statの値が変わったときに発生|


### changeStatsCntOfSameType
イベント引数  
function(statsType, cnt) { }

### newType
newTypeイベントはnewStatsイベントやnewStatイベントより後に発生します。  
新しく取得されたStatsは、イベント引数statsOfSameTypeにまとめて渡されますので、
まとめて処理したいときに使用します。  
イベント引数  
function(statsType, statsOfSameType) { }

### newStats
newStatsイベントは、newStatより後に発生します。
イベント引数  
function(statsType, statsId, stats) { }

### newStat
イベント引数  
function(statsType, statsId, statName, value) { }

### removeType
removeTypeイベントはremoveStatsイベントやremoveStatイベントより後に発生します。  
removeされたStatsは、イベント引数statsOfSameTypeにまとめて渡されます。
statsOfSameTypeに渡されるデータは前回取得時のデータとなりますので注意してください。
イベント引数  
function(statsType, statsOfSameType) { }

### removeStats
removeStatsイベントは、removeStatより後に発生します。
イベント引数  
function(statsType, statsId, stats) { }

### removeStat
イベント引数  
function(statsType, statsId, statName, value) { }

### statValueChanged
イベント引数  
function(statsType, statsId, statName, value, oldValue) { }




