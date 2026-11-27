// src/domain/diff.js
// Calculates structured diff summaries between consecutive parcel data snapshots

const Normalizer = require('./normalizer');

class RecordDiffer {
  /**
   * Generates a structured JSON diff of meaningful changes between oldData and newData.
   * Excludes volatile metadata.
   */
  static computeDiff(oldData, newData) {
    const canonicalOld = Normalizer.toCanonicalForm(oldData) || {};
    const canonicalNew = Normalizer.toCanonicalForm(newData) || {};

    const diff = {
      added: {},
      modified: {},
      removed: {},
      hasChanges: false
    };

    const allKeys = new Set([...Object.keys(canonicalOld), ...Object.keys(canonicalNew)]);

    for (const key of allKeys) {
      const inOld = key in canonicalOld;
      const inNew = key in canonicalNew;

      if (!inOld && inNew) {
        diff.added[key] = canonicalNew[key];
        diff.hasChanges = true;
      } else if (inOld && !inNew) {
        diff.removed[key] = canonicalOld[key];
        diff.hasChanges = true;
      } else {
        const valOld = canonicalOld[key];
        const valNew = canonicalNew[key];

        const jsonOld = JSON.stringify(valOld);
        const jsonNew = JSON.stringify(valNew);

        if (jsonOld !== jsonNew) {
          diff.modified[key] = {
            previous: valOld,
            current: valNew
          };
          diff.hasChanges = true;
        }
      }
    }

    return diff;
  }
}

module.exports = RecordDiffer;
