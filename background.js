var TBNotify = {};

TBNotify.lastSeenObjectId = localStorage['lastSeenObjectId'];

/**
 * Request the activity stream.
 * Relies on the user being authenticated on teambox.com already.
 */
TBNotify.fetchActivity = function() {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", "https://teambox.com/api/1/activities");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            // TODO: Handle not being logged in.
            var response = JSON.parse(xhr.responseText);

            TBNotify.processActivityResponse(response);
        }
    };

    xhr.send();
};

TBNotify.fetchCallback = function() {

};

/**
 * Process the activity stream data.
 * Update / notify with result.
 */
TBNotify.processActivityResponse = function(data) {
    if (data.objects[0] && data.objects[0].id != TBNotify.lastEncounteredObjectId) {
        var itemsBeforeLast = 0;
        var objects = data.objects;

        for (var iter = 0, item; item = objects[iter]; iter++) {
            if (item.id == TBNotify.lastSeenObjectId) {
                break;
            }

            itemsBeforeLast++;
        }

        if (itemsBeforeLast) {
            chrome.browserAction.setBadgeText({text: "" + itemsBeforeLast});
        } else {
            chrome.browserAction.setBadgeText({text: ""});
        }

        // We don't want to re-notify for the same update.
        TBNotify.lastEncounteredObjectId = data.objects[0].id;
    }
};

/**
 * Handler for when the user clicks on the icon in the bar.
 */
TBNotify.handleButtonClicked = function() {
    chrome.browserAction.setBadgeText({"text": ""});
    localStorage['lastSeenObjectId'] = TBNotify.lastSeenObjectId = TBNotify.lastEncounteredObjectId;
};

chrome.browserAction.onClicked.addListener(TBNotify.handleButtonClicked);

// Initial load fetch.
TBNotify.fetchActivity();
// Update every 30 seconds.
window.setInterval(TBNotify.fetchActivity, 30000);
