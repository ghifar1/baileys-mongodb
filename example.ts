import makeWASocket, { ConnectionState, DisconnectReason, WAConnectionState, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { useMongoDbAuthState } from './lib'

async function connectToWhatsApp() {
    const { state, saveCreds, clearAll } = await useMongoDbAuthState({
        host: "",
        password: "",
        port: 32701,
        username: "root",
        isSrv: false
    })

    // const {state, saveCreds} = await useMultiFileAuthState("coba");

    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state,
    })
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect!.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect!.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if (shouldReconnect) {
                connectToWhatsApp()
            } else {
                clearAll()
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('messages.upsert', async m => {
        console.log(JSON.stringify(m, undefined, 2))
    })
}
// run in main file
connectToWhatsApp()