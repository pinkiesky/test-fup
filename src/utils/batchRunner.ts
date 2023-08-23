import { debounce } from 'lodash';
import Queue from 'queue'
import { once } from 'node:events';

interface IBatchWriterOptions {
  maxBatchSize: number;
  debounceTimeMs: number;
}

interface IBatchWriter<T> {
  (document: T): Promise<void>;
  close(): Promise<void>;
}

interface IBatchRunner<T> {
  (document: T[]): Promise<void>;
}

export function batchRunner<T>(
  runner: IBatchRunner<T>,
  options: IBatchWriterOptions,
): IBatchWriter<T> {
  const batch: T[] = [];
  const queue = new Queue({ autostart: true, concurrency: 1 })

  const flush = async () => {
    if (!batch.length) {
      return;
    }

    const batchCloned = [...batch];
    batch.length = 0;

    queue.push(async () => {
      try {
        await runner(batchCloned);
      } catch (error) {
        console.error(error);
      }
    });
  };
  const debouncedFlush = options.debounceTimeMs
    ? debounce(flush, options.debounceTimeMs, {
        maxWait: options.debounceTimeMs,
      })
    : () => Promise.resolve();

  const func = async (document: T) => {
    batch.push(document as any);

    if (batch.length >= options.maxBatchSize) {
      flush();
    } else {
      debouncedFlush();
    }
  };
  func.close = async () => {
    await flush();

    if (queue.length) {
      await once(queue, 'end');
    } 
  };

  return func;
}
