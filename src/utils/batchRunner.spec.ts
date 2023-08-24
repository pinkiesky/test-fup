import { batchRunner } from "./batchRunner";

jest.useFakeTimers();

describe("batchRunner", () => {
  it("should batch the documents", async () => {
    const task = jest.fn();
    const batch = batchRunner(task, {
      maxBatchSize: 2,
      debounceTimeMs: 100,
    });

    batch.pushToBatch(1);
    batch.pushToBatch(2);
    batch.pushToBatch(3);
    batch.pushToBatch(4);
    batch.pushToBatch(5);
    batch.pushToBatch(6);
    batch.pushToBatch(7);
    batch.pushToBatch(8);
    batch.pushToBatch(9);
    batch.pushToBatch(10);

    await batch.close();

    expect(task).toHaveBeenCalledTimes(5);
    expect(task).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(task).toHaveBeenNthCalledWith(2, [3, 4]);
    expect(task).toHaveBeenNthCalledWith(3, [5, 6]);
    expect(task).toHaveBeenNthCalledWith(4, [7, 8]);
    expect(task).toHaveBeenNthCalledWith(5, [9, 10]);
  });

  it("should debounce the documents", async () => {
    const task = jest.fn();
    const batch = batchRunner(task, {
      maxBatchSize: 4,
      debounceTimeMs: 100,
    });

    batch.pushToBatch(1);
    batch.pushToBatch(2);
    batch.pushToBatch(3);
    jest.runAllTimers();

    expect(task).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenNthCalledWith(1, [1, 2, 3]);
  });
});
