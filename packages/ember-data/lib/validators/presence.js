DS.PresenceValidator = DS.Validator.extend({
  type: 'presence',

  validateEach: function(record, attribute, value, options, callback) {
    var message = options.message || 'blank';

    if (Ember.isEmpty(value)) {
      return { message: message, value: value };
    }
  }
});
