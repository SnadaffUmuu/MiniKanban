const SHAPES = {
  egg: {
    path: 'M 205 20 C 291 20 354 91 374 188 C 409 348 326 444 198 445 C 73 446 13 359 24 240 C 32 116 108 24 205 20 Z',
    bbox: {
      x: 22.719028,
      y: 20,
      width: 359.323177,
      height: 425.008533
    }
  },
  blob: {
    path: 'M 202 25 C 296 -1 364 59 355 124 C 343 171 407 187 376 262 C 354 310 383 369 307 416 C 255 454 200 428 148 443 C 80 458 16 401 35 330 C 44 290 6 235 30 183 C 50 135 83 163 93 94 C 103 46 149 52 202 25 Z',
    bbox: {
      x: 21.921118,
      y: 18.789873,
      width: 362.647197,
      height: 426.623944
    }
  },
  canopy: {
    path: 'M 200 32 C 244 -4 277 12 291 65 C 305 93 324 67 345 83 C 381 111 346 148 352 176 C 359 197 394 201 384 247 C 375 279 339 275 352 318 C 366 382 305 405 268 391 C 235 371 241 450 195 446 C 151 446 156 378 119 395 C 48 432 20 374 38 319 C 51 283 5 271 17 232 C 26 196 68 202 64 171 C 57 127 74 95 109 94 C 135 92 123 33 164 25 C 179 21 190 29 200 32 Z',
    bbox: {
      x: 14.982482,
      y: 12.633669,
      width: 370.800971,
      height: 433.513562
    }
  }
};

const SETTINGS = {
  ALPHA: 0.5,
  PHI0: 0.05,
  D_PREF: 3,
  D_FLOOR: 1.2,
  D_MAX: 8,
  OMEGA: 0.65,
  // Six iterations are the only guard against visible crystallization; there
  // is no automatic grid detector. The audited share of strongly ordered
  // points rises from about 1.6% initially to 7.6% here and 13% at convergence.
  // Six is visually approved; increase it only after another visual review.
  ITERATIONS: 6,
  CANDIDATES: 18,
  RESOLUTION: 2,
  PADDING: 9
};

let layoutCache = null;

function randomFrom(seed) {
  let state = 2166136261;
  const text = String(seed);
  for(let i = 0;i < text.length;i++) {
    state ^= text.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  return function () {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function square(value) {
  return value * value;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function format(value, digits) {
  return Number(value).toFixed(digits);
}

function fitShape(shape, width, height) {
  const bbox = shape.bbox;
  const scale = Math.min(
    (width - 2 * SETTINGS.PADDING) / bbox.width,
    (height - 2 * SETTINGS.PADDING) / bbox.height
  );
  const offsetX = (width - scale * bbox.width) / 2 - scale * bbox.x;
  const offsetY = (height - scale * bbox.height) / 2 - scale * bbox.y;
  return {
    scale,
    offsetX,
    offsetY,
    transform: `translate(${format(offsetX, 4)} ${format(offsetY, 4)}) scale(${format(scale, 6)})`
  };
}

function createRegion(shape, width, height) {
  const resolution = SETTINGS.RESOLUTION;
  const pixelWidth = Math.round(width * resolution);
  const pixelHeight = Math.round(height * resolution);
  const fit = fitShape(shape, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if(!context) throw Error('Unable to create the book tree canvas context.');
  context.setTransform(
    resolution * fit.scale,
    0,
    0,
    resolution * fit.scale,
    resolution * fit.offsetX,
    resolution * fit.offsetY
  );
  context.fillStyle = '#fff';
  context.fill(new Path2D(shape.path));

  const rgba = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
  const mask = new Uint8Array(pixelWidth * pixelHeight);
  const indices = [];
  for(let i = 0;i < mask.length;i++) {
    if(rgba[4 * i + 3] >= 128) {
      mask[i] = 1;
      indices.push(i);
    }
  }
  if(!indices.length) throw Error('Book tree region is empty.');

  const distances = new Float32Array(mask.length);
  const diagonal = Math.SQRT2;
  for(let i = 0;i < mask.length;i++) {
    const x = i % pixelWidth;
    const y = Math.floor(i / pixelWidth);
    distances[i] = !mask[i]
      || x === 0
      || x === pixelWidth - 1
      || y === 0
      || y === pixelHeight - 1
      ? 0
      : 1e5;
  }

  for(let y = 1;y < pixelHeight - 1;y++) {
    for(let x = 1;x < pixelWidth - 1;x++) {
      const i = y * pixelWidth + x;
      if(mask[i]) {
        distances[i] = Math.min(
          distances[i],
          1 + distances[i - 1],
          1 + distances[i - pixelWidth],
          diagonal + distances[i - pixelWidth - 1],
          diagonal + distances[i - pixelWidth + 1]
        );
      }
    }
  }

  for(let y = pixelHeight - 2;y >= 1;y--) {
    for(let x = pixelWidth - 2;x >= 1;x--) {
      const i = y * pixelWidth + x;
      if(mask[i]) {
        distances[i] = Math.min(
          distances[i],
          1 + distances[i + 1],
          1 + distances[i + pixelWidth],
          diagonal + distances[i + pixelWidth + 1],
          diagonal + distances[i + pixelWidth - 1]
        );
      }
    }
  }

  return {
    width,
    height,
    pixelWidth,
    pixelHeight,
    resolution,
    indices,
    area: indices.length / (resolution * resolution),
    transform: fit.transform,

    inside(x, y) {
      const ix = Math.floor(x * resolution);
      const iy = Math.floor(y * resolution);
      return ix >= 0
        && ix < pixelWidth
        && iy >= 0
        && iy < pixelHeight
        && !!mask[iy * pixelWidth + ix];
    },

    at(index, random) {
      return {
        x: ((index % pixelWidth) + 0.5 + (random() - 0.5) * 0.7) / resolution,
        y: (Math.floor(index / pixelWidth) + 0.5 + (random() - 0.5) * 0.7) / resolution
      };
    },

    sample(random) {
      return this.at(indices[Math.floor(random() * indices.length)], random);
    },

    clearance(x, y) {
      const ix = Math.floor(x * resolution);
      const iy = Math.floor(y * resolution);
      return ix >= 0 && ix < pixelWidth && iy >= 0 && iy < pixelHeight
        ? distances[iy * pixelWidth + ix] / resolution
        : 0;
    }
  };
}

function diameter(step) {
  const coverage = Math.sqrt(2 * Math.sqrt(3) * SETTINGS.PHI0 / Math.PI);
  const raw = Math.pow(SETTINGS.D_PREF, SETTINGS.ALPHA)
    * Math.pow(coverage * step, 1 - SETTINGS.ALPHA);
  return clamp(
    raw,
    Math.min(SETTINGS.D_FLOOR, SETTINGS.D_MAX, 0.48 * step),
    Math.min(SETTINGS.D_MAX, 0.48 * step)
  );
}

function safePosition(point, region, radius) {
  if(region.inside(point.x, point.y) && region.clearance(point.x, point.y) >= radius + 0.7) {
    return point;
  }

  const x0 = Math.floor(point.x * region.resolution);
  const y0 = Math.floor(point.y * region.resolution);
  for(let ring = 0;ring <= Math.max(region.pixelWidth, region.pixelHeight);ring++) {
    let best = null;
    let bestDistance = Infinity;
    for(let y = Math.max(0, y0 - ring);y <= Math.min(region.pixelHeight - 1, y0 + ring);y++) {
      for(let x = Math.max(0, x0 - ring);x <= Math.min(region.pixelWidth - 1, x0 + ring);x++) {
        if(Math.max(Math.abs(x - x0), Math.abs(y - y0)) !== ring) continue;
        const candidate = {
          x: (x + 0.5) / region.resolution,
          y: (y + 0.5) / region.resolution
        };
        if(region.clearance(candidate.x, candidate.y) < radius + 0.7) continue;
        const distance = square(candidate.x - point.x) + square(candidate.y - point.y);
        if(distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
    }
    if(best) return best;
  }
  throw Error('Book tree dots do not fit inside the region.');
}

class SpatialIndex {
  constructor(points, cellSize, width, height) {
    this.cell = cellSize;
    this.cols = Math.ceil(width / cellSize) + 2;
    this.rows = Math.ceil(height / cellSize) + 2;
    this.buckets = Array.from({length: this.cols * this.rows}, () => []);
    this.points = points;
    for(let i = 0;i < points.length;i++) this.add(i);
  }

  add(index) {
    const point = this.points[index];
    const x = clamp(Math.floor(point.x / this.cell), 0, this.cols - 1);
    const y = clamp(Math.floor(point.y / this.cell), 0, this.rows - 1);
    this.buckets[y * this.cols + x].push(index);
  }

  nearest(point) {
    const cx = clamp(Math.floor(point.x / this.cell), 0, this.cols - 1);
    const cy = clamp(Math.floor(point.y / this.cell), 0, this.rows - 1);
    let best = Infinity;
    let id = -1;

    for(let ring = 0;ring < Math.max(this.cols, this.rows);ring++) {
      const left = Math.max(0, cx - ring);
      const right = Math.min(this.cols - 1, cx + ring);
      const top = Math.max(0, cy - ring);
      const bottom = Math.min(this.rows - 1, cy + ring);

      for(let y = top;y <= bottom;y++) {
        for(let x = left;x <= right;x++) {
          if(ring && x !== left && x !== right && y !== top && y !== bottom) continue;
          const bucket = this.buckets[y * this.cols + x];
          for(let i = 0;i < bucket.length;i++) {
            const candidateId = bucket[i];
            const candidate = this.points[candidateId];
            const distance = square(point.x - candidate.x) + square(point.y - candidate.y);
            if(distance < best) {
              best = distance;
              id = candidateId;
            }
          }
        }
      }

      const limits = [];
      if(left > 0) limits.push(point.x - left * this.cell);
      if(right < this.cols - 1) limits.push((right + 1) * this.cell - point.x);
      if(top > 0) limits.push(point.y - top * this.cell);
      if(bottom < this.rows - 1) limits.push((bottom + 1) * this.cell - point.y);
      if(id >= 0 && (!limits.length || square(Math.min.apply(Math, limits)) >= best)) break;
    }
    return {id, distance: best};
  }
}

function initialPoints(count, region, step, random, radius) {
  const points = [safePosition(region.sample(random), region, radius)];
  const grid = new SpatialIndex(points, step, region.width, region.height);
  while(points.length < count) {
    let best = null;
    let bestDistance = -1;
    for(let i = 0;i < SETTINGS.CANDIDATES;i++) {
      const candidate = region.sample(random);
      if(region.clearance(candidate.x, candidate.y) < radius + 0.7) continue;
      const distance = grid.nearest(candidate).distance;
      if(distance > bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    if(!best) best = safePosition(region.sample(random), region, radius);
    points.push(best);
    grid.add(points.length - 1);
  }
  return points;
}

function makeSamples(region, count, random) {
  const samples = new Array(count);
  for(let i = 0;i < count;i++) samples[i] = region.sample(random);
  return samples;
}

function evaluate(points, samples, region, step) {
  const grid = new SpatialIndex(points, step, region.width, region.height);
  const totalsX = new Float64Array(points.length);
  const totalsY = new Float64Array(points.length);
  const counts = new Uint32Array(points.length);
  let energy = 0;
  for(let i = 0;i < samples.length;i++) {
    const nearest = grid.nearest(samples[i]);
    totalsX[nearest.id] += samples[i].x;
    totalsY[nearest.id] += samples[i].y;
    counts[nearest.id]++;
    energy += nearest.distance;
  }
  return {totalsX, totalsY, counts, energy: energy / samples.length};
}

function separation(points) {
  let minimum = Infinity;
  for(let i = 0;i < points.length;i++) {
    for(let j = 0;j < i;j++) {
      const distance = square(points[i].x - points[j].x)
        + square(points[i].y - points[j].y);
      if(distance < minimum) minimum = distance;
    }
  }
  return Math.sqrt(minimum);
}

function validateInput(input) {
  const width = Number(input.width);
  const height = Number(input.height);
  const count = Number(input.n);
  if(!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw Error('Book tree dimensions must be finite and greater than zero.');
  }
  if(!Number.isFinite(count) || count < 0 || Math.floor(count) !== count) {
    throw Error('Book tree page count must be a non-negative integer.');
  }
  const shapeKey = SHAPES[input.shape] ? input.shape : 'egg';
  return {
    seed: String(input.seed),
    width,
    height,
    count,
    shapeKey,
    shape: SHAPES[shapeKey]
  };
}

function emptyLayout(data) {
  const fit = fitShape(data.shape, data.width, data.height);
  return {
    points: [],
    diameter: 0,
    outline: {
      path: data.shape.path,
      transform: fit.transform
    },
    width: data.width,
    height: data.height,
    shape: data.shapeKey
  };
}

function generate(input) {
  const data = validateInput(input);
  if(data.count === 0) return emptyLayout(data);

  const cacheKey = `${data.seed}:${data.shapeKey}:${data.count}:${data.width}:${data.height}`;
  if(layoutCache && layoutCache.key === cacheKey) return layoutCache.value;

  const region = createRegion(data.shape, data.width, data.height);
  const step = Math.sqrt(2 * region.area / (Math.sqrt(3) * data.count));
  const preferredDiameter = diameter(step);
  const random = randomFrom(`${data.seed}:${data.shapeKey}:${data.count}`);
  const samples = makeSamples(region, Math.min(120 * data.count, 85000), random);
  const attempts = data.count <= 30 ? 3 : 1;
  let points = null;
  let bestEnergy = Infinity;

  for(let attempt = 0;attempt < attempts;attempt++) {
    const candidatePoints = initialPoints(
      data.count,
      region,
      step,
      random,
      preferredDiameter / 2
    );
    const assessment = evaluate(candidatePoints, samples, region, step);
    if(assessment.energy < bestEnergy) {
      bestEnergy = assessment.energy;
      points = candidatePoints;
    }
  }

  let current = evaluate(points, samples, region, step);
  for(let iteration = 0;iteration < SETTINGS.ITERATIONS;iteration++) {
    const proposed = points.map((point, index) => {
      if(!current.counts[index]) return point;
      const center = {
        x: current.totalsX[index] / current.counts[index],
        y: current.totalsY[index] / current.counts[index]
      };
      return safePosition({
        x: point.x + SETTINGS.OMEGA * (center.x - point.x),
        y: point.y + SETTINGS.OMEGA * (center.y - point.y)
      }, region, preferredDiameter / 2);
    });
    const next = evaluate(proposed, samples, region, step);
    if(next.energy > current.energy + 1e-8) break;
    const improvement = (current.energy - next.energy) / Math.max(1, current.energy);
    points = proposed;
    current = next;
    if(improvement < 0.00015) break;
  }

  const closest = separation(points);
  let boundary = Infinity;
  for(let i = 0;i < points.length;i++) {
    boundary = Math.min(boundary, region.clearance(points[i].x, points[i].y));
  }
  const finalDiameter = Math.max(0, Math.min(
    preferredDiameter,
    closest - 0.8,
    2 * boundary - 1.4
  ));
  const result = {
    points,
    diameter: finalDiameter,
    outline: {
      path: data.shape.path,
      transform: region.transform
    },
    width: data.width,
    height: data.height,
    shape: data.shapeKey
  };
  layoutCache = {key: cacheKey, value: result};
  return result;
}

export const BookTree = {
  defaultShape: 'egg',

  hasShape(shape) {
    return !!SHAPES[shape];
  },

  generate
};