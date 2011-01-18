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
    if (data.objects[0] && data.objects[0].id != TBNotify.lastSeenObjectId) {
        chrome.browserAction.setBadgeText({text: "1"});

        // We don't want to re-notify for the same update.
        TBNotify.lastSeenObjectId = data.objects[0].id;
    }
};

/**
 * Handler for when the user clicks on the icon in the bar.
 */
TBNotify.handleButtonClicked = function() {
    chrome.browserAction.setBadgeText({"text": ""});
    localStorage['lastSeenObjectId'] = TBNotify.lastSeenObjectId;
};

chrome.browserAction.onClicked.addListener(TBNotify.handleButtonClicked);

// Initial load fetch.
TBNotify.fetchActivity();
// Update every 30 seconds.
window.setInterval(TBNotify.fetchActivity, 30000);
