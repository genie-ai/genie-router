
function readFromObject(object, key) {
    const parts = key.split('.', 2);
    if (parts.length === 1) {
    // there is no sublevel more to read
        return object[parts[0]];
    }
    // the key demands more sublevels
    if (object[parts[0]]) {
        return readFromObject(object[parts[0]], parts[1]);
    }
    return undefined;
}

function startReadFromObject(object, key, defaultVal) {
    const val = readFromObject(object, key);
    if (val !== undefined) {
        return val;
    }
    return defaultVal;
}

module.exports = startReadFromObject;
