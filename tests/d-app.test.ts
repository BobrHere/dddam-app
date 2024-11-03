import { Type } from "@sinclair/typebox"
import {DApp, DEvent, DEventProcessor, DUseCase, ValidationError} from "../src"

class User {
    events: DEvent<any>[];

    constructor(
        readonly username: string,
        public hashedPassword: string,
        public age: number | null,
        public status: string | null,
    ) {
        this.username = username;
        this.hashedPassword = hashedPassword;
        this.age = age;
        this.status = status;
    }
}

class UserRepo {
    users: User[] = [];

    add(user: User) {
        if (this.users.find(u => u.username === user.username)) {
            throw new Error('user already exists');
        }
        this.users.push(user);
    }

    get(username: string) {
        return this.users.find(u => u.username === username);
    }

    remove(user: User) {
        this.users = this.users.filter(u => u !== user);
    }
}

type Dependencies = {
    userRepo: UserRepo,
}

class UserAdded {
    eventName = "USER ADDED" as const;

    constructor(readonly username: string) {
        this.username = username;
    }
}

describe("test DApp", () => {
    let addedUsers = 0;

    const createUserUseCase = new DUseCase(
        "create user",
        Type.Object({
            username: Type.String(),
            password: Type.String(),
            age: Type.Optional(Type.Number()),
            status: Type.Optional(Type.String()),
        }),
        async(params, deps: Dependencies, useCaseName, handleDEvent) => {
            console.log(`${useCaseName}...`);
            deps.userRepo.add(new User(
                params.username,
                "x",
                params.age ?? null,
                params.status ?? null,
            ));
            handleDEvent([new UserAdded(params.username)]);
        }
    );

    const deleteUserUseCase = new DUseCase(
        "delete user",
        Type.Object({
            username: Type.String(),
        }),
        async(params, deps: Dependencies, useCaseName, handleDEvent) => {
            console.log(`${useCaseName}...`);
            const user = deps.userRepo.get(params.username);
            if (user)
                deps.userRepo.remove(user);
        }
    );

    const postUseCase = new DUseCase(
        "post",
        Type.Object({
            username: Type.String(),
        }),
        async(params, deps: Dependencies, useCaseName, handleDEvent) => {
            console.log(`${useCaseName}...`);
            const user = deps.userRepo.get(params.username);
            if (user)
                deps.userRepo.remove(user);
        }
    );


    type EventDeps = {
        x: number
    }

    const countUsersProc = new DEventProcessor("USER ADDED", async(dEvent: UserAdded, deps: EventDeps) => {
        addedUsers++;
    });

    const printEvent = new DEventProcessor("USER ADDED", async(dEvent: UserAdded, deps) => {
        console.log(dEvent);
    });

    const app = new DApp(
        async (t: (ucDeps: Dependencies, epDeps: EventDeps) => Promise<any>) => await t({userRepo: new UserRepo()}, {x: 1}),
        [createUserUseCase, deleteUserUseCase, postUseCase],
        [countUsersProc, printEvent],
    );

    test("test commands and events", async() => {
        console.log(JSON.stringify(app, null, 2));
        await app.run("create user", {username: "albo", password: "ololol"});

        expect(addedUsers).toBe(1);
    });

    test("test command verification error", async () => {
        let error: ValidationError;
        try {
            await app.run("create user", {username: "albo"} as any);
        } catch (e) {
            error = e;
        }
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.errors).not.toHaveLength(0);
        console.log(`errors: ${JSON.stringify(error.errors, null, 2)}`);
    });
})
