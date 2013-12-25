require("ember-data/system/model/model");

var get = Ember.get, set = Ember.set, isEmpty = Ember.isEmpty;

DS.Model.reopen({
  validate: function(options) {
    var validators = get(this, 'validators').invoke('validate', this, options);
    var promiseLabel = "DS: Model#validate " + this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.RSVP.all(validators).then(function(results) {
        var errors = {};
        var hasErrors = false;
        results.forEach(function(errs) {
          for (var key in errs) {
            if (!isEmpty(errs[key])) {
              hasErrors = true;
              errors[key] = errors[key] || Ember.A();
              errors[key].addObjects(errs[key]);
            }
          }
        });
        if (hasErrors) {
          reject(new DS.InvalidError(errors));
        } else {
          resolve(this);
        }
      });
    }, promiseLabel);
  },

  validateAttribute: function(attribute, options) {
    var validators = this.validatorsOn(attribute).invoke('validateAttribute', this, attribute, options);
    var promiseLabel = "DS: Model#validateAttribute " + this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.RSVP.all(validators).then(function(results) {
        var errors = {};
        errors[attribute] = Ember.A();
        results.forEach(function(errs) {
          errors[attribute].addObjects(errs);
        });
        if (isEmpty(errors[attribute])) {
          resolve(this);
        } else {
          reject(new DS.InvalidError(errors));
        }
      });
    }, promiseLabel);
  },

  validators: Ember.computed(function() {
    var allValidators = Ember.A();

    get(this.constructor, 'validators').forEach(function(attribute, validators) {
      allValidators.addObjects(validators);
    });

    return allValidators;
  }),

  validatorsOn: function(attribute) {
    return get(this.constructor, 'validators').get(attribute);
  },

  readAttributeForValidation: function(name) {
    return get(this, name);
  },

  addValidationErrors: function(errors, type) {
    var record = this;

    function addError(attribute) {
      var error = errors[attribute];
      if (error) {
        record.addValidationError(attribute, error, type);
      }
    }

    this.eachAttribute(addError);
    this.eachRelationship(addError);
  },

  addValidationError: function(attribute, message, type) {
    get(this, 'errors').add(attribute, message, type);
  },

  removeValidationError: function(attribute) {
    var record = this;

    get(this, 'errors').remove(attribute, 'adapter');

    record.validate(attribute);
  }
});

DS.Model.reopenClass({
  validators: Ember.computed(function() {
    var validators = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });

    setupValidations(this, validators);

    return validators;
  })
});

function setupValidations(model, validators) {
  var validations = get(model, 'validations');

  if (!validations) { return; }

  Ember.keys(validations).forEach(function(attribute) {
    Ember.keys(validations[attribute]).forEach(function(validator) {
      var options = validations[attribute][validator];
      options = Ember.merge(options, { attributes: [attribute] });
      validator = model.store.validatorFor(validator, options);
      validators.get(attribute).push(validator);
    });
  });
}
