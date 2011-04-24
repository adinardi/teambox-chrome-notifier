var TBNotify = chrome.extension.getBackgroundPage().TBNotify;

var TBNPopup = {};

TBNPopup.init = function() {
    TBNotify.popupOpened();

    TBNPopup.contentContainer = document.getElementById('content');

    var notifications = TBNotify.notifications;
    _(notifications).each(function(item) {
          TBNPopup.renderNotification(item);
    });
};

TBNPopup.renderNotification = function(props) {
    var div = document.createElement('div');
    div.className = 'notification-wrapper';

    var img = document.createElement('img');
    img.src = props.img;
    img.className = 'notification-image';

    var type = document.createElement('a');
    if(props.url) {
        type.href = props.url;
        type.target = "_blank";
    }
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
