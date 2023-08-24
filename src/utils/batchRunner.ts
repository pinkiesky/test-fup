import { debounce } from "lodash";
import Queue from "queue";
import { once } from "node:events";
import { getLogger } from "./logger";

const logger = getLogger("batchRunner");

interface IBatchRunnerOptions {
  maxBatchSize: number;
  debounceTimeMs: number;
  onError?: (error: Error) => void;
}

interface IBatchRunner<T> {
  pushToBatch(elem: T): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}

interface ITask<T> {
  (batch: T[]): Promise<void>;
}

export function batchRunner<T>(
  task: ITask<T>,
  options: IBatchRunnerOptions,
): IBatchRunner<T> {
  let isClosed = false;

  const batch: T[] = [];
  const queue = new Queue({ autostart: true, concurrency: 1 });

  const flush = async () => {
    if (!batch.length) {
      return;
    }

    const batchCloned = [...batch];
    batch.length = 0;

    queue.push(async () => {
      try {
        await task(batchCloned);
      } catch (error: any) {
        if (options.onError) {
          options.onError(error);
        } else {
          logger.error("unhandled error in batchRunner", error);
        }
      }
    });
  };
  const debouncedFlush = options.debounceTimeMs
    ? debounce(flush, options.debounceTimeMs, {
        maxWait: options.debounceTimeMs,
      })
    : null;

  const pushToBatch = async (document: T) => {
    if (isClosed) {
      throw new Error("batchRunner is closed");
    }

    batch.push(document);

    if (batch.length >= options.maxBatchSize) {
      flush();
    }

    debouncedFlush?.();
  };

  return {
    pushToBatch,
    flush,
    close: async () => {
      isClosed = true;

      await debouncedFlush?.flush();
      await flush();

      if (queue.length) {
        await once(queue, "end");
      }
    },
  };
}
