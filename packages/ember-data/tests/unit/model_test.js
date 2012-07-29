var get = Ember.get, set = Ember.set;

var Person, store, array;

module("DS.Model", {
  setup: function() {
    store = DS.Store.create();

    Person = DS.Model.extend({
      name: DS.attr('string')
    });
  },

  teardown: function() {
    Person = null;
    store = null;
  }
});

test("can have a property set on it", function() {
  var record = store.createRecord(Person);
  set(record, 'name', 'bar');

  equal(get(record, 'name'), 'bar', "property was set on the record");
});

test("a record reports its unique id via the `id` property", function() {
  store.load(Person, { id: 1 });

  var record = store.find(Person, 1);
  equal(get(record, 'id'), 1, "reports id as id by default");

  var PersonWithPrimaryKey = DS.Model.extend({
    primaryKey: 'foobar'
  });

  store.load(PersonWithPrimaryKey, { id: 1, foobar: 2 });
  record = store.find(PersonWithPrimaryKey, 2);

  equal(get(record, 'id'), 2, "reports id as foobar when primaryKey is set");
});

var converts = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 1, name: provided });
  testStore.load(Model, { id: 2 });

  var record = testStore.find(Model, 1);
  deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);

  record = testStore.find(Model, 2);
  set(record, 'name', provided);
  deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 1, name: provided });
  var record = testStore.find(Model, 1);

  deepEqual(get(record, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsWhenSet = function(type, provided, expected) {
  var testStore = DS.Store.create();

  var Model = DS.Model.extend({
    name: DS.attr(type)
  });

  testStore.load(Model, { id: 2 });
  var record = testStore.find(Model, 2);

  set(record, 'name', provided);
  deepEqual(record.toJSON().name, expected, type + " saves " + provided + " as " + expected);
};

test("a DS.Model can describe String attributes", function() {
  converts('string', "Scumbag Tom", "Scumbag Tom");
  converts('string', 1, "1");
  converts('string', null, null);
  converts('string', undefined, null);
  convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Number attributes", function() {
  converts('number', "1", 1);
  converts('number', "0", 0);
  converts('number', 1, 1);
  converts('number', 0, 0);
  converts('number', null, null);
  converts('number', undefined, null);
  converts('number', true, 1);
  converts('number', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  converts('boolean', "1", true);
  converts('boolean', "", false);
  converts('boolean', 1, true);
  converts('boolean', 0, false);
  converts('boolean', null, false);
  converts('boolean', true, true);
  converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function() {
  converts('date', null, null);
  converts('date', undefined, undefined);

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  var store = DS.Store.create();

  var Person = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  store.load(Person, { id: 1 });
  var record = store.find(Person, 1);

  record.set('updatedAt', date);
  deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("retrieving properties should return the same value as they would if they were not in the data hash if the record is not loaded", function() {
  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      // no-op
      find: Ember.K
    })
  });

  // TODO :
  // Investigate why this test fail with DS.attr `name` and jshint because of this :
  // if (typeof String.prototype.name !== 'function') {
  //   String.prototype.name = function () {
  //     if (ix.test(this)) {
  //         return this;
  //     }
  //     if (nx.test(this)) {
  //         return '"' + this.replace(nxg, function (a) {
  //             var c = escapes[a];
  //             if (c) {
  //                 return c;
  //             }
  //             return '\\u' + ('0000' + a.charCodeAt().toString(16)).slice(-4);
  //         }) + '"';
  //     }
  //     return '"' + this + '"';
  //   };
  // }

  var Person = DS.Model.extend({
    firstName: DS.attr('string')
  });

  var record = store.find(Person, 1);

  strictEqual(get(record, 'firstName'), null, "returns null value");
});

test("it should cache attributes", function() {
  var store = DS.Store.create();

  var Post = DS.Model.extend({
    updatedAt: DS.attr('date')
  });

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  store.load(Post, { id: 1 });

  var record = store.find(Post, 1);

  record.set('updatedAt', date);
  deepEqual(date, get(record, 'updatedAt'), "setting a date returns the same date");
  strictEqual(get(record, 'updatedAt'), get(record, 'updatedAt'), "second get still returns the same object");
});

test("it can specify which key to use when looking up properties on the hash", function() {
  var Model = DS.Model.extend({
    name: DS.attr('string', { key: 'full_name' })
  });

  store.load(Model, { id: 1, name: "Steve", full_name: "Pete" });
  var record = store.find(Model, 1);

  equal(get(record, 'name'), "Pete", "retrieves correct value");
});

module("DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = DS.Store.create();
    store.loadMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("a DS.Model can update its attributes", function() {
  var person = store.find(Person, 2);

  set(person, 'name', "Brohuda Katz");
  equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
});

test("a DS.Model can have a defaultValue", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string', { defaultValue: "unknown" })
  });

  var tag = Tag.createRecord();

  equal(get(tag, 'name'), "unknown", "the default value is found");

  set(tag, 'name', null);

  equal(get(tag, 'name'), null, "null doesn't shadow defaultValue");
});

test("it should modify the property of the hash specified by the `key` option", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({
    name: DS.attr('string', { key: 'full_name' })
  });

  store.load(Person, { id: 1, name: "Steve", full_name: "Peter" });
  var record = store.find(Person, 1);

  record.set('name', "Colin");

  var data = record.toJSON();
  equal(get(data, 'full_name'), "Colin", "properly modified full_name property");
  strictEqual(get(data, 'name'), undefined, "does not include non-defined attributes");
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz");
  });

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz-Foo");
  });

  equal(get(people, 'length'), 0, "there are now no items");
});


module("with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
    store = DS.Store.create();
    store.loadMany(Person, array);
  },
  teardown: function() {
    Person = null;
    store = null;
    array = null;
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz");
  });

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz-Foo");
  });

  equal(get(people, 'length'), 0, "there are now no items");
});

test("when a record depends on another record, we can delete the first record and finish loading the second record", function() {
  var id = 0,
      parentComment, childComment;

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      createRecord: function(store, type, record) {
        var hash = record.toJSON();
        hash.id = ++id;
        store.didCreateRecord(record, hash);
      },

      updateRecord: function(store, type, record) {
        store.didUpdateRecord(record);
      }
    })
  });

  var Comment = DS.Model.extend({
    title: DS.attr('string')
  });

  parentComment = store.createRecord(Comment);
  childComment = store.createRecord(Comment);

  childComment.deleteRecord();

  equal(get(childComment, 'isDeleted'), true, "child record is marked as deleted");
  equal(get(childComment, 'isDirty'), false, "child record should not be dirty since it was deleted and never saved");
  equal(get(parentComment, 'isDirty'), true, "parent comment has not yet been saved");

  Ember.run(function() {
    store.commit();
  });

  equal(get(parentComment, 'isDirty'), false, "parent comment has been saved");
  ok(true, "no exception was thrown");
});

test("unload new record", function() {
  var tryToFind;

  store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function() {
        tryToFind = true;
      }
    })
  });

  var ChildRecord = DS.Model.extend();

  var Record = DS.Model.extend({
    title: DS.attr('string'),
    children: DS.hasMany(ChildRecord)
  });

  ChildRecord.reopen({
    parent: DS.belongsTo(Record)
  });

  var record = store.createRecord(Record, {id: 1, title: 'toto'});
  var childRecord = store.createRecord(ChildRecord, {id: 1});
  record.get('children').pushObject(childRecord);

  equal(get(record, 'isNew'), true, "record is new");
  equal(get(record, 'isDirty'), true, "record is dirty");
  equal(get(childRecord, 'isDirty'), true, "child record is dirty");

  record = store.find(Record, 1);
  equal(get(record, 'id'), 1, "found record with id 1");
  equal(get(childRecord, 'parent'), record, "parent record is not null");

  store.unloadRecord(record);

  equal(get(record, 'isDirty'), false, "record is not dirty");
  equal(get(record, 'isDeleted'), true, "record is deleted");
  //equal(get(childRecord, 'parent'), null, "parent record is null");

  tryToFind = false;
  store.find(Record, 1);
  equal(tryToFind, true, "not found record with id 1");
});

test("unload loaded record", function() {
  var tryToFind;

  store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function() {
        tryToFind = true;
      }
    })
  });

  var Record = DS.Model.extend({
    title: DS.attr('string')
  });

  store.load(Record, {id: 1, title: 'toto'});
  var record = store.find(Record, 1);

  equal(get(record, 'isNew'), false, "record is not new");

  store.unloadRecord(record);

  equal(get(record, 'isDirty'), false, "record is not dirty");
  equal(get(record, 'isDeleted'), true, "record is deleted");

  tryToFind = false;
  store.find(Record, 1);
  equal(tryToFind, true, "not found record with id 1");
});

test("unload child record", function() {
  var tryToFind, id = 0;

  store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: Ember.K,
      createRecord: function(store, type, record) {
        var hash = record.toJSON();
        hash.id = ++id;
        store.didCreateRecord(record, hash);
      }
    })
  });

  var ChildRecord = DS.Model.extend();

  var Record = DS.Model.extend({
    title: DS.attr('string'),
    children: DS.hasMany(ChildRecord)
  });

  ChildRecord.reopen({
    parent: DS.belongsTo(Record)
  });

  store.load(Record, {id: 1, title: 'toto', children: [1]});
  store.load(ChildRecord, {id: 1, parent: 1});

  var records = store.findAll(ChildRecord);

  var record = store.find(Record, 1);
  var childRecord = record.get('children').objectAt(0);

  equal(record.get('children.length'), 1, 'has one child');
  equal(records.get('length'), 1, 'found one record');

  var childRecord2 = store.createRecord(ChildRecord, {});
  record.get('children').pushObject(childRecord2);

  equal(record.get('children.length'), 2, 'has two children');
  equal(records.get('length'), 2, 'found two records');

  store.unloadRecord(childRecord);

  equal(record.get('children.length'), 1, "record has one child");
  equal(records.get('length'), 1, 'found one record');

  equal(get(childRecord, 'isDirty'), false, "record is not dirty");
  equal(get(childRecord, 'isDeleted'), true, "record is deleted");

  equal(get(record, 'isDirty'), false, "record is not dirty");

  store.unloadRecord(childRecord2);

  //equal(record.get('children.length'), 0, "record has no more children");
  equal(records.get('length'), 0, 'found no records');
});
