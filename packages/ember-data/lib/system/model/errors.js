var get = Ember.get, set = Ember.set, isEmpty = Ember.isEmpty;

/**
@module ember-data
*/

/**
  Holds validation errors for a given record organized by attribute names.

  @class Errors
  @namespace DS
  @extends Ember.Object
  @uses Ember.Enumerable
 */
DS.Errors = Ember.Object.extend(Ember.Enumerable, {
  /**
    @property errorsByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  errorsByAttributeName: Ember.computed(function() {
    return Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
  }),

  /**
    @property record
    @type {DS.Model}
    @private
  */
  record: null,

  /**
    @property content
    @type {Array}
    @private
  */
  content: Ember.computed(function() {
    return Ember.A();
  }),

  /**
    @method unknownProperty
    @private
  */
  unknownProperty: function(name) {
    var errors = get(this, 'errorsByAttributeName').get(name);
    if (isEmpty(errors)) { return null; }
    return errors;
  },

  /**
    @method nextObject
    @private
  */
  nextObject: function(index, previousObject, context) {
    return get(this, 'content').objectAt(index);
  },

  /**
    Total number of errors.

    @property length
    @type {Number}
    @readOnly
  */
  length: Ember.computed.oneWay('content.length').readOnly(),

  /**
    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: Ember.computed.not('length').readOnly(),

  /**
    Adds error messages to a given attribute and sends
    `becameInvalid` event to the record.

    @method add
    @param {String} name
    @param {Array|String} messages
  */
  add: function(name, messages) {
    var errorsByAttributeName = get(this, 'errorsByAttributeName'),
        errors = errorsByAttributeName.get(name),
        wasEmpty = get(this, 'isEmpty');

    messages = Ember.makeArray(messages);

    errors.pushObjects(messages);
    get(this, 'content').pushObjects(messages);
    this.notifyPropertyChange(name);

    if (wasEmpty && !get(this, 'isEmpty')) {
      get(this, 'record').send('becameInvalid');
    }
  },

  /**
    Removes all error messages from the given attribute and sends
    `becameValid` event to the record if there no more errors left.

    @method remove
    @param {String} name
  */
  remove: function(name) {
    if (get(this, 'isEmpty')) { return; }

    var errorsByAttributeName = get(this, 'errorsByAttributeName'),
        errors = errorsByAttributeName.get(name);

    errorsByAttributeName.set(name, Ember.A());
    var content = [];
    errorsByAttributeName.forEach(function(key, errors) {
      content = content.concat(errors);
    });
    get(this, 'content').setObjects(content);
    this.notifyPropertyChange(name);

    if (get(this, 'isEmpty')) {
      get(this, 'record').send('becameValid');
    }
  },

  /**
    Removes all error messages and sends `becameValid` event
    to the record.

    @method clear
  */
  clear: function() {
    if (get(this, 'isEmpty')) { return; }

    this.notifyPropertyChange('errorsByAttributeName');
    get(this, 'content').clear();

    get(this, 'record').send('becameValid');
  },

  /**
    Checks if there is error messages for the given attribute.

    @method has
    @param {String} name
    @returns {Boolean} true if there some errors on given attribute
  */
  has: function(name) {
    return !isEmpty(get(this, 'errorsByAttributeName').get(name));
  }
});
