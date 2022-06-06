import { sleep } from "./util";

interface LogData {
    totalCount: number,
    successIdList: number[],
    failedIdList: number[],
}

type Logger = (logData: LogData) => void

interface hashbasedPoolProps<ItemType, ResponseType> {
    itemList: ItemType[],
    maxPoolSize: number,
    maxRetryCount: number,
    runFunction: (item: ItemType) => Promise<ResponseType>,
    logger: Logger,
}

export async function hashbasedPool<ItemType, ResponseType>({ itemList, runFunction, maxPoolSize, maxRetryCount, logger }: hashbasedPoolProps<ItemType, ResponseType>) {
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
    let retryingFailedIdList: number[] = [];

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
                    retryingFailedIdList.push(result.id);
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
                    await sleep(150);
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

    retryingFailedIdList = failedIdList;

    let retryCount = 0;
    let retriedCount = 0;
    let retryingCount = retryingFailedIdList.length;

    while ((retryCount < maxRetryCount && retryingFailedIdList.length > 0)) {
        await getResultFromPool(true);

        const leftPoolSpace = getLeftPoolSize();

        let newPoolSize = 0;

        if (leftPoolSpace > 0) {
            for (let id of retryingFailedIdList) {
                if (newPoolSize >= leftPoolSpace) {
                    continue;
                }

                requestHash[id] = getRequest(id);

                retryingFailedIdList = retryingFailedIdList.filter(failedId => failedId !== id);

                newPoolSize++;
                retriedCount++;

                await sleep(150);
            }
        }

        logger({
            totalCount: itemList.length,
            successIdList,
            failedIdList,
        });

        if (retriedCount >= retryingCount) {
            retryCount++;
            retriedCount = 0;
            retryingCount = retryingFailedIdList.length;
        }
    }

    return { successResultList, successIdList, failedIdList };
}