import { Static } from "@sinclair/typebox";
import {DEvent, DEventProcessor} from "./d-event";
import { DUseCase } from "./d-use-case";

/**
 * `DApp` - Application layer Mediator.
 * 
 * The main handler of commands or queries. Deals with transactions, dependencies, events processing.
 * Recommended to use two instances - one for commands and one for queries -
 * better to have separated dependencies.
 */
export class DApp<
    DUseCaseDeps, DEventProcessorDeps,
    DUseCases extends DUseCase<string, any, DUseCaseDeps, any>[],
    UCMap extends UseCasesMap<DUseCaseDeps, DUseCases>,
> {
    private useCasesMap: UCMap;
    private dEventProcessorsMap: DEventProcessorsMap<DEventProcessorDeps>;

    constructor(
        private transactionHandler: TransactionHandler<DUseCaseDeps, DEventProcessorDeps>,
        useCases: DUseCases,
        dEventProcessors: DEventProcessor<any, any, DEventProcessorDeps>[],
    ) {
        this.transactionHandler = transactionHandler;
        this.useCasesMap = this.createUseCasesMap(useCases);
        this.dEventProcessorsMap = this.createDEventProcessorsMap(dEventProcessors);
    }

    private createUseCasesMap(useCases: DUseCases): UCMap {
        const useCasesMap = {} as any;
        useCases.forEach(uc => {
            useCasesMap[uc.useCaseName] = uc;
        });
        return useCasesMap;
    }

    private createDEventProcessorsMap(
        dEventProcessors: DEventProcessor<any, any, DEventProcessorDeps>[],
    ): DEventProcessorsMap<DEventProcessorDeps> {
        const dEventProcessorsMap = {} as any;
        dEventProcessors.forEach(handler => {
            if (dEventProcessorsMap[handler.dEventName] === undefined) {
                dEventProcessorsMap[handler.dEventName] = [];
            }
            dEventProcessorsMap[handler.dEventName].push(handler);
        });
        return dEventProcessorsMap;
    }

    getSchema<
        UCName extends (keyof UCMap) & string,
        UCSchema extends UseCaseSchema<UCMap, UCName>
    >(ucName: UCName): UCSchema {
        return (this.useCasesMap[ucName] as DUseCase<UCName, any, any, any>).paramsSchema;
    }

    /**
     * Runs a Use Case in a transaction. Commits at the end and returns a result of the use case.
     * Fallbacks the transaction if the Use Case throws an exception.
     */
    async run<
        UCName extends keyof UCMap,
        UCParams extends UseCaseParams<UCMap, UCName>,
        UCResult extends UseCaseResult<UCMap, UCName>,
    >(ucName: UCName, ucParams: UCParams): Promise<UCResult> {
        const useCase = this.useCasesMap[ucName];
        return await this.transactionHandler<UCResult>(
            async(ucDeps, epDeps) => {
                const dEventsList: DEvent<any>[] = [];
                const dEventHandler = (dEvents: DEvent<any>[]) => {
                    dEventsList.push(...dEvents);
                };
                const result = await (useCase as DUseCase<any, any, any, any>)
                    .execute(ucParams, ucDeps, dEventHandler);
                for (const dEvent of dEventsList) {
                    await this.processDEvent(dEvent, epDeps);
                }
                return result;
            },
        );
    }

    private async processDEvent(domainEvent: DEvent<any>, epDeps: DEventProcessorDeps) {
        const dEventProcessors = this.dEventProcessorsMap[domainEvent.eventName];
        for (const processor of dEventProcessors) {
            await processor.process(domainEvent, epDeps);
        }
    }
}

export type TransactionHandler<UseCaseDependencies, DEventProcessorDependencies> =
    <R>(transaction: (ucDeps: UseCaseDependencies, epDeps: DEventProcessorDependencies) => Promise<R>) => Promise<R>;

type DEventProcessorsMap<Dependencies> = {
    [dEventName: string]: DEventProcessor<any, any, Dependencies>[]
}

type UseCasesMap<Dependencies, UseCases extends DUseCase<string, any, Dependencies, any>[]> = {
    [UC in UseCases[number] as `${UC["useCaseName"]}`]: UC extends DUseCase<any, any, any, any> ? UC : never
}

type UseCaseSchema<UCMap extends UseCasesMap<any, any>, UCName extends keyof UCMap> =
    UCMap[UCName] extends DUseCase<string, infer UCP, any, any> ? UCP : never;

type UseCaseParams<UCMap extends UseCasesMap<any, any>, UCName extends keyof UCMap> =
    UCMap[UCName] extends DUseCase<string, infer UCP, any, any> ? Static<UCP> : never;

type UseCaseResult<UCMap extends UseCasesMap<any, any>, UCName extends keyof UCMap> =
    UCMap[UCName] extends DUseCase<string, any, any, infer UCR> ? UCR : never;
