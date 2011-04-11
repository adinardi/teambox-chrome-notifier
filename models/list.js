TBNotify.models.List = Object.create(TBNotify.models.Base, {
    getReferenceById: {value: function(id) {
        return this.referencesById[id];
    }},

    load: {value: function(data) {
        TBNotify.models.Base.load.call(this, data);

        var referencesById = this.referencesById = {};
        this.activities = [];

        var list = this;

        this.objects.forEach(function(value, index, arr) {
            var type = TBNotify.models[value.type];
            if (!type) {
                console.log('no type found', value.type, value);
            } else {
                var obj = Object.create(type);
                obj.list = list;
                obj.load(value);
                console.log('TYPE FOUND', obj);
            }

            list.activities.push(obj || value);
        });

        this.references.forEach(function(value, index, arr) {
            var type = TBNotify.models[value.type];
            if (!type) {
                console.log('no type found', value.type, value);
            } else {
                var obj = Object.create(type);
                obj.list = list;
                obj.load(value);
                console.log('TYPE FOUND', obj);
            }

            referencesById[value.id] = obj || value;
        });
    }}
});

