var errors;

module("unit/model/errors", {
  setup: function() {
    errors = DS.Errors.create();
  },

  teardown: function() {
  }
});

function becameInvalid(eventName) {
  if (eventName === 'becameInvalid') {
    ok(true, 'becameInvalid send');
  } else {
    ok(false, eventName + ' is send instead of becameInvalid');
  }
}

function becameValid(eventName) {
  if (eventName === 'becameValid') {
    ok(true, 'becameValid send');
  } else {
    ok(false, eventName + ' is send instead of becameValid');
  }
}

function unexpectedSend(eventName) {
  ok(false, 'unexpected send : ' + eventName);
}

test("add error", function() {
  expect(6);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error');
  errors.trigger = unexpectedSend;
  ok(errors.has('firstName'), 'it has firstName errors');
  equal(errors.get('length'), 1, 'it has 1 error');
  errors.add('firstName', ['error1', 'error2']);
  equal(errors.get('length'), 3, 'it has 3 errors');
  ok(!errors.get('isEmpty'), 'it is not empty');
  errors.add('lastName', 'error');
  equal(errors.get('length'), 4, 'it has 4 errors');
});

test("remove error", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error');
  errors.trigger = becameValid;
  errors.remove('firstName');
  errors.trigger = unexpectedSend;
  ok(!errors.has('firstName'), 'it has no firstName errors');
  equal(errors.get('length'), 0, 'it has 0 error');
  ok(errors.get('isEmpty'), 'it is empty');
  errors.remove('firstName');
});

test("remove same errors from different attributes", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', 'error');
  errors.add('lastName', 'error');
  errors.trigger = unexpectedSend;
  equal(errors.get('length'), 2, 'it has 2 error');
  errors.remove('firstName');
  equal(errors.get('length'), 1, 'it has 1 error');
  errors.trigger = becameValid;
  errors.remove('lastName');
  ok(errors.get('isEmpty'), 'it is empty');
});

test("clear errors", function() {
  expect(5);
  errors.trigger = becameInvalid;
  errors.add('firstName', ['error', 'error1']);
  equal(errors.get('length'), 2, 'it has 2 errors');
  errors.trigger = becameValid;
  errors.clear();
  errors.trigger = unexpectedSend;
  ok(!errors.has('firstName'), 'it has no firstName errors');
  equal(errors.get('length'), 0, 'it has 0 error');
  errors.clear();
});
