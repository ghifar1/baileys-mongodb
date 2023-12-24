import { AuthenticationCreds, BufferJSON, SignalDataTypeMap, initAuthCreds, proto } from "@whiskeysockets/baileys"
import { MongoClient } from "mongodb";

type mongoUriObject = {
    username: string | null
    password: string | null
    host: string
    port: number
    isSrv: boolean
}

const connectToMongoDB = async (mongoUri: string | mongoUriObject, database: string = "whatsappBot") => {
    let uri = "";
    if (typeof mongoUri === "string") {
        uri = mongoUri
    } else {
        uri = `mongodb${mongoUri.isSrv ? "+srv": ""}://${mongoUri.username}:${mongoUri.password}@${mongoUri.host}:${mongoUri.port}/${database}`
    }

    if (uri == "" || uri == undefined || uri == null) throw new Error("invalid uri")

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db(database)
        const collection = db.collection("credentials")

        console.log("success connected to mongodb");

        return collection;
    } catch (error) {
        console.error("error when connect to mongodb", error);
    }
}

export const useMongoDbAuthState = async (mongoUri: string | mongoUriObject, identifier: string = "default", database: string = "whatsappBot") => {

    let collection = await connectToMongoDB(mongoUri, database)

    if (collection === undefined) throw new Error("cannot get collection mongodb")

    const readData = async (fileName: string) => {
        try {
            const query = {
                filename: fixFileName(fileName),
                identifier: identifier
            }
            const data = await collection?.findOne(query)
            return JSON.parse(data?.datajson, BufferJSON.reviver)
        } catch (error) {
            return null
        }
    }

    const writeData = async (datajson: any, fileName: string): Promise<void> => {
        try {
            const query = {
                filename: fixFileName(fileName),
                identifier: identifier
            }
            const data = {
                $set: {
                    filename: fixFileName(fileName),
                    identifier: identifier,
                    datajson: JSON.stringify(datajson, BufferJSON.replacer)
                }
            }
            await collection?.updateOne(query, data, {
                upsert: true
            })
        } catch (error) {
            throw error
        }
    }

    const removeData = async (fileName: string): Promise<void> => {
        try {
            const query = {
                filename: fileName,
                identifier: identifier
            }
            await collection?.deleteOne(query)
        } catch (error) {
            throw error
        }
    }

    const clearAll = async (): Promise<void> => {
        try {
            const query = {
                identifier: identifier
            }
            await collection?.deleteMany(query)
        } catch (error) {
            throw error
        }
    }

    const fixFileName = (file?: string) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

    const getCreds = await readData("creds.json")

    const creds: AuthenticationCreds = getCreds || initAuthCreds()

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    // @ts-ignore
                    const data: { [_: string]: SignalDataTypeMap[typeof type] } = {}
                    await Promise.all(
                        ids.map(
                            async id => {
                                let value = await readData(`${type}-${id}.json`)
                                if (type === 'app-state-sync-key' && value) {
                                    value = proto.Message.AppStateSyncKeyData.fromObject(value)
                                }

                                data[id] = value
                            }
                        )
                    )

                    return data
                },
                set: async (data) => {
                    const tasks: Promise<void>[] = []
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id]
                            const file = `${category}-${id}.json`
                            tasks.push(value ? writeData(value, file) : removeData(file))
                        }
                    }

                    await Promise.all(tasks)
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds.json')
        },
        clearAll
    }
}
