chrome.runtime.onMessageExternal.addListener((message, sender, response) => {
    chrome.desktopCapture.chooseDesktopMedia(["window", "screen"], sender.tab, (streamId) => {
        response(streamId);
    });
    return true;
});
