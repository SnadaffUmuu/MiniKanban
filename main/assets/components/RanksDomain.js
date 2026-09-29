function toInt(value) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function getLevels(ranks) {
  return Object.keys(ranks || {})
    .map(Number)
    .sort((a, b) => a - b);
}

function getOverlap(first, second) {
  return first.filter(color => second.includes(color)).length;
}

export const RanksDomain = {

  parseRanks(raw, validColors, colorsInUse) {
    const errors = [];
    const lines = raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    const ranks = {};
    const usedColors = new Set();
    const validColorsSet = new Set(validColors || []);

    lines.forEach((line, index) => {
      const level = index + 1;
      const firstSpace = line.indexOf(' ');
      if(firstSpace === -1) {
        errors.push(`Строка ${level}: отсутствует пробел после квоты`);
      }

      const quota = parseInt(line.slice(0, firstSpace), 10);
      if(isNaN(quota) || quota <= 0) {
        errors.push(`Строка ${level}: некорректная квота`);
      }

      const colors = line.slice(firstSpace + 1)
        .split(',')
        .map(color => color.trim())
        .filter(color => color.length > 0);

      if(colors.length === 0) {
        errors.push(`Строка ${level}: не указаны цвета`);
      }

      colors.forEach(color => {
        if(!validColorsSet.has(color)) {
          errors.push(`Строка ${level}: цвет "${color}" не существует`);
        }
        if(usedColors.has(color)) {
          errors.push(`Строка ${level}: цвет "${color}" используется повторно`);
        }
        usedColors.add(color);
      });

      ranks[level] = {q: quota, c: colors};
    });

    const notMentionedColors = (colorsInUse || []).filter(color => !usedColors.has(color));
    if(notMentionedColors.length && lines.length) {
      const lowestLevel = lines.length;
      ranks[lowestLevel].c = ranks[lowestLevel].c.concat(notMentionedColors);
      lines[lines.length - 1] += `,${notMentionedColors.join(',')}`;
      raw = lines.join('\n');
    }

    return {
      ranks: errors.length ? null : ranks,
      ranksRaw: raw,
      errors,
    };
  },

  getLevelOfColor(color, ranks) {
    if(!ranks) return null;
    const levels = getLevels(ranks);
    const level = levels.find(item => ranks[item].c.includes(color));
    return level == null
      ? (levels.length ? levels[levels.length - 1] + 1 : 1)
      : level;
  },

  addColorToLowestLevel(ranks, ranksRaw, color) {
    if(!ranks) return {ranks, ranksRaw, changed: false};
    const levels = getLevels(ranks);
    const alreadyIncluded = levels.some(level => ranks[level].c.includes(color));
    if(alreadyIncluded || !levels.length) return {ranks, ranksRaw, changed: false};

    const updatedRanks = {};
    levels.forEach(level => {
      updatedRanks[level] = {
        q: ranks[level].q,
        c: [...ranks[level].c],
      };
    });
    const lowestLevel = levels[levels.length - 1];
    updatedRanks[lowestLevel].c.push(color);
    return {
      ranks: updatedRanks,
      ranksRaw: (ranksRaw || '') + `,${color}`,
      changed: true,
    };
  },

  commitBalance(ranks, counters, level) {
    const updatedCounters = Object.assign({}, counters || {});
    level = toInt(level);

    const ownCount = toInt(updatedCounters[level]);

    if(level === 1) {
      updatedCounters[level] = ownCount + 1;
      return {counters: updatedCounters};
    }

    const levels = getLevels(ranks);
    const quotaOwn = toInt(ranks[level].q);
    const isLastLevel = level === levels[levels.length - 1];
    updatedCounters[level] = isLastLevel && ownCount >= quotaOwn
      ? quotaOwn
      : ownCount + 1;
    updatedCounters[level - 1] = toInt(updatedCounters[level - 1])
      - toInt(ranks[level - 1].q);

    return {counters: updatedCounters};
  },

  getStanding(ranks, counters, level) {
    level = toInt(level);
    if(level <= 1 || !ranks || !ranks[level - 1]) return null;
    return toInt(counters && counters[level - 1]) - toInt(ranks[level - 1].q);
  },

  getPassState(ranks, counters, level) {
    level = toInt(level);
    return {
      standing: this.getStanding(ranks, counters, level),
      parentInDebt: level > 2 && toInt(counters && counters[level - 2]) < 0,
    };
  },

  reconcileCounters(oldRanks, oldCounters, newRanks) {
    oldRanks = oldRanks || {};
    oldCounters = oldCounters || {};
    newRanks = newRanks || {};

    const oldLevels = getLevels(oldRanks);
    const newLevels = getLevels(newRanks);
    const candidates = [];

    oldLevels.forEach(oldLevel => {
      newLevels.forEach(newLevel => {
        const overlap = getOverlap(oldRanks[oldLevel].c, newRanks[newLevel].c);
        if(overlap > 0) {
          candidates.push({oldLevel, newLevel, overlap});
        }
      });
    });

    candidates.sort((a, b) =>
      b.overlap - a.overlap
      || Math.abs(a.oldLevel - a.newLevel) - Math.abs(b.oldLevel - b.newLevel)
      || a.oldLevel - b.oldLevel
      || a.newLevel - b.newLevel
    );

    const oldMatches = {};
    const newMatches = {};
    candidates.forEach(candidate => {
      if(oldMatches[candidate.oldLevel] == null && newMatches[candidate.newLevel] == null) {
        oldMatches[candidate.oldLevel] = candidate.newLevel;
        newMatches[candidate.newLevel] = candidate.oldLevel;
      }
    });

    const ambiguousOld = {};
    const ambiguousNew = {};
    oldLevels.forEach(oldLevel => {
      if(candidates.filter(item => item.oldLevel === oldLevel).length > 1) {
        ambiguousOld[oldLevel] = true;
      }
    });
    newLevels.forEach(newLevel => {
      if(candidates.filter(item => item.newLevel === newLevel).length > 1) {
        ambiguousNew[newLevel] = true;
      }
    });

    const counters = {};
    const rows = [];
    const oldLastLevel = oldLevels.length ? oldLevels[oldLevels.length - 1] : 0;
    const newLastLevel = newLevels.length ? newLevels[newLevels.length - 1] : 0;

    newLevels.forEach(newLevel => {
      const oldLevel = newMatches[newLevel];
      let status = oldLevel == null ? 'new' : 'grandfathered';
      let oldStanding = oldLevel == null
        ? null
        : this.getStanding(oldRanks, oldCounters, oldLevel);

      if(newLevel > 1) {
        const newPredecessorLevel = newLevel - 1;
        const oldPredecessorLevel = oldLevel == null ? null : oldLevel - 1;
        const predecessorUnchanged = oldLevel != null
          && oldPredecessorLevel > 0
          && newMatches[newPredecessorLevel] === oldPredecessorLevel;
        const appendedToOldTail = oldLevel == null
          && newLevel === newLastLevel
          && newMatches[newPredecessorLevel] === oldLastLevel;

        if(predecessorUnchanged) {
          counters[newPredecessorLevel] = toInt(oldCounters[oldPredecessorLevel]);
          status = 'kept';
        } else if(oldStanding != null || oldLevel === 1) {
          counters[newPredecessorLevel] = (oldStanding == null ? 0 : oldStanding)
            + toInt(newRanks[newPredecessorLevel].q);
        } else if(appendedToOldTail) {
          counters[newPredecessorLevel] = toInt(oldCounters[oldLastLevel]);
          status = 'kept';
        } else {
          counters[newPredecessorLevel] = 0;
        }
      } else if(oldLevel === 1) {
        status = 'kept';
      }

      if(ambiguousNew[newLevel] || (oldLevel != null && ambiguousOld[oldLevel])) {
        status = 'ambiguous';
      }

      rows.push({
        newLevel,
        oldLevel: oldLevel == null ? null : oldLevel,
        colors: [...newRanks[newLevel].c],
        oldStanding,
        newStanding: this.getStanding(newRanks, counters, newLevel),
        openingBalance: newLevel > 1 ? counters[newLevel - 1] : null,
        status,
        editable: status === 'ambiguous' && newLevel > 1,
      });
    });

    if(newLastLevel > 0) {
      const oldLevel = newMatches[newLastLevel];
      const ownCount = oldLevel == null ? 0 : toInt(oldCounters[oldLevel]);
      counters[newLastLevel] = Math.min(ownCount, toInt(newRanks[newLastLevel].q));
    }

    oldLevels.forEach(oldLevel => {
      if(oldMatches[oldLevel] == null) {
        rows.push({
          newLevel: null,
          oldLevel,
          colors: [...oldRanks[oldLevel].c],
          oldStanding: this.getStanding(oldRanks, oldCounters, oldLevel),
          newStanding: null,
          openingBalance: null,
          status: 'dropped',
          editable: false,
        });
      }
    });

    return {counters, rows};
  },

  applyOverrides(reconciliation, overrides) {
    const counters = Object.assign({}, reconciliation.counters);
    const appliedOverrides = overrides || {};
    reconciliation.rows.forEach(row => {
      if(!row.editable || appliedOverrides[row.newLevel] == null) return;
      counters[row.newLevel - 1] = toInt(appliedOverrides[row.newLevel]);
    });
    return counters;
  },
};