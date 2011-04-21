var TBNotify = {};
window.TBNotify = TBNotify;

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
TBNotify.lastSeenObjectId = 0; //localStorage.lastSeenObjectId;


/**
 * Update the current running settings to be the user given setting or the default.
 */
TBNotify.updateSettings = function() {
  TBNotify.settings.refreshtime = localStorage.refreshtime || TBNotify.defaultSettings.refreshtime;
  TBNotify.settings.apihost = localStorage.apihost || TBNotify.defaultSettings.apihost;
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

      var response = _.parseFromAPI(JSON.parse(xhr.responseText));

      TBNotify.processActivityResponse(response);
    }
  };

  xhr.send();
};

/**
 * Process the activity stream data.
 * Update / notify with result.
 */
TBNotify.processActivityResponse = function(objects) {
  if (!objects[0]) { return; }

  var showNotifications = true;

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

  // For each activity...
  _(objects).chain().reverse().each(function (item) {
    // See if we've displayed a notification for this item yet.
    if (TBNotify.notifiedIds.indexOf(item.id) == -1) {

      // We found the targeted item by the activity, hooray!
      if (item.target) {

        var showItem = true;

        var notificationType = '';
        var notificationBody = '';
        var notificationAction = item.project.name + ': ' + item.target.name;
        var notificationURL = item.target.url();

        notificationBody = item.target.body_html || item.target.body || item.target.name;

        switch (item.target.target_type) {
          case 'Conversation':
            // Check if a conversation is a "simple" one (activity feed only).
            // If so, don't show the conversation as a notification
            if (item.target.simple === true) {
              showItem = false;
              notificationAction = item.project.name + ' conversation';
            } else {
              notificationAction = item.project.name + ': ' + item.target.target.name;
            }
            notificationURL = item.target.target.url();
            break;
          case 'Task':
            notificationAction = item.project.name + ': ' + item.target.target.name;
            notificationURL = item.target.target.url();
            break;
        }

        if (showItem) {
          TBNotify.notifications.push({
            img: item.user.avatar_url,
            type: notificationAction,
            body: notificationBody,
            url: TBNotify.settings.apihost + notificationURL
          });

          if (showNotifications) {
            // Meh, let's scope this so I can just use notification for all
            // of them and they can just quickly reference back to it.
            // I hate closures. This is nasty.
            (function() {
              var notification = webkitNotifications.createNotification(
                item.user.avatar_url,
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
  });

  if (unreadCount) {
    chrome.browserAction.setBadgeText({text: "" + unreadCount});
  } else {
    chrome.browserAction.setBadgeText({text: ""});
  }

  // Store so that we can sync this to our last seen when button is pressed
  TBNotify.lastEncounteredObjectId = objects[0].id;

  // Wipe out any ids past the last 100.
  TBNotify.notifiedIds.splice(100);
};

TBNotify.getActionVerb = function(action) {
  switch (action) {
    case 'create': return 'New';
    case 'edit':   return 'Updated';
    default:       return action;
  }
};

/**
 * Handler for when the user clicks on the icon in the bar.
 */
TBNotify.handleButtonClicked = function() {
  chrome.browserAction.setBadgeText({"text": ""});
  localStorage.lastSeenObjectId = TBNotify.lastSeenObjectId = TBNotify.lastEncounteredObjectId;
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
