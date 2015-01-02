var get = Ember.get;
var isEmpty = Ember.isEmpty;
var map = Ember.EnumerableUtils.map;
var makeArray = Ember.makeArray;
var emberA = Ember.A;
var EmberArray = Ember.Array;
var Evented = Ember.Evented;

import {
  MapWithDefault
} from "ember-data/system/map";

function computedErrorsBy(fn) {
  return Ember.reduceComputed("sortedContent", {
    initialValue: function() {
      return MapWithDefault.create({
        defaultValue: function() {
          return emberA();
        }
      });
    },

    addedItem: function(errors, error) {
      errors.get(error.attribute).pushObject(fn(error));

      return errors;
    },

    removedItem: function(errors, error) {
      errors.get(error.attribute).removeObject(fn(error));

      return errors;
    }
  });
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
    "errors": {
      "username": ["This username is already taken!"],
      "email": ["Doesn't look like a valid email."]
    }
  }
  ```

  Errors can be displayed to the user by accessing their property name
  or using the `messages` property to get an array of all errors.

  ```handlebars
  {{#each message in errors.adapter.messages}}
    <div class="error">
      {{message}}
    </div>
  {{/each}}

  <label>Username: {{input value=username}} </label>
  {{#each error in errors.adapter.username}}
    <div class="error">
      {{error.message}}
    </div>
  {{/each}}

  <label>Email: {{input value=email}} </label>
  {{#each error in errors.adapter.email}}
    <div class="error">
      {{error.message}}
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
    Register with target handler

    @method registerHandlers
    @param {Object} target
    @param {Function} becameInvalid
    @param {Function} becameValid
  */
  registerHandlers: function(target, becameInvalid, becameValid) {
    this.on('becameInvalid', target, becameInvalid);
    this.on('becameValid', target, becameValid);
  },

  /**
    @property errorsByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  errorsByAttributeName: computedErrorsBy(function(error) {
    return error;
  }),

  /**
    @property messagesByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  messagesByAttributeName: computedErrorsBy(function(error) {
    return error.message;
  }),

  /**
    @method messagesFor
    @private
  */
  messagesFor: function(attribute) {
    return get(this, 'messagesByAttributeName').get(attribute);
  },

  /**
    An array containing all of the error messages for this
    record. This is useful for displaying all errors to the user.

    ```handlebars
    {{#each message in errors.messages}}
      <div class="error">
        {{message}}
      </div>
    {{/each}}
    ```

    @property messages
    @type {Array}
  */
  messages: Ember.computed.mapBy('sortedContent', 'message'),

  messagesSorting: emberA(['attribute']),
  sortedContent: Ember.computed.sort('content', 'messagesSorting'),

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
      user.get('errors').add('username', 'This field is required');
    }
    ```

    @method add
    @param {String} attribute
    @param {Array|String} messages
    @param {String} source
  */
  add: function(attribute, messages, source) {
    var wasEmpty = get(this, 'isEmpty');
    var existingMessages = this.messagesFor(attribute);

    messages = makeArray(messages);
    messages = emberA(messages);

    messages.removeObjects(existingMessages);

    messages = map(messages, function(message) {
      var error = {
        attribute: attribute,
        message: message
      };

      if (source) { error.source = source; }

      return error;
    });

    var idx = get(this, 'length');
    this.arrayContentWillChange(idx, 0, messages.length);

    get(this, 'content').pushObjects(messages);

    this.notifyPropertyChange(attribute);
    this.arrayContentDidChange(idx, 0, messages.length);

    if (wasEmpty && !get(this, 'isEmpty')) {
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
    @param {String} source
  */
  remove: function(attribute, source) {
    if (get(this, 'isEmpty')) { return; }

    if (!attribute && !source) {
      throw new Error('You can not remove without attribute or source.');
    }

    var content = get(this, 'content').reject(function(error) {
      var result;

      if (attribute) {
        result = error.attribute === attribute;
      } else {
        result = true;
      }

      if (result && source) {
        result = error.source === source;
      }

      return result;
    });

    var amt = get(this, 'length');
    var length = get(content, 'length');
    this.arrayContentWillChange(0, amt, length);

    get(this, 'content').setObjects(content);

    this.notifyPropertyChange(attribute);
    this.arrayContentDidChange(0, amt, length);

    if (get(this, 'isEmpty')) {
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
    @param {String} source
  */
  clear: function(source) {
    if (get(this, 'isEmpty')) { return; }

    if (source) {
      this.remove(null, source);
    } else {
      var amt = get(this, 'length');

      this.arrayContentWillChange(0, amt, 0);

      get(this, 'content').clear();

      this.arrayContentDidChange(0, amt, 0);

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
    @return {Boolean} true if there some errors on given attribute
  */
  has: function(attribute) {
    return !isEmpty(this.messagesFor(attribute));
  }
});
