# Diana Ismail Labs

A Next.js 15 application showcasing Proof of Concepts (POCs) and experiments in Agentic-AI, Mixed Reality, and Retail Tech.

## Features
- Dynamic project grid driven by a local JSON file
- Category filtering
- Premium, dark-mode default "Agent-first" design aesthetic
- Smooth Framer Motion animations

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Managing Projects

To add, edit, or remove projects, simply modify the `src/data/projects.json` file. The grid and category tabs will automatically update. Ensure you follow the necessary schema:

```json
{
  "id": "unique-id",
  "title": "Project Title",
  "description": "Short description of the project.",
  "category": "String category used for filtering tabs",
  "status": "Active | Research | Archived",
  "tags": ["Tag1", "Tag2"],
  "demoUrl": "https://...",
  "githubUrl": "https://..."
}
```

## Docker

This project is configured strings for Docker with a multi-stage build that leverages Next.js standalone output to minimize image size. 

### Building the Image

```bash
docker build -t labs-app .
```

### Running the Container

```bash
docker run -p 3000:3000 labs-app
```

### Using Docker Compose

For a simpler experience, you can use Docker Compose to build and run the application in detached mode:

```bash
docker compose up -d --build
```

To stop the container:
```bash
docker compose down
```
