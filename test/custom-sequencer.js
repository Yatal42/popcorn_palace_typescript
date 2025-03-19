const Sequencer = require('@jest/test-sequencer').default;
const path = require('path');

class CustomSequencer extends Sequencer {
  /**
   * test paths:
   * 1. movies.e2e-spec.ts - run first since other tests depend on movies
   * 2. theaters.e2e-spec.ts - run second since showtimes depend on theaters
   * 3. showtimes.e2e-spec.ts - run third since bookings depend on showtimes
   * 4. bookings.e2e-spec.ts - run last as they depend on all other entities
   * 5. Any other tests - run in default ordering
   */
  sort(tests) {
    const testOrder = [
      'movies.e2e-spec',
      'theaters.e2e-spec',
      'showtimes.e2e-spec',
      'bookings.e2e-spec',
    ];

    return tests.sort((testA, testB) => {
      const fileNameA = path.basename(testA.path, '.ts');
      const fileNameB = path.basename(testB.path, '.ts');

      const indexA = testOrder.findIndex((name) => fileNameA.includes(name));
      const indexB = testOrder.findIndex((name) => fileNameB.includes(name));

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      if (indexA !== -1) {
        return -1;
      }
      if (indexB !== -1) {
        return 1;
      }

      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;