import { sleep } from "./util";

interface LogData {
    totalCount: number,
    successIdList: number[],
    failedIdList: number[],
}

type Logger = (logData: LogData) => void

interface fetchAllProps<ItemType, ResponseType> {
    itemList: ItemType[],
    runFunction: (item: ItemType) => Promise<ResponseType>,
    logger: Logger,
    maxRetryCount?: number,
    maxPoolSize?: number,
    delay?: number,
}

export async function fetchAll<ItemType, ResponseType>({ itemList, runFunction, logger, maxPoolSize = 15, maxRetryCount = 5, delay = 150 }: fetchAllProps<ItemType, ResponseType>) {
    type RequestItem = {
        id: number,
        value: ResponseType,
        rejected: false,
    } | {
        id: number,
        rejected: true,
    }

    const requestHash: { [key: number]: Promise<RequestItem> } = {};

    const successResultList: ResponseType[] = [];
    const successIdList: number[] = [];
    const failedIdList: number[] = [];

    let retriedFailedIdList: number[] = [];

    async function getRequest(id: number) {
        return new Promise<RequestItem>(async resolve => {
            try {
                const value = await runFunction(itemList[id]);

                resolve({ id, value, rejected: false });
            } catch (e) {
                resolve({ id, rejected: true });
            }
        });
    }

    function getLeftPoolSize() {
        return maxPoolSize - Object.values(requestHash).filter(value => value !== undefined).length
    }

    async function getResultFromPool(isRetrying?: boolean) {
        try {
            const result = await Promise.any(Object.values(requestHash));

            if (result.rejected) {
                if (isRetrying) {
                    retriedFailedIdList.push(result.id);
                } else {

                    failedIdList.push(result.id);
                }
            } else {
                successIdList.push(result.id);
                successResultList.push(result.value);
            }

            delete requestHash[result.id];
        } catch (e) {
            // 
        }
    }

    let initialized = false;
    let index = 0;

    while (successResultList.length + failedIdList.length < itemList.length) {
        await getResultFromPool();

        const leftPoolSpace = getLeftPoolSize();

        if (leftPoolSpace > 0) {
            for (let id = index; (id < index + leftPoolSpace) && id < itemList.length; id++) {
                requestHash[id] = getRequest(id);

                if (!initialized) {
                    await sleep(delay);
                }
            }

            index = index + leftPoolSpace;
        }

        initialized = true;

        logger({
            totalCount: itemList.length,
            successIdList,
            failedIdList,
        });
    }

    retriedFailedIdList = failedIdList;

    let retryCount = 0;
    let retryCountInCycle = 0;
    let totalRetryCountInCycle = retriedFailedIdList.length;

    while ((retryCount < maxRetryCount && retriedFailedIdList.length > 0)) {
        await getResultFromPool(true);

        const leftPoolSpace = getLeftPoolSize();

        let usedPoolCount = 0;

        if (leftPoolSpace > 0) {
            for (let id of retriedFailedIdList) {
                if (usedPoolCount >= leftPoolSpace) {
                    continue;
                }

                requestHash[id] = getRequest(id);

                retriedFailedIdList = retriedFailedIdList.filter(failedId => failedId !== id);

                usedPoolCount++;
                retryCountInCycle++;

                await sleep(delay);
            }
        }

        logger({
            totalCount: itemList.length,
            successIdList,
            failedIdList,
        });

        if (retryCountInCycle >= totalRetryCountInCycle) {
            retryCount++;
            retryCountInCycle = 0;
            totalRetryCountInCycle = retriedFailedIdList.length;
        }
    }

    return { successResultList, successIdList, failedIdList };
}