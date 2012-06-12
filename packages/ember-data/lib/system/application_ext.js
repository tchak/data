var set = Ember.set;

Ember.onLoad('application', function(app) {
  app.registerInjection({
    name: "store",
    before: "controllers",

    injection: function(app, stateManager, property) {
      if (property === 'Store') {
        var store = app[property].create();
        set(stateManager, 'store', store);
        set(store, 'stateManager', stateManager);

        stateManager.reopen({
          didFindRecord: Ember.K,
          didFindRecords: Ember.K,
          didCreateRecord: Ember.K,
          didUpdateRecord: Ember.K,
          didDeleteRecord: Ember.K,
          recordWasInvalid: Ember.K
        });
      }
    }
  });
});
