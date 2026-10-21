import { describe, expect, it } from 'vitest';

import { LatestWins } from './latest-wins.ts';

describe('FEATURE: LatestWins', () => {
  describe('GIVEN a job that is running', () => {
    it('WHEN several jobs arrive THEN only the first and the last run, in that order', async () => {
      const queue = new LatestWins<string>();
      const ran: string[] = [];
      const open = Promise.withResolvers<undefined>();
      const work = async (job: string): Promise<void> => {
        ran.push(job);

        if (job === 'first') await open.promise;
      };

      const first = queue.run('first', work);
      const second = queue.run('second', work);
      const third = queue.run('third', work);

      await Promise.all([second, third]);

      expect(ran).toStrictEqual(['first']);

      open.resolve(undefined);
      await first;

      expect(ran).toStrictEqual(['first', 'third']);
    });

    it('WHEN it throws THEN the queue accepts the next job', async () => {
      const queue = new LatestWins<string>();
      const ran: string[] = [];
      const work = async (job: string): Promise<void> => {
        ran.push(job);
        await Promise.resolve();

        if (job === 'bad') throw new Error('boom');
      };

      await expect(queue.run('bad', work)).rejects.toThrow('boom');
      await queue.run('good', work);

      expect(ran).toStrictEqual(['bad', 'good']);
    });

    it('WHEN it throws with a job waiting THEN the waiting job is dropped, not run after a later one', async () => {
      const queue = new LatestWins<string>();
      const ran: string[] = [];
      const work = async (job: string): Promise<void> => {
        ran.push(job);
        await Promise.resolve();

        if (job === 'bad') throw new Error('boom');
      };

      const bad = queue.run('bad', work);
      const waiting = queue.run('waiting', work);

      await waiting;
      await expect(bad).rejects.toThrow('boom');
      await queue.run('newer', work);

      expect(ran).toStrictEqual(['bad', 'newer']);
    });
  });
});
