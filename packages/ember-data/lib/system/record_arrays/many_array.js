require("ember-data/system/record_arrays/record_array");
require("ember-data/system/record_arrays/many_array_states");

var get = Ember.get, set = Ember.set;

DS.ManyArray = DS.RecordArray.extend({
  init: function() {
    set(this, 'stateManager', DS.ManyArrayStateManager.create({ manyArray: this }));

    return this._super();
  },

  parentRecord: null,

  parentRecordDirtyDidChange: Ember.observer(function() {
    var stateManager = get(this, 'stateManager'),
        parentRecord = get(this, 'parentRecord');
    // without this check, this is hit before
    // the parentRecord is done initializing
    if(!get(this, 'parentRecord.stateManager')) {
      return;
    }
    if(get(parentRecord, 'isDirty')) {
      stateManager.send('parentBecameDirty');
    } else {
      stateManager.send('parentBecameClean');
    }
  }, 'parentRecord.isDirty'),

  isDirty: Ember.computed(function() {
    return get(this, 'stateManager.currentState.isDirty');
  }).property('stateManager.currentState').cacheable(),

  fetch: function() {
    var clientIds = get(this, 'content'),
        store = get(this, 'store'),
        type = get(this, 'type');

    var ids = clientIds.map(function(clientId) {
      return store.clientIdToId[clientId];
    });

    store.findMany(type, ids, this);
  },

  // Overrides Ember.Array's replace method to implement
  replace: function(index, removed, added) {
    var parentRecord = get(this, 'parentRecord');
    var stateManager = get(this, 'stateManager');
    var store = get(this, 'store');

    // Map the array of record objects into an array of  client ids.
    added = added.map(function(record) {
      Ember.assert("You can only add records of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === record.constructor));

      var inverseAssociation = this.assignInverse(record, parentRecord);

      stateManager.send('recordWasAdded', record);

      var clientId = record.get('clientId');
      store.registerRecordArrayForClientId(this, clientId);

      return clientId;
    }, this);

    var len = index+removed, record, inverseAssociation;
    for (var i = index; i < len; i++) {
      // TODO: null out inverse FK
      record = this.objectAt(i);
      inverseAssociation = this.assignInverse(record, parentRecord, true);

      stateManager.send('recordWasRemoved', record);
    }

    this._super(index, removed, added);
  },

  /**
    Finds the belongsTo association of record for parentRecord and, if such an
    association exists, assigns parentRecord to it.

    Returns the association found, or undefined if no such association exists.
  */
  assignInverse: function(record, parentRecord, remove) {
    var associationMap = get(record.constructor, 'associations'),
        possibleAssociations = associationMap.get(parentRecord.constructor),
        possible, actual;

    if (!possibleAssociations) { return; }

    for (var i = 0, l = possibleAssociations.length; i < l; i++) {
      possible = possibleAssociations[i];

      if (possible.kind === 'belongsTo') {
        actual = possible;
        break;
      }
    }

    if (actual) {
      set(record, actual.name, remove ? null : parentRecord);
      return actual;
    }
  },

  // Create a child record within the parentRecord
  createRecord: function(hash, transaction) {
    var parentRecord = get(this, 'parentRecord'),
        store = get(parentRecord, 'store'),
        type = get(this, 'type'),
        record;

    transaction = transaction || get(parentRecord, 'transaction');

    record = store.createRecord.call(store, type, hash, transaction);
    this.pushObject(record);

    return record;
  }
});
