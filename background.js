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
        var encountered = false;

        // We get a big array of items for reference, index them on their IDs
        var referenceItems = {};
        for (var iter = 0, item; item = data.references[iter]; iter++) {
            referenceItems[item.id] = item;
        }

        for (var iter = 0, item; item = objects[iter]; iter++) {
            if (item.id == TBNotify.lastSeenObjectId) {
                break;
            }

            if (TBNotify.lastEncounteredObjectId == item.id) {
                encountered = true;
            }

            // If we are still before the last encountered / notified item,
            // then let's notify!
            if (!encountered) {
                var refItem = referenceItems[item.target_id];
                var user = referenceItems[item.user_id];

                // We found the reference item, hooray!
                if (refItem) {
                    // Meh, let's scope this so I can just use notification for all
                    // of them and they can just quickly reference back to it.
                    // I hate closures. This is nasty.
                    (function() {
                        var notification = webkitNotifications.createNotification(
                            user.avatar_url,
                            refItem.type,
                            refItem.body || refItem.name
                        );

                        notification.show();

                        setTimeout(function() {
                            notification.cancel();
                        }, 10000);
                    })();
                }
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
