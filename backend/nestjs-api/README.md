<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Database Seeding

The application includes a simple seeding system for initial data setup.

### Seed Tools Data

To seed the tools collection with initial data:

```bash
# Run seeding (builds and seeds, then exits)
$ npm run seed
```

The seeding system:
- Reads from `src/database/seeds/tools.json`
- Uses incremental updates (only adds new tools, doesn't duplicate)
- Validates all data using class-validator DTOs
- Tracks seed version to avoid re-running same data

### Tools JSON Structure

The `tools.json` file should follow this structure (see `tools-sample.json` for a complete example):

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-09-14T08:40:00Z",
  "contributors": {
    "contributor-id": {
      "name": "Contributor Name",
      "email": "email@example.com",
      "contributions": 1
    }
  },
  "tools": [
    {
      "id": "tool-id",                          // Required: lowercase, numbers, hyphens only
      "name": "Tool Name",                      // Required: max 100 chars
      "description": "Short description",      // Required: max 500 chars
      "longDescription": "Detailed description", // Optional: min 50 chars
      "pricing": ["Free", "Paid"],             // Required: array of strings
      "interface": ["Web", "API"],             // Required: array of strings
      "functionality": ["Category"],           // Required: array of strings
      "deployment": ["Cloud"],                 // Required: array of strings
      "logoUrl": "https://example.com/logo.png", // Required: valid URL
      "searchKeywords": ["keyword1", "keyword2"], // Required: array of strings
      "tags": {                                // Required: at least one non-empty
        "primary": ["Category1"],
        "secondary": ["Category2"]
      },
      "popularity": 95,                        // Optional: 0-100
      "rating": 4.5,                          // Optional: 0-5
      "reviewCount": 1000,                    // Optional: >= 0
      "features": {                           // Optional: boolean values only
        "apiAccess": true,
        "freeTier": false
      },
      "integrations": ["Service1"],           // Optional: array of strings
      "languages": ["English"],               // Optional: array of strings
      "pros": ["Advantage 1"],                // Optional: array of strings
      "cons": ["Limitation 1"],               // Optional: array of strings
      "useCases": ["Use case 1"],             // Optional: array of strings
      "contributor": "contributor-id",        // Required: references contributors
      "dateAdded": "2025-09-14T08:40:00Z",   // Required: ISO date string
      "lastUpdated": "2025-09-14T08:40:00Z"  // Optional: ISO date string
    }
  ]
}
```

### Field Requirements

**Required fields**: `id`, `name`, `description`, `pricing`, `interface`, `functionality`, `deployment`, `logoUrl`, `searchKeywords`, `tags`, `contributor`, `dateAdded`

**Validation rules**:
- `id`: Must match `/^[a-z0-9-]+$/` pattern
- `name`: 1-100 characters
- `description`: 1-500 characters
- `logoUrl`: Must be valid URL
- `tags`: Must have at least one non-empty array (primary or secondary)
- `popularity`: 0-100 if provided
- `rating`: 0-5 if provided
- `features`: All values must be boolean if provided

### Environment Variables

- `SEED_TOOLS=true` - Enable seeding on startup
- `EXIT_AFTER_SEED=true` - Exit after seeding (useful for one-time runs)

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
