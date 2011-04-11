var TBNotify = {};
window.TBNotify = TBNotify;

TBNotify.models = {};

/**
 * Default settings
 * @const
 * @type {Object.<string, id>}
 */
TBNotify.defaultSettings = {};
TBNotify.defaultSettings.refreshtime = 2;
TBNotify.defaultSettings.apihost = 'https://teambox.com';

/**
 * Current running settings.
 * @type {Object.<string, id}
 */
TBNotify.settings = {};

// Some system state
TBNotify.unreadCount = 0;
TBNotify.notifications = [];
TBNotify.lastEncounteredObjectId = 0;
TBNotify.lastSeenObjectId = localStorage['lastSeenObjectId'];


/**
 * Update the current running settings to be the user given setting or the default.
 */
TBNotify.updateSettings = function() {
    TBNotify.settings.refreshtime = localStorage['refreshtime'] || TBNotify.defaultSettings.refreshtime;
    TBNotify.settings.apihost = localStorage['apihost'] || TBNotify.defaultSettings.apihost;
};

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

    xhr.open("GET", TBNotify.settings.apihost + "/api/1/activities");

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

/**
 * Process the activity stream data.
 * Update / notify with result.
 */
TBNotify.processActivityResponse = function(data) {
    if (data.objects[0]) {
        var list = Object.create(TBNotify.models.List);
        list.load(data);
        console.log('data', data, list);

        var objects = data.objects;
        var showNotifications = true;

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
            showNotifications = false;
        }

        unreadCount = startPos + 1;

        for (var iter = startPos, item; item = objects[iter]; iter--) {
            // See if we've displayed a notification for this item yet.
            if (TBNotify.notifiedIds.indexOf(item.id) == -1) {
                var refItem = referenceItems[item.target_id];
                var user = referenceItems[item.user_id];
                var project = referenceItems[item.project_id];

                // We found the reference item, hooray!
                if (refItem) {

                    var showItem = true;

                    var notificationType = '';
                    var notificationBody = '';
                    var notificationAction = project.name + ': ' + TBNotify.getActionVerb(item.action) + ' ' + refItem.type + (refItem.target_type ? ' on ' + refItem.target_type : '') + ' by ' + user.first_name + ' ' + user.last_name;

                    // Special handling of certain activities.
                    // Falls back to generic handling
                    //if (refItem.type == "Person") {
                        //var userObj = referenceItems[refItem.user_id];
                        //var projectObj = referenceItems[item.project_id];

                        //notificationType = 'Person added to Project';
                        //notificationBody = userObj.first_name + ' ' + userObj.last_name + ' was added to ' + projectObj.name;
                    //} else if (refItem.type == "Comment") {
                        //var commentParent = referenceItems[refItem.target_id];
                        //var projectObj = referenceItems[refItem.project_id];

                        //var parentName = commentParent.name ? '"' + commentParent.name + '"' : projectObj.name;
                        //notificationType = 'Comment on ' + parentName;
                        //notificationBody = refItem.body;
                    //} else {
                        //notificationType = refItem.type;
                        //notificationBody = refItem.body || refItem.name;
                    //}

                    notificationBody = refItem.body || refItem.name;

                    switch (refItem.type) {
                        case 'Conversation':
                            // Check if a conversation is a "simple" one (activity feed only).
                            // If so, don't show the conversation as a notification
                            if (refItem.simple == true) {
                                showItem = false;
                            }
                            break;
                    }

                    if (showItem) {
                        TBNotify.notifications.push({
                            img: user.avatar_url,
                            type: notificationAction,
                            body: notificationBody
                        });

                        if (showNotifications) {
                            // Meh, let's scope this so I can just use notification for all
                            // of them and they can just quickly reference back to it.
                            // I hate closures. This is nasty.
                            (function() {
                                var notification = webkitNotifications.createNotification(
                                    user.avatar_url,
                                    notificationAction,
                                    notificationBody
                                );

                                notification.show();

                                setTimeout(function() {
                                    notification.cancel();
                                }, 10000);
                            })();
                        }
                    }

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

TBNotify.getActionVerb = function(action) {
    switch (action) {
        case 'create':
            return 'New';
            break;

        case 'edit':
            return 'Updated';
            break;

        default:
            return action;
    }
}

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

    window.setTimeout(TBNotify.refresh, 60000 * parseInt(TBNotify.settings.refreshtime, 10));
};

// Immediately initialize our settings
TBNotify.updateSettings();

chrome.browserAction.onClicked.addListener(TBNotify.handleButtonClicked);

// Start loading
TBNotify.refresh();
