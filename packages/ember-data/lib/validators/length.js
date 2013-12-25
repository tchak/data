var get = Ember.get;

DS.LengthValidator = DS.Validator.extend({
  type: 'length',

  validateEach: function(record, attribute, value, options, callback) {
    var length = value ? get(value, 'length') : null,
        message, count;

    if (typeof options.minimum === 'number' && length < options.minimum) {
      count = options.minimum;
      message = options.tooShort || options.message || 'tooShort';
    } else if (typeof options.maximum === 'number' && length > options.maximum) {
      count = options.maximum;
      message = options.tooLong || options.message || 'tooLong';
    } else if (typeof options.is === 'number' && length !== options.is) {
      count = options.is;
      message = options.message || 'wrongLength';
    }

    if (message) {
      return { message: message, value: value, count: count };
    }
  }
});
