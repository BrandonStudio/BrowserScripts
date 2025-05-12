export type ThreadResponse = {
    threads: Thread[];
};

export type MessagesResponse = {
    thread: Thread;
    messages: Message[];
};

type Thread = {
    id: string;
    name: string;
    repoID: number;
    repoOwnerID: number;
    createdAt: string;
    updatedAt: string;
    sharedAt: string | null;
    associatedRepoIDs: number[];
};

type Message = {
    id: string;
    parentMessageID: string;
    intent: string;
    role: string;
    content: string;
    createdAt: string;
    threadID: string;
    references: Reference[];
    skillExecutions: any[];
    copilotAnnotations: {
        CodeVulnerability: null | any;
        PublicCodeReference: null | any;
    };
    interrupted: boolean;
    confirmations: null | any;
    clientConfirmations: null | any;
};

type Reference = {
    type: string;
    id: number;
    name: string;
    ownerLogin: string;
    ownerType: string;
    readmePath: string;
    description: string;
    commitOID: string;
    ref: string;
    refInfo: {
        name: string;
        type: string;
    };
    visibility: string;
    languages: {
        name: string;
        percent: number;
    }[];
};

export type WebDAVConfig = {
    url: string;
    username: string;
    password: string;
    authHeader: string;
};

export type StoredData = {
    id: string;
    versions: {
        syncedAt: string;
        messages: Message[];
        messageIDs: string[];
    }
}
