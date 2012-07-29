var get = Ember.get;

DS.Model.reopen({
  validate: Ember.K,

  valid: function() {
    this.send('becameValid');

    this.validate();

    if (!get(this, 'errors.isEmpty')) {
      this.send('becameInvalid');
      return false;
    }

    return true;
  }
});
