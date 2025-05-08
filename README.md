# 🎫 Alliance Chemical Ticket System

A modern, responsive ticket management system built for Alliance Chemical using Next.js, React, and PostgreSQL with Drizzle ORM.

![GitHub](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-v15.3.1-black)
![React](https://img.shields.io/badge/React-v19.0.0-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Support-336791)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-Latest-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 📋 Project Overview

Alliance Chemical Ticket System is a comprehensive support ticketing platform designed specifically for the chemical industry. The system streamlines communication between customers, support staff, and technical specialists, ensuring that product and service inquiries are tracked, assigned, and resolved efficiently.

### 🏢 Industry-Specific Features

- **Chemical Product Database Integration** - Link tickets to specific products in the chemical catalog
- **Safety Data Sheet (SDS) Attachment** - Automatically link relevant safety documentation
- **Regulatory Compliance Tracking** - Flag and categorize tickets related to compliance inquiries
- **Laboratory Testing Request Workflow** - Specialized ticket type for sample testing requests

## ✨ Detailed Features

- **📊 Interactive Dashboard**
  - Real-time ticket status visualization
  - Performance metrics by department and agent
  - SLA compliance monitoring
  - Time-to-resolution analytics
  - Custom report generation
  
- **🔒 Enterprise Authentication System**
  - Role-based access control
  - Active Directory/LDAP integration
  - Multi-factor authentication
  - Single Sign-On (SSO) support
  - Session management and security policies

- **👥 User Management**
  - Hierarchical user structure with departments
  - Skill-based routing capabilities
  - Workload balancing
  - Availability scheduling
  - Performance tracking and metrics

- **🎫 Advanced Ticket Lifecycle**
  - Configurable ticket states and transitions
  - Conditional workflow rules
  - SLA monitoring with escalation paths
  - Custom fields by ticket type
  - Automated ticket routing based on content analysis
  - Ticket merging and relationship management

- **📁 Document Management**
  - Secure file storage with versioning
  - Preview for common file types
  - Automated virus scanning
  - File categorization and tagging
  - Drag-and-drop attachment interface

- **📧 Comprehensive Email Integration**
  - Bidirectional email communication
  - Email template system with variables
  - HTML and plain text support
  - Email signature management
  - Automated response handling
  - Microsoft Outlook integration via Graph API

- **🔍 Enterprise Search Capabilities**
  - Full-text search across all ticket content
  - Saved searches and filters
  - Advanced query syntax support
  - Search within attachments
  - Parametric and faceted search options

- **📱 Responsive and Accessible Design**
  - Fully responsive from mobile to desktop
  - Dark/light mode support
  - WCAG 2.1 AA compliance
  - Customizable UI themes
  - Optimized for screen readers

- **📊 Business Intelligence**
  - Custom dashboard creation
  - Scheduled report generation
  - Data export in multiple formats
  - Trend analysis and forecasting
  - KPI monitoring and alerting

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ React UI    │  │ Next.js SSR │  │ Progressive Web App │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    API Layer                                │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ REST API    │  │ GraphQL API │  │ WebSocket Service   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Service Layer                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ Ticket      │  │ Notification        │  │
│  │ Service     │  │ Service     │  │ Service             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ User        │  │ Email       │  │ Reporting           │  │
│  │ Service     │  │ Service     │  │ Service             │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Data Layer                               │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │ Redis Cache │  │ File Storage        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Technology Stack Details

### Frontend
- **React 19**: Utilized with functional components and hooks
- **Next.js 15.3**: Server-side rendering and API routes
- **TypeScript**: Type-safe development
- **SWR**: Data fetching and caching
- **React Query**: Server state management
- **Tailwind CSS**: Utility-first styling
- **React Hook Form**: Form validation
- **Zod**: Schema validation
- **Framer Motion**: Animation library

### Backend
- **Next.js API Routes**: RESTful API endpoints
- **Drizzle ORM**: Type-safe database interactions
- **PostgreSQL**: Primary data store
- **Redis**: Caching and real-time features
- **Bull MQ**: Background job processing
- **NextAuth.js**: Authentication framework
- **JWT**: Stateless authentication

### DevOps & Infrastructure
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline
- **Vercel**: Production hosting
- **Jest & React Testing Library**: Testing framework
- **Playwright**: End-to-end testing
- **ESLint & Prettier**: Code quality tools
- **Husky**: Git hooks for quality enforcement

## 🖥️ Screenshots

![Dashboard](https://via.placeholder.com/800x450?text=Dashboard+Screenshot)
![Ticket Management](https://via.placeholder.com/800x450?text=Ticket+Management+Screenshot)
![Email Processing](https://via.placeholder.com/800x450?text=Email+Integration+Screenshot)

## 🛠️ Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/alliance-chemical-ticket-system-nextjs.git
   ```

2. Install dependencies
   ```bash
   npm install
   ```
3. Configure environment variables (create a `.env.local` file)
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/ticketing
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   REDIS_URL=redis://localhost:6379
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=user@example.com
   SMTP_PASSWORD=yourpassword
   MS_GRAPH_CLIENT_ID=your-microsoft-client-id
   MS_GRAPH_CLIENT_SECRET=your-microsoft-client-secret
   MS_GRAPH_TENANT_ID=your-microsoft-tenant-id
   ```

4. Run database migrations
   ```bash
   npm run db:migrate
   ```

5. Seed the database with initial data
   ```bash
   npm run db:seed
   ```

6. Start the development server
   ```bash
   npm run dev
   ```

## 💾 Database Schema

```
┌────────────────┐       ┌────────────────┐       ┌────────────────┐
│     Users      │       │     Tickets    │       │    Comments    │
├────────────────┤       ├────────────────┤       ├────────────────┤
│ id             │       │ id             │       │ id             │
│ name           │   ┌──>│ title          │<──┐   │ content        │
│ email          │   │   │ description    │   │   │ created_at     │
│ password_hash  │   │   │ status         │   │   │ updated_at     │
│ role           ├───┘   │ priority       │   │   │ ticket_id      ├──┐
│ department     │       │ created_at     │   │   │ user_id        │<─┘
│ created_at     │       │ updated_at     │   │   └────────────────┘
│ updated_at     │       │ assignee_id    │<──┘          ▲
└────────────────┘       │ reporter_id    │<─────────────┘
                         └────────────────┘
                                 ▲
                                 │
┌────────────────┐       ┌──────┴───────┐       ┌────────────────┐
│  Attachments   │       │   Activities │       │ Ticket Types   │
├────────────────┤       ├────────────────┤     ├────────────────┤
│ id             │       │ id             │     │ id             │
│ filename       │       │ description    │     │ name           │
│ path           │       │ activity_type  │     │ description    │
│ size           │       │ created_at     │     │ custom_fields  │
│ mime_type      │       │ user_id        │     │ workflow_id    │
│ created_at     │       │ ticket_id      │     └────────────────┘
│ ticket_id      ├───────┤ attachment_id  │              ▲
└────────────────┘       └────────────────┘              │
                                                         │
                                                         │
┌────────────────┐       ┌────────────────┐       ┌─────┴────────┐
│    Products    │       │  Departments   │       │   Workflows  │
├────────────────┤       ├────────────────┤       ├────────────────┤
│ id             │       │ id             │       │ id             │
│ name           │       │ name           │       │ name           │
│ description    │       │ description    │       │ description    │
│ category       │       │ manager_id     │       │ states         │
│ sds_url        │       └────────────────┘       │ transitions    │
└────────────────┘                                └────────────────┘
```

## 🔧 Configuration Details

### Email Processing Rules

The system uses a sophisticated email processing engine with the following capabilities:

```javascript
// Sample email processing rule
{
  name: "Product Inquiry Detection",
  pattern: "\\b(product|catalog|pricing)\\b",
  action: {
    assignDepartment: "Sales",
    priority: "Medium",
    addTag: "Product Inquiry"
  }
}
```

### Workflow Configuration

Ticket workflows are fully customizable:

```javascript
// Sample workflow definition
{
  name: "Standard Support Workflow",
  states: [
    {
      id: "new",
      name: "New",
      initial: true,
      actions: ["assign", "comment", "attach"]
    },
    {
      id: "in_progress",
      name: "In Progress",
      actions: ["comment", "attach", "resolve", "escalate"]
    },
    {
      id: "resolved",
      name: "Resolved",
      terminal: true,
      actions: ["reopen", "comment"]
    }
  ],
  transitions: [
    { from: "new", to: "in_progress", role: ["agent", "admin"] },
    { from: "in_progress", to: "resolved", role: ["agent", "admin"] },
    { from: "resolved", to: "in_progress", role: ["agent", "admin", "customer"] }
  ]
}
```

## 📈 Performance Optimizations

- **Server-Side Rendering**: Critical pages are server-rendered for faster initial load
- **Static Site Generation**: Documentation and static pages are pre-built
- **Edge Caching**: API responses cached at the edge for frequently accessed data
- **Image Optimization**: Automatic image resizing and WebP conversion
- **Code Splitting**: Dynamic imports to minimize initial bundle size
- **API Response Compression**: GZIP/Brotli compression for API payloads
- **Database Query Optimization**: Indexes and query tuning for common operations
- **Connection Pooling**: Efficient database connection management

## 🧪 Testing Strategy

- **Unit Tests**: Component and utility function testing with Jest
- **Integration Tests**: API route testing with SuperTest
- **E2E Tests**: Complete user flows with Playwright
- **Visual Regression Tests**: UI component testing with Storybook
- **Load Testing**: Performance testing with k6
- **Continuous Integration**: Automated test runs on pull requests

## 📚 Documentation

For more information on how to use and extend the system, check out the `/docs` directory.

## 🗓️ Roadmap

- **Q3 2023**
  - Mobile app development
  - Enhanced reporting capabilities
  - AI-powered ticket classification

- **Q4 2023**
  - Customer portal with self-service options
  - Knowledge base integration
  - Chatbot support assistant

- **Q1 2024**
  - Multi-tenant architecture
  - Global deployment options
  - Advanced analytics platform

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Next.js team for the amazing framework
- All open-source contributors whose libraries made this possible
- The Alliance Chemical team for their valuable feedback and requirements

