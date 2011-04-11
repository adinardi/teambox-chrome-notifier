TBNotify.models.Base = Object.create({});

TBNotify.models.Base.load = function(props) {
    for (var x in props) {
        this[x] = props[x];
    }
};
