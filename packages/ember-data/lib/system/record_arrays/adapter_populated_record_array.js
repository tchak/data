require("ember-data/system/record_arrays/record_array");

var get = Ember.get, set = Ember.set;

DS.AdapterPopulatedRecordArray = DS.RecordArray.extend({
  query: null,

  replace: function() {
    var type = get(this, 'type').toString();
    throw new Error("The result of a server query (on " + type + ") is immutable.");
  },

  load: function(references) {
    this.setProperties({
      content: Ember.A(references),
      isLoaded: true
    });

    // TODO: does triggering didLoad event should be the last action of the runLoop?
    Ember.run.once(this, 'trigger', 'didLoad');
  }
});
