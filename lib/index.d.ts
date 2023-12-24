import { AuthenticationCreds } from "@whiskeysockets/baileys";
type mongoUriObject = {
    username: string | null;
    password: string | null;
    host: string;
    port: number;
    isSrv: boolean;
};
export declare const useMongoDbAuthState: (mongoUri: string | mongoUriObject, identifier?: string, database?: string) => Promise<{
    state: {
        creds: AuthenticationCreds;
        keys: {
            get: (type: any, ids: any) => Promise<{
                [_: string]: any;
            }>;
            set: (data: any) => Promise<void>;
        };
    };
    saveCreds: () => Promise<void>;
    clearAll: () => Promise<void>;
}>;
export {};
