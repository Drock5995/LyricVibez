<general_rules>
- When creating new components, place them in the `components/` directory.
- For new hooks, use the `hooks/` directory.
- Utility functions should be placed in the `utils/` directory.
- Services, like the Gemini service, should be in the `services/` directory.
- Before creating a new component, hook, or utility, search the existing directories to see if a similar one already exists.
- To run the linter, use the command `npm run lint`. This is configured with ESLint and the TypeScript plugin.
</general_rules>
<repository_structure>
The repository is a monorepo with a React frontend and a Node.js/Express backend.
- The frontend code is in the root directory and uses Vite for building and development.
- The backend code is in the `server/` directory.
- The `server/` directory contains its own `package.json` for backend-specific dependencies.
- The `server/` directory also contains `routes/`, `middleware/`, and `models/` directories for the Express application.
- `public/` contains static assets.
- `uploads/` and `output/` are used for file uploads and generated video output, respectively.
</repository_structure>
<dependencies_and_installation>
- The project uses `npm` for package management.
- To install frontend dependencies, run `npm install` in the root directory.
- To install backend dependencies, run `npm install` in the `server/` directory.
</dependencies_and_installation>
<testing_instructions>
- There are no specific testing frameworks or test files in this repository.
- There are some files that seem to be for testing purposes, but no formal testing setup.
  - `server/routes/test-auth.js`
  - `server/routes/simple-user.js`
  - `server/routes/simple-auth-fixed.js`
  - `server/routes/simple-auth.js`
</testing_instructions>
<pull_request_formatting>
</pull_request_formatting>
