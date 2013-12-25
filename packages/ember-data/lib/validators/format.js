var get = Ember.get;

DS.FormatValidator = DS.Validator.extend({
  patterns: {
    email: /^.+@.+\...+$/,
    url: /^(https?:\/\/)?([\da-z\.\-]+)\.([a-z\.]{2,6})([\/\w \.\-]*)*\/?$/,
    phone: /^\+?[0-9\-\s]*$/
  },

  validateEach: function(record, attribute, value, options, callback) {
    var pattern = options['with'] || options.pattern,
        message = options.message || 'invalid';

    if (Ember.typeOf(pattern) === 'string') {
      pattern = this.patterns[pattern];
    }

    if (Ember.typeOf(value) !== 'string' || !value.match(pattern)) {
      return { message: message, value: value };
    }
  }
});
