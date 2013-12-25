var get = Ember.get,
    typeOf = Ember.typeOf,
    isNone = Ember.isNone,
    isEmpty = Ember.isEmpty;

DS.Validator = Ember.Object.extend({
  options: null,
  attributes: null,
  type: null,

  validate: function(record, options) {
    options = Ember.merge(get(this, 'options'), options);

    var attributes = get(this, 'attributes'),
        results = {};

    if (this.shouldValidate(options, record)) {
      attributes.forEach(function(attribute) {
        var errors = this._validateAttribute(record, attribute, options);
        if (!isEmpty(errors)) { results[attribute] = errors; }
      }, this);
    }

    return Ember.RSVP.hash(results);
  },

  validateAttribute: function(record, attribute, options) {
    options = Ember.merge(get(this, 'options'), options);

    if (this.shouldValidate(options, record)) {
      return this._validateAttribute(record, attribute, options);
    }

    return Ember.RSVP.resolve([]);
  },

  /**
    @method validateEach
    @returns {RSVP.Promise}
  */
  validateEach: function() {},

  /**
    @method formatMessage
  */
  formatMessage: function(attribute, message, options) {
    return message;
  },

  shouldValidate: function(options, record) {
    if (options['if'] && !get(record, options['if'])) {
      return false;
    } else if (options['unless'] && get(record, options['unless'])) {
      return false;
    } else if (options['on'] === 'create' && !get(record, 'isNew')) {
      return false;
    } else if (options['on'] === 'update' && get(record, 'isNew') || !get(record, 'isDirty')) {
      return false;
    }

    return true;
  },

  /**
    @method _validateAttribute
    @private
  */
  _validateAttribute: function(record, attribute, options) {
    var promiseLabel = "DS: Validator#validateEach " + this;
    var resolver = Ember.RSVP.defer(promiseLabel);

    var value = record.readAttributeForValidation(attribute);

    if (!options.allowBlank && typeOf(value) === 'string') {
      value = value.replace(/^\s+$/g, '');
    }
    if ((options.allowNull && isNone(value)) || (options.allowBlank && isEmpty(value))) {
      resolver.resolve([]);
    } else {
      var self = this;
      var result = this.validateEach(record, attribute, value, options);

      if (result && result.then) {
        result.then(function() {
          resolver.resolve([]);
        }, function(errors) {
          Ember.makeArray(errors).map(function(error) {
            if (typeof error === 'string') {
              error = self.formatMessage(attribute, error);
            } else {
              error = self.formatMessage(attribute, error.message, error);
            }

            resolver.resolve(error);
          });
        });
      } else {
        resolver.resolve((result && Ember.makeArray(result)) || []);
      }
    }

    return resolver.promise;
  }
});
