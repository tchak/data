var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

var store, adapter;
var Comment;

module("Association/adapter integration test", {
  setup: function() {
    adapter = DS.Adapter.create();

    store = DS.Store.create({
      isDefaultStore: true,
      adapter: adapter
    });

    Comment = DS.Model.extend();
    Comment.reopen({
      body: DS.attr('string'),
      comments: DS.hasMany(Comment),
      comment: DS.belongsTo(Comment)
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("when adding a record to an association that belongs to another record that has not yet been saved, only the parent record is saved", function() {
  expect(2);

  var transaction = store.transaction();
  var parentRecord = transaction.createRecord(Comment);
  var childRecord = transaction.createRecord(Comment);

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, record) {
    createCalled++;
    if (createCalled === 1) {
      equal(record, parentRecord, "parent record is committed first");
      store.didCreateRecord(record, { id: 1 });
    } else if (createCalled === 2) {
      equal(record, childRecord, "child record is committed after its parent is committed");
    }
  };

  Ember.run(function() {
    transaction.commit();
  });
});

test("if a record is added to the store while a child is pending, auto-committing the child record should not commit the new record", function() {
  expect(2);

  var parentRecord = Comment.createRecord();
  var childRecord = Comment.createRecord();

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, record) {
    createCalled++;
    if (createCalled === 1) {
      equal(record, parentRecord, "parent record is committed first");

      Comment.createRecord();

      store.didCreateRecord(record, { id: 1 });
    } else if (createCalled === 2) {
      equal(record, childRecord, "child record is committed after its parent is committed");
    } else {
      ok(false, "Third comment should not be saved");
    }
  };

  Ember.run(function() {
    store.commit();
  });
});

test("if a parent record and an uncommitted pending child belong to different transactions, committing the parent's transaction does not cause the child's transaction to commit", function() {
  expect(1);

  var parentTransaction = store.transaction();
  var childTransaction = store.transaction();

  var parentRecord = parentTransaction.createRecord(Comment);
  var childRecord = childTransaction.createRecord(Comment);

  parentRecord.get('comments').pushObject(childRecord);

  var createCalled = 0;
  adapter.createRecord = function(store, type, record) {
    createCalled++;
    if (createCalled === 1) {
      equal(record, parentRecord, "parent record is committed");

      store.didCreateRecord(record, { id: 1 });
    } else {
      ok(false, "Child comment should not be saved");
    }
  };

  Ember.run(function() {
    parentTransaction.commit();
  });
});

test("committing a transaction that creates a parent-child hierarchy does not overwrite the children", function() {
  var id = 1;
  var createCalled = 0;
  adapter.createRecord = function(store, type, record) {
    var json = record.toJSON();
    json.id = id++;
    createCalled++;
    store.didCreateRecord(record, json);
  };
  
  var parent = store.createRecord(Comment, {body: 'parent'});
  parent.get('comments').createRecord({body: 'child'});
  
  Ember.run(function() {
    store.commit();
  });
  
  equal(createCalled, 2, "create was called twice");
  
  var comments = parent.getPath('comments');
  var child = comments.objectAt(0);
  
  equal(child.get('body'), 'child', "child should be present");
});

