var TBNotify = chrome.extension.getBackgroundPage().TBNotify;

var TBNPopup = {};

TBNPopup.init = function() {
    TBNotify.popupOpened();

    TBNPopup.contentContainer = document.getElementById('content');

    var notifications = TBNotify.notifications;

    for (var iter = 0, item; item = notifications[iter]; iter++) {
        TBNPopup.renderNotification(item);
    }
};

TBNPopup.renderNotification = function(props) {
    var div = document.createElement('div');
    div.className = 'notification-wrapper';

    var img = document.createElement('img');
    img.src = props.img;
    img.className = 'notification-image';

    var type = document.createElement('div');
    type.style.fontWeight = 'bold';
    type.innerHTML = props.type;
    type.className = 'notification-type';

    var content = document.createElement('div');
    content.innerHTML = props.body;
    content.className = 'notification-content';

    div.appendChild(img);
    div.appendChild(type);
    div.appendChild(content);

    TBNPopup.contentContainer.insertBefore(div, TBNPopup.contentContainer.firstChild);
};

TBNPopup.clearButtonClick = function() {
    TBNotify.notifications = [];

    TBNPopup.contentContainer.innerHTML = '';
};


TBNPopup.init();
