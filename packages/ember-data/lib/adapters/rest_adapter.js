require("ember-data/core");
require('ember-data/system/adapters');
/*global jQuery*/

var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

DS.RESTAdapter = DS.Adapter.extend({
  bulkCommit: false,

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = {};
    data[root] = record.toJSON();

    this.ajax(this.buildURL(root), "POST", {
      data: data,

      success: function(json) {
        this.sideload(store, type, json, root);
        store.didCreateRecord(record, json[root]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, [record], jqXHR, textStatus, errorThrown);
      }
    });
  },

  createRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(function(record) {
      return record.toJSON();
    });

    this.ajax(this.buildURL(root), "POST", {
      data: data,

      success: function(json) {
        this.sideload(store, type, json, plural);
        store.didCreateRecords(type, records, json[plural]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, records, jqXHR, textStatus, errorThrown);
      }
    });
  },

  updateRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    var data = {};
    data[root] = record.toJSON();

    this.ajax(this.buildURL(root, id), "PUT", {
      data: data,

      success: function(json) {
        this.sideload(store, type, json, root);
        store.didUpdateRecord(record, json && json[root]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, [record], jqXHR, textStatus, errorThrown);
      }
    });
  },

  updateRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(function(record) {
      return record.toJSON();
    });

    this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data,

      success: function(json) {
        this.sideload(store, type, json, plural);
        store.didUpdateRecords(records, json[plural]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, records, jqXHR, textStatus, errorThrown);
      }
    });
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "DELETE", {
      success: function(json) {
        if (json) { this.sideload(store, type, json); }
        store.didDeleteRecord(record);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, [record], jqXHR, textStatus, errorThrown);
      }
    });
  },

  deleteRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(function(record) {
      return get(record, 'id');
    });

    this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: data,
      success: function(json) {
        if (json) { this.sideload(store, type, json); }
        store.didDeleteRecords(records);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, records, jqXHR, textStatus, errorThrown);
      }
    });
  },

  find: function(store, type, id, record) {
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "GET", {
      success: function(json) {
        this.sideload(store, type, json, root);
        store.didFindRecord(record, json[root]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordError(store, [record], jqXHR, textStatus, errorThrown);
      }
    });
  },

  findMany: function(store, type, ids, recordArray) {
    this.findQuery(store, type, {ids: ids}, recordArray);
  },

  findAll: function(store, type, recordArray) {
    this.findQuery(store, type, null, recordArray);
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type), plural = this.pluralize(root);

    this.ajax(this.buildURL(root), "GET", {
      data: query,
      success: function(json) {
        this.sideload(store, type, json, plural);
        store.didFindRecords(recordArray, json[plural]);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        this.handleRecordArrayError(store, recordArray, jqXHR, textStatus, errorThrown);
      }
    });
  },

  // HELPERS

  plurals: {},

  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },

  rootForType: function(type) {
    if (type.url) { return type.url; }

    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },

  ajax: function(url, type, hash) {
    hash.url = url;
    hash.type = type;
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    hash.context = this;

    if (hash.data && type !== 'GET') {
      hash.data = JSON.stringify(hash.data);
    }

    Ember.$.ajax(hash);
  },

  handleRecordError: function(store, records, jqXHR, textStatus, errorThrown) {
    var data = Ember.$.parseJSON(jqXHR.responseText),
        errorMessage;

    if (jqXHR.status === 422) {
      records.forEach(function(record) {
        store.recordWasInvalid(record, data['errors']);
      });
    } else {
      errorMessage = data['error'] || (errorThrown && errorThrown.message) || textStatus;
      records.forEach(function(record) {
        store.recordDidError(record, errorMessage);
      });
    }
  },

  handleRecordArrayError: function(store, recordArray, jqXHR, textStatus, errorThrown) {
    var data = Ember.$.parseJSON(jqXHR.responseText),
        errorMessage = data['error'] || (errorThrown && errorThrown.message) || textStatus;

    store.recordArrayDidError(recordArray, errorMessage);
  },

  sideload: function(store, type, json, root) {
    var sideloadedType, mappings, loaded = {};

    loaded[root] = true;

    for (var prop in json) {
      if (!json.hasOwnProperty(prop)) { continue; }
      if (prop === root) { continue; }

      sideloadedType = type.typeForAssociation(prop);

      if (!sideloadedType) {
        mappings = get(this, 'mappings');
        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mappings", !!mappings);

        sideloadedType = get(mappings, prop);

        if (typeof sideloadedType === 'string') {
          sideloadedType = getPath(window, sideloadedType);
        }

        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mapping for it", !!sideloadedType);
      }

      this.sideloadAssociations(store, sideloadedType, json, prop, loaded);
    }
  },

  sideloadAssociations: function(store, type, json, prop, loaded) {
    loaded[prop] = true;

    get(type, 'associationsByName').forEach(function(key, meta) {
      key = meta.key || key;
      if (meta.kind === 'belongsTo') {
        key = this.pluralize(key);
      }
      if (json[key] && !loaded[key]) {
        this.sideloadAssociations(store, meta.type, json, key, loaded);
      }
    }, this);

    this.loadValue(store, type, json[prop]);
  },

  loadValue: function(store, type, value) {
    if (value instanceof Array) {
      store.loadMany(type, value);
    } else {
      store.load(type, value);
    }
  },

  buildURL: function(record, suffix) {
    var url = [""];

    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Record URL (" + record + ") must not start with slash", !record || record.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (this.namespace !== undefined) {
      url.push(this.namespace);
    }

    url.push(this.pluralize(record));
    if (suffix !== undefined) {
      url.push(suffix);
    }

    return url.join("/");
  }
});

