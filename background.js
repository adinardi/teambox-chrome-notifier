var TBNotify = {};
window.TBNotify = TBNotify;

TBNotify.unreadCount = 0;
TBNotify.notifications = [];
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
    if (data.objects[0] && data.objects[0].id != TBNotify.lastEncounteredObjectId) {
        var objects = data.objects;
        var encountered = false;

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

                    var notificationType = '';
                    var notificationBody = '';

                    // Special handling of certain activities.
                    // Falls back to generic handling
                    if (refItem.type == "Person") {
                        var userObj = referenceItems[refItem.user_id];
                        var projectObj = referenceItems[item.project_id];

                        notificationType = 'Person added to Project';
                        notificationBody = userObj.first_name + ' ' + userObj.last_name + ' was added to ' + projectObj.name;
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
                }
            }
        }

        if (unreadCount) {
            chrome.browserAction.setBadgeText({text: "" + unreadCount});
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

TBNotify.popupOpened = function() {
    TBNotify.handleButtonClicked();
};

chrome.browserAction.onClicked.addListener(TBNotify.handleButtonClicked);

// Initial load fetch.
TBNotify.fetchActivity();
// Update every 30 seconds.
window.setInterval(TBNotify.fetchActivity, 60000);
