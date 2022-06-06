export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
}

const ONE_GB = 1073741824;

const ONE_MB = 1048576;

const ONE_KB = 1024;

export function calculateSize(rawSize: string) {
    const [size, unit] = rawSize.split(" ");

    const baseSize = Number(size);

    switch (unit.toLowerCase()) {
        case "bytes": {
            return baseSize;
        }
        case "kb": {
            return baseSize * ONE_KB;
        }
        case "mb": {
            return baseSize * ONE_MB;
        }
        case "gb": {
            return baseSize * ONE_GB;
        }
        default: {
            return baseSize;
        }
    }
}


export function formatSize(size: number) {
    if(size > ONE_GB) {
        return (size / ONE_GB).toFixed(2) + " GB"; 
    } else if (size > ONE_MB) {
        return (size / ONE_MB).toFixed(2) + " MB";
    } else if (size > ONE_KB) {
        return (size / ONE_KB).toFixed(2) + " KB";
    } else {
        return size + " bytes";
    }
}

export function formatTime(seconds: number) {
    if (isNaN(seconds) || !Number.isFinite(seconds)) {
        return "00:00:00";
    }

    const date = new Date(0);


    date.setSeconds(seconds);

    return `${seconds > 86400 ? Math.floor(seconds / 86400) + "d " : ""}${date.toISOString().substring(11, 19)}`
}