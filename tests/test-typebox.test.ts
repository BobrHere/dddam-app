import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

describe("Test abilities of typebox", () => {
    test("Test Diff abilities of typebox", () => {
        const t = Type.Object({
            a: Type.Boolean(),
            b: Type.String(),
            c: Type.Object({
                x: Type.Number(),
                y: Type.Number(),
                z: Type.Number(),
            })
        });
        const v = {a: false, b: "", c: {x: 1, y: 2, z: 3}};
        const errors = [...Value.Errors(t, [], v)];
        console.log(`errors: ${JSON.stringify(errors, null, 4)}`)
    })
})