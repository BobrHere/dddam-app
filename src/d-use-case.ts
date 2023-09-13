import {TSchema, Static} from "@sinclair/typebox";
import {Value} from "@sinclair/typebox/value";
import {DEvent} from "./d-event";


/**
 * `DUseCase` - can be used as a Command or a Query of CQRS.
 */
export class DUseCase<
    UseCaseName extends string,
    ParamsSchema extends TSchema,
    Dependencies, UseCaseResult,
> {
    /**
     * 
     * @param useCaseName the name of the Use Case. Will be remembered by the type system
     * in the DApp.
     * @param paramsSchema validation schema of the Use Case parameters.
     * @param useCaseFunc 
     */
    constructor(
        readonly useCaseName: UseCaseName,
        readonly paramsSchema: ParamsSchema,
        private useCaseFunc: UseCaseFunc<Static<ParamsSchema>, Dependencies, UseCaseResult>,
    ) {
        this.useCaseName = useCaseName;
        this.paramsSchema = paramsSchema;
        this.useCaseFunc = useCaseFunc;
    }

    async execute(
        params: Static<ParamsSchema>,
        deps: Dependencies,
        dEventHandler: (dEvent: DEvent<any>[]) => void,
    ): Promise<UseCaseResult> {
        if (!Value.Check(this.paramsSchema, params)) {
            throw new ValidationError(params, this.paramsSchema);
        }
        return await this.useCaseFunc(params, deps, dEventHandler);
    }
}

type UseCaseFunc<UseCaseParams, Dependencies, UseCaseResult> = (
    params: UseCaseParams,
    deps: Dependencies,
    dEventHandler: (dEvent: DEvent<any>[]) => void,
) => Promise<UseCaseResult>;

export class ValidationError extends Error {
    constructor(readonly value: any, readonly schema: TSchema) {
        const valueStr = JSON.stringify(value);
        const schemaStr = JSON.stringify(schema);
        super(`validation error. value: ${valueStr}, schema: ${schemaStr}`);
        this.value = value;
        this.schema = schema;
    }
}
