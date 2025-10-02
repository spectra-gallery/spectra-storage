// Simple semaphore to cap concurrent heavy tasks (e.g., Puppeteer)
class Semaphore {
  constructor(limit = 1) {
    this.limit = Math.max(1, Number(limit) || 1);
    this.active = 0;
    this.queue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.active < this.limit) {
          this.active += 1;
          resolve(this._release.bind(this));
        } else {
          this.queue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  _release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

// Global semaphore instance; limit can be overridden via env
const limit = process.env.PUPPETEER_MAX_CONCURRENCY || 1;
const puppeteerSemaphore = new Semaphore(limit);

module.exports = { Semaphore, puppeteerSemaphore };

