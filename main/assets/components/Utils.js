export const Utils = {
  generateUID() {
    return '_' + Math.random().toString(36).substr(2, 9);
  },

  preventDefault(e) {
    e.preventDefault();
  },

  updateButtonState(field, button) {
    if(field.value.trim().length
      && (field.dataset.originalValue
        && field.value !== field.dataset.originalValue
        || !field.dataset.originalValue)
    ) {
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', true);
    }
  },

  expandInput(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  },

  focusAndPlaceCursorAtEnd(input) {
    input.addEventListener('focus', function () {
      setTimeout(() => {
        this.setSelectionRange(this.value.length, this.value.length);
      }, 0);
    });
    input.focus();
  },

  cacheComponentDom(component) {
    if(!component.dom) return;
    if(component.selectors) {
      Object.keys(component.selectors).forEach(selector => {
        const el = document.querySelector(component.selectors[selector]);
        if(el) {
          component.dom[selector] = el;
        }
      })
    }
  },

  getColumnEl(el) {
    return el.closest('.column');
  },

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  escapeAttr(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  mergeRanges(existing, incoming) {
    const all = [...existing, ...incoming];

    // группировка по stage
    const byStage = new Map();

    for(const r of all) {
      if(!byStage.has(r.s)) {
        byStage.set(r.s, []);
      }
      byStage.get(r.s).push({...r});
    }

    const result = [];

    for(const [stage, ranges] of byStage) {
      // сортировка по началу
      ranges.sort((a, b) => a.f - b.f);

      const merged = [];

      for(const curr of ranges) {
        if(merged.length === 0) {
          merged.push(curr);
          continue;
        }

        const last = merged[merged.length - 1];

        // ключевая логика: пересечение ИЛИ смежность
        if(curr.f <= last.t + 1) {
          last.t = Math.max(last.t, curr.t);
        } else {
          merged.push(curr);
        }
      }

      result.push(...merged);
    }

    return result;
  },

  findCrossStageOverlaps(ranges) {
    // копия + сортировка
    const sorted = [...ranges].sort((a, b) => a.f - b.f);

    const active = [];
    const conflicts = [];

    for(const curr of sorted) {
      // выкидываем неактуальные
      for(let i = active.length - 1;i >= 0;i--) {
        if(active[i].t < curr.f) {
          active.splice(i, 1);
        }
      }

      // проверяем пересечения с активными
      for(const other of active) {
        if(other.s === curr.s) continue; // только разные стадии

        // есть пересечение
        if(curr.f <= other.t) {
          conflicts.push({
            a: other,
            b: curr,
            overlap: {
              from: Math.max(curr.f, other.f),
              to: Math.min(curr.t, other.t)
            }
          });
        }
      }

      active.push(curr);
    }

    return conflicts;
  },

  findConflictsBetween(existing, incoming) {
    const conflicts = [];

    for(const inc of incoming) {
      for(const ex of existing) {
        if(inc.s === ex.s) continue;

        if(inc.f <= ex.t && ex.f <= inc.t) {
          conflicts.push({
            a: ex,
            b: inc,
            overlap: {
              from: Math.max(inc.f, ex.f),
              to: Math.min(inc.t, ex.t)
            }
          });
        }
      }
    }

    return conflicts;
  },

  formatConflicts(conflicts) {
    return conflicts.map(c => {
      return `Stage ${c.a.s} (${c.a.f}-${c.a.t}) пересекается с stage ${c.b.s} (${c.b.f}-${c.b.t}) на ${c.overlap.from}-${c.overlap.to}`;
    });
  },

  extractRange(str) {
    const re = /(?:^|[^\p{L}\p{N}])(\d+)(?:\s*-\s*(\d+|\.\.\.))?(?=$|[^\p{L}\p{N}])/u;

    const match = str.match(re);
    if(!match) return null;

    const start = parseInt(match[1], 10);

    if(match[2]) {
      if(match[2] === '...') return [start, start];
      return [start, parseInt(match[2], 10)];
    }

    return [start, start];
  },

  toInt(v) {
    return v == null ? 0 : parseInt(v, 10);
  }

};