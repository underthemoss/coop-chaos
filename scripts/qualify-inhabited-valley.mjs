import { typescriptModule } from './typescript-module.mjs';
import { validateInhabitedValley } from './inhabited-valley-validation.mjs';
const { authorInhabitedValley, inhabitedPlacements } = await import(await typescriptModule('src/content/inhabited-valley-generator.ts'));
const { direct, flank, ...evidence } = validateInhabitedValley(authorInhabitedValley(), inhabitedPlacements());
console.log(JSON.stringify(evidence,null,2));
