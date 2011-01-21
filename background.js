var TBNotify = {};
window.TBNotify = TBNotify;

TBNotify.unreadCount = 0;
TBNotify.notifications = [];
TBNotify.lastEncounteredObjectId = 0;
TBNotify.lastSeenObjectId = localStorage['lastSeenObjectId'];

// Check if the refreshtime is set, otherwise default to 5 minutes
if (!localStorage['refreshtime']) {
    localStorage['refreshtime'] = 5;
}
/**
 * Ids of items which have been notified.
 * @type {Array.<number>}
 */
TBNotify.notifiedIds = [];

/**
 * Request the activity stream.
 * Relies on the user being authenticated on teambox.com already.
 */
TBNotify.fetchActivity = function() {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", "https://teambox.com/api/1/activities");

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            if (xhr.responseText.indexOf('<!DOCTYPE html>') > -1) {
                // Not logged in apparently.
                chrome.browserAction.setIcon({path: 'icon_notloggedin.png'});
                chrome.browserAction.setTitle({title: 'Error: Not logged in to teambox.com'});
                // Die.
                return;
            }

            // If we're authenticated, reset to default settings.
            chrome.browserAction.setIcon({path: 'icon.png'});
            chrome.browserAction.setTitle({title: 'Teambox Notifier'});

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
    if (data.objects[0]) {
        var objects = data.objects;

        // We get a big array of items for reference, index them on their IDs
        var referenceItems = {};
        for (var iter = 0, item; item = data.references[iter]; iter++) {
            referenceItems[item.id] = item;
        }

        var unreadCount = 0;
        var startPos = 0;

        if (TBNotify.lastSeenObjectId) {
            for (var iter = objects.length - 1, item; item = objects[iter]; iter--) {
                if (item.id == TBNotify.lastSeenObjectId) {
                    startPos = iter - 1;
                    break;
                }
            }
        } else {
            startPos = objects.length - 1;
        }

        unreadCount = startPos + 1;

        for (var iter = startPos, item; item = objects[iter]; iter--) {
            // See if we've displayed a notification for this item yet.
            if (TBNotify.notifiedIds.indexOf(item.id) == -1) {
                var refItem = referenceItems[item.target_id];
                var user = referenceItems[item.user_id];

                // We found the reference item, hooray!
                if (refItem) {

                    var notificationType = '';
                    var notificationBody = '';

                    // Special handling of certain activities.
                    // Falls back to generic handling
                    if (refItem.type == "Person") {
                        var userObj = referenceItems[refItem.user_id];
                        var projectObj = referenceItems[item.project_id];

                        notificationType = 'Person added to Project';
                        notificationBody = userObj.first_name + ' ' + userObj.last_name + ' was added to ' + projectObj.name;
                    } else if (refItem.type == "Comment") {
                        var commentParent = referenceItems[refItem.target_id];
                        var projectObj = referenceItems[refItem.project_id];

                        var parentName = commentParent.name ? '"' + commentParent.name + '"' : projectObj.name;
                        notificationType = 'Comment on ' + parentName;
                        notificationBody = refItem.body;
                    } else {
                        notificationType = refItem.type;
                        notificationBody = refItem.body || refItem.name;
                    }

                    TBNotify.notifications.push({
                        img: user.avatar_url,
                        type: notificationType,
                        body: notificationBody
                    });

                    // Meh, let's scope this so I can just use notification for all
                    // of them and they can just quickly reference back to it.
                    // I hate closures. This is nasty.
                    (function() {
                        var notification = webkitNotifications.createNotification(
                            user.avatar_url,
                            notificationType,
                            notificationBody
                        );

                        notification.show();

                        setTimeout(function() {
                            notification.cancel();
                        }, 10000);
                    })();

                    TBNotify.notifiedIds.unshift(item.id);
                }
            }
        }

        if (unreadCount) {
            chrome.browserAction.setBadgeText({text: "" + unreadCount});
        } else {
            chrome.browserAction.setBadgeText({text: ""});
        }

        // Store so that we can sync this to our last seen when button is pressed
        TBNotify.lastEncounteredObjectId = data.objects[0].id;


        // Wipe out any ids past the last 100.
        TBNotify.notifiedIds.splice(100);
    }
};

/**
 * Handler for when the user clicks on the icon in the bar.
 */
TBNotify.handleButtonClicked = function() {
    chrome.browserAction.setBadgeText({"text": ""});
    localStorage['lastSeenObjectId'] = TBNotify.lastSeenObjectId = TBNotify.lastEncounteredObjectId;
};

TBNotify.popupOpened = function() {
    TBNotify.handleButtonClicked();
};

TBNotify.refresh = function() {
    TBNotify.fetchActivity();

    window.setTimeout(TBNotify.refresh, 60000 * parseInt(localStorage['refreshtime'], 10));
};

chrome.browserAction.onClicked.addListener(TBNotify.handleButtonClicked);

// Start loading
TBNotify.refresh();
