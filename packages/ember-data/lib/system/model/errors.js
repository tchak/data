var get = Ember.get;
var isEmpty = Ember.isEmpty;
var map = Ember.EnumerableUtils.map;
var makeArray = Ember.makeArray;
var emberA = Ember.A;
var EmberArray = Ember.Array;
var Evented = Ember.Evented;
var tryInvoke = Ember.tryInvoke;
var reduceComputed = Ember.reduceComputed;
var mapBy = Ember.computed.mapBy;

import {
  MapWithDefault
} from "ember-data/system/map";

function selectByAttribute(attribute) {
  return function(error) {
    return error.attribute === attribute;
  };
}

function selectByType(type) {
  return function(error) {
    return error instanceof type;
  };
}

function selectByTypeAndAttribute(type, attribute) {
  return function(error) {
    return (error instanceof type) && error.attribute === attribute;
  };
}

function replaceWithContent(target, content, attributes) {
  var amt = get(target, 'length'),
      length = get(content, 'length');

  if (amt !== length) {
    target.arrayContentWillChange(0, amt, length);

    get(target, 'content').setObjects(content);

    for (var i = 0, lng = attributes.length; i < lng; i++) {
      target.notifyPropertyChange(attributes[i]);
    }

    target.arrayContentDidChange(0, amt, length);
  }
}

/**
@module ember-data
*/

/**
  Holds validation errors for a given record organized by attribute names.

  Every DS.Model has an `errors` property that is an instance of
  `DS.Errors`. This can be used to display validation error
  messages returned from the server when a `record.save()` rejects.
  This works automatically with `DS.ActiveModelAdapter`, but you
  can implement [ajaxError](/api/data/classes/DS.RESTAdapter.html#method_ajaxError)
  in other adapters as well.

  For Example, if you had an `User` model that looked like this:

  ```javascript
  App.User = DS.Model.extend({
    username: attr('string'),
    email: attr('string')
  });
  ```
  And you attempted to save a record that did not validate on the backend.

  ```javascript
  var user = store.createRecord('user', {
    username: 'tomster',
    email: 'invalidEmail'
  });
  user.save();
  ```

  Your backend data store might return a response that looks like
  this. This response will be used to populate the error object.

  ```javascript
  {
    "username": ["This username is already taken!"],
    "email": ["Doesn't look like a valid email."]
  }
  ```

  Errors can be displayed to the user by accessing their property name
  to get an array of all the error objects for that property. Each
  error object is a JavaScript object with two keys:

  - `message` A string containing the error message from the backend
  - `attribute` The name of the property associated with this error message

  ```handlebars
  <label>Username: {{input value=username}} </label>
  {{#each model.errors.username as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}

  <label>Email: {{input value=email}} </label>
  {{#each model.errors.email as |error|}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}
  ```

  You can also access the special `messages` property on the error
  object to get an array of all the error strings.

  ```handlebars
  {{#each model.errors.messages as |message|}}
    <div class="error">
      {{message}}
    </div>
  {{/each}}
  ```

  @class Errors
  @namespace DS
  @extends Ember.Object
  @uses Ember.Enumerable
  @uses Ember.Evented
 */
export default Ember.Object.extend(EmberArray, Evented, {
  /**
    Override the default event firing from Ember.Evented to
    also call methods with the given name.

    @method trigger
    @private
    @param {String} name
  */
  trigger: function(name) {
    tryInvoke(this, name);
    this._super.apply(this, arguments);
  },

  /**
    @property messagesByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  messagesByAttributeName: reduceComputed("sortedContent", {
    initialValue: function() {
      return MapWithDefault.create({
        defaultValue: function() {
          return emberA();
        }
      });
    },

    addedItem: function(errors, error) {
      var attribute = error.attribute || 'base';

      errors.get(attribute).pushObject(error.message);

      return errors;
    },

    removedItem: function(errors, error) {
      var attribute = error.attribute || 'base';

      errors.get(attribute).removeObject(error.message);

      return errors;
    }
  }),

  /**
    @method messagesFor
    @private
  */
  messagesFor: function(attribute) {
    return get(this, 'messagesByAttributeName').get(attribute);
  },

  /**
    Returns errors for a given attribute

    ```javascript
    var user = store.createRecord('user', {
      username: 'tomster',
      email: 'invalidEmail'
    });
    user.save().catch(function(){
      user.get('errors').errorsFor('email'); // returns:
      // [{attribute: "email", message: "Doesn't look like a valid email.", source: 'ember-data:adapter'}]
    });
    ```

    @method errorsFor
    @param {String} attribute
    @param {Errors} type
    @return {Array}
  */
  errorsFor: function(attribute, type) {
    var errors = get(this, 'content');

    if (typeof attribute !== 'string') {
      type = attribute;
      attribute = undefined;
    }

    if (attribute) {
      errors = emberA(errors).filter(selectByAttribute(attribute));
    }

    if (type) {
      errors = emberA(errors).filter(selectByType(type));
    }

    return errors;
  },

  /**
    An array containing all of the error messages for this
    record. This is useful for displaying all errors to the user.

    ```handlebars
    {{#each message in model.errors.messages}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property messages
    @type {Array}
  */
  messages: mapBy('sortedContent', 'message'),

  sortContentBy: emberA(['attribute']),
  sortedContent: Ember.computed.sort('content', 'sortContentBy'),

  /**
    @property content
    @type {Array}
    @private
  */
  content: Ember.computed(function() {
    return emberA();
  }),

  /**
    @method objectAt
    @private
  */
  objectAt: function(idx) {
    return get(this, 'sortedContent').objectAt(idx);
  },

  /**
    Returns error messages for a given attribute

    ```javascript
    var user = store.createRecord('user', {
      username: 'tomster',
      email: 'invalidEmail'
    });
    user.save().catch(function(){
      user.get('errors.adapter').get('email'); // ["Doesn't look like a valid email."]
    });
    ```

    @method get
    @param {String} attribute
    @return {Array}
  */
  unknownProperty: function(attribute) {
    var errors = this.messagesFor(attribute);
    if (isEmpty(errors)) { return null; }
    return errors;
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

    Example:

    ```javascript
    if (!user.get('username') {
      user.get('errors').add(new ValidationError({
        attribute: 'password',
        message: "Your password is incorrect"
      }));
    }

    ```

    {{#each model.errors as |error|}}
      {{error.message}}
      {{error.code}}
    {{/each}}

    @method add
    @param {Array<Error>} errors
  */

  add: function(errors) {
    errors = makeArray(errors);
    errors = emberA(errors);

    var hasValidationErrors = this.hasValidationErrors();

    var idx = get(this, 'length');
    this.arrayContentWillChange(idx, 0, errors.length);

    get(this, 'content').pushObjects(errors);

    errors.mapBy('attribute').compact().uniq().forEach(attribute => {
      this.notifyPropertyChange(attribute);
    });

    this.arrayContentDidChange(idx, 0, errors.length);

    if (!hasValidationErrors && this.hasValidationErrors()) {
      this.trigger('becameInvalid');
    }
  },

  /**
    Removes all error messages from the given attribute and sends
    `becameValid` event to the record if there no more errors left.

    Example:

    ```javascript
    App.User = DS.Model.extend({
      email: DS.attr('string'),
      twoFactorAuth: DS.attr('boolean'),
      phone: DS.attr('string')
    });

    App.UserEditRoute = Ember.Route.extend({
      actions: {
        save: function(user) {
           if (!user.get('twoFactorAuth')) {
             user.get('errors').remove('phone');
           }
           user.save();
         }
      }
    });
    ```

    @method remove
    @param {String} attribute
    @param {Error} type
  */
  remove: function(attribute, type) {
    if (typeof attribute !== 'string') {
      type = attribute;
      attribute = undefined;
    }

    if (attribute && type) {
      this.removeByTypeAndAttribute(type, attribute);
    } else if (attribute) {
      this.removeByAttribute(attribute);
    } else if (type) {
      this.removeByType(type);
    }
  },

  removeByType: function(type) {
    this.removeBy(selectByType(type));
  },

  removeByAttribute: function(attribute) {
    this.removeBy(selectByAttribute(attribute));
  },

  removeByTypeAndAttribute: function(type, attribute) {
    this.removeBy(selectByTypeAndAttribute(type, attribute));
  },

  removeBy: function(selector) {
    if (get(this, 'isEmpty')) { return; }

    var hadAdapterErrors = this.hasValidationErrors();
    var content = get(this, 'content');

    content = content.reject(selector);
    attributes = emberA(content).mapBy('attribute').uniq();

    replaceWithContent(this, content, attributes);

    if (hadAdapterErrors && !this.hasValidationErrors()) {
      this.trigger('becameValid');
    }
  },

  /**
    Removes all error messages and sends `becameValid` event
    to the record.

    Example:

    ```javascript
    App.UserEditRoute = Ember.Route.extend({
      actions: {
        retrySave: function(user) {
           user.get('errors').clear();
           user.save();
         }
      }
    });
    ```

    @method clear
    @param {Error} type
  */
  clear: function(type) {
    if (type) {
      this.removeByType(type);
    } else {
      this._clear();
    }
  },

  _clear: function() {
    if (get(this, 'isEmpty')) { return; }

    var hadAdapterErrors = this.hasValidationErrors();
    var amt = get(this, 'length');

    this.arrayContentWillChange(0, amt, 0);

    get(this, 'content').clear();

    this.arrayContentDidChange(0, amt, 0);

    if (hadAdapterErrors && !this.hasValidationErrors()) {
      this.trigger('becameValid');
    }
  },

  /**
    Checks if there is error messages for the given attribute.

    ```javascript
    App.UserEditRoute = Ember.Route.extend({
      actions: {
        save: function(user) {
           if (user.get('errors').has('email')) {
             return alert('Please update your email before attempting to save.');
           }
           user.save();
         }
      }
    });
    ```

    @method has
    @param {String} attribute
    @param {Error} type
    @return {Boolean} true if there some errors on given attribute
  */
  has: function(attribute, type) {
    var errors = this.errorsFor(attribute, type);
    return !isEmpty(errors);
  },

  hasValidationErrors: function() {
    return this.has(ValidationError);
  }
});
