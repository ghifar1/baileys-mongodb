"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMongoDbAuthState = void 0;
const baileys_1 = require("@whiskeysockets/baileys");
const mongodb_1 = require("mongodb");
const connectToMongoDB = async (mongoUri, database = "whatsappBot") => {
    let uri = "";
    if (typeof mongoUri === "string") {
        uri = mongoUri;
    }
    else {
        uri = `mongodb${mongoUri.isSrv ? "+srv" : ""}://${mongoUri.username}:${mongoUri.password}@${mongoUri.host}:${mongoUri.port}/${database}`;
    }
    if (uri == "" || uri == undefined || uri == null)
        throw new Error("invalid uri");
    try {
        const client = new mongodb_1.MongoClient(uri);
        await client.connect();
        const db = client.db(database);
        const collection = db.collection("credentials");
        console.log("success connected to mongodb");
        return collection;
    }
    catch (error) {
        console.error("error when connect to mongodb", error);
    }
};
const useMongoDbAuthState = async (mongoUri, identifier = "default", database = "whatsappBot") => {
    let collection = await connectToMongoDB(mongoUri, database);
    if (collection === undefined)
        throw new Error("cannot get collection mongodb");
    const readData = async (fileName) => {
        try {
            const query = {
                filename: fixFileName(fileName),
                identifier: identifier
            };
            const data = await (collection === null || collection === void 0 ? void 0 : collection.findOne(query));
            return JSON.parse(data === null || data === void 0 ? void 0 : data.datajson, baileys_1.BufferJSON.reviver);
        }
        catch (error) {
            return null;
        }
    };
    const writeData = async (datajson, fileName) => {
        try {
            const query = {
                filename: fixFileName(fileName),
                identifier: identifier
            };
            const data = {
                $set: {
                    filename: fixFileName(fileName),
                    identifier: identifier,
                    datajson: JSON.stringify(datajson, baileys_1.BufferJSON.replacer)
                }
            };
            await (collection === null || collection === void 0 ? void 0 : collection.updateOne(query, data, {
                upsert: true
            }));
        }
        catch (error) {
            throw error;
        }
    };
    const removeData = async (fileName) => {
        try {
            const query = {
                filename: fileName,
                identifier: identifier
            };
            await (collection === null || collection === void 0 ? void 0 : collection.deleteOne(query));
        }
        catch (error) {
            throw error;
        }
    };
    const clearAll = async () => {
        try {
            const query = {
                identifier: identifier
            };
            await (collection === null || collection === void 0 ? void 0 : collection.deleteMany(query));
        }
        catch (error) {
            throw error;
        }
    };
    const fixFileName = (file) => { var _a; return (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, '__')) === null || _a === void 0 ? void 0 : _a.replace(/:/g, '-'); };
    const getCreds = await readData("creds.json");
    const creds = getCreds || (0, baileys_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    // @ts-ignore
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            value = baileys_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds.json');
        },
        clearAll
    };
};
exports.useMongoDbAuthState = useMongoDbAuthState;
