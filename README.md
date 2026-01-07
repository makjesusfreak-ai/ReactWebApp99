# Ailment Tracker - React Web Application

A comprehensive healthcare ailment management system built with React, Next.js, NestJS, AG-Grid, and amCharts5. Features real-time collaboration, DynamoDB storage, Redis caching, and AWS AppSync integration.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   Next.js   │  │   AG-Grid    │  │     amCharts5         │  │
│  │   React     │  │  Data Table  │  │  Bubble Visualization │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    GraphQL / WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │   NestJS    │  │   GraphQL    │  │    Subscriptions      │  │
│  │   Server    │  │   Resolvers  │  │    (Real-time)        │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                            │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  DynamoDB   │  │    Redis     │  │      AppSync          │  │
│  │  (Storage)  │  │   (Cache)    │  │  (Real-time Sync)     │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### Data Management Page (AG-Grid)
- **Nested Hierarchical Data**: Ailments → Treatments/Diagnostics → Side Effects
- **Inline Editing**: Click any cell to edit, Tab to navigate between cells
- **Real-time Save**: Press Enter to save changes
- **Add/Delete**: Intuitive buttons to add treatments, diagnostics, and side effects
- **Expand/Collapse**: Toggle nested rows visibility
- **Duration Formatting**: Human-readable time display (e.g., "2h 30m 45s")

### Visualization Page (amCharts5)
- **Bubble Chart with Pie Bullets**: 
  - X-axis: Ailment Duration
  - Y-axis: Ailment Intensity
  - Bubble Size: Ailment Severity
  - Pie Charts: Top treatment efficacy and intensity
- **Interactive**: Zoom, pan, tooltips with detailed information
- **Summary Statistics**: Total ailments, treatments, diagnostics, and average severity

### Backend Features
- **GraphQL API**: Full CRUD operations with NestJS
- **Real-time Subscriptions**: WebSocket-based live updates
- **Redis Caching**: Faster data retrieval for frequently accessed items
- **DynamoDB**: Scalable NoSQL storage

## 📋 Data Model

```typescript
// Main Ailment Record
interface Ailment {
  id: string;
  ailment: {
    name: string;
    description: string;
    duration: number;     // seconds
    intensity: number;    // 0-100
    severity: number;     // 0-100
  };
  treatments: Treatment[];
  diagnostics: Diagnostic[];
}

// Treatment (nested in Ailment)
interface Treatment {
  id: string;
  name: string;
  description: string;
  application: 'oral' | 'IV' | 'topical' | 'surgical';
  efficacy: number;       // 0-100
  duration: number;       // seconds
  intensity: number;      // 0-100
  type: 'holistic' | 'symptom-based';
  sideEffects: SideEffect[];
  setting: 'hospital' | 'clinic' | 'home';
  isPreventative: boolean;
  isPalliative: boolean;
  isCurative: boolean;
}

// Diagnostic (nested in Ailment)
interface Diagnostic {
  id: string;
  name: string;
  description: string;
  efficacy: number;       // 0-100
  duration: number;       // seconds
  intensity: number;      // 0-100
  type: 'holistic' | 'symptom-based';
  sideEffects: SideEffect[];
  setting: 'hospital' | 'clinic' | 'home';
}

// Side Effect (nested in Treatment/Diagnostic)
interface SideEffect {
  id: string;
  name: string;
  description: string;
  duration: number;       // seconds
  intensity: number;      // 0-100
  severity: number;       // 0-100
}
```

## 🛠️ Prerequisites

- Node.js 18.x or later
- npm or yarn
- Docker (for local DynamoDB and Redis)
- AWS CLI (for deployment)
- Terraform (for infrastructure)
- AWS SAM CLI (for serverless deployment)

## 📦 Installation

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

### 2. Set Up Environment Variables

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

### 3. Start Local Infrastructure (Optional)

```bash
# Start local DynamoDB
docker run -p 8000:8000 amazon/dynamodb-local

# Start local Redis
docker run -p 6379:6379 redis:latest
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:3001/graphql
```

## 🏗️ Infrastructure Deployment

### Using Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Get outputs
terraform output
```

### Using AWS SAM

```bash
cd infrastructure/sam

# Install Lambda dependencies
cd lambda && npm install && cd ..

# Build
sam build

# Deploy
sam deploy --guided
```

## 🧪 Testing the Application

### 1. Access the Application
- **Data Management**: http://localhost:3000
- **Visualization**: http://localhost:3000/visualization
- **GraphQL Playground**: http://localhost:3001/graphql

### 2. Test GraphQL Queries

```graphql
# Get all ailments
query {
  getAilments {
    id
    ailment {
      name
      duration
      intensity
    }
    treatments {
      name
      efficacy
    }
  }
}

# Create an ailment
mutation {
  createAilment(input: {
    ailment: {
      name: "Migraine"
      description: "Severe headache"
      duration: 14400
      intensity: 75
      severity: 60
    }
    treatments: [{
      name: "Ibuprofen"
      application: oral
      efficacy: 70
      duration: 3600
      intensity: 20
      type: symptom_based
      setting: home
      isPreventative: false
      isPalliative: true
      isCurative: false
    }]
  }) {
    id
    ailment {
      name
    }
  }
}
```

## 📁 Project Structure

```
ReactWebApp99/
├── frontend/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Data Management page
│   │   │   ├── visualization/  # Visualization page
│   │   │   └── layout.tsx      # Root layout
│   │   ├── components/         # React components
│   │   │   ├── AilmentDataGrid.tsx
│   │   │   ├── BubbleChart.tsx
│   │   │   └── Navigation.tsx
│   │   ├── graphql/            # Apollo Client & queries
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helper functions
│   └── package.json
│
├── backend/                     # NestJS Backend
│   ├── src/
│   │   ├── ailment/            # Ailment module
│   │   │   ├── ailment.module.ts
│   │   │   ├── ailment.service.ts
│   │   │   ├── ailment.resolver.ts
│   │   │   ├── dto/            # Input DTOs
│   │   │   └── entities/       # GraphQL types
│   │   ├── dynamodb/           # DynamoDB service
│   │   ├── redis/              # Redis caching service
│   │   ├── pubsub/             # GraphQL subscriptions
│   │   └── app.module.ts
│   └── package.json
│
├── infrastructure/
│   ├── terraform/              # Terraform IaC
│   │   ├── main.tf
│   │   ├── dynamodb.tf
│   │   ├── elasticache.tf
│   │   ├── appsync.tf
│   │   └── schema.graphql
│   └── sam/                    # AWS SAM templates
│       ├── template.yaml
│       └── lambda/
│
└── package.json                # Root workspace config
```

## 🎯 Key Functionalities

### AG-Grid Features
- Single-click cell editing
- Tab navigation between cells
- Enter to save row
- Custom duration editor (accepts "2h 30m" format)
- Dropdown selectors for enums
- Checkbox for boolean fields
- Hierarchical row expansion

### Duration Formatting
- Input: `3600` → Display: `1h`
- Input: `5430` → Display: `1h 30m 30s`
- Input: `86400` → Display: `1d`
- Accepts input in format: `2h 30m 45s` or raw seconds

## 🔐 Security Considerations

- API Key authentication for AppSync
- VPC isolation for ElastiCache Redis
- DynamoDB encryption at rest
- IAM role-based access control
- CORS configuration for frontend

## 📈 Scaling Considerations

- DynamoDB with on-demand capacity
- ElastiCache Redis cluster mode for high availability
- CloudFront CDN for static assets
- Lambda auto-scaling for serverless API

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
