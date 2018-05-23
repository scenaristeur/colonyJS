---
title: Get Started
section: Docs
order: 2
---

The task lifecycle is a great way to get a complete picture of how colonyJS works with the Colony Network. If you're a seasoned developer, or more of an "I'll just figure it out myself" type, you might want to jump to the [Quickstart](/colonyjs/docs-quickstart/).

The most useful tool within a colony is the `task` method. Tasks are used to coordinate work, track reputation, and ultimately the only way to get paid through a colony. See [tasks](/colonynetwork/docs-tasks/) for a complete description of what tasks are within a colony.

Using colonyJS, you can query the blockchain for information about tasks, create new tasks, modify them, commit and reveal ratings, and finalize them to trigger payouts -- all from within your application.

## Getting Started
First of all, we will need to set up some prerequisites (clients for the Colony Network and for a specific Colony).

If you haven't done so already, add the required libraries to your project with `yarn`:

```bash
yarn add @colony/colony-js-client @colony/colony-js-adapter-ethers @colony/colony-js-contract-loader-http @colony/colony-wallet
```

For your application to be able to communicate with colony, you'll need to configure a [Loader](/colonyjs/docs-loaders/) to read contracts, an [Adapter](/colonyjs/docs-adapters/) to communicate with the blockchain, and a wallet to be able to send transactions that require a signature.

```js
import ColonyNetworkClient, { ROLES } from '@colony/colony-js-client';

import EthersAdapter from '@colony/colony-js-adapter-ethers';

import { TrufflepigLoader } from '@colony/colony-js-contract-loader-http';

import { software as wallet } from 'colony-wallet/wallets';
import { localhost } from 'colony-wallet/providers';

const loader = new TrufflepigLoader();
const provider = localhost('http://localhost:8545/');

const adapter = new EthersAdapter({ loader, provider, wallet });

// Create a ColonyNetworkClient instance
const networkClient = new ColonyNetworkClient({ adapter });
await networkClient.init();


```

You'll need to either create a new colony or talk to an existing one.

```js
// To create a new cool colony:
const colonyData = {
    name: 'MyCoolColony', // Unique name for the colony
    tokenAddress: '0xf000000000000000000000000000000000000000', // Address of the colony's native token
  };

  // Create a cool Colony!
  const { eventData: { colonyId }} = await networkClient.createColony.send(colonyData);

  // Congrats, you've created a Colony!
  console.log(colonyId);

```

```js
// For a colony that exists already, you just need its name
const colonyClient = await networkClient.getColonyClient({ key: 'MyCoolColony' });
```


## Task Life-cycle
Once the colony is configured and everything has been initialized, you can start the task workflow.

### Create
A newly created task must be assigned to a domain and must reference a `specificationHash` for the task's completion. Also known as a "Task Brief", the task specification is a description of the work to be done and how that work will be evaluated.

```js
const { eventData: { taskId } } = await colonyClient.createTask.send({
  specificationHash: 'specification hash goes here',
  domainId: 1,
});
```

Once a task has been created, it can be examined:

```js
const task = await colonyClient.getTask.call({ taskId: 1 });

```

At any time before a task is finalized, the task can be canceled, which allows any funding to be returned to the colony and halts any further modification of the task.

```js
await colonyClient.cancelTask.send({ taskId: 1 });
```

### Modify
After the task has been created, the task may be modified to include additional data. This could be setting the task's worker or manager, or skill tag(s).

```js
// Set the manager
await colonyClient.setTaskRoleUser.send({
  taskId: 1,
  role: ROLES.MANAGER,
  user: 'wallet address of manager',
});

// Set the worker
await colonyClient.setTaskRoleUser.send({
  taskId: 1,
  role: ROLES.WORKER,
  user: 'wallet address of worker',
});

// Set the task Domain
await colonyClient.setTaskDomain.send({
  taskId: 1,
  domainId: 2,
});

// Set the task Skill
await colonyClient.setTaskSkill.send({
  taskId: 1,
  skillId: 5,
});
```
### Modification with Multi-sig Operations
Important changes to a task must be approved by multiple people. Task changes requiring two signatures are:

* Changing the task Brief (Manager and Worker)
* Changing or setting the task Due Date (Manager and Worker)
* Changing or setting the Worker's payout (Manager and Worker)
* Changing or setting the Evaluator's payout (Manager and Evaluator)

Attempting to use these methods without a MultisigOperation will throw an error. You can learn more about Multisignature transactions in colonyJS [here](/colonyjs/docs-multisignature).

### Rate
After the work has been submitted (or the due date has passed), the work rating period begins.

Task payouts are determined by work rating, which is currently implemented as "5-star" system, but which will change to a "3-star" system in the future.

* The Evaluator reviews the work done and submits a rating for the Worker.
* The Worker considers the task assignment and submits a rating for the Manager.

Because work ratings are on-chain, they follow a _*Commit* and *Reveal*_ pattern in which ratings are obscured to prevent them from influencing each other.


* During the *Commit* period, hidden ratings are submitted to the blockchain. The commit period lasts 5 days.

```js
const ratingSecret = await colonyClient.generateSecret.call({ salt, rating });

await colonyClient.submitTaskWorkRating.send({
  taskId: 1
  role: ROLES.WORKER,
  ratingSecret,
});
```

* During the *Reveal* period, users submit a transaction to reveal their rating.

```js
await colonyClient.revealTaskWorkRating.send({
  taskId: 1,
  role: ROLES.WORKER,
  rating,
  salt,
});
```

During the rating period, if either party fails to commit or reveal their rating, their counterpart is given the highest possible rating, and their own rating is penalized.

It's easy to check the status of a task during the rating period:

```js
const { count, timestamp } = await colonyClient.getTaskWorkRatings.call({
  taskId: 1,
});
```

### Finalize

After the rating period has finished, the task may be finalized, which prevents any further task modifications and allows each role to claim their payout.

```js
await colonyClient.finalizeTask.send({
  taskId: 1,
});

await colonyClient.claimPayout.send({
  taskId: 1,
  role: ROLES.WORKER,
  token: 'token contract address',
});
```